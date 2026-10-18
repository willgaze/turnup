import { prisma } from './prisma'
import { generateCode } from './trade-status'
import { readArrivalEmail, isGenericTitle } from './arrival-email'
import { cleanText } from './clean-text'
import { atLocalTime } from './when'
import { cardShape } from './arrival-card'
import { INBOUND_HOST, inboxAddress } from './inbox-address'
import { readForwardingConfirm, CONFIRM_KEY } from './gmail-confirm'
import { nameOfSender } from './arrival-email'
import { arrivalFromTracker, trackerDedupeKey } from './arrival-sync'

/**
 * The household card: everything coming to one door, from wherever it came.
 *
 * Every read and write here is wrapped. `Place` and `Arrival` are new tables,
 * which is the migration case that fails soft — until `prisma db push` has run
 * the card is simply empty and nothing else in the product notices. See the
 * migration table in CLAUDE.md.
 */

/** A dedupe key that survives a carrier emailing four times about one parcel. */
function dedupeKeyFor(parsed) {
  if (parsed.reference) return `${parsed.carrierId || parsed.carrier}:${parsed.reference}`.toLowerCase().slice(0, 180)
  // No reference: the sender and what they called it is the best we have, and
  // it is right more often than it is wrong — the same shop rarely emails about
  // two different sofas on one day.
  return `${parsed.carrier}:${parsed.title}`.toLowerCase().replace(/\s+/g, ' ').slice(0, 180)
}

/**
 * Stages only ever move forwards.
 *
 * Carriers send out of order — a "dispatched" email can land after an "out for
 * delivery" one, and a delayed queue can replay yesterday. A card that walks
 * backwards is a card that lies, so a later email can only advance a row,
 * never rewind it. MISSED is the one exception: it is news, whenever it lands.
 */
const RANK = { ORDERED: 0, BOOKED: 1, ON_THE_WAY: 2, OUT_FOR_DELIVERY: 3, DONE: 4 }
function nextStage(current, incoming) {
  if (incoming === 'MISSED' || current === 'MISSED') return incoming
  const a = RANK[current] ?? -1
  const b = RANK[incoming] ?? -1
  return b >= a ? incoming : current
}

// The gate lives in src/lib/inbound-config.js now, because it has to read a
// row as well as an environment variable and so cannot be a constant.

/** Make a household card. Two secrets: one to read it, one to post to it. */
export async function createPlace(label) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.place.create({
        data: {
          code: generateCode(8),
          // Longer than the read code: this one ends up written down in a mail
          // filter and never typed, so length costs nothing and guessing it
          // would let somebody put rows on a stranger's card.
          inboxKey: generateCode(14).toLowerCase(),
          label: cleanText(label, 80) || null,
        },
      })
    } catch (error) {
      // A code collision is a retry, not a database fault. Same rule as jobs.
      if (error?.code === 'P2002' && attempt < 4) continue
      throw error
    }
  }
  return null
}

export async function placeByCode(code) {
  try {
    const row = await prisma.place.findUnique({
      where: { code: String(code || '').toUpperCase() },
      include: { arrivals: { orderBy: [{ expectedFor: 'asc' }, { updatedAt: 'desc' }] } },
    })
    return row?.isActive ? row : null
  } catch { return null }
}

/**
 * File one forwarded email against a place.
 *
 * Returns what happened rather than throwing, because the caller is an inbound
 * mail webhook: a provider that gets a 500 retries, and a retry storm on a
 * parse bug would put the same parcel on the card twenty times.
 */
export async function fileEmail({ inboxKey, from, subject, text, receivedAt }) {
  let place
  try {
    place = await prisma.place.findUnique({ where: { inboxKey: String(inboxKey || '').toLowerCase() } })
  } catch { return { ok: false, why: 'unavailable' } }
  if (!place?.isActive) return { ok: false, why: 'no_such_inbox' }

  // Gmail asking the household to confirm forwarding. Not an arrival, but the
  // one email they must see, or nothing else ever arrives. See gmail-confirm.js.
  const confirm = readForwardingConfirm({ from, subject, text })
  if (confirm) {
    try {
      const data = {
        kind: 'NOTICE', source: 'EMAIL', stage: 'BOOKED', carrier: 'Gmail',
        title: 'Gmail is asking you to confirm forwarding',
        reference: confirm.code, trackUrl: confirm.url,
      }
      await prisma.arrival.upsert({
        where: { placeId_dedupeKey: { placeId: place.id, dedupeKey: CONFIRM_KEY } },
        create: { placeId: place.id, dedupeKey: CONFIRM_KEY, ...data },
        update: data,
      })
      return { ok: true, filed: true, stage: 'GMAIL_CONFIRM' }
    } catch { return { ok: false, why: 'unavailable' } }
  }

  const parsed = readArrivalEmail({ from, subject, text, receivedAt })
  // Not an arrival. A receipt, a newsletter, a password reset. Dropping it is
  // the correct outcome and is not an error worth reporting as one.
  if (!parsed) return { ok: true, filed: false, why: 'not_an_arrival' }

  // Mail is flowing, so Gmail's ask has been answered: take the notice off.
  prisma.arrival.deleteMany({ where: { placeId: place.id, dedupeKey: CONFIRM_KEY } }).catch(() => {})

  const dedupeKey = dedupeKeyFor(parsed)
  const data = {
    kind: parsed.kind,
    source: 'EMAIL',
    carrier: parsed.carrier,
    title: parsed.title,
    reference: parsed.reference,
    trackUrl: parsed.trackUrl,
    expectedFor: parsed.expectedFor,
    expectedSaid: parsed.expectedSaid,
    windowStart: null,
    windowEnd: null,
    windowSaid: parsed.window?.said || null,
  }
  // A window is hours on the stated day; with no day there is nothing to hang
  // them off, so the words are kept and the times are not invented.
  //
  // Through atLocalTime(), never setUTCHours(). A carrier saying "between 12
  // and 4" means twelve o'clock where the house is, and Britain is an hour
  // ahead of UTC for seven months of the year — the same mistake that showed
  // a trade's 09:00 window back to the customer as 10:00.
  if (parsed.window && parsed.expectedFor) {
    const hhmm = (t) => `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`
    data.windowStart = atLocalTime(parsed.expectedFor, hhmm(parsed.window.start))
    data.windowEnd = atLocalTime(parsed.expectedFor, hhmm(parsed.window.end))
  }

  try {
    const existing = await prisma.arrival.findUnique({
      where: { placeId_dedupeKey: { placeId: place.id, dedupeKey } },
    })
    if (existing) {
      await prisma.arrival.update({
        where: { id: existing.id },
        data: {
          ...data,
          stage: nextStage(existing.stage, parsed.stage),
          // Never blank something already known because a later, thinner email
          // did not repeat it.
          reference: data.reference || existing.reference,
          trackUrl: data.trackUrl || existing.trackUrl,
          // The title is what the thing IS, and that does not change because
          // a later email about it had a different subject line. A parcel
          // first filed as "Your Screwfix order" must not become "Your parcel
          // is on its way" an hour later — the stage already moved, and the
          // one line naming the thing is the line worth keeping.
          //
          // One exception: a title this code made up because the first email
          // named nothing ("Samsung UK order", from "Confirmation of your
          // order") gives way to the first later email that does name it.
          title: existing.title && !isGenericTitle(existing.title, existing.carrier) ? existing.title : (data.title || existing.title),
          expectedFor: data.expectedFor || existing.expectedFor,
          expectedSaid: data.expectedFor ? data.expectedSaid : existing.expectedSaid,
        },
      })
      return { ok: true, filed: true, updated: true, stage: nextStage(existing.stage, parsed.stage) }
    }
    await prisma.arrival.create({ data: { ...data, placeId: place.id, dedupeKey, stage: parsed.stage } })
    // The same email, filed before a forward could be read (v1.64.2): a row
    // under the household's own name with this exact title is this thing,
    // filed wrongly. Narrow on purpose: same card, same title, and the sender
    // being whoever forwarded it, never a carrier or a shop.
    const forwarder = nameOfSender(from)
    if (forwarder && forwarder !== data.carrier) {
      prisma.arrival.deleteMany({
        where: { placeId: place.id, source: 'EMAIL', title: data.title, carrier: forwarder, NOT: { dedupeKey } },
      }).catch(() => {})
    }
    return { ok: true, filed: true, updated: false, stage: parsed.stage }
  } catch (error) {
    console.error('arrival file failed:', error?.code || error?.message)
    return { ok: false, why: 'unavailable' }
  }
}

// The card's shape lives on its own, with no database import, so it can be
// checked by a script. Re-exported so callers have one place to import from.
export { cardShape }
export { INBOUND_HOST, inboxAddress }


/**
 * Put one of the trade's own jobs on a household card, and keep it there.
 *
 * The row is OWNED by the job: every sync overwrites it, including backwards.
 * That is the opposite of `nextStage()` above, and deliberately so — a carrier
 * guessing out of order is noise, but a trade un-pausing a job is a fact, and
 * the one row on this card with a person behind it must say what that person
 * last tapped.
 *
 * Fire-and-forget everywhere it is called. A household card is a nicety; the
 * stage change on a driveway is not, and must never wait on this or fail
 * because of it. Same rule as push.
 */
export async function attachTracker(placeCode, tracker) {
  const row = arrivalFromTracker(tracker)
  if (!row) return { ok: false, why: 'no_tracker' }
  try {
    const place = await prisma.place.findUnique({ where: { code: String(placeCode || '').toUpperCase() } })
    if (!place?.isActive) return { ok: false, why: 'no_such_card' }
    const { dedupeKey, updatedAt, ...data } = row
    await prisma.arrival.upsert({
      where: { placeId_dedupeKey: { placeId: place.id, dedupeKey } },
      create: { ...data, placeId: place.id, dedupeKey },
      update: data,
    })
    return { ok: true }
  } catch (error) {
    console.error('attach tracker failed:', error?.code || error?.message)
    return { ok: false, why: 'unavailable' }
  }
}

/** Take a job off a card. The job itself is untouched. */
export async function detachTracker(placeCode, code) {
  try {
    const place = await prisma.place.findUnique({ where: { code: String(placeCode || '').toUpperCase() } })
    if (!place) return { ok: false, why: 'no_such_card' }
    await prisma.arrival.deleteMany({
      where: { placeId: place.id, dedupeKey: trackerDedupeKey(code) },
    })
    return { ok: true }
  } catch { return { ok: false, why: 'unavailable' } }
}

/**
 * The job moved, so every card carrying it moves too.
 *
 * Called un-awaited from the stage handler. A job can sit on more than one
 * card — a landlord's and a tenant's, say — so this updates all of them, and
 * does nothing at all when the job is on none, which is the normal case.
 */
export async function syncTrackerToCards(tracker) {
  const row = arrivalFromTracker(tracker)
  if (!row) return 0
  try {
    const { dedupeKey, updatedAt, placeId, ...data } = row
    const done = await prisma.arrival.updateMany({
      where: { dedupeKey, source: 'TRADE' },
      data,
    })
    return done.count
  } catch (error) {
    console.error('sync tracker to cards failed:', error?.code || error?.message)
    return 0
  }
}

/** Which jobs are on a card, so the dashboard can show and un-show them. */
export async function trackersOnCard(placeCode) {
  try {
    const place = await prisma.place.findUnique({
      where: { code: String(placeCode || '').toUpperCase() },
      include: { arrivals: { where: { source: 'TRADE' } } },
    })
    return (place?.arrivals || []).map((a) => a.tradeStatusCode).filter(Boolean)
  } catch { return [] }
}

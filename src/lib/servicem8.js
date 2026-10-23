/**
 * ServiceM8, kept at arm's length.
 *
 * The rule that makes this robust: a webhook is a DOORBELL, never a message.
 * Whatever ServiceM8 sends us, we throw the body away except for the job's
 * uuid, then ask their API what is actually true and derive the stage from
 * that. So a replayed, forged, reordered or half-delivered webhook cannot move
 * a card anywhere the real job is not; and a missed one costs nothing, because
 * the same derivation runs when a customer opens their page (pull on read) and
 * when the trade opens the dashboard.
 *
 * Auth is an API key (ServiceM8 → Settings → API Keys), sent as X-API-Key.
 * Nothing here is reachable without SM8_API_KEY; without it every function
 * says so and the dashboard shows what to do.
 *
 * Mapping, deliberately conservative — only what ServiceM8 can actually know:
 *   Completed                        → Job done
 *   a recorded check-in still open   → On site
 *   checked out, job not completed   → Paused ("away from site for now")
 *   Work Order, nothing recorded     → Booked in (never regresses On my way:
 *                                      setting off is TurnUp's own tap)
 *   Quote / Unsuccessful             → no change, noted in the log
 */
import { prisma } from './prisma'
import { notifyStage } from './push'
import { pushPassUpdate } from '@/lib/pass-service'
import { cleanText } from './clean-text'
import { generateCode } from './trade-status'
import { nudgeIfDue } from './nudge'
import { revisionFor, dayMoveFor, windowHours, lastShown } from './window'
import { dayOnly } from './when'
import { createHmac } from 'node:crypto'

// SM8_API_BASE exists so a test can stand a fake ServiceM8 up on localhost.
// Production never sets it.
const BASE = (process.env.SM8_API_BASE || 'https://api.servicem8.com').replace(/\/$/, '')
const API = `${BASE}/api_1.0`
const HOOKS = `${BASE}/webhook_subscriptions/event`
export const EVENTS = ['job.status_changed', 'job.checked_in', 'job.checked_out', 'job.completed', 'job.updated']
const STALE_MS = 60_000
const TIMEOUT_MS = 6_000     // ServiceM8 wants a 2xx inside 10s; leave room
// The one note this file writes. It is also the one it is allowed to erase:
// a pause we announced must not outlive the pause.
const AWAY_NOTE = 'Away from site for now — back to finish.'

export const sm8Configured = () => Boolean(process.env.SM8_API_KEY)
// The webhook URL's secret. Set SM8_WEBHOOK_TOKEN if you want to choose it;
// otherwise it is derived from JWT_SECRET, so connecting ServiceM8 needs one
// env var, not two. Changing JWT_SECRET therefore changes the URL — press
// Start listening again after.
export const webhookToken = () => {
  if (process.env.SM8_WEBHOOK_TOKEN) return process.env.SM8_WEBHOOK_TOKEN
  if (!process.env.JWT_SECRET) return null
  return createHmac('sha256', process.env.JWT_SECRET).update('sm8-webhook').digest('hex').slice(0, 40)
}

const UUID = /^[0-9a-f-]{32,36}$/i
const isNull = (d) => !d || String(d).startsWith('0000-00-00')

async function api(path, init = {}) {
  if (!sm8Configured()) throw new Error('sm8_not_configured')
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(path.startsWith('http') ? path : `${API}/${path}`, {
      ...init,
      signal: ctl.signal,
      headers: { Accept: 'application/json', 'X-API-Key': process.env.SM8_API_KEY, ...(init.headers || {}) },
    })
    if (r.status === 401 || r.status === 403) throw new Error('sm8_key_rejected')
    const text = await r.text()
    if (!r.ok) {
      // Carry ServiceM8's own sentence up. On 9 Oct 2026 the first subscribe
      // on a real account came back 429 "Webhook Events is being activated on
      // this account. Please try again in a few moments." — a code alone
      // would have sent Will looking for a bug that was not there.
      let msg = ''
      try { msg = JSON.parse(text)?.message || '' } catch { msg = text.slice(0, 120) }
      const e = new Error(`sm8_http_${r.status}${msg ? `: ${msg}` : ''}`)
      e.status = r.status
      throw e
    }
    return text ? JSON.parse(text) : null
  } finally { clearTimeout(t) }
}

const filter = (field, value) => `$filter=${encodeURIComponent(`${field} eq '${String(value).replace(/'/g, "''")}'`)}`

/** The job, by uuid or by the number the trade knows it as. */
export async function fetchJob({ uuid, number }) {
  if (uuid && UUID.test(uuid)) return api(`job/${uuid}.json`)
  if (number) {
    const rows = await api(`job.json?${filter('generated_job_id', String(number).trim())}`)
    return Array.isArray(rows) && rows.length ? rows[0] : null
  }
  return null
}

/** Recorded (not scheduled) check-ins for a job, newest first. */
export async function fetchActivities(jobUuid) {
  const rows = await api(`jobactivity.json?${filter('job_uuid', jobUuid)}`)
  return (Array.isArray(rows) ? rows : [])
    .filter((a) => Number(a.active ?? 1) === 1 && Number(a.activity_was_recorded ?? 0) === 1)
    .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)))
}

/** Scheduled visits edited since a ServiceM8-local stamp ("2026-10-12 09:00:00"), any job. */
export async function fetchActivitiesEditedSince(sinceStamp) {
  const rows = await api(`jobactivity.json?$filter=${encodeURIComponent(`edit_date gt '${sinceStamp}'`)}`)
  return Array.isArray(rows) ? rows : []
}

/** The person on the job, for pre-filling a new tracker. */
/**
 * ServiceM8 stamps times in the account's local time, with no offset:
 * "2026-10-16 09:00:00" is nine in the morning in the UK. On a server that
 * runs in UTC, new Date() on that string is an hour out all summer. So the
 * London offset for that instant is worked out and applied.
 */
export function londonDate(stamp) {
  const m = String(stamp || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const [, Y, M, D, h, mi, sec] = m.map(Number)
  const guess = Date.UTC(Y, M - 1, D, h, mi, sec || 0)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess))
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT'
  const off = /([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tz)
  const minutes = off ? (off[1] === '-' ? -1 : 1) * (Number(off[2]) * 60 + Number(off[3] || 0)) : 0
  return new Date(guess - minutes * 60_000)
}

/** The next booking on a job: the earliest scheduled visit that has not ended. */
export async function fetchNextBooking(jobUuid) {
  const rows = await api(`jobactivity.json?${filter('job_uuid', jobUuid)}`)
  const now = Date.now() - 6 * 3600_000 // a visit that started this morning still counts
  return (Array.isArray(rows) ? rows : [])
    .filter((a) => Number(a.active ?? 1) === 1 && Number(a.activity_was_scheduled ?? 0) === 1 && !isNull(a.start_date))
    .map((a) => ({ start: londonDate(a.start_date), end: isNull(a.end_date) ? null : londonDate(a.end_date) }))
    .filter((b) => b.start && (b.end || b.start).getTime() >= now)
    .sort((a, b) => a.start - b.start)[0] || null
}

export async function fetchJobContact(jobUuid) {
  const rows = await api(`jobcontact.json?${filter('job_uuid', jobUuid)}`)
  const list = Array.isArray(rows) ? rows.filter((c) => Number(c.active ?? 1) === 1) : []
  return list.find((c) => c.type === 'JOB') || list[0] || null
}

/** Pure: what stage the ServiceM8 facts imply, given where the card is now. */
export function deriveStage({ job, activities, current }) {
  const status = String(job?.status || '')
  if (status === 'Completed') return { stage: 'DONE', why: 'completed in ServiceM8' }
  const open = activities.find((a) => !isNull(a.start_date) && isNull(a.end_date))
  if (open) return { stage: 'ON_SITE', why: 'checked in' }
  const latest = activities[0]
  if (latest && !isNull(latest.end_date) && current === 'ON_SITE') {
    return { stage: 'PAUSED', why: 'checked out, job not finished', note: AWAY_NOTE }
  }
  if (status === 'Work Order') {
    if (['ON_MY_WAY', 'PAUSED', 'BOOKED', 'ON_SITE'].includes(current)) return { stage: current, why: 'work order, nothing new' }
    return { stage: 'BOOKED', why: 'work order' }
  }
  return { stage: current, why: `status ${status || 'unknown'} — not ours to move` }
}

async function log(entry) {
  // The log is a convenience. If its table is not there yet, the sync still is.
  try { await prisma.sm8Event.create({ data: entry }) } catch (e) { console.error('sm8 log:', e?.code || e?.message) }
}

/**
 * Bring one tracker into line with its ServiceM8 job. Idempotent: running it
 * twice does nothing the second time. Never throws; returns what it did.
 */
export async function syncTracker(tracker, { source = 'sync' } = {}) {
  const jobUuid = tracker.externalId
  if (!jobUuid || !UUID.test(jobUuid)) return { outcome: 'unlinked' }
  try {
    const [job, activities, booking] = await Promise.all([fetchJob({ uuid: jobUuid }), fetchActivities(jobUuid), fetchNextBooking(jobUuid).catch(() => null)])
    if (!job) { await log({ event: source, jobUuid, tradeStatusId: tracker.id, outcome: 'job_missing' }); return { outcome: 'job_missing' } }
    const { stage, why, note } = deriveStage({ job, activities, current: tracker.stage })
    let outcome = 'unchanged'

    // The booking window travels too. A booking in ServiceM8 is an arrangement
    // the trade made with the customer, so it lands as AGREED by the trade —
    // "Between 09:00 and 11:00" on the card, the same thing the confirmation
    // text said. Left alone while the customer has a counter-offer open on
    // TurnUp: ServiceM8 does not know about that conversation.
    const same = (a, b) => (a ? new Date(a).getTime() : 0) === (b ? b.getTime() : 0)
    if (booking && tracker.stage !== 'DONE' && !(tracker.windowState === 'PROPOSED' && tracker.windowBy === 'CUSTOMER')
        && !(same(tracker.windowStart, booking.start) && same(tracker.windowEnd, booking.end) && tracker.windowState === 'AGREED')) {
      // A booking moved in ServiceM8 is a revised promise like any other: the
      // first hours and the first day are kept, and the change is on the record.
      const revision = revisionFor(tracker, { start: booking.start, end: booking.end }, { by: 'TRADE' })
      const moved = dayMoveFor(tracker, booking.start)
      const notes = []
      if (revision.windowRevisedAt) notes.push({ stage: tracker.stage, note: `Hours changed in ServiceM8 from ${windowHours(lastShown(tracker))?.toLowerCase() || 'none'} to ${windowHours(booking).toLowerCase()}.` })
      if (moved.scheduledMovedAt) notes.push({ stage: tracker.stage, note: `Moved in ServiceM8 from ${dayOnly(tracker.scheduledFor)} to ${dayOnly(booking.start)}.` })
      await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
        scheduledFor: booking.start, windowStart: booking.start, windowEnd: booking.end,
        windowState: 'AGREED', windowBy: 'TRADE', windowAt: new Date(),
        ...revision, ...moved,
        ...(notes.length ? { events: { create: notes } } : {}),
      } })
      outcome = 'window'
    }

    if (stage !== tracker.stage) {
      const keep = tracker.stageNote === AWAY_NOTE ? null : tracker.stageNote
      const data = { stage, stageNote: note ? cleanText(note) : keep, events: { create: { stage, note: `From ServiceM8: ${why}` } } }
      // Same rule as the stage button: setting off is stamped on the way into
      // On my way only, and cleared only by going back to Booked in.
      if (stage === 'ON_MY_WAY') data.arrivingAt = new Date()
      else if (stage === 'BOOKED') data.arrivingAt = null
      const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data })
      notifyStage(updated, stage).catch(() => {})
      outcome = outcome === 'window' ? `moved:${stage}+window` : `moved:${stage}`
    }
    if (outcome !== 'unchanged') pushPassUpdate(tracker.code).catch(() => {})
    await prisma.sm8Link.upsert({
      where: { tradeStatusId: tracker.id },
      create: { tradeStatusId: tracker.id, jobUuid, jobNumber: job.generated_job_id ? String(job.generated_job_id) : null, syncedAt: new Date(), lastStatus: job.status, lastOutcome: outcome },
      update: { syncedAt: new Date(), lastStatus: job.status, lastOutcome: outcome, jobNumber: job.generated_job_id ? String(job.generated_job_id) : undefined },
    }).catch((e) => console.error('sm8 link:', e?.code || e?.message))
    await log({ event: source, jobUuid, tradeStatusId: tracker.id, outcome })
    prisma.tradeStatus.findUnique({ where: { id: tracker.id } }).then((fresh) => fresh && nudgeIfDue(fresh)).catch(() => {})
    return { outcome, stage, why }
  } catch (error) {
    const outcome = `error:${error?.message || 'unknown'}`
    await log({ event: source, jobUuid, tradeStatusId: tracker.id, outcome })
    return { outcome }
  }
}

/* ------------------------------------------------------------------------ */
/* A tracker from a job                                                      */
/* ------------------------------------------------------------------------ */

/** The tracker fields a ServiceM8 job and its contact fill in. */
export function fieldsFromJob(job, contact) {
  return {
    externalId: job.uuid,
    jobRef: job.generated_job_id ? String(job.generated_job_id) : null,
    customerName: [contact?.first, contact?.last].filter(Boolean).join(' ') || null,
    customerPhone: contact?.mobile || contact?.phone || null,
    jobAddress: String(job.job_address || '').replace(/\s*\n\s*/g, ', ') || null,
    jobSummary: String(job.job_description || '').split('\n')[0].slice(0, 120) || null,
  }
}

/** The digits of a phone number, so "07979 350 201" and "+447979350201" agree on their tail. */
export const phoneDigits = (v) => String(v || '').replace(/\D/g, '')

/**
 * Does what the customer typed belong to this job's contact? Accepts the last
 * four digits, or the whole number in any spacing. Checks mobile and landline.
 */
export function phoneMatches(contact, given) {
  const g = phoneDigits(given)
  if (g.length < 4) return false
  return [contact?.mobile, contact?.phone].map(phoneDigits).filter((d) => d.length >= 4).some((d) =>
    g.length <= 4 ? d.endsWith(g) : d.slice(-10) === g.slice(-10))
  // Why the tail: a number stored as 01234 567890 and typed as +441234567890
  // share their last ten digits and nothing before.
}

/**
 * The tracker that follows this job, made if it does not exist yet. This is
 * how a link ServiceM8 wrote into its own booking text becomes a card: the
 * customer taps it, the job is looked up, and the tracker appears, linked at
 * birth and synced straight away so it shows the job's real state.
 */
export async function findOrCreateForJob(job, contact) {
  const existing = await prisma.tradeStatus.findFirst({ where: { externalId: job.uuid, isActive: true } })
  if (existing) return { tracker: existing, created: false }
  const fields = fieldsFromJob(job, contact)
  const stage = job.status === 'Completed' ? 'DONE' : 'BOOKED'
  let tracker = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      tracker = await prisma.tradeStatus.create({
        data: { ...fields, stage, code: generateCode(), events: { create: { stage, note: 'From ServiceM8: booked' } } },
      })
      break
    } catch (error) {
      const collided = error?.code === 'P2002' && String(error?.meta?.target ?? '').includes('code')
      if (!collided) throw error
    }
  }
  if (!tracker) throw new Error('code_collision')
  await syncTracker(tracker, { source: 'sync.link' })
  const fresh = await prisma.tradeStatus.findUnique({ where: { id: tracker.id } })
  return { tracker: fresh || tracker, created: true }
}

/** Find the tracker following a ServiceM8 job uuid, then sync it. */
export async function syncByJobUuid(jobUuid, { source }) {
  const tracker = await prisma.tradeStatus.findFirst({ where: { externalId: jobUuid, isActive: true } })
  if (!tracker) { await log({ event: source, jobUuid, outcome: 'unlinked' }); return { outcome: 'unlinked' } }
  return syncTracker(tracker, { source })
}

/**
 * Pull on read: called from the customer's status route. Cheap when there is
 * nothing to do, never awaited by the caller for longer than it takes to
 * decide, never allowed to break the page.
 */
export async function syncIfStale(tracker) {
  if (!sm8Configured() || !tracker?.externalId || !UUID.test(tracker.externalId)) return
  try {
    const link = await prisma.sm8Link.findUnique({ where: { tradeStatusId: tracker.id } }).catch(() => null)
    if (link?.syncedAt && Date.now() - new Date(link.syncedAt).getTime() < STALE_MS) return
    await syncTracker(tracker, { source: 'sync.read' })
  } catch (e) { console.error('sm8 syncIfStale:', e?.message) }
}

/** Pull the uuid out of whatever shape the webhook came in. */
export function jobUuidFromDelivery(body) {
  const cands = [
    body?.entry?.[0]?.uuid, body?.entry?.[0]?.job_uuid, body?.eventArgs?.entry?.[0]?.uuid,
    body?.job_uuid, body?.uuid, body?.object_uuid,
  ]
  for (const c of cands) if (c && UUID.test(String(c))) return String(c)
  const url = body?.resource_url || body?.eventArgs?.resource_url || ''
  const m = String(url).match(/([0-9a-f-]{36})\.json/i)
  return m ? m[1] : null
}

export const eventNameFromDelivery = (body, fallback = 'webhook') =>
  String(body?.event || body?.eventName || body?.event_name || fallback).slice(0, 60)

/* ---- subscriptions ------------------------------------------------------- */

export const callbackUrl = (origin) => (webhookToken() ? `${origin}/api/servicem8/webhook/${webhookToken()}` : null)

export async function listSubscriptions() {
  const rows = await api(HOOKS)
  return Array.isArray(rows) ? rows : rows?.data || []
}

export async function subscribe(origin) {
  const url = callbackUrl(origin)
  if (!url) throw new Error('sm8_no_webhook_token')
  const results = []
  for (const event of EVENTS) {
    const body = new URLSearchParams({ event, callback_url: url, unique_id: 'turnup' })
    try {
      const r = await api(HOOKS, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      results.push({ event, ok: Boolean(r?.success ?? true) })
    } catch (e) { results.push({ event, ok: false, error: e.message }) }
  }
  return results
}

export async function unsubscribe() {
  const subs = await listSubscriptions()
  const mine = subs.filter((s) => s.unique_id === 'turnup' || String(s.callback_url || '').includes('/api/servicem8/webhook/'))
  for (const s of mine) {
    const id = s.uuid || s.id
    if (id) await api(`${HOOKS}/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  return mine.length
}

// ---------------------------------------------------------------------------
// What ServiceM8 sent, and what is coming up. Found 12 Oct 2026: the account
// API key can read the job email and SMS history (email.json, sms.json,
// filtered by related_object_uuid). Until then this connector believed it
// could not see whether the booking text went, and said so in the box.
// ---------------------------------------------------------------------------

const LINK_RE = /\/j\/\d+/

/** Outbound emails and texts ServiceM8 holds against a job, newest first. */
export async function fetchMessages(jobUuid) {
  const [emails, sms] = await Promise.all([
    api(`email.json?${filter('related_object_uuid', jobUuid)}`).catch(() => []),
    api(`sms.json?${filter('related_object_uuid', jobUuid)}`).catch(() => []),
  ])
  const out = (rows) => (Array.isArray(rows) ? rows : []).filter((m) => m.direction === 'outbound')
  const by = (a, b) => String(b.timestamp).localeCompare(String(a.timestamp))
  return {
    emails: out(emails).sort(by).map((m) => ({
      at: londonDate(m.timestamp), to: (m.to_email || [])[0] || null, subject: m.subject || null,
      opened: Boolean(m.opened), firstOpenedAt: isNull(m.first_opened_at) ? null : londonDate(m.first_opened_at),
      bounced: Boolean(m.bounced), hasLink: LINK_RE.test(String(m.message_text || '')),
    })),
    sms: out(sms).sort(by).map((m) => ({
      at: londonDate(m.timestamp), to: m.to_phone || null, hasLink: LINK_RE.test(String(m.message || '')),
      preview: String(m.message || '').slice(0, 90),
    })),
  }
}

/**
 * One line of truth about the booking message: did the link reach them, and
 * how. "nothing" is the case the trade needs to see, because ServiceM8 only
 * sends a confirmation from the New Booking window with the tick on, and
 * only texts if the automation's SMS method is ticked.
 */
export function confirmationState(messages) {
  const texted = (messages?.sms || []).find((m) => m.hasLink)
  const emailed = (messages?.emails || []).find((m) => m.hasLink)
  const anySms = (messages?.sms || [])[0] || null
  const anyEmail = (messages?.emails || [])[0] || null
  const verdict = texted && emailed ? 'texted and emailed'
    : texted ? 'texted'
    : emailed ? (emailed.opened ? 'emailed, opened' : emailed.bounced ? 'emailed, bounced' : 'emailed, not opened yet')
    : anySms || anyEmail ? 'sent, but without the link'
    : 'nothing sent'
  return {
    verdict,
    linkTexted: Boolean(texted), linkEmailed: Boolean(emailed),
    emailOpened: Boolean(emailed?.opened), emailBounced: Boolean(emailed?.bounced),
    textedAt: texted?.at || null, emailedAt: emailed?.at || null, openedAt: emailed?.firstOpenedAt || null,
    smsCount: (messages?.sms || []).length, emailCount: (messages?.emails || []).length,
  }
}

const dayStamp = (d) => {
  const z = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const g = Object.fromEntries(z.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return `${g.year}-${g.month}-${g.day}`
}

let weekCache = { at: 0, days: 0, value: null }
const WEEK_CACHE_MS = 90_000
const WEEK_MAX = 25

/**
 * The bookings ServiceM8 has for the next few days, each with the job, the
 * contact, whether a TurnUp card follows it yet, and whether ServiceM8 sent
 * the link. Cached briefly per instance: a dashboard open on a phone polls,
 * and ServiceM8 allows 180 calls a minute across everything.
 */
export async function fetchUpcoming({ days = 7, fresh = false } = {}) {
  if (!fresh && weekCache.value && weekCache.days === days && Date.now() - weekCache.at < WEEK_CACHE_MS) return weekCache.value
  const today = dayStamp(new Date())
  const until = new Date(Date.now() + days * 86_400_000)
  const rows = await api(`jobactivity.json?$filter=${encodeURIComponent(`start_date gt '${today} 00:00:00'`)}`)
  const seen = new Set()
  const bookings = (Array.isArray(rows) ? rows : [])
    .filter((a) => Number(a.active ?? 1) === 1 && Number(a.activity_was_scheduled ?? 0) === 1 && !isNull(a.start_date))
    .map((a) => ({ jobUuid: a.job_uuid, start: londonDate(a.start_date), end: isNull(a.end_date) ? null : londonDate(a.end_date) }))
    .filter((b) => b.start && b.start <= until)
    .filter((b) => { const k = `${b.jobUuid}|${b.start.toISOString()}`; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => a.start - b.start)
    .slice(0, WEEK_MAX)
  const out = await Promise.all(bookings.map(async (b) => {
    const [job, contact, messages, tracker] = await Promise.all([
      fetchJob({ uuid: b.jobUuid }).catch(() => null),
      fetchJobContact(b.jobUuid).catch(() => null),
      fetchMessages(b.jobUuid),
      prisma.tradeStatus.findFirst({ where: { externalId: b.jobUuid, isActive: true }, select: { id: true, code: true, stage: true, viewCount: true, termsAgreedAt: true, presenceAskedAt: true, reminderReply: true, linkSentAt: true, toldAt: true } }).catch(() => null),
    ])
    if (!job || Number(job.active ?? 1) !== 1) return null
    const f = fieldsFromJob(job, contact)
    return {
      jobUuid: b.jobUuid, jobNumber: f.jobRef, start: b.start, end: b.end, status: job.status,
      customerName: f.customerName, mobile: contact?.mobile || null, phone: contact?.phone || null,
      jobAddress: f.jobAddress, jobSummary: f.jobSummary,
      confirmation: confirmationState(messages),
      card: tracker ? { code: tracker.code, stage: tracker.stage, opened: tracker.viewCount || 0, termsAgreed: Boolean(tracker.termsAgreedAt), asked: Boolean(tracker.presenceAskedAt), reply: tracker.reminderReply || null, linkSentAt: tracker.linkSentAt || null, toldAt: tracker.toldAt || null } : null,
    }
  }))
  const value = out.filter(Boolean)
  weekCache = { at: Date.now(), days, value }
  return value
}

/**
 * A text through ServiceM8, with the account API key. Checked 12 Oct 2026:
 * the Messaging API accepts the key, charges the account's SMS allowance
 * like any other text, and with regardingJobUUID the message lands in the
 * job's SMS history and diary. Plain ASCII only (src/lib/sm8-words.js).
 */
export async function sendSms({ to, message, jobUuid }) {
  if (!sm8Configured()) throw new Error('sm8_not_configured')
  if (!/^\+[1-9]\d{6,14}$/.test(String(to || ''))) throw new Error('bad_number')
  const body = { to, message: String(message).slice(0, 1600) }
  if (jobUuid && UUID.test(jobUuid)) body.regardingJobUUID = jobUuid
  const r = await api(`${BASE}/platform_service_sms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  await log({ event: 'sms.send', jobUuid: jobUuid || null, outcome: r?.errorCode === 0 ? `sent:${r.messageID || ''}` : `error:${r?.message || 'unknown'}` })
  if (r?.errorCode !== 0) throw new Error(`sm8_sms: ${r?.message || 'failed'}`)
  weekCache.at = 0 // the week's verdicts just changed
  return { sent: true, messageID: r.messageID || null, to }
}

/**
 * An email through ServiceM8, with the account API key. The same Messaging
 * API as sendSms (`POST /platform_service_email`, developer.servicem8.com
 * reference "Send an Email"). Checked 18 Oct 2026: the key is accepted (a bad
 * address comes back 400 "Email To address is not valid", not 401). The From
 * address is ServiceM8's to choose, which is the business's own; with
 * regardingJobUUID the email lands in the job diary. Plain text only.
 */
export async function sendEmail({ to, subject, text, jobUuid }) {
  if (!sm8Configured()) throw new Error('sm8_not_configured')
  const body = { to: String(to || '').trim(), subject: String(subject).slice(0, 200), textBody: String(text).slice(0, 8000) }
  if (jobUuid && UUID.test(jobUuid)) body.regardingJobUUID = jobUuid
  let r
  try {
    r = await api(`${BASE}/platform_service_email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch (e) {
    await log({ event: 'email.send', jobUuid: jobUuid || null, outcome: `error:${String(e.message).slice(0, 80)}` })
    throw e
  }
  await log({ event: 'email.send', jobUuid: jobUuid || null, outcome: r?.errorCode === 0 ? `sent:${r.messageID || ''}` : `error:${r?.message || 'unknown'}` })
  if (r?.errorCode !== 0) throw new Error(`sm8_email: ${r?.message || 'failed'}`)
  return { sent: true, messageID: r.messageID || null }
}

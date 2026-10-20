import { prisma } from '@/lib/prisma'
import { notifyCustomer, pushTrade } from '@/lib/push'
import { TRADE_NAME } from '@/lib/trade'
import { diaryFor } from '@/lib/sm8-oauth'
import { readTap } from '@/lib/tap'

/**
 * Customer not home.
 *
 * What a carrier does when nobody answers, from a one-van firm: a record of
 * when the trade was at the door (their phone's clock and the server's), where
 * the phone said it was, what they tried and when, how long they waited, and a
 * photo of the door. Then the customer is told, plainly and without blame,
 * and offered the next step. No fee is ever TAKEN from here — the next step
 * is offered first. A charge is only ever STATED, and only when the customer
 * agreed the booking terms from their own phone before the day (termsAgreedAt
 * on the job, src/lib/terms.js); then the note says the figure they agreed,
 * not whatever the profile says now. Otherwise the note says nothing is
 * charged, in those words. The card goes to Paused with the note, so the
 * page tells the truth: the trade came, could not get in, and will come back.
 */
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
const first = TRADE_NAME.split(' ')[0]
const KINDS = ['KNOCKED', 'CALLED', 'TEXTED']
const MAX_PHOTO = 450_000 // bytes of JPEG; the dashboard downsizes before sending

export const REPLIES = { HERE: 'is there now', LATER: 'would like it later today', REBOOK: 'would like another day' }

function tried(attempts) {
  const kinds = [...new Set(attempts.map((a) => a.kind))]
  const words = { KNOCKED: 'knocked', CALLED: 'called', TEXTED: 'texted' }
  const w = kinds.map((k) => words[k]).filter(Boolean)
  return w.length ? w.join(w.length === 2 ? ' and ' : ', ').replace(/, ([^,]*)$/, ' and $1') : 'tried the door'
}

export async function recordNoAccess(tracker, body) {
  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date()
  // Queued on the phone with no signal and sent later: the time they left is
  // the time they tapped Leave, not the time the signal came back.
  const tap = readTap(body)
  if (tap.tapId) {
    const seen = await prisma.noAccess.findFirst({ where: { tapId: tap.tapId } }).catch(() => null)
    if (seen) return { row: { id: seen.id, startedAt: seen.startedAt, leftAt: seen.leftAt, attempts: seen.attempts, photoTaken: Boolean(seen.photoAt), fee: seen.fee }, tracker, duplicate: true }
  }
  const leftAt = tap.deviceAt || new Date()
  if (Number.isNaN(startedAt.getTime())) throw new Error('bad_started')
  const attempts = (Array.isArray(body.attempts) ? body.attempts : [])
    .filter((a) => KINDS.includes(a?.kind) && a?.at && !Number.isNaN(new Date(a.at).getTime()))
    .slice(0, 12).map((a) => ({ kind: a.kind, at: new Date(a.at).toISOString() }))
  let photo = null
  if (body.photo) {
    const b64 = String(body.photo).replace(/^data:image\/\w+;base64,/, '')
    photo = Buffer.from(b64, 'base64')
    if (photo.length > MAX_PHOTO) throw new Error('photo_too_big')
  }
  const waited = Math.max(0, Math.round((leftAt - startedAt) / 60_000))
  const fee = agreedFee(tracker)
  const ending = fee
    ? `As agreed when you booked, a visit with no one in and no notice is £${fee}. Say if something happened, and tell me when suits — I will come back.`
    : 'Nothing is charged — tell me when suits and I will come back.'
  const note = `No one was home at ${hhmm(startedAt)}. I ${tried(attempts)} and waited ${waited} minute${waited === 1 ? '' : 's'}. ${ending}`

  const row = await prisma.noAccess.create({ data: {
    tradeStatusId: tracker.id, startedAt, leftAt,
    deviceStartedAt: body.deviceStartedAt ? new Date(body.deviceStartedAt) : null,
    lat: num(body.lat), lng: num(body.lng), accuracy: num(body.accuracy),
    attempts, photo, photoAt: photo ? new Date() : null, fee, tapId: tap.tapId,
  } })
  const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    stage: 'PAUSED', stageNote: note, askAnsweredAt: tracker.askedAt && !tracker.askAnsweredAt ? new Date() : undefined,
    events: { create: { stage: 'PAUSED', note, deviceAt: tap.deviceAt, offline: tap.offline } },
  } })
  notifyCustomer(updated, { title: 'Sorry we missed you', body: `${TRADE_NAME} was at the door and could not get in. Open the page to say when suits.` }).catch(() => {})
  diaryFor(updated, `No one home. At the door ${hhmm(startedAt)}, ${tried(attempts)}, waited ${waited} min${photo ? ', door photo taken' : ''}${fee ? `, GBP ${fee} as agreed` : ', nothing charged'}. Customer told and asked when suits.`).catch(() => {})
  return { row: { id: row.id, startedAt, leftAt, attempts, photoTaken: Boolean(photo), fee }, tracker: updated }
}

export async function replyNoAccess(tracker, noAccessId, choice) {
  if (!REPLIES[choice]) throw new Error('bad_choice')
  const now = new Date()
  await prisma.noAccess.update({ where: { id: noAccessId }, data: { reply: choice, replyAt: now } })
  const who = tracker.customerName ? tracker.customerName.split(' ')[0] : 'The customer'
  await prisma.tradeStatus.update({ where: { id: tracker.id }, data: { events: { create: { stage: tracker.stage, note: `After no access: ${who} ${REPLIES[choice]}.` } } } })
  const next = choice === 'HERE' ? 'Go back if you still can, or say how long.' : 'Set new hours on the card.'
  diaryFor(tracker, `After no access: ${who} ${REPLIES[choice]}.`).catch(() => {})
  const r = await pushTrade({ ...TRADE_LINES.afterNoAccess(REPLIES[choice], next), tag: `nudge-${tracker.code}` })
  return { ok: true, sent: r.sent }
}

/**
 * The short-notice charge the customer agreed to before the day, or null.
 * Read from the snapshot taken when they tapped, never from the live profile:
 * a fee raised since the booking was not what they agreed to.
 */
export function agreedFee(tracker) {
  if (!tracker?.termsAgreedAt) return null
  const n = Number(tracker.termsAgreed?.fee)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
export { first as tradeFirstName }

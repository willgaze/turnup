import { prisma } from '@/lib/prisma'
import { pushTrade, notifyCustomer } from '@/lib/push'
import { TRADE_NAME } from '@/lib/trade'
import { dayBeforeAskDue } from '@/lib/day-before'
import { diaryFor } from '@/lib/sm8-oauth'
import { dayWord } from '@/lib/nudge-words'
import { askNudgeDue, inQuietHours, askExpired, MAX_ASK_NUDGES, REPEAT_MS } from '@/lib/ask-reminder'
export { dayWord }
export { askNudgeDue, inQuietHours, askExpired, MAX_ASK_NUDGES, QUIET_FROM, QUIET_UNTIL } from '@/lib/ask-reminder'

/**
 * What happens when the window arrives and the card has not moved.
 *
 * Until now: nothing. The customer stared at Booked in and the trade's phone
 * stayed quiet. Two things fix that, and both are here:
 *
 *   1. The customer can ASK. "Are you still coming?" sets askedAt and buzzes
 *      every phone the trade registered. The trade answers from the card —
 *      On my way, or "about 30 minutes late" — and the customer's page shows
 *      the answer with the time it was given.
 *   2. The trade is NUDGED without being asked. When the window starts and
 *      the card still says Booked in, one push. When the window ends and the
 *      card is still not On site, a second. An unanswered question is
 *      repeated every ten minutes.
 *
 *   3. The afternoon before, the CUSTOMER is asked (askPresenceIfDue, from
 *      src/lib/day-before.js: 16:00 in the trade's zone, once). Their page
 *      grows a card — tomorrow, these hours, still fine? — with three
 *      replies: still fine, someone else will be in, need to move it
 *      (replyReminder). The first two answer "will someone be in?" as well,
 *      so one tap does both jobs; each reply buzzes the trade. Two-way
 *      reminders are the best-evidenced cut in no-shows there is, and the
 *      reply is what makes it two-way.
 *
 * None of this invents a time. It only notices that a time the trade gave
 * has arrived, and makes sure a human says something.
 *
 * nudgeIfDue runs on the customer's poll (every 30 s while they are looking,
 * which is exactly when it matters), on every ServiceM8 event, and from the
 * cron route. It is idempotent: each level fires once, paced by nudgedAt.
 */
// How often an unanswered ask may buzz, when it must not, and when it stops:
// src/lib/ask-reminder.js, which is pure so scripts/check-nudge-ask.mjs can
// run the whole decision without a database.

// The email fallback when no push landed (src/lib/customer-email.js). Imported
// at call time: customer-email needs servicem8, and servicem8 imports this file.
async function emailCustomer(tracker, kind, pushed) {
  try { return await (await import('@/lib/customer-email')).emailIfUnreached(tracker, kind, pushed) } catch { return { emailed: false } }
}
const first = (t) => t.customerName ? t.customerName.split(' ')[0] : 'The customer'
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })

export function nudgeDue(t, now = new Date()) {
  if (!t.isActive || t.stage === 'DONE') return null

  // An unanswered question outranks everything — but it is not endless, it is
  // not nocturnal, and it does not outlive the day it is about.
  const open = askNudgeDue(t, now)
  if (open) return open
  // Spent, asleep or stale: fall through rather than stop. The window nudges
  // below fire once each, and the missed notice is the CUSTOMER being told
  // their window has passed — silencing a reminder must never silence that.

  // Only real hours make a window. A job booked for a day with no hours
  // carries scheduledFor at midnight, and this used to fall back to it: the
  // trade was buzzed at one in the morning, told the window had ended at two,
  // and at ten past two the CUSTOMER was told their window was missed. A day
  // is not a time anybody gave (v1.60.0). ServiceM8 bookings always set
  // windowStart, so they are untouched.
  const start = t.windowStart
  if (!start) return null
  const end = t.windowEnd || new Date(new Date(start).getTime() + 60 * 60_000)
  // The window was missed. Ten minutes after it ended (a judgement: long
  // enough to answer the nudge, short enough that the customer is not left
  // staring), with nobody On site and no late estimate still running, the
  // CUSTOMER is told, plainly, and given three choices. Fires once.
  //
  // Checked BEFORE the start and end nudges (v1.65.0). Those two only count
  // as sent when a trade phone took them, so with no phone registered the
  // start nudge stayed due for ever, shadowed this one, and the customer was
  // never told. Once the window is missed, "it has started" is stale anyway.
  if (!t.missedAt && !['ON_SITE', 'PAUSED', 'DONE'].includes(t.stage) && now >= new Date(end).getTime() + MISSED_GRACE_MS) {
    const promised = t.lateMinutes && t.lateAt ? new Date(t.lateAt).getTime() + t.lateMinutes * 60_000 + MISSED_GRACE_MS : 0
    if (now >= promised) return { kind: 'missed', title: `${first(t)} has been told the window was missed`, body: `It ended at ${hhmm(end)}. They can choose to wait, have it later today, or rebook. Set off, say how late, or give them a new window.` }
  }
  // Both of these buzz the trade and nobody else, so both sleep. They fire
  // once each (nudgeLevel), so waiting until 07:00 delays them; it never
  // loses them. The missed notice above is deliberately NOT gated: that one
  // is the customer being told, and a window that genuinely ended at one in
  // the morning is a thing they are owed.
  if (inQuietHours(now)) return null
  if (t.nudgeLevel < 1 && now >= new Date(start) && t.stage === 'BOOKED') {
    return { kind: 'start', level: 1, title: `${first(t)}'s window has started`, body: `From ${hhmm(start)}, and the card still says Booked in. Set off, or say you are running late.` }
  }
  if (t.nudgeLevel < 2 && now >= new Date(end) && !['ON_SITE', 'PAUSED', 'DONE'].includes(t.stage)) {
    return { kind: 'end', level: 2, title: `${first(t)}'s window has ended`, body: `It ran to ${hhmm(end)} and the card is not On site. Tell them where you are.` }
  }
  return null
}

export const REMINDER_REPLIES = { OK: 'is still fine for it', SOMEONE_ELSE: 'says someone else will let you in', MOVE: 'would like to move it' }


export const MISSED_GRACE_MS = 10 * 60_000
export const MISSED_CHOICES = { WAIT: 'will wait', LATER: 'would like it later today', REBOOK: 'would like another day' }

/**
 * The afternoon before the job: ask the customer whether anyone will be in.
 *
 * Decided in src/lib/day-before.js; sent here. The row is claimed first with
 * an atomic update (presenceAskedAt null -> now), so the cron sweep and the
 * customer's poll cannot both send it. The customer gets a push if they
 * switched one on; their page asks regardless. If no phone of theirs can be
 * reached, the TRADE is nudged instead to text the link, because an ask that
 * reaches nobody is not an ask. The timeline records it either way.
 */
export async function askPresenceIfDue(tracker, now = new Date()) {
  try {
    if (!dayBeforeAskDue(tracker, now)) return null
    const claimed = await prisma.tradeStatus.updateMany({
      where: { id: tracker.id, presenceAskedAt: null, stage: 'BOOKED', isActive: true },
      data: { presenceAskedAt: now },
    })
    if (claimed.count !== 1) return null
    await prisma.tradeStatusEvent.create({ data: { tradeStatusId: tracker.id, stage: 'BOOKED', note: 'Asked: will someone be in tomorrow?' } })
    diaryFor(tracker, 'Day-before ask sent: still fine, and will someone be in?').catch(() => {})
    const c = await notifyCustomer(tracker, { title: 'Booked for tomorrow', body: 'Still fine, and will someone be in? Open the page: one tap answers.' })
    let t = { sent: 0 }
    let e = { emailed: false }
    if (!c.sent) {
      e = await emailCustomer(tracker, 'DAY_BEFORE', c)
      t = await pushTrade({
        title: `${first(tracker)} is booked tomorrow`,
        body: e.emailed
          ? 'No notifications on their phone, so the ask went by email. Text them the link if you want to be sure.'
          : 'They cannot be reached by notification. Text them the link so they can say whether anyone will be in.',
        tag: `nudge-${tracker.code}`,
      })
    }
    return { kind: 'day-before', sent: c.sent, emailed: e.emailed, tradeSent: t.sent }
  } catch (error) {
    console.error('day-before ask failed:', error?.message)
    return null
  }
}

/** Send what is due for one tracker. Never throws. */
export async function nudgeIfDue(tracker) {
  try {
    const asked = await askPresenceIfDue(tracker)
    if (asked) return asked
    const due = nudgeDue(tracker)
    if (!due) return null
    if (due.kind === 'missed') return tellMissed(tracker, due)
    const r = await pushTrade({ title: due.title, body: due.body, tag: `nudge-${tracker.code}` })
    // Only count a nudge that had somewhere to go: with no device registered,
    // the first phone to register should still get it.
    if (r.devices === 0) return { ...due, sent: 0 }
    const data = { nudgedAt: new Date() }
    if (due.level) data.nudgeLevel = due.level
    // Count this buzz against the ask's allowance. `spend` is the morning
    // summary taking the rest of it, so nothing follows.
    if (due.ask) data.askNudges = due.spend ?? (tracker.askNudges || 0) + 1
    await prisma.tradeStatus.update({ where: { id: tracker.id }, data })
    return { ...due, sent: r.sent }
  } catch (error) {
    console.error('nudge failed:', error?.message)
    return null
  }
}

/** Every live job that could be due. For the cron route. */
export async function nudgeAll() {
  const rows = await prisma.tradeStatus.findMany({
    where: { isActive: true, stage: { not: 'DONE' }, OR: [{ windowStart: { not: null } }, { scheduledFor: { not: null } }] },
  })
  const out = []
  for (const t of rows) { const r = await nudgeIfDue(t); if (r) out.push({ code: t.code, kind: r.kind, sent: r.sent }) }
  return { checked: rows.length, nudged: out }
}

/**
 * The customer asked. Once per ten minutes, then it buzzes the trade.
 *
 * This push is the FIRST of the three the ask is allowed, so askNudges starts
 * at 1 rather than 0 — counting it from zero here is how three reminders
 * quietly become four.
 */
export async function ask(tracker) {
  const now = new Date()
  if (tracker.askedAt && !tracker.askAnsweredAt && now - new Date(tracker.askedAt) < REPEAT_MS) return { ok: true, repeated: true }
  await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    askedAt: now, askAnsweredAt: null, nudgedAt: now, askNudges: 1,
    events: { create: { stage: tracker.stage, note: 'Asked: are you still coming?' } },
  } })
  diaryFor(tracker, 'Customer asked: are you still coming?').catch(() => {})
  // The lock screen carries the trade's own stage and nothing of the
  // customer's: their first name is not needed to know which card to open,
  // and whoever picks the phone up off the table is not the person who holds
  // the link. See the lock-screen rule in CLAUDE.md.
  const r = await pushTrade({ title: 'A customer is asking', body: `"Are you still coming?" Reply from the card: On my way, or how late.`, tag: `nudge-${tracker.code}` })
  return { ok: true, devices: r.devices, sent: r.sent }
}

/**
 * Stop reminders, without answering the question and without moving the card.
 *
 * The trade has seen it and is dealing with it another way — a phone call,
 * usually. Setting askAnsweredAt is what every other answer does, so this
 * reuses exactly that rather than inventing a second kind of silence. The
 * stage is untouched: a tap that quiets a buzz must never tell a customer
 * their plumber has set off.
 */
export async function stopAskReminders(tracker) {
  if (!tracker.askedAt || tracker.askAnsweredAt) return tracker
  const now = new Date()
  const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    askAnsweredAt: now, askNudges: MAX_ASK_NUDGES,
    events: { create: { stage: tracker.stage, note: 'Reminders stopped by the trade; the question is still open.' } },
  } })
  diaryFor(tracker, 'Trade stopped the reminders for "are you still coming?".').catch(() => {})
  return updated
}

/**
 * The trade's answer in minutes: "about 30 minutes late". Written to the
 * card as a note with the time, and pushed to the customer. Null clears it.
 */
export async function runningLate(tracker, minutes) {
  const now = new Date()
  const m = minutes ? Math.max(5, Math.min(240, Math.round(minutes))) : null
  const note = m ? `Running about ${m} minutes late — sorry. Said at ${hhmm(now)}.` : null
  const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    lateMinutes: m, lateAt: m ? now : null, askAnsweredAt: now,
    ...(note ? { stageNote: note, events: { create: { stage: tracker.stage, note } } } : {}),
  } })
  if (m) notifyCustomer(updated, { title: 'Running late', body: `${TRADE_NAME} says about ${m} minutes late, and is sorry.` }).catch(() => {})
  if (m) diaryFor(updated, `Running about ${m} minutes late, customer told.`).catch(() => {})
  return updated
}

/** Any stage change answers an open question. */
export const answeredByStage = (tracker) => (tracker.askedAt && !tracker.askAnsweredAt ? { askAnsweredAt: new Date() } : {})

/**
 * The window was missed: tell the customer, once, whatever devices exist.
 * Their page shows it with the three choices the moment it next polls; the
 * push is the enhancement. The trade is told that the customer was told.
 */
async function tellMissed(tracker, due) {
  const now = new Date()
  await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    missedAt: now, nudgedAt: now, nudgeLevel: Math.max(tracker.nudgeLevel || 0, 2),
    events: { create: { stage: tracker.stage, note: 'The window was missed — the customer has been told and asked what they would like.' } },
  } })
  // Awaited: nobody is waiting on a sweep, and on a serverless function the
  // email after a push that did not land must finish before the sweep does.
  const c = await notifyCustomer(tracker, { title: 'Sorry — the window has passed', body: `${TRADE_NAME} has not arrived in the window. Open the page to choose: wait, later today, or another day.` }).catch(() => ({ sent: 0 }))
  await emailCustomer(tracker, 'MISSED', c)
  diaryFor(tracker, `Window missed (ended ${hhmm(tracker.windowEnd || tracker.windowStart || tracker.scheduledFor)}). Customer told and offered wait / later today / another day.`).catch(() => {})
  const r = await pushTrade({ title: due.title, body: due.body, tag: `nudge-${tracker.code}` })
  return { ...due, sent: r.sent }
}

/** The customer's choice after a missed window. A request, pushed to the trade. */
export async function chooseAfterMissed(tracker, choice) {
  if (!MISSED_CHOICES[choice]) throw new Error('bad_choice')
  const now = new Date()
  const line = `${first(tracker)} ${MISSED_CHOICES[choice]}`
  await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    missedChoice: choice, missedChoiceAt: now,
    events: { create: { stage: tracker.stage, note: `After the missed window: ${line}.` } },
  } })
  diaryFor(tracker, `After the missed window: ${line}.`).catch(() => {})
  const next = choice === 'WAIT' ? 'Set off, or say how late.' : 'Propose a new window on the card.'
  const r = await pushTrade({ title: line, body: next, tag: `nudge-${tracker.code}` })
  return { ok: true, sent: r.sent }
}

/** The customer's reply to the day-before ask. A message to the trade, never a change to the booking. */
export async function replyReminder(tracker, choice) {
  if (!REMINDER_REPLIES[choice]) throw new Error('bad_choice')
  const now = new Date()
  const line = `${first(tracker)} ${REMINDER_REPLIES[choice]}`
  await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    reminderReply: choice, reminderReplyAt: now,
    // "Still fine" and "someone else will be in" are presence answers too,
    // so the card and the door note agree without the customer answering
    // twice. "Move it" says nothing about who will be in, so it leaves it.
    ...(choice === 'OK' ? { presence: 'IN', presenceAt: now } : choice === 'SOMEONE_ELSE' ? { presence: 'SOMEONE_ELSE', presenceAt: now } : {}),
    events: { create: { stage: tracker.stage, note: `Reply to the reminder: ${line}.` } },
  } })
  diaryFor(tracker, `Reply to the day-before ask: ${line}.`).catch(() => {})
  const next = choice === 'MOVE' ? 'Offer new hours on the card; they can counter from theirs.' : choice === 'SOMEONE_ELSE' ? 'Read the door notes before you knock.' : 'Nothing to do.'
  const r = await pushTrade({ title: line, body: next, tag: `nudge-${tracker.code}` })
  return { ok: true, sent: r.sent, reminderReply: choice, reminderReplyAt: now.toISOString() }
}

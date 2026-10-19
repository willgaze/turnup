/**
 * How often, and how late, the trade is reminded of an unanswered question.
 *
 * "Are you still coming?" sets askedAt and buzzes every phone the trade
 * registered. Until now nothing stopped it: the reminder repeated every ten
 * minutes for as long as the ask stayed open. An ask made at 15:34 on
 * 18 Oct 2026 buzzed the owner's phone through the night and was still going
 * in the morning, which is the opposite of what a reminder is for — a trade
 * who has been woken six times has learned to ignore the seventh.
 *
 * Three locks, each a different failure:
 *
 *   MAX_ASK_NUDGES  a reminder that has not worked three times will not work
 *                   the fortieth time. The count includes the push ask()
 *                   sends itself, so it is three buzzes in total, not four.
 *   quiet hours     nothing wakes the trade between 21:00 and 07:00 in their
 *                   own zone. If an ask is left open across a night, ONE
 *                   summary goes at 07:00 and then it stops for good.
 *   expiry          an ask belongs to the day of the job it is about. Past
 *                   the end of that day it never pushes again, whatever the
 *                   count says: a stale question at breakfast is not a
 *                   reminder, it is noise about yesterday.
 *
 * Pure and relative-imported so scripts/check-nudge-ask.mjs can run it
 * without a database or a bundler. nudge.js does the sending.
 */
import { isoDay, zoned, atLocalTime } from './when.js'

export const MAX_ASK_NUDGES = 3
export const QUIET_FROM = 21
export const QUIET_UNTIL = 7
export const REPEAT_MS = 10 * 60_000

/** 21:00 to 07:00 in the trade's own zone, never UTC. */
export function inQuietHours(now = new Date()) {
  const t = zoned(now)
  if (!t) return false
  return t.hour >= QUIET_FROM || t.hour < QUIET_UNTIL
}

/**
 * The ask belongs to the job's day. `windowStart` first, because only real
 * hours make a window (v1.60.0); `scheduledFor` is the day when there are no
 * hours, and is read as a DAY here, never as a time. With neither, the ask
 * belongs to the day it was made.
 */
export function askExpired(t, now = new Date()) {
  if (!t.askedAt) return false
  const on = isoDay(t.windowStart || t.scheduledFor || t.askedAt)
  const today = isoDay(now)
  return Boolean(on && today && today > on)
}

/**
 * The one summary after a silent night: a sweep in the 07:00 hour whose last
 * buzz was before 07:00 today. It ignores MAX_ASK_NUDGES because it is the
 * wrap-up rather than another reminder — and sending it spends the whole
 * allowance, so exactly one goes out.
 */
export function morningSummaryDue(t, now = new Date()) {
  const at = zoned(now)
  if (!at || at.hour !== QUIET_UNTIL) return false
  const seven = atLocalTime(now, `${String(QUIET_UNTIL).padStart(2, '0')}:00`)
  if (!seven) return false
  const last = t.nudgedAt ? new Date(t.nudgedAt) : new Date(t.askedAt)
  return last < seven
}

/**
 * What, if anything, the trade should be told about an open ask.
 *
 * Returns null when the ask is answered, expired, spent or the trade is
 * asleep — and null means "fall through", never "say nothing at all". The
 * window nudges and the missed notice sit below this in nudgeDue, and the
 * missed notice is the CUSTOMER being told their window has passed:
 * silencing a reminder must never silence that.
 *
 * The lock screen carries the stage and nothing of the customer's. Their
 * first name is not needed to know which card to open, and whoever picks the
 * phone up off the kitchen table is not the person who holds the link.
 */
export function askNudgeDue(t, now = new Date()) {
  if (!t.askedAt || t.askAnsweredAt) return null
  if (askExpired(t, now)) return null
  if (inQuietHours(now)) return null

  const asked = new Date(t.askedAt)
  const body = (lead) => `${lead} Open the card to reply, or to stop the reminders.`

  if (morningSummaryDue(t, now)) {
    return {
      kind: 'ask', ask: true, spend: MAX_ASK_NUDGES,
      title: 'A customer is asking',
      body: body(`"Are you still coming?" has been waiting since yesterday and is still unanswered.`),
    }
  }

  if ((t.askNudges || 0) >= MAX_ASK_NUDGES) return null
  const paced = !t.nudgedAt || new Date(t.nudgedAt) < asked || now - new Date(t.nudgedAt) >= REPEAT_MS
  if (!paced) return null

  return {
    kind: 'ask', ask: true,
    title: 'A customer is asking',
    body: body(`"Are you still coming?" — asked earlier, no answer yet.`),
  }
}

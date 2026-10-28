import { zoned } from './when.js'

/**
 * The pilot, once a week, on the trade's phone.
 *
 * The four numbers live on a panel the trade has to go and open. A pilot
 * decided on 11 Oct 2026 as "thirty days, four numbers" needs the numbers to
 * arrive, not wait: so every Monday at 08:00 in the trade's zone, one push
 * with last week's four beside the week before, and a tap opens the panel.
 *
 * Pure. The sending is in src/lib/pilot-weekly.js; this file decides when and
 * says what, so scripts/check-pilot-summary.mjs can prove both without a
 * database or a clock.
 *
 * It is a notification to the TRADE's phone, so the trade-push rule applies:
 * numbers and fixed words, never a customer's name, never a note. The body
 * here is built from counts alone and handed to TRADE_LINES.pilotWeek().
 */

export const SUMMARY_HOUR = 8 // Monday, 08:00, trade's zone
const DAY = 24 * 60 * 60 * 1000

/** Midnight at the start of the Monday of `now`'s week, in the trade's zone, as an instant. */
export function weekStart(now = new Date()) {
  const t = zoned(now)
  if (!t) return null
  const back = (t.weekday + 6) % 7 // Monday 0 ... Sunday 6
  // Walk back to Monday's calendar date, then find the instant that is
  // 00:00 local on that date (zone offset read from the day itself).
  const monday = new Date(Date.UTC(t.year, t.month - 1, t.day) - back * DAY)
  const m = zoned(monday)
  const guess = Date.UTC(m.year, m.month - 1, m.day)
  const z = zoned(new Date(guess))
  // guess is 00:00 UTC on that date; local midnight is earlier by the offset
  const offsetMin = (z.hour * 60 + z.minute) - 0
  return new Date(guess - offsetMin * 60_000)
}

/**
 * Due when it is Monday 08:00 or later in the trade's zone and nothing has
 * been sent since that Monday began. Not Sunday night, not twice.
 */
export function summaryDue({ pilotSummaryAt } = {}, now = new Date()) {
  const t = zoned(now)
  if (!t) return false
  if (t.weekday !== 1 || t.hour < SUMMARY_HOUR) return false
  const start = weekStart(now)
  return !pilotSummaryAt || new Date(pilotSummaryAt) < start
}

const pctOf = (x) => (x && x.pct !== null && x.pct !== undefined ? ` (${x.pct}%)` : '')
const n = (x) => (x && Number.isFinite(x.n) ? x.n : 0)
const arrow = (a, b) => (b === null || b === undefined ? '' : a > b ? ', up' : a < b ? ', down' : ', level')

/**
 * One line per number, last week against the week before. Numbers only.
 *
 *   Jobs 5 (was 4). Links opened by a customer 4 (80%, was 2). Will someone
 *   be in? answered 2 of 3 asked (was 1 of 2). Wasted trips 0 (was 1). Calls
 *   asking when you are coming 1 (was 3). Since 19 Oct: 23 jobs, 61% opened.
 */
export function summaryBody(week, prior = null, { startLabel = null, sinceStart = null } = {}) {
  const p = prior || {}
  const parts = [
    `Jobs ${n({ n: week.jobs })}${prior ? ` (was ${p.jobs ?? 0})` : ''}.`,
    `Links opened by a customer ${n(week.linksOpened)}${pctOf(week.linksOpened)}${prior ? ` (was ${n(p.linksOpened)}${arrow(n(week.linksOpened), n(p.linksOpened))})` : ''}.`,
    `Will someone be in? answered ${n(week.inAnswered)} of ${week.inAnswered?.of ?? 0} asked${prior ? ` (was ${n(p.inAnswered)} of ${p.inAnswered?.of ?? 0})` : ''}.`,
    `Wasted trips ${n(week.wastedTrips)}${prior ? ` (was ${n(p.wastedTrips)})` : ''}.`,
    `Calls asking when you are coming ${n(week.calls)}${prior ? ` (was ${n(p.calls)})` : ''}.`,
  ]
  if (sinceStart && startLabel) parts.push(`Since ${startLabel}: ${sinceStart.jobs} job${sinceStart.jobs === 1 ? '' : 's'}${sinceStart.linksOpened?.pct !== null && sinceStart.linksOpened?.pct !== undefined ? `, ${sinceStart.linksOpened.pct}% opened` : ''}.`)
  return parts.join(' ')
}

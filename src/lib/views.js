/**
 * Views: which jobs to show, in what order, and why.
 *
 * Fourteen full job cards on one phone screen is a wall. ServiceM8 solved this
 * years ago with views ("Action required", "Today", "Quotes", ...): the same
 * jobs, cut different ways, each with a count, and the list only ever shows
 * one cut at a time. This is that, for TurnUp.
 *
 * Two parts:
 *
 *   1. A tiny engine (buildViews) that takes rows and a list of view
 *      definitions and returns each view's rows, sorted, with a count. Generic,
 *      so the household card list and the ServiceM8 week can use it too.
 *
 *   2. The trade's job views (JOB_VIEWS) and the reasons a job needs the trade
 *      (needsReasons). Every reason is a FACT already on the row: something the
 *      customer said, a window that started, a link nobody opened. Nothing here
 *      invents a time or guesses a delay.
 *
 * Pure: no React, no database, no '@' imports, so `node scripts/check-views.mjs`
 * runs it without a build. Dates are compared as London days through isoDay(),
 * never by subtracting milliseconds (23:30 and 00:30 are a day apart).
 */
import { isoDay, timeOnly, dayOnly } from './when.js'

const ACTIVE_STAGES = ['ON_MY_WAY', 'ON_SITE', 'PAUSED']
const HOUR = 3600_000
const DAY = 24 * HOUR

/** How far back Done looks, and how long a customer's note stays a "needs you". */
export const DONE_DAYS = 14
export const NOTE_DAYS = 7
/** How far ahead "Coming up" looks. Anything later sits in All. */
export const AHEAD_DAYS = 14

const ms = (v) => (v ? new Date(v).getTime() : NaN)
const day = (v) => (v ? isoDay(v) : '')
const when = (v) => (v ? timeOnly(v) : '')

/**
 * Why a job needs the trade right now, most urgent first. Each reason:
 *   key    — stable id, for tests and for the colour
 *   rank   — lower is more urgent; the row sorts by its best reason
 *   alert  — true only for "someone is waiting on you now" (red is for real
 *            problems; everything else is amber)
 *   words  — one short line for the row, UK English, no jargon
 */
export function needsReasons(t, now = new Date()) {
  if (!t || t.isActive === false) return []
  const out = []
  const today = day(now)
  const jobDay = day(t.scheduledFor)
  const nowMs = new Date(now).getTime()

  // 1. The customer asked "are you still coming?" and nobody has answered.
  if (t.askedAt && !t.askAnsweredAt && ['BOOKED', 'ON_MY_WAY'].includes(t.stage)) {
    out.push({ key: 'ASKED', rank: 1, alert: true, words: `Asked “are you still coming?” at ${when(t.askedAt)}` })
  }

  // 2. The window ended with nobody there, and the customer was told.
  if (t.missedAt && !['ON_SITE', 'PAUSED', 'DONE'].includes(t.stage)) {
    const chose = { WAIT: 'they will wait', LATER: 'they want later today', REBOOK: 'they want another day' }[t.missedChoice]
    out.push({ key: 'MISSED', rank: 2, alert: true, words: chose ? `Window missed — ${chose}` : 'Window missed — they have been told' })
  }

  // 3. The day-before reply was "can we move it?".
  if (t.stage === 'BOOKED' && t.reminderReply === 'MOVE') {
    out.push({ key: 'MOVE', rank: 3, alert: false, words: 'Wants to move it — offer new hours' })
  }

  // 4. Their hours have started and the card still says Booked in.
  if (t.stage === 'BOOKED' && t.windowStart && ms(t.windowStart) <= nowMs && jobDay === today) {
    out.push({ key: 'WINDOW_STARTED', rank: 4, alert: false, words: `Their hours started ${when(t.windowStart)} — still Booked in` })
  }

  // 5. The customer is running late (their words, their minutes).
  if (t.customerLateMinutes && ['BOOKED', 'ON_MY_WAY'].includes(t.stage) && t.customerLateAt && nowMs - ms(t.customerLateAt) < 6 * HOUR) {
    out.push({ key: 'CUSTOMER_LATE', rank: 5, alert: false, words: `They said they are running about ${t.customerLateMinutes} min late` })
  }

  // 6. Booked for today or tomorrow and the customer cannot see it yet.
  const soon = jobDay && (jobDay === today || jobDay === day(nowMs + DAY))
  if (t.stage === 'BOOKED' && soon && !t.viewCount) {
    out.push(t.linkSentAt
      ? { key: 'UNOPENED', rank: 7, alert: false, words: 'Link sent, not opened yet' }
      : { key: 'NOT_SENT', rank: 6, alert: false, words: 'Link not sent yet' })
  }

  // 7. After the job, a note to the trade.
  if (t.stage === 'DONE' && t.feedbackText && t.feedbackAt && nowMs - ms(t.feedbackAt) < NOTE_DAYS * DAY) {
    out.push({ key: 'NOTE', rank: 8, alert: false, words: 'Left you a note after the job' })
  }

  return out.sort((a, b) => a.rank - b.rank)
}

/** A job whose day has gone and that was never marked done. */
export function isLooseEnd(t, now = new Date()) {
  if (!t || t.isActive === false || t.stage === 'DONE' || !t.scheduledFor) return false
  if (ACTIVE_STAGES.includes(t.stage)) return false // in hand now, not loose
  return day(t.scheduledFor) < day(now)
}

const byDayThenWindow = (a, b) =>
  (ms(a.scheduledFor) || Infinity) - (ms(b.scheduledFor) || Infinity) ||
  (ms(a.windowStart) || Infinity) - (ms(b.windowStart) || Infinity) ||
  (a.position ?? 99) - (b.position ?? 99)
const newestFirst = (a, b) => ms(b.updatedAt) - ms(a.updatedAt)

/**
 * The trade's job views, in tab order. `test(t, ctx)` decides membership;
 * `sort` orders the view. A job can sit in more than one view (a job that
 * needs you today is in Needs you AND Today): views are lenses, not folders.
 */
export const JOB_VIEWS = [
  {
    key: 'needs', label: 'Needs you', empty: 'Nothing needs you.',
    test: (t, c) => c.reasons(t).length > 0,
    sort: (a, b, c) => c.reasons(a)[0].rank - c.reasons(b)[0].rank || byDayThenWindow(a, b),
  },
  {
    key: 'now', label: 'Now', empty: 'Nothing under way.',
    test: (t) => t.isActive !== false && ACTIVE_STAGES.includes(t.stage),
    sort: newestFirst,
  },
  {
    key: 'today', label: 'Today', empty: 'Nothing else booked today.',
    test: (t, c) => t.isActive !== false && t.stage === 'BOOKED' && day(t.scheduledFor) === c.today,
    sort: byDayThenWindow,
  },
  {
    key: 'next', label: 'Coming up', empty: 'Nothing booked in the next two weeks.',
    test: (t, c) => t.isActive !== false && t.stage === 'BOOKED' &&
      (!t.scheduledFor || (day(t.scheduledFor) > c.today && ms(t.scheduledFor) - c.nowMs < AHEAD_DAYS * DAY)),
    sort: byDayThenWindow,
  },
  {
    key: 'loose', label: 'Loose ends', empty: 'No old jobs left open.',
    test: (t, c) => isLooseEnd(t, c.now),
    sort: (a, b) => ms(b.scheduledFor) - ms(a.scheduledFor),
  },
  {
    key: 'done', label: 'Done', empty: 'Nothing finished in the last two weeks.',
    test: (t, c) => t.isActive !== false && t.stage === 'DONE' && c.nowMs - ms(t.updatedAt) < DONE_DAYS * DAY,
    sort: newestFirst,
  },
  {
    key: 'all', label: 'All', empty: 'No jobs yet.',
    test: () => true,
    sort: null, // the server's run order stands
  },
]

/**
 * The engine. rows + view definitions → { views: [{key,label,empty,rows,count}], byKey }.
 * Reasons are worked out once per row and shared by every view.
 */
export function buildViews(rows, defs = JOB_VIEWS, now = new Date()) {
  const cache = new Map()
  const ctx = {
    now,
    nowMs: new Date(now).getTime(),
    today: day(now),
    reasons: (t) => { if (!cache.has(t)) cache.set(t, needsReasons(t, now)); return cache.get(t) },
  }
  const views = defs.map((d) => {
    const hit = (rows || []).filter((t) => d.test(t, ctx))
    const sorted = d.sort ? [...hit].sort((a, b) => d.sort(a, b, ctx)) : hit
    return { key: d.key, label: d.label, empty: d.empty, rows: sorted, count: sorted.length }
  })
  return { views, byKey: Object.fromEntries(views.map((v) => [v.key, v])), reasons: ctx.reasons }
}

/**
 * Which view to open when nobody has picked one: the first that has
 * something in it, in the order a trade would want to be told.
 */
export const DEFAULT_ORDER = ['needs', 'now', 'today', 'next', 'all']
export function defaultView(built) {
  for (const k of DEFAULT_ORDER) if (built.byKey[k]?.count) return k
  return 'all'
}

/** The one-line "when" for a compact row: "today 14:00", "Tue 3 Nov", "No day yet". */
export function rowWhen(t, now = new Date()) {
  if (!t.scheduledFor) return 'No day yet'
  const d = day(t.scheduledFor)
  const label = d === day(now) ? 'Today' : d === day(new Date(now).getTime() + DAY) ? 'Tomorrow' : dayOnly(t.scheduledFor)
  return t.windowStart ? `${label} ${when(t.windowStart)}${t.windowEnd ? `–${when(t.windowEnd)}` : ''}` : label
}

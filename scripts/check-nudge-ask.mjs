/**
 * The "Are you still coming?" reminder, checked without a database.
 *
 *   node scripts/check-nudge-ask.mjs
 *
 * The bug this exists for: an unanswered ask repeated every ten minutes for
 * ever. An ask made at 15:34 on 18 Oct 2026 buzzed the owner's phone through
 * the night and was still going at breakfast. Three locks, one block each,
 * plus the lock-screen rule.
 *
 * `askNudgeDue` returning null means FALL THROUGH, not silence: nudgeDue goes
 * on to the window nudges and the missed notice, and the missed notice is the
 * customer being told. Several checks below assert that null deliberately.
 *
 * Every time here is written in UTC and read in Europe/London, which in
 * October is BST (UTC+1) until the 25th. So 20:00Z is 21:00 local — the first
 * quiet minute. The times are deliberately awkward: an off-by-an-hour is the
 * mistake this product has actually shipped, twice.
 */
import { askNudgeDue, inQuietHours, askExpired, morningSummaryDue, MAX_ASK_NUDGES, QUIET_FROM, QUIET_UNTIL } from '../src/lib/ask-reminder.js'

const T = (iso) => new Date(iso)

/** A job booked for the afternoon of 18 Oct, with an ask open since 15:34 local. */
const job = (over = {}) => ({
  stage: 'BOOKED',
  customerName: 'Sarah Whitfield',
  windowStart: T('2026-10-18T13:00:00Z'), // 14:00 local
  windowEnd: T('2026-10-18T15:00:00Z'),   // 16:00 local
  scheduledFor: T('2026-10-18T13:00:00Z'),
  askedAt: T('2026-10-18T14:34:00Z'),     // 15:34 local
  askAnsweredAt: null,
  askNudges: 1,                            // ask() sent the first one itself
  nudgedAt: T('2026-10-18T14:34:00Z'),
  ...over,
})

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
const asks = (t, now) => Boolean(askNudgeDue(t, now))

/* 1. Three reminders per ask, counting the one ask() sent. --------------- */

check(MAX_ASK_NUDGES === 3, 'the cap is three buzzes in total')
check(asks(job(), T('2026-10-18T14:45:00Z')), 'one sent, eleven minutes on: the second is due')
check(asks(job({ askNudges: 2, nudgedAt: T('2026-10-18T14:45:00Z') }), T('2026-10-18T14:56:00Z')), 'two sent: the third is due')
check(!asks(job({ askNudges: 3, nudgedAt: T('2026-10-18T14:56:00Z') }), T('2026-10-18T15:08:00Z')),
  'three sent: the fourth never comes')
check(!asks(job({ askNudges: 3, nudgedAt: T('2026-10-18T14:56:00Z') }), T('2026-10-18T18:00:00Z')),
  'and still nothing three hours later — this is the all-night bug')
check(!asks(job(), T('2026-10-18T14:39:00Z')),
  'inside the ten minutes it is not due yet, cap or no cap')

/* 2. Nobody is woken between 21:00 and 07:00, in the trade's zone. ------- */

check(QUIET_FROM === 21 && QUIET_UNTIL === 7, 'quiet hours are 21:00 to 07:00')
check(inQuietHours(T('2026-10-18T20:00:00Z')) === true, '21:00 local (20:00Z in BST) is quiet')
check(inQuietHours(T('2026-10-18T19:59:00Z')) === false, '20:59 local is not — the boundary is local, not UTC')
check(inQuietHours(T('2026-10-19T02:00:00Z')) === true, 'the middle of the night is quiet')
check(inQuietHours(T('2026-10-19T05:59:00Z')) === true, '06:59 local is still quiet')
check(inQuietHours(T('2026-10-19T06:00:00Z')) === false, '07:00 local is not')
check(inQuietHours(T('2026-11-01T21:30:00Z')) === true,
  'after the clocks go back, 21:30 local is 21:30Z and still quiet')

const evening = job({ askedAt: T('2026-10-18T19:30:00Z'), nudgedAt: T('2026-10-18T19:30:00Z') })
check(!asks(evening, T('2026-10-18T21:00:00Z')), 'an open ask does not buzz at 22:00 local')
check(!asks(evening, T('2026-10-19T01:00:00Z')), 'nor at two in the morning')
check(!asks(evening, T('2026-10-19T04:30:00Z')), 'nor at half past five')

/* ...and one summary at 07:00, which then spends the whole allowance. ---- */

// The ask is for a job on the 19th, so it is still live the next morning.
const overnight = job({
  windowStart: T('2026-10-19T08:00:00Z'), windowEnd: T('2026-10-19T10:00:00Z'),
  scheduledFor: T('2026-10-19T08:00:00Z'),
  askedAt: T('2026-10-18T19:30:00Z'), nudgedAt: T('2026-10-18T19:30:00Z'),
})
const summary = askNudgeDue(overnight, T('2026-10-19T06:05:00Z'))
check(Boolean(summary), 'at 07:05 local the summary goes')
check(summary && summary.spend === MAX_ASK_NUDGES, 'and it spends the whole allowance, so it is the last one')
check(!asks({ ...overnight, askNudges: MAX_ASK_NUDGES, nudgedAt: T('2026-10-19T06:05:00Z') }, T('2026-10-19T06:20:00Z')),
  'nothing follows the summary fifteen minutes later')
check(!asks(overnight, T('2026-10-19T05:55:00Z')), 'and nothing at 06:55, which is still quiet')
check(morningSummaryDue({ ...overnight, nudgedAt: T('2026-10-19T06:30:00Z') }, T('2026-10-19T06:50:00Z')) === false,
  'a buzz already sent after 07:00 is not re-summarised in the same hour')
check(morningSummaryDue(job(), T('2026-10-18T14:45:00Z')) === false,
  'and an ordinary afternoon reminder is not a summary')

/* 3. An ask does not outlive the day of the job it is about. ------------- */

check(askExpired(job(), T('2026-10-18T22:00:00Z')) === false, 'late on the day itself: still live')
check(askExpired(job(), T('2026-10-19T09:00:00Z')) === true, 'the next morning: expired')
check(!asks(job(), T('2026-10-19T09:00:00Z')),
  'a stale ask never pushes the next day, even with the allowance unspent')
check(!asks(job({ askNudges: 0 }), T('2026-10-20T09:00:00Z')), 'nor two days later')
check(askExpired({ askedAt: null }, T('2026-10-19T09:00:00Z')) === false, 'no ask, nothing to expire')
check(askExpired({ askedAt: T('2026-10-18T14:34:00Z'), windowStart: null, scheduledFor: null }, T('2026-10-19T09:00:00Z')) === true,
  'with no day on the job it belongs to the day it was asked')
check(askExpired(job({ windowStart: null }), T('2026-10-19T09:00:00Z')) === true,
  'and scheduledFor stands in as the DAY when there are no hours')

/* 4. Answered, by whichever route. -------------------------------------- */

check(!asks(job({ askAnsweredAt: T('2026-10-18T14:40:00Z') }), T('2026-10-18T15:00:00Z')),
  'answered — by a stage, by a late figure, or by Stop reminders — and it stops')
check(!asks(job({ askAnsweredAt: T('2026-10-18T14:40:00Z'), askNudges: 0 }), T('2026-10-19T06:05:00Z')),
  'an answered ask gets no morning summary either')
check(!asks({ askedAt: null, askAnsweredAt: null }, T('2026-10-18T14:45:00Z')), 'no ask, no reminder')

/* ...and what null means: fall through, never blanket silence. ----------- */

// Stop reminders sets askAnsweredAt and nothing else. It is exactly the
// silence every other answer produces, so there is only one kind to reason
// about — and it leaves the stage alone, so the customer is told nothing.
const stopped = job({ askAnsweredAt: T('2026-10-18T14:40:00Z'), askNudges: MAX_ASK_NUDGES })
check(!asks(stopped, T('2026-10-18T16:00:00Z')), 'Stop reminders holds an hour later')
check(stopped.stage === 'BOOKED', 'and it leaves the stage alone — the customer is told nothing')
check(askNudgeDue(job({ askNudges: MAX_ASK_NUDGES }), T('2026-10-18T16:00:00Z')) === null,
  'a spent ask returns null, which is nudgeDue\'s cue to fall through to the missed notice')

/* 5. The lock screen carries no customer name. -------------------------- */

const line = askNudgeDue(job(), T('2026-10-18T14:45:00Z'))
check(line.title === 'A customer is asking', 'the title is "A customer is asking"')
const clean = (d) => !/Sarah|Whitfield/.test(`${d.title} ${d.body}`)
check(clean(line), 'and neither title nor body carries their name')
check(clean(summary), 'nor does the morning summary')

console.log(failed ? `\nFAILED — ${failed} check(s)` : '\nThe ask reminder holds.')
process.exit(failed ? 1 : 0)

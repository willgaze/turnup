/**
 * The weekly pilot summary, checked without a database or a clock.
 *
 *   node scripts/check-pilot-summary.mjs
 *
 * It goes once, on Monday morning in the trade's zone, and it says numbers.
 */
import { summaryDue, weekStart, summaryBody, SUMMARY_HOUR } from '../src/lib/pilot-summary.js'
import { TRADE_LINES } from '../src/lib/trade-push-words.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
const T = (iso) => new Date(iso)

// 2026-10-26 is a Monday, and the clocks went back the day before: GMT.
check(SUMMARY_HOUR === 8, 'the hour is eight in the morning')
check(summaryDue({}, T('2026-10-26T08:00:00Z')) === true, 'Monday 08:00 GMT, never sent: due')
check(summaryDue({}, T('2026-10-26T07:59:00Z')) === false, 'Monday 07:59: not yet')
check(summaryDue({}, T('2026-10-25T09:00:00Z')) === false, 'Sunday: never')
check(summaryDue({ pilotSummaryAt: T('2026-10-26T08:03:00Z') }, T('2026-10-26T12:00:00Z')) === false, 'sent this Monday: not again at noon')
check(summaryDue({ pilotSummaryAt: T('2026-10-26T08:03:00Z') }, T('2026-10-27T09:00:00Z')) === false, 'nor on Tuesday')
check(summaryDue({ pilotSummaryAt: T('2026-10-26T08:03:00Z') }, T('2026-11-02T08:00:00Z')) === true, 'the next Monday: due again')
// BST: Monday 19 Oct, 08:00 London is 07:00Z.
check(summaryDue({}, T('2026-10-19T07:00:00Z')) === true && summaryDue({}, T('2026-10-19T06:59:00Z')) === false, 'in summer the hour is London\'s, not UTC\'s')
check(weekStart(T('2026-10-21T15:00:00Z')).toISOString() === '2026-10-18T23:00:00.000Z', 'a Wednesday in BST starts its week at Monday 00:00 London (Sunday 23:00Z)')
check(weekStart(T('2026-10-28T15:00:00Z')).toISOString() === '2026-10-26T00:00:00.000Z', 'a Wednesday in GMT starts its week at Monday 00:00Z')
check(summaryDue({ pilotSummaryAt: T('2026-10-25T23:30:00Z') }, T('2026-10-26T08:00:00Z')) === true, 'a forced send on Sunday night does not count as this Monday\'s')

// What it says.
const week = { jobs: 5, linksOpened: { n: 4, pct: 80 }, inAnswered: { n: 2, of: 3, pct: 67 }, wastedTrips: { n: 0 }, calls: { n: 1 } }
const prior = { jobs: 4, linksOpened: { n: 2, pct: 50 }, inAnswered: { n: 1, of: 2, pct: 50 }, wastedTrips: { n: 1 }, calls: { n: 3 } }
const body = summaryBody(week, prior, { startLabel: '19 Oct', sinceStart: { jobs: 23, linksOpened: { n: 14, pct: 61 } } })
check(body === 'Jobs 5 (was 4). Links opened by a customer 4 (80%) (was 2, up). Will someone be in? answered 2 of 3 asked (was 1 of 2). Wasted trips 0 (was 1). Calls asking when you are coming 1 (was 3). Since 19 Oct: 23 jobs, 61% opened.', `the body reads as expected:\n        ${body}`)
check(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(body.replace(/Links opened|Wasted trips|Will someone|Calls asking/g, '')), 'no two capitalised words in a row: no customer name can get in')
check(!/\b\d{1,2}:\d{2}\b|arriv|minutes/.test(body), 'no time and no arrival anywhere in it')
const first = summaryBody({ jobs: 2, linksOpened: { n: 0, pct: 0 }, inAnswered: { n: 0, of: 0, pct: null }, wastedTrips: { n: 0 }, calls: { n: 0 } }, null)
check(first === 'Jobs 2. Links opened by a customer 0 (0%). Will someone be in? answered 0 of 0 asked. Wasted trips 0. Calls asking when you are coming 0.', 'the first week has no "was": nothing to compare with')
const line = TRADE_LINES.pilotWeek(week, prior, { startLabel: '19 Oct', sinceStart: { jobs: 23, linksOpened: { n: 14, pct: 61 } } })
check(line.title === 'Your pilot, this week' && line.body === body, 'the push line takes counts, not a string, and says the same')
check(TRADE_LINES.pilotWeek('Sarah Whitfield', 'x', 'y').body.indexOf('Sarah') === -1, 'handed a name instead of counts, the line still cannot say it')

console.log(`\n${failed === 0 ? 'The weekly summary holds.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

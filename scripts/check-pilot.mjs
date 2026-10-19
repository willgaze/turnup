/**
 * The pilot numbers, checked without a database.
 *
 *   node scripts/check-pilot.mjs
 */
import { pilotNumbers, countsAsCustomerView } from '../src/lib/pilot.js'

const T = (iso) => new Date(iso)
const now = T('2026-11-10T12:00:00Z')
const job = (id, over = {}) => ({ id, isActive: true, createdAt: T('2026-10-20T09:00:00Z'), scheduledFor: T('2026-10-22T08:00:00Z'), viewCount: 0, presenceAt: null, presenceAskedAt: null, askedAt: null, ...over })

const jobs = [
  job('a', { viewCount: 3, presenceAskedAt: T('2026-10-21T15:00:00Z'), presenceAt: T('2026-10-21T18:00:00Z') }),
  job('b', { viewCount: 1, presenceAskedAt: T('2026-10-21T15:00:00Z') }),
  job('c', { viewCount: 0 }),
  job('d', { viewCount: 2, askedAt: T('2026-10-22T09:30:00Z') }),
  job('old', { scheduledFor: T('2026-09-01T08:00:00Z'), viewCount: 9, presenceAt: T('2026-08-31T18:00:00Z') }),
  job('off', { isActive: false, viewCount: 9 }),
  job('noday', { scheduledFor: null, createdAt: T('2026-11-01T09:00:00Z'), viewCount: 1 }),
]
const noAccess = [
  { tradeStatusId: 'c', startedAt: T('2026-10-22T09:00:00Z') },
  { tradeStatusId: 'old', startedAt: T('2026-09-01T09:00:00Z') },
  { tradeStatusId: 'c', startedAt: T('2026-10-29T09:00:00Z') },
]

const r = pilotNumbers(jobs, noAccess, { days: 30, now })
let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
check(r.jobs === 5, `five jobs in the window: four booked, one with no day but made inside it (got ${r.jobs})`)
check(r.linksOpened.n === 4 && r.linksOpened.pct === 80, `links opened 4 of 5, 80% (got ${r.linksOpened.n}, ${r.linksOpened.pct})`)
check(r.askedDayBefore.n === 2, `asked the day before: 2 (got ${r.askedDayBefore.n})`)
check(r.inAnswered.n === 1 && r.inAnswered.pct === 50 && r.inAnswered.of === 2, `"in?" answered 1 of the 2 asked, 50% (got ${r.inAnswered.n} of ${r.inAnswered.of}, ${r.inAnswered.pct}%)`)
check(r.wastedTrips.n === 2, `wasted trips: two No one home records in the window, the old one excluded (got ${r.wastedTrips.n})`)
// A wasted trip is counted by its own date, so rebooking the job into the
// future does not lose it (19 Oct 2026).
const rebooked = pilotNumbers(jobs.map((j) => (j.id === 'c' ? { ...j, scheduledFor: T('2026-12-20T08:00:00Z') } : j)), noAccess, { days: 30, now })
check(rebooked.wastedTrips.n === 2, `wasted trips survive the job being rebooked into the future (got ${rebooked.wastedTrips.n})`)
// The clock starts on a date: before it, test cards are not the pilot.
const started = pilotNumbers(jobs, noAccess, { days: 30, now, start: T('2026-10-25T00:00:00Z') })
check(started.jobs === 1 && started.wastedTrips.n === 1 && started.start === '2026-10-25T00:00:00.000Z', `a start date is the floor: one job and one trip since 25 Oct (got ${started.jobs}, ${started.wastedTrips.n})`)
check(pilotNumbers(jobs, noAccess, { days: 30, now, start: T('2026-01-01T00:00:00Z') }).jobs === 5, 'a start date older than the window changes nothing')
// The hand count is shown when typed, never invented.
check(pilotNumbers(jobs, noAccess, { days: 30, now, calls: 3 }).calls.n === 3, 'calls typed on the panel: 3')
check(pilotNumbers(jobs, noAccess, { days: 30, now, calls: -1 }).calls.n === null, 'a negative hand count is not shown')
// What counts as a customer opening the link.
check(countsAsCustomerView({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }), 'an iPhone opening the link counts')
check(!countsAsCustomerView({ operator: true, userAgent: 'Mozilla/5.0 (iPhone)' }), 'the trade opening their own link does not count')
check(!countsAsCustomerView({ userAgent: 'WhatsApp/2.23.20.0 A' }), 'WhatsApp fetching the preview does not count')
check(!countsAsCustomerView({ userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }), 'Facebook/Messenger preview does not count')
check(!countsAsCustomerView({ userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' }), 'Discord preview does not count')
check(!countsAsCustomerView({ userAgent: 'curl/8.4.0' }), 'curl does not count')
check(r.stillComingAsks.n === 1, `"are you still coming?" taps: 1 (got ${r.stillComingAsks.n})`)
check(r.calls.n === null, 'calls are counted by hand, never invented')
const empty = pilotNumbers([], [], { now })
check(empty.jobs === 0 && empty.linksOpened.pct === null, 'no jobs: no percentages, not NaN')
console.log(`\n${failed === 0 ? 'The pilot numbers hold.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

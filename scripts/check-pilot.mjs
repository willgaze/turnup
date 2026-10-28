/**
 * The pilot numbers, checked without a database.
 *
 *   node scripts/check-pilot.mjs
 */
import { pilotNumbers, rangAfterOpening, countsAsCustomerView } from '../src/lib/pilot.js'

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
// Three calls inside the window, one before it. 'c' never opened its link
// and rang; 'a' opened and rang anyway; one call belongs to no job.
const calls = [
  { id: '1', at: T('2026-10-22T08:40:00Z'), tradeStatusId: 'c' },
  { id: '2', at: T('2026-10-23T11:00:00Z'), tradeStatusId: 'a' },
  { id: '3', at: T('2026-10-24T16:20:00Z'), tradeStatusId: null },
  { id: 'old', at: T('2026-09-02T10:00:00Z'), tradeStatusId: 'old' },
]

const r = pilotNumbers(jobs, noAccess, calls, { days: 30, now })
let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
check(r.jobs === 5, `five jobs in the window: four booked, one with no day but made inside it (got ${r.jobs})`)
check(r.linksOpened.n === 4 && r.linksOpened.pct === 80, `links opened 4 of 5, 80% (got ${r.linksOpened.n}, ${r.linksOpened.pct})`)
check(r.askedDayBefore.n === 2, `asked the day before: 2 (got ${r.askedDayBefore.n})`)
check(r.inAnswered.n === 1 && r.inAnswered.pct === 50 && r.inAnswered.of === 2, `"in?" answered 1 of the 2 asked, 50% (got ${r.inAnswered.n} of ${r.inAnswered.of}, ${r.inAnswered.pct}%)`)
check(r.wastedTrips.n === 2, `wasted trips: two No one home records in the window, the old one excluded (got ${r.wastedTrips.n})`)
// A wasted trip is counted by its own date, so rebooking the job into the
// future does not lose it (19 Oct 2026).
const rebooked = pilotNumbers(jobs.map((j) => (j.id === 'c' ? { ...j, scheduledFor: T('2026-12-20T08:00:00Z') } : j)), noAccess, calls, { days: 30, now })
check(rebooked.wastedTrips.n === 2, `wasted trips survive the job being rebooked into the future (got ${rebooked.wastedTrips.n})`)
// The clock starts on a date: before it, test cards are not the pilot.
const started = pilotNumbers(jobs, noAccess, calls, { days: 30, now, start: T('2026-10-25T00:00:00Z') })
check(started.jobs === 1 && started.wastedTrips.n === 1 && started.start === '2026-10-25T00:00:00.000Z', `a start date is the floor: one job and one trip since 25 Oct (got ${started.jobs}, ${started.wastedTrips.n})`)
check(pilotNumbers(jobs, noAccess, calls, { days: 30, now, start: T('2026-01-01T00:00:00Z') }).jobs === 5, 'a start date older than the window changes nothing')

// --- the fourth number ------------------------------------------------
// It was an integer that ignored every one of these (v1.76.0).
check(r.calls.n === 3, `calls: three in the window, the September one excluded (got ${r.calls.n})`)
check(started.calls.n === 0, 'a start date moves the call count too — the integer it replaced could not be windowed')
check(pilotNumbers(jobs, noAccess, calls, { days: 90, now }).calls.n === 4, 'ninety days takes in the older call; thirty did not')
check(r.calls.onAJob === 2, `two of the three calls are attached to a job (got ${r.calls.onAJob})`)
check(r.calls.last === '2026-10-24T16:20:00.000Z', `the last call is dated (got ${r.calls.last})`)
check(pilotNumbers(jobs, noAccess, [], { days: 30, now }).calls.n === 0, 'no calls logged is 0, not null: the row is the record and an empty record is a count')
// A figure typed before calls were dated is shown, never added in.
const legacy = pilotNumbers(jobs, noAccess, calls, { days: 30, now, typedBefore: 7 })
check(legacy.calls.n === 3 && legacy.calls.typedBefore === 7, `an old hand-typed total is kept beside the count, not added to it (got ${legacy.calls.n}, ${legacy.calls.typedBefore})`)
check(pilotNumbers(jobs, noAccess, calls, { days: 30, now, typedBefore: 0 }).calls.typedBefore === null, 'a zero hand-typed total is nothing to say')

// --- the bet, settled from inside the window --------------------------
// 'a', 'b', 'd', 'noday' opened their link; 'a' rang anyway. 'c' did not
// open it and rang. No before is needed: the control is in the window.
check(r.rang.opened.n === 1 && r.rang.opened.of === 4 && r.rang.opened.pct === 25, `of four who opened the link, one rang: 25% (got ${r.rang.opened.n}/${r.rang.opened.of}, ${r.rang.opened.pct}%)`)
check(r.rang.notOpened.n === 1 && r.rang.notOpened.of === 1 && r.rang.notOpened.pct === 100, `of the one who never opened it, one rang: 100% (got ${r.rang.notOpened.n}/${r.rang.notOpened.of}, ${r.rang.notOpened.pct}%)`)
// A call with no job cannot be placed on either side and must not land on one.
check(r.rang.opened.n + r.rang.notOpened.n === 2, 'the call attached to no job sits out of the comparison')
// Two calls about one job are one customer ringing, not two who did.
const twice = pilotNumbers(jobs, noAccess, [...calls, { id: '4', at: T('2026-10-25T09:00:00Z'), tradeStatusId: 'c' }], { days: 30, now })
check(twice.calls.n === 4 && twice.rang.notOpened.n === 1, `a customer ringing twice is four calls but still one customer who rang (got ${twice.calls.n} calls, ${twice.rang.notOpened.n} customer)`)
// None of nobody is not evidence, and must never draw as 0%.
const allOpened = pilotNumbers(jobs.filter((j) => (j.viewCount || 0) > 0), [], calls, { days: 30, now })
check(allOpened.rang.notOpened.of === 0 && allOpened.rang.notOpened.pct === null, 'a side with no jobs reads null, never 0% — "none of nobody rang" is not a finding')
// A call outside the window does not reach back into the comparison.
check(rangAfterOpening([job('z', { viewCount: 1 })], []).opened.pct === 0, 'nobody ringing out of a real side is a true 0%')

// --- what counts as a customer opening the link -----------------------
check(countsAsCustomerView({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' }), 'an iPhone opening the link counts')
check(!countsAsCustomerView({ operator: true, userAgent: 'Mozilla/5.0 (iPhone)' }), 'the trade opening their own link does not count')
check(!countsAsCustomerView({ userAgent: 'WhatsApp/2.23.20.0 A' }), 'WhatsApp fetching the preview does not count')
check(!countsAsCustomerView({ userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }), 'Facebook/Messenger preview does not count')
check(!countsAsCustomerView({ userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' }), 'Discord preview does not count')
check(!countsAsCustomerView({ userAgent: 'curl/8.4.0' }), 'curl does not count')
check(r.stillComingAsks.n === 1, `"are you still coming?" taps: 1 (got ${r.stillComingAsks.n})`)
const empty = pilotNumbers([], [], [], { now })
check(empty.jobs === 0 && empty.linksOpened.pct === null, 'no jobs: no percentages, not NaN')
check(empty.rang.opened.pct === null && empty.rang.notOpened.pct === null, 'no jobs: the comparison says nothing rather than 0')
console.log(`\n${failed === 0 ? 'The pilot numbers hold.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

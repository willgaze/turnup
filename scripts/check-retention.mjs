/**
 * Retention, checked without a database.
 *
 *   node scripts/check-retention.mjs
 *
 * Proves the rule in src/lib/retention.js, and that the three places that
 * depend on it actually use it: the sweep asks the rule (it does not keep
 * its own numbers), the cron is scheduled, and the two pages print the
 * numbers from the rule rather than typing their own.
 */
import { readFileSync } from 'node:fs'
import {
  addMonths, jobDoneAt, jobDue, arrivalDue, orphanPassDue, cutoffs,
  JOB_KEEP_MONTHS, ARRIVAL_KEEP_DAYS, ORPHAN_PASS_DAYS, RETENTION_WORDS,
} from '../src/lib/retention.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
const T = (iso) => new Date(iso)
const now = T('2027-11-01T12:00:00Z')
const done = (at) => ({ stage: 'DONE', createdAt: T(at) })
const job = (over) => ({ stage: 'DONE', updatedAt: T('2027-10-30T00:00:00Z'), events: [], ...over })

// The numbers are the ones the paperwork promises.
check(JOB_KEEP_MONTHS === 12, 'jobs are kept 12 months after Job done')
check(ARRIVAL_KEEP_DAYS === 90, 'household rows are kept 90 days after arrival')

// Calendar arithmetic.
check(addMonths(T('2026-10-26T09:00:00Z'), 12).toISOString() === '2027-10-26T09:00:00.000Z', 'twelve months is the same date next year')
check(addMonths(T('2028-02-29T09:00:00Z'), 12).toISOString() === '2029-02-28T09:00:00.000Z', '29 Feb plus twelve months clamps to 28 Feb')
check(addMonths(T('2027-03-31T09:00:00Z'), -1).toISOString() === '2027-02-28T09:00:00.000Z', 'a month back from 31 Mar clamps to 28 Feb')

// Jobs.
check(jobDue(job({ events: [done('2026-10-01T10:00:00Z')] }), now), 'done 13 months ago: due')
check(!jobDue(job({ events: [done('2026-12-01T10:00:00Z')] }), now), 'done 11 months ago: not due')
check(jobDue(job({ events: [done('2026-11-01T12:00:00Z')] }), now), 'done exactly 12 months ago to the minute: due')
check(!jobDue(job({ events: [done('2026-11-01T12:01:00Z')] }), now), 'one minute short of 12 months: not due')
check(!jobDue(job({ stage: 'ON_SITE', events: [done('2025-01-01T10:00:00Z')] }), now), 'reopened (not Done today): never due, however old the first Done')
check(!jobDue(job({ events: [done('2025-01-01T10:00:00Z'), done('2027-09-01T10:00:00Z')] }), now), 'finished again last month: the clock restarted, not due')
check(jobDue(job({ events: [], updatedAt: T('2026-09-01T00:00:00Z') }), now), 'Done with no events: falls back to when it was last touched, due')
check(!jobDue(job({ events: [], updatedAt: T('2027-09-01T00:00:00Z') }), now), 'Done with no events, touched recently: not due')
check(!jobDue(job({ stage: 'BOOKED', updatedAt: T('2020-01-01T00:00:00Z') }), now), 'a job never Done is never due (it is a live booking until the trade deletes it)')
check(!jobDue(job({ stage: 'PAUSED', updatedAt: T('2020-01-01T00:00:00Z') }), now), 'a Paused job is never due')
check(jobDoneAt({ stage: 'DONE', events: [{ stage: 'ON_SITE', createdAt: T('2027-10-01T00:00:00Z') }, done('2026-01-01T00:00:00Z')] }).toISOString() === '2026-01-01T00:00:00.000Z', 'only DONE events set the clock')

// Household rows.
const arr = (stage, at) => ({ stage, updatedAt: T(at) })
check(arrivalDue(arr('DONE', '2027-08-01T12:00:00Z'), now), 'arrived 92 days ago: due')
check(!arrivalDue(arr('DONE', '2027-08-05T12:00:00Z'), now), 'arrived 88 days ago: not due')
check(!arrivalDue(arr('ON_THE_WAY', '2026-01-01T00:00:00Z'), now), 'never arrived: not due')
check(!arrivalDue(arr('MISSED', '2026-01-01T00:00:00Z'), now), 'missed is not arrived: not due')

// Wallet registrations for jobs that are gone.
const live = new Set(['LIVECODE'])
check(!orphanPassDue({ serialNumber: 'LIVECODE', updatedAt: T('2020-01-01T00:00:00Z') }, live, now), 'a registration for a live job is never orphaned')
check(orphanPassDue({ serialNumber: 'GONECODE', updatedAt: T('2027-09-01T00:00:00Z') }, live, now), `a dead job's registration goes after ${ORPHAN_PASS_DAYS} days`)
check(!orphanPassDue({ serialNumber: 'GONECODE', updatedAt: T('2027-10-25T00:00:00Z') }, live, now), 'a dead job\'s registration is kept long enough for the phone to hear')

// The query cut-offs agree with the rule at the boundary.
const c = cutoffs(now)
check(jobDue(job({ events: [{ stage: 'DONE', createdAt: c.jobsDoneBefore }] }), now), 'a job done exactly at the query cut-off is due by the rule too')
check(arrivalDue(arr('DONE', c.arrivedBefore.toISOString()), now), 'a row arrived exactly at the query cut-off is due by the rule too')

// The callers use the rule.
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const sweep = src('src/lib/retention-sweep.js')
check(/jobDue\(/.test(sweep) && /arrivalDue\(/.test(sweep) && /orphanPassDue\(/.test(sweep), 'the sweep decides with the pure rule')
check(!/\b(365|12 \* 30|90 \*|30 \*)\b/.test(sweep.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'the sweep keeps no numbers of its own')
check(/isActive: false/.test(sweep) && sweep.indexOf('isActive: false') < sweep.indexOf('tradeStatus.deleteMany'), 'erasing switches the link off before it deletes anything')
check(/pilotCall\.deleteMany\(\{ where: \{ tradeStatusId/.test(sweep), 'erasing a job takes the calls logged against it')
check(!/passDevice\.deleteMany\(\{ where: \{ serialNumber/.test(sweep), 'erasing a job keeps its Wallet registrations so the phone can hear the card is dead')
const cron = JSON.parse(src('vercel.json')).crons || []
check(cron.some((c) => c.path === '/api/cron/retention'), 'vercel.json schedules /api/cron/retention')
check(/sweepRetention\(\)/.test(src('src/app/api/cron/retention/route.js')), 'the cron route runs the sweep')
for (const page of ['src/app/privacy/page.js', 'src/app/processor/page.js']) {
  const s = src(page)
  check(/RETENTION_WORDS/.test(s), `${page} prints the retention words from the rule`)
  check(!/\b12 months\b|\b90 days\b/.test(s), `${page} does not type its own retention numbers`)
}
check(RETENTION_WORDS.job.includes(String(JOB_KEEP_MONTHS)) && RETENTION_WORDS.arrival.includes(String(ARRIVAL_KEEP_DAYS)), 'the words carry the numbers')

if (failed) { console.log(`\n${failed} failed`); process.exit(1) }
console.log('\nretention: all good')

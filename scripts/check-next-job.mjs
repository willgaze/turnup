/**
 * "On my way" offered at Job done, checked without a database.
 *
 *   node scripts/check-next-job.mjs
 *
 * The offer names the earliest job still Booked in for today, in the trade's
 * zone, and nothing else: not tomorrow's, not one already moving, not the
 * job just finished, never a job with no day.
 */
import { nextJobAfterDone, leftToday } from '../src/lib/next-job.js'

const T = (iso) => new Date(iso)
// 2026-10-20 is BST: a London day runs 23:00Z the night before to 22:59Z.
const now = T('2026-10-20T10:30:00Z')
const job = (id, over = {}) => ({ id, isActive: true, stage: 'BOOKED', customerName: `Customer ${id}`, scheduledFor: T('2026-10-20T08:00:00Z'), windowStart: null, position: null, ...over })

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const jobs = [
  job('done', { stage: 'ON_SITE', windowStart: T('2026-10-20T08:00:00Z') }),
  job('late', { windowStart: T('2026-10-20T15:00:00Z') }),
  job('next', { windowStart: T('2026-10-20T12:00:00Z') }),
  job('tomorrow', { scheduledFor: T('2026-10-21T08:00:00Z'), windowStart: T('2026-10-21T09:00:00Z') }),
  job('moving', { stage: 'ON_MY_WAY', windowStart: T('2026-10-20T11:00:00Z') }),
  job('off', { isActive: false, windowStart: T('2026-10-20T11:30:00Z') }),
  job('noday', { scheduledFor: null }),
]
check(nextJobAfterDone(jobs, 'done', now)?.id === 'next', 'the earliest job still Booked in today, by its window')
check(leftToday(jobs, 'done', now) === 2, 'two of today\'s jobs are still Booked in')
check(nextJobAfterDone(jobs, 'next', now)?.id === 'late', 'finishing the next one offers the one after')
check(nextJobAfterDone(jobs.filter((j) => !['next', 'late'].includes(j.id)), 'done', now) === null, 'nothing else today: no offer, and tomorrow is not pulled forward')
check(nextJobAfterDone([job('a', { stage: 'BOOKED', windowStart: T('2026-10-20T14:00:00Z') })], 'a', now) === null, 'the job just finished is never offered')

// Day-only bookings sort by their day, then by the position the trade typed.
const dayOnly = [job('p2', { position: 2 }), job('p1', { position: 1 }), job('p3', { position: 3 })]
check(nextJobAfterDone(dayOnly, 'x', now)?.id === 'p1', 'no hours: the position the trade typed decides')
check(nextJobAfterDone([job('w', { windowStart: T('2026-10-20T16:00:00Z'), position: 9 }), job('p1', { position: 1 })], 'x', now)?.id === 'w', 'a job with hours comes before one with only a position')

// The clock change: 22:30Z on 25 Oct is 23:30 BST, still the 25th; a job
// scheduled 00:30Z on the 26th is 00:30 GMT, the 26th.
const late = T('2026-10-25T22:30:00Z')
check(nextJobAfterDone([job('still-today', { scheduledFor: T('2026-10-25T20:00:00Z') }), job('after-midnight', { scheduledFor: T('2026-10-26T00:30:00Z') })], 'x', late)?.id === 'still-today', 'today is the London day, across the clock change')
check(nextJobAfterDone(null, 'x', now) === null && nextJobAfterDone([], 'x', now) === null, 'no jobs: no offer, never a throw')

console.log(`\n${failed === 0 ? 'The next-job offer holds.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

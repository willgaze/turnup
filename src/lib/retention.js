/**
 * How long TurnUp keeps things, as a rule with no database in it.
 *
 * Go-to-market stop 4 (26 Oct 2026): a beta trade is signing processor terms
 * that say how long their customers' details are kept, and a promise like that
 * is only worth making if the code keeps it. So the rule lives here, pure, and
 * `node scripts/check-retention.mjs` proves it; `src/lib/retention-sweep.js`
 * does the deleting and asks THIS file which rows are due, never its own
 * opinion; `/privacy` and `/processor` print the numbers from this file, so the
 * pages cannot say twelve months while the code does eleven.
 *
 * Two rules, and what they deliberately do not cover:
 *
 * - A JOB and everything hanging off it (its timeline, the customer's answers,
 *   No one home records, push subscriptions, the ServiceM8 link, the email
 *   claims) goes JOB_KEEP_MONTHS after it reached Job done. "Reached" is the
 *   latest DONE event: a job reopened and finished again starts its clock
 *   again, and a job that is not Done today is not due, however old its first
 *   Done was.
 * - A HOUSEHOLD ROW (one Arrival on a household card) goes ARRIVAL_KEEP_DAYS
 *   after it arrived. Stages only move forwards, so once a row is DONE its
 *   updatedAt is when it got there (a later title tidy can move it on by a
 *   little, which only ever keeps a row longer, never shorter).
 *
 * Not covered, on purpose, and said so on the pages: a job that never reaches
 * Job done stays until the trade deletes it (or the account), and a parcel
 * that never arrives stays on its card. A rule that guessed when an unfinished
 * job was "abandoned" would delete somebody's live booking.
 */

export const JOB_KEEP_MONTHS = 12
export const ARRIVAL_KEEP_DAYS = 90

// A Wallet registration whose job no longer exists is kept this long, so the
// phone can ask what changed, be told the card is dead (401), and take it off.
// Then it is only a device id and a push token pointing at nothing.
export const ORPHAN_PASS_DAYS = 30

const DAY = 24 * 60 * 60 * 1000

/** Calendar months, in UTC, clamped: 29 Feb plus twelve months is 28 Feb. */
export function addMonths(date, months) {
  const d = new Date(date)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1,
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, last))
  return target
}

const time = (v) => (v == null ? null : new Date(v))

/**
 * When the job last reached Job done, or null if it is not Done now.
 * `job.events` may be all of them or only the DONE ones; either works.
 */
export function jobDoneAt(job) {
  if (!job || job.stage !== 'DONE') return null
  const done = (job.events || []).filter((e) => e && e.stage === 'DONE' && e.createdAt)
  if (done.length) return new Date(Math.max(...done.map((e) => time(e.createdAt).getTime())))
  // A job marked Done before events were kept, or by a path that wrote none.
  return time(job.updatedAt)
}

/** The moment a Done job becomes due for deletion, or null. */
export function jobDeleteAfter(job) {
  const at = jobDoneAt(job)
  return at ? addMonths(at, JOB_KEEP_MONTHS) : null
}

export function jobDue(job, now = new Date()) {
  const after = jobDeleteAfter(job)
  return Boolean(after) && after.getTime() <= time(now).getTime()
}

/** When a household row arrived, or null if it has not. */
export function arrivedAt(arrival) {
  if (!arrival || arrival.stage !== 'DONE') return null
  return time(arrival.updatedAt)
}

export function arrivalDue(arrival, now = new Date()) {
  const at = arrivedAt(arrival)
  return Boolean(at) && at.getTime() + ARRIVAL_KEEP_DAYS * DAY <= time(now).getTime()
}

/** A Wallet registration for a job that is gone, and has had time to hear so. */
export function orphanPassDue(row, liveCodes, now = new Date()) {
  if (!row || liveCodes.has(row.serialNumber)) return false
  return time(row.updatedAt).getTime() + ORPHAN_PASS_DAYS * DAY <= time(now).getTime()
}

/**
 * The cut-off dates the sweep queries with. Anything the query finds is
 * still passed through jobDue / arrivalDue before it is deleted: the query
 * narrows, the rule decides.
 */
export function cutoffs(now = new Date()) {
  const n = time(now)
  return {
    jobsDoneBefore: addMonths(n, -JOB_KEEP_MONTHS),
    arrivedBefore: new Date(n.getTime() - ARRIVAL_KEEP_DAYS * DAY),
    orphanPassBefore: new Date(n.getTime() - ORPHAN_PASS_DAYS * DAY),
  }
}

/** The words, for /privacy and /processor. One place, so they cannot drift. */
export const RETENTION_WORDS = {
  job: `${JOB_KEEP_MONTHS} months after the job is marked Job done`,
  jobLong: `Deleted automatically ${JOB_KEEP_MONTHS} months after the job is marked Job done, with its timeline, the customer’s answers and any No one home record. A job reopened and finished again starts the ${JOB_KEEP_MONTHS} months again. A job never marked Job done is kept until you delete it.`,
  arrival: `${ARRIVAL_KEEP_DAYS} days after it arrives`,
  arrivalLong: `Each row on a household card is deleted automatically ${ARRIVAL_KEEP_DAYS} days after it arrives. A row that never arrives stays until the card is switched off.`,
  backups: 'Copies in the database provider’s restore history age out on its own schedule: no more than 30 days on any Neon plan.',
  sweep: 'A sweep runs once a day and deletes whatever has come due.',
}

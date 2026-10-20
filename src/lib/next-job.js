import { isoDay } from './when.js'

/**
 * Job done, so who is next?
 *
 * The moment one job ends is the moment the next customer most wants to hear
 * "on my way", and it is the moment the trade is packing a van and will not
 * remember. So the dashboard offers it: finish one job and the card asks
 * whether you are heading to the next one booked today. One tap, the same
 * tap as the On my way button; nothing is sent until it is pressed. The
 * offer never promises a time and never picks a job for a different day.
 *
 * Next means: still Booked in, booked for today in the trade's zone, and the
 * earliest by its window, then by its day, then by the position the trade
 * typed. A job with no day is not today's. Pure, so scripts/check-next-job.mjs
 * runs it without a database or a browser.
 */
const when = (t) => t.windowStart || t.scheduledFor || null
const dayOf = (t) => (when(t) ? isoDay(when(t)) : '')

export function nextJobAfterDone(trackers, doneId, now = new Date()) {
  const today = isoDay(now)
  const candidates = (trackers || []).filter((t) =>
    t && t.id !== doneId && t.isActive !== false && t.stage === 'BOOKED' && dayOf(t) === today)
  candidates.sort((a, b) => {
    const aw = a.windowStart ? new Date(a.windowStart).getTime() : Infinity
    const bw = b.windowStart ? new Date(b.windowStart).getTime() : Infinity
    if (aw !== bw) return aw - bw
    const as = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Infinity
    const bs = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Infinity
    if (as !== bs) return as - bs
    return (a.position || 99) - (b.position || 99)
  })
  return candidates[0] || null
}

/** How many of today's jobs are still Booked in, for "that was the last one". */
export const leftToday = (trackers, doneId, now = new Date()) =>
  (trackers || []).filter((t) => t && t.id !== doneId && t.isActive !== false && t.stage === 'BOOKED' && dayOf(t) === isoDay(now)).length

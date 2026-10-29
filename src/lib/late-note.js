/**
 * The "running late" note, and when it stops being news.
 *
 * runningLate() writes the trade's own figure into stageNote so the customer
 * reads it on the status card and the Wallet card's "Latest" field. A stage
 * change kept stageNote untouched, so once the van was there the same words
 * stayed on the card: job #2742 read "Running about 30 minutes late" at Job
 * done (21 Oct 2026). Lateness is about getting to the door; once the trade is
 * On site, Paused or Done it is history, and showing it reads as news.
 *
 * Pure, no database, so `node scripts/check-late-note.mjs` can prove it.
 * Only the note this file wrote is cleared: anything the trade typed stays.
 */

const PAST_THE_DOOR = ['ON_SITE', 'PAUSED', 'DONE']

/** The one wording. `saidAt` is already a HH:MM string in the trade's zone. */
export function lateNote(minutes, saidAt) {
  return `Running about ${minutes} minutes late — sorry. Said at ${saidAt}.`
}

const LATE_RE = /^Running about \d{1,3} minutes late — sorry\. Said at \d{2}:\d{2}\.$/

/** True only for a note lateNote() wrote, never for words the trade typed. */
export function isLateNote(note) {
  return typeof note === 'string' && LATE_RE.test(note.trim())
}

/**
 * What stageNote should become when the stage moves to `next`.
 * Returns null to clear it, or undefined to leave it alone.
 */
export function noteAfterStage(currentNote, next) {
  if (!PAST_THE_DOOR.includes(next)) return undefined
  return isLateNote(currentNote) ? null : undefined
}

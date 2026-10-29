/**
 * A "running late" note stops being news once the van is there.
 *
 *   node scripts/check-late-note.mjs
 *
 * Job #2742 read "Running about 30 minutes late" on its status card and its
 * Wallet card after Job done (21 Oct 2026): a stage change kept stageNote.
 * The note runningLate() writes is cleared on the way to On site, Paused or
 * Job done; anything the trade typed is left alone.
 */
import { lateNote, isLateNote, noteAfterStage } from '../src/lib/late-note.js'
import { readFileSync } from 'node:fs'
import { publicShape } from '../src/lib/trade-status.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const late = lateNote(30, '08:12')
check(late === 'Running about 30 minutes late — sorry. Said at 08:12.', 'the wording is the one the customer has always read')
check(isLateNote(late), 'a note lateNote() wrote is recognised')
check(isLateNote(lateNote(240, '23:59')), 'the largest figure is recognised')
check(!isLateNote('Waiting on the cylinder from the merchant'), 'a typed reason is not a late note')
check(!isLateNote('Running about 30 minutes late — sorry. Said at 08:12. Gate code is 1234'), 'a late note the trade added words to is theirs now')
check(!isLateNote(null) && !isLateNote(undefined) && !isLateNote(42), 'nothing is not a late note')

for (const s of ['ON_SITE', 'PAUSED', 'DONE']) check(noteAfterStage(late, s) === null, `cleared on the way to ${s}`)
for (const s of ['BOOKED', 'ON_MY_WAY']) check(noteAfterStage(late, s) === undefined, `kept at ${s}: still waiting for the van`)
check(noteAfterStage('Waiting on the cylinder', 'DONE') === undefined, 'a typed note survives Job done')
check(noteAfterStage(null, 'DONE') === undefined, 'no note, nothing to do')

// Every path that writes or moves the note goes through this file, so the
// wording cannot drift from what isLateNote() recognises.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
check(/lateNote\(m, /.test(src('src/lib/nudge.js')) && !/`Running about \$\{m\} minutes late — sorry/.test(src('src/lib/nudge.js')), 'runningLate() builds its note with lateNote()')
check(/noteAfterStage\(current\.stageNote, body\.stage\)/.test(src('src/app/api/dashboard/trackers/[id]/route.js')), 'the stage button clears it')
check(/noteAfterStage\(tracker\.stageNote, stage\)/.test(src('src/lib/servicem8.js')), 'a ServiceM8 check-in clears it too')
check(/\['BOOKED', 'ON_MY_WAY'\]\.includes\(status\.stage\)/.test(src('src/app/t/StillComing.jsx')), 'the customer’s late row shows only before the van is there')
check(/\['BOOKED', 'ON_MY_WAY'\]\.includes\(t\.stage\)/.test(src('src/app/dashboard/Console.jsx')), 'the dashboard’s late row shows only before the van is there')

// Rows already in the database (#2742 among them) were written before the
// stage change cleared the note: the public shape hides it, so the page and
// both Wallet cards stop saying it without anyone touching the row.
const row = (stage, stageNote) => ({ code: 'ZZZZZZZZ', stage, stageNote })
check(publicShape(row('DONE', late)).stageNote === null, 'an old late note is not on a Job done card')
check(publicShape(row('ON_SITE', late)).stageNote === null, 'nor on an On site card')
check(publicShape(row('ON_MY_WAY', late)).stageNote === late, 'it is still there while the customer waits')
check(publicShape(row('DONE', 'Boiler serviced, all good')).stageNote === 'Boiler serviced, all good', 'a typed Job done note is untouched')

if (failed) { console.log(`\n${failed} failed`); process.exit(1) }
console.log('\nall passed')

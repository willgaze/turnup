// node scripts/check-views.mjs
// The dashboard's views (src/lib/views.js): which jobs sit in Needs you, Now,
// Today, Coming up, Loose ends, Done, and why. Pure, no database, no build.
import { buildViews, needsReasons, defaultView, isLooseEnd, rowWhen } from '../src/lib/views.js'

let fail = 0, n = 0
const ok = (cond, name) => { n++; if (!cond) { fail++; console.log('FAIL', name) } }

// Sat 31 Oct 2026, 14:00 London (GMT, after the clock change on the 25th).
const NOW = new Date('2026-10-31T14:00:00Z')
const at = (iso) => new Date(iso).toISOString()
const base = { isActive: true, stage: 'BOOKED', viewCount: 1, linkSentAt: at('2026-10-30T09:00Z'), updatedAt: at('2026-10-31T08:00Z') }
const job = (id, extra) => ({ id, ...base, ...extra })

const rows = [
  job('asked', { scheduledFor: at('2026-10-31T00:00Z'), windowStart: at('2026-10-31T12:00Z'), askedAt: at('2026-10-31T13:10Z') }),
  job('missed', { scheduledFor: at('2026-10-31T00:00Z'), missedAt: at('2026-10-31T11:00Z'), missedChoice: 'LATER' }),
  job('move', { scheduledFor: at('2026-11-01T00:00Z'), reminderReply: 'MOVE' }),
  job('started', { scheduledFor: at('2026-10-31T00:00Z'), windowStart: at('2026-10-31T13:00Z') }),
  job('unsent', { scheduledFor: at('2026-11-01T00:00Z'), viewCount: 0, linkSentAt: null }),
  job('unopened', { scheduledFor: at('2026-10-31T00:00Z'), windowStart: at('2026-10-31T16:00Z'), viewCount: 0 }),
  job('calm-today', { scheduledFor: at('2026-10-31T00:00Z'), windowStart: at('2026-10-31T16:00Z') }),
  job('next-week', { scheduledFor: at('2026-11-03T00:00Z'), windowStart: at('2026-11-03T09:00Z') }),
  job('far', { scheduledFor: at('2026-12-20T00:00Z') }),
  job('undated', {}),
  job('onway', { stage: 'ON_MY_WAY', scheduledFor: at('2026-10-31T00:00Z') }),
  job('paused-old', { stage: 'PAUSED', scheduledFor: at('2026-10-29T00:00Z') }),
  job('loose', { scheduledFor: at('2026-10-27T00:00Z') }),
  job('done-note', { stage: 'DONE', feedbackText: 'Lovely job', feedbackAt: at('2026-10-30T18:00Z'), updatedAt: at('2026-10-30T18:00Z') }),
  job('done-old', { stage: 'DONE', updatedAt: at('2026-09-01T10:00Z') }),
  job('off', { isActive: false, askedAt: at('2026-10-31T13:10Z'), scheduledFor: at('2026-10-31T00:00Z') }),
]
const b = buildViews(rows, undefined, NOW)
const ids = (k) => b.byKey[k].rows.map((r) => r.id)

// Needs you: every reason, most urgent first, never a switched-off link.
ok(ids('needs')[0] === 'asked', 'an unanswered ask is the first thing')
ok(ids('needs')[1] === 'missed', 'a missed window is second')
ok(ids('needs').includes('move') && ids('needs').includes('started'), 'move and started are in')
ok(ids('needs').includes('unsent') && ids('needs').includes('unopened'), 'unsent and unopened are in')
ok(ids('needs').includes('done-note'), 'a fresh note after the job is in')
ok(!ids('needs').includes('off'), 'a switched-off link never needs you')
ok(!ids('needs').includes('calm-today') && !ids('needs').includes('next-week'), 'calm jobs are not in')
ok(ids('needs').indexOf('unsent') < ids('needs').indexOf('unopened'), 'not sent ranks above not opened')
ok(needsReasons(rows[0], NOW)[0].alert === true, 'an ask is an alert (red)')
ok(needsReasons(rows[2], NOW)[0].alert === false, 'a move request is amber, not red')
ok(/14:00|13:10/.test(needsReasons(rows[0], NOW)[0].words) && needsReasons(rows[0], NOW)[0].words.includes('13:10'), 'the ask says the London time it was made')
ok(needsReasons(rows[1], NOW)[0].words.includes('later today'), 'a missed window says what they chose')

// Now / Today / Coming up / Loose ends / Done.
ok(ids('now').join() === 'onway,paused-old', 'Now is On my way, On site, Paused, however old')
ok(ids('today')[0] === 'asked' && ids('today').indexOf('started') < ids('today').indexOf('calm-today'), 'Today runs in window order')
ok(ids('today').length === 5 && !ids('today').includes('onway'), 'Today excludes what is already under way')
ok(ids('next').includes('next-week') && ids('next').includes('move') && ids('next').includes('undated'), 'Coming up: tomorrow, next week, and no day yet')
ok(!ids('next').includes('far'), 'beyond two weeks is not Coming up')
ok(ids('next').at(-1) === 'undated', 'no day yet sorts last')
ok(ids('loose').join() === 'loose', 'Loose ends: a past day still Booked in, and only that')
ok(!isLooseEnd(rows.find((r) => r.id === 'paused-old'), NOW), 'a paused job from Thursday is in hand, not loose')
ok(ids('done').join() === 'done-note', 'Done is the last two weeks only')
ok(ids('all').length === rows.length, 'All is everything, in the server order')

// Default view and the day line.
ok(defaultView(b) === 'needs', 'opens on Needs you when anything needs you')
const calm = buildViews([rows[6], rows[10]], undefined, NOW)
ok(defaultView(calm) === 'now', 'opens on Now when nothing needs you')
ok(defaultView(buildViews([], undefined, NOW)) === 'all', 'an empty day opens on All')
ok(rowWhen(rows[6], NOW) === 'Today 16:00', 'row says Today 16:00')
ok(rowWhen(rows[9], NOW) === 'No day yet', 'no day says so')

// Midnight edge: 23:30 and 00:30 London are different days.
const late = new Date('2026-10-31T23:30:00Z')
const tomorrowJob = job('t', { scheduledFor: at('2026-11-01T00:00Z') })
ok(buildViews([tomorrowJob], undefined, late).byKey.today.count === 0, 'at 23:30 tomorrow is not today')
ok(buildViews([tomorrowJob], undefined, new Date('2026-11-01T00:30:00Z')).byKey.today.count === 1, 'at 00:30 it is')

// In BST (before 25 Oct) London is an hour ahead of UTC.
const bstNow = new Date('2026-10-20T23:30:00Z') // 00:30 on the 21st in London (BST)
const bstJob = job('b', { scheduledFor: at('2026-10-20T23:00:00Z') }) // midnight 21 Oct London
ok(buildViews([bstJob], undefined, bstNow).byKey.today.count === 1, 'in BST the London day is used, not UTC')

console.log(fail ? `${fail} of ${n} failed` : `views: ${n} cases pass`)
process.exit(fail ? 1 : 0)

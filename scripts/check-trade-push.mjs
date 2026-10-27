/**
 * What may go on the TRADE's lock screen.
 *
 *   node scripts/check-trade-push.mjs
 *
 * The rule in CLAUDE.md — a notification carries the stage and nothing else,
 * never the customer's name, the address, the job reference or free text —
 * was written for the customer's phone and quietly skipped on the trade's.
 * Ten notifications named the customer, and `feedbackLeft` put the customer's
 * own private note in the body, which is exactly what the rule bans.
 *
 * Two halves, because one without the other does not hold:
 *
 *   1. Every line in TRADE_LINES is built and read. Nothing it can produce
 *      contains anything a customer supplied — and it cannot, because no
 *      builder takes a customer-supplied argument.
 *   2. Every pushTrade() call site in src/ is read as source, and its title
 *      and body must come from TRADE_LINES rather than be built inline. This
 *      is the half that catches the next person adding one in a hurry.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TRADE_LINES } from '../src/lib/trade-push-words.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

/* 1. Nothing the vocabulary can say names anybody. ---------------------- */

// Built with the arguments they really take. There is no point poisoning
// them: a poisoned clock time and a poisoned name are the same string, so
// such a check could never fail and would only look like protection. What
// holds the line is the named-arguments list below and the call-site scan.
const ARGS = ['09:00', '09:00', '09:00', '09:00']
const BANNED = [
  [/Sarah|Whitfield|Doherty|Pryce/i, 'a customer name'],
  [/\b\d+ [A-Z][a-z]+ (Lane|Street|Road|Close|Cottages)/, 'an address'],
  [/#\d{3,}/, 'a job reference'],
]

const names = Object.keys(TRADE_LINES)
check(names.length > 0, `the vocabulary has ${names.length} lines`)

for (const name of names) {
  const built = TRADE_LINES[name](...ARGS)
  const text = `${built.title} ${built.body}`
  check(typeof built.title === 'string' && built.title.length > 0, `${name}: has a title`)
  check(typeof built.body === 'string' && built.body.length > 0, `${name}: has a body`)
  for (const [re, what] of BANNED) check(!re.test(text), `${name}: carries no ${what}`)
}

// The three lines that DO take an argument take only safe ones: a clock time
// the trade's own window gave, a figure from a fixed list of buttons, and
// fixed words from a choice. Named here so adding a fourth is deliberate.
const TAKES_ARGUMENTS = {
  windowStarted: 'a clock time from the trade\'s own window',
  windowEnded: 'a clock time from the trade\'s own window',
  windowMissed: 'a clock time from the trade\'s own window',
  bookedTomorrow: 'whether the email fallback was used',
  afterMissed: 'fixed words from MISSED_CHOICES, and the trade\'s next step',
  reminderReply: 'fixed words from REMINDER_REPLIES, and the trade\'s next step',
  afterNoAccess: 'fixed words from REPLIES, and the trade\'s next step',
  customerLate: 'minutes from a fixed list, and two clock times',
  pilotWeek: 'the pilot counts from pilotNumbers(): numbers, built into words inside the vocabulary',
}
for (const name of names) {
  const takesArgs = TRADE_LINES[name].length > 0
  check(!takesArgs || Boolean(TAKES_ARGUMENTS[name]),
    `${name}: ${takesArgs ? 'its arguments are named and safe' : 'takes nothing at all'}`)
}

// The one that was actually leaking: the customer's own note.
const note = TRADE_LINES.feedbackLeft()
check(!/\$\{|slice|text/.test(`${note.title} ${note.body}`),
  'feedbackLeft: the note itself is not in the notification')
check(/dashboard|card/i.test(note.body), 'feedbackLeft: it says where to go and read it instead')

/* 2. No call site builds its own. --------------------------------------- */

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : (/\.jsx?$/.test(f) ? [p] : [])
})

// Customer-supplied things that must never appear in a pushTrade argument.
const LEAKY = /customerName|\bfirst\(|\$\{who\}|\btext\.slice|jobAddress|jobRef|stageNote|feedbackText/

const offenders = []
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  if (!src.includes('pushTrade(')) continue
  src.split('\n').forEach((line, i) => {
    if (!line.includes('pushTrade(')) return
    if (line.includes('export') || line.includes('function pushTrade')) return
    // The whole call is on one line everywhere in this repo; if that ever
    // stops being true, this check must grow rather than be deleted.
    if (LEAKY.test(line)) offenders.push(`${file}:${i + 1}`)
  })
}
check(offenders.length === 0,
  offenders.length ? `no call site builds its own: FOUND ${offenders.join(', ')}` : 'no pushTrade call site passes a customer field')

// And the multi-line case the comment above worries about: a pushTrade whose
// arguments run onto the next lines.
const multiline = []
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  lines.forEach((line, i) => {
    if (!line.includes('pushTrade({') || line.includes('export')) return
    if (line.includes('})')) return // closed on the same line
    const block = lines.slice(i, i + 8).join('\n')
    if (LEAKY.test(block.slice(0, block.indexOf('})') + 2 || undefined))) multiline.push(`${file}:${i + 1}`)
  })
}
check(multiline.length === 0,
  multiline.length ? `a multi-line call leaks: ${multiline.join(', ')}` : 'nor does a call spread over several lines')

/* 3. The scanner can actually fail. ------------------------------------- */

// A check that cannot fail is not protection, it is decoration. These are the
// five shapes this bug took before it was fixed, each caught.
const WAS_LIVE = [
  "const r = await pushTrade({ title: `${first(t)}'s window has started`, body: 'x' })",
  "pushTrade({ title: `${who} left a note after the job`, body: text.slice(0, 120) })",
  "pushTrade({ title: `${(tracker.customerName || 'x').split(' ')[0]} went to leave a review` })",
  "pushTrade({ title: line, body: tracker.stageNote })",
  "pushTrade({ title: 'A job', body: `at ${tracker.jobAddress}` })",
]
for (const [i, line] of WAS_LIVE.entries()) {
  check(LEAKY.test(line), `the scanner catches the leak it was written for (${i + 1} of ${WAS_LIVE.length})`)
}
check(!LEAKY.test("const r = await pushTrade({ ...TRADE_LINES.windowStarted(hhmm(start)), tag: `nudge-${tracker.code}` })"),
  'and passes the line that replaced them')

console.log(failed ? `\nFAILED — ${failed} check(s)` : '\nThe trade\'s lock screen holds.')
process.exit(failed ? 1 : 0)

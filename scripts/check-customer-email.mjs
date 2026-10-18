/**
 * The email fallback, checked without a database.
 *
 *   node scripts/check-customer-email.mjs
 *
 * When no push reached the customer, three moments go by email: set off,
 * window missed, the day-before ask. What an email may say is the lock-screen
 * rule (the trade, the van, the stage, the link) and never a time.
 */
import { emailFor, emailDecision, validEmail, EMAIL_KINDS } from '../src/lib/customer-email-words.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const base = { tradeName: 'Sam Hale Plumbing', host: 'www.getturnup.com', code: 'K7M4PQRT' }
const who = { name: 'Sam', vehicle: 'White Ford Transit Custom', reg: 'AB12CDE' }
const mails = Object.fromEntries(EMAIL_KINDS.map((kind) => [kind, emailFor({ ...base, kind, who, pushOn: true })]))

// What each one says
check(mails.ON_MY_WAY.subject === 'Sam from Sam Hale Plumbing is on the way', 'set off: subject names who is coming')
check(/has set off and is heading to you\. Look out for a White Ford Transit Custom, AB12CDE\./.test(mails.ON_MY_WAY.text), 'set off: the van and the plate, from Who to expect')
check(emailFor({ ...base, kind: 'ON_MY_WAY' }).subject === 'Sam Hale Plumbing is on the way', 'set off with no name on file: the business name, not "undefined"')
check(!/Look out/.test(emailFor({ ...base, kind: 'ON_MY_WAY', who: { name: 'Sam' } }).text), 'no van on file: no van line')
check(/wait, later today, or another day/.test(mails.MISSED.text) && /is sorry/.test(mails.MISSED.text), 'missed: the apology and the three choices')
check(/still fine, and will someone be in\?/i.test(mails.DAY_BEFORE.text), 'day before: the same two questions as the page')
for (const k of EMAIL_KINDS) check(mails[k].text.includes('https://www.getturnup.com/t/K7M4PQRT'), `${k}: carries the link`)
check(emailFor({ ...base, kind: 'RUNNING_LATE' }) === null, 'an unknown kind sends nothing')

// What none of them may say
const all = EMAIL_KINDS.map((k) => `${mails[k].subject}\n${mails[k].text}`)
check(all.every((t) => !/\b\d{1,2}[:.]\d{2}\b|\bminutes?\b|\b(arriv(e|ing) (at|by|in)|within|eta)\b/i.test(t)), 'no time, no minutes, no arrival promise in any of them')
check(all.every((t) => !/K7M4PQRT/.test(t.split('\n')[0])), 'the code is not in a subject (a mail preview is a lock screen)')
check(all.every((t) => !/[^\x00-\x7F]/.test(t)), 'plain ASCII, so no mail client mangles a dash')
check(all.every((t) => !/Rosebourne/i.test(t)), 'no other business named')

// The how-to only when the button exists
check(mails.ON_MY_WAY.text.includes('Tell me when they set off'), 'push configured: says how to get notifications instead')
check(!emailFor({ ...base, kind: 'ON_MY_WAY', who }).text.includes('Tell me when they set off'), 'push not configured: never points at a button that is not there')

// Whether to send
const go = { kind: 'ON_MY_WAY', pushed: 0, on: true, sm8: true, jobUuid: '1d2e3f40-1111-2222-3333-444455556666' }
check(emailDecision(go) === 'send', 'no push landed, switched on, linked job: send')
check(emailDecision({ ...go, pushed: 1 }) === 'skip:pushed', 'a push landed: the email is a fallback, never a second copy')
check(emailDecision({ ...go, on: false }) === 'skip:off', 'switched off: nothing')
check(emailDecision({ ...go, sm8: false }) === 'skip:no_servicem8', 'no ServiceM8 key: nothing')
check(emailDecision({ ...go, jobUuid: null }) === 'skip:not_linked', 'a card made by hand: no address to send to')
check(emailDecision({ ...go, kind: 'DONE' }) === 'skip:kind', 'Job done is not one of the three')

// Addresses
check(validEmail('sarah.jones@example.co.uk') && validEmail('  a@b.com '), 'an ordinary address passes, spaces trimmed')
check(!validEmail('07700 900123') && !validEmail('') && !validEmail(null) && !validEmail('sarah@') && !validEmail('Sarah <s@x.com>'), 'a phone number, a blank, a half address or a display name: not sent')

console.log(`\n${failed === 0 ? 'The email fallback holds.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

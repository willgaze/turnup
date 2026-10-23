/**
 * Connect Gmail, the pure parts, checked without Google.
 *
 *   node scripts/check-gmail-poll.mjs
 *
 * What is asked of Gmail (the query), what comes back (base64url raw), when
 * a token is refreshed, and where a sweep starts. The OAuth dance itself is
 * Google's and is proven by connecting; these are the parts that would fail
 * quietly if they drifted.
 */
import { gmailQuery, decodeRaw, needsRefresh, sweepFrom, GMAIL_SCOPE, SENDER_DOMAINS, validClientId, validClientSecret } from '../src/lib/gmail-words.js'
import { readRawEmail } from '../src/lib/mime.js'
import { readArrivalEmail } from '../src/lib/arrival-email.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

check(GMAIL_SCOPE === 'https://www.googleapis.com/auth/gmail.readonly', 'the scope is gmail.readonly and nothing wider')

const q = gmailQuery(1_760_000_000_000)
check(q.startsWith('after:1760000000 '), `the query starts after the last message read, in seconds (${q.slice(0, 22)}…)`)
check(/-in:spam -in:trash -in:sent/.test(q), 'spam, bin and sent mail are never read')
check(/from:\(royalmail\.com OR /.test(q) && /subject:\(order OR parcel/.test(q), 'a courier domain or a delivery word in the subject, nothing else')
check(!/OR OR|\(\)/.test(q) && q.split('(').length === q.split(')').length, 'the query is well formed')
check(SENDER_DOMAINS.every((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)), 'every sender is a bare domain')
check(gmailQuery(0).startsWith('after:0 ') && gmailQuery(undefined).startsWith('after:0 '), 'no floor reads as the epoch, never NaN')

// A raw message from Gmail is base64url; decoded, it is a normal email the
// reader already understands.
const eml = 'From: Evri <donotreply@evri.com>\r\nSubject: Your Evri parcel is on its way\r\nTo: the.oakleys@example.com\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nYour parcel H01ABCD1234567890 is on its way and should be with you on Thursday.\r\n'
const b64url = Buffer.from(eml, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
check(decodeRaw(b64url) === eml, 'base64url with padding stripped decodes to the email')
const read = readRawEmail(decodeRaw(b64url))
const got = read && readArrivalEmail({ ...read, receivedAt: new Date('2026-10-19T09:00:00Z') })
check(got?.carrier === 'Evri' && got?.stage === 'ON_THE_WAY', `a decoded Gmail message files like a forwarded one (${got?.carrier} / ${got?.stage})`)
check(decodeRaw('') === '' && decodeRaw(null) === '', 'nothing decodes to nothing')

const now = Date.parse('2026-10-19T09:00:00Z')
check(needsRefresh(now + 30_000, now) && !needsRefresh(now + 120_000, now) && needsRefresh(null, now), 'a token is refreshed a minute before it dies, and when nothing is known')
check(sweepFrom({ lastSeenAt: '2026-10-19T08:00:00Z' }, now) === Date.parse('2026-10-19T08:00:00Z'), 'a sweep starts after the newest message already read')
check(sweepFrom({ connectedAt: '2026-10-19T08:30:00Z' }, now) === Date.parse('2026-10-18T08:30:00Z'), 'the first sweep reaches one day back from connecting, no further')

// The two boxes on the panel: loose, Google is the real judge.
check(validClientId('123456789012-abc1def2ghi3jkl4mno5pqr6stu7vwx8.apps.googleusercontent.com'), 'a Google client ID passes')
check(!validClientId('123456789012') && !validClientId('GOCSPX-abcdefghijklmnop') && !validClientId(''), 'a bare number, a secret in the ID box, or nothing: refused')
check(validClientSecret('GOCSPX-abcdefghijklmnopqrstuvwxyz'), 'a Google client secret passes')
check(!validClientSecret('short') && !validClientSecret('has a space in it 1234567890') && !validClientSecret(''), 'too short, a space, or nothing: refused')

console.log(`\n${failed === 0 ? 'Connect Gmail holds.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)

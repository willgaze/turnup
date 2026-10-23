/**
 * The Wallet update service, proved without a database or Apple.
 *   node scripts/check-pass-service.mjs
 */
import { applePassToken, sinceDate, updatedSince, notModified, apnsVerdict } from '../src/lib/pass-update.js'

let n = 0; const fails = []
const eq = (what, got, want) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`) }

// The Authorization header.
eq('token', applePassToken('ApplePass 9f8e7d6c5b4a39281716'), '9f8e7d6c5b4a39281716')
eq('token, spaces', applePassToken('  ApplePass   abcdefgh  '), 'abcdefgh')
eq('token, bearer is not ours', applePassToken('Bearer abcdefghij'), null)
eq('token, missing', applePassToken(undefined), null)
eq('token, too short', applePassToken('ApplePass abc'), null)
eq('token, junk', applePassToken('ApplePass abc def'), null)

// The tag.
eq('since, none', sinceDate(undefined), null)
eq('since, empty', sinceDate(''), null)
eq('since, ms', sinceDate('1792736000000')?.toISOString(), '2026-10-23T06:13:20.000Z')
eq('since, junk', sinceDate('yesterday'), null)
eq('since, negative', sinceDate('-5'), null)

// What changed.
const t1 = new Date('2026-10-23T08:00:00.000Z'), t2 = new Date('2026-10-23T09:30:00.000Z')
const rows = [{ code: 'AAAAAAAA', updatedAt: t1 }, { code: 'BBBBBBBB', updatedAt: t2 }]
eq('all, first call', updatedSince(rows, null), { serialNumbers: ['AAAAAAAA', 'BBBBBBBB'], lastUpdated: String(t2.getTime()) })
eq('only the newer one', updatedSince(rows, t1), { serialNumbers: ['BBBBBBBB'], lastUpdated: String(t2.getTime()) })
eq('nothing since the newest', updatedSince(rows, t2), null)
eq('no passes', updatedSince([], null), null)
eq('a row with no date is ignored', updatedSince([{ code: 'CCCCCCCC' }], null), null)
eq('round trip: the tag we gave comes back as a date', updatedSince(rows, sinceDate(updatedSince(rows, null).lastUpdated)), null)

// If-Modified-Since.
eq('not modified, same second', notModified(new Date('2026-10-23T08:00:00.400Z'), 'Fri, 23 Oct 2026 08:00:00 GMT'), true)
eq('modified, next second', notModified(new Date('2026-10-23T08:00:01.000Z'), 'Fri, 23 Oct 2026 08:00:00 GMT'), false)
eq('no header: send it', notModified(new Date(), undefined), false)
eq('junk header: send it', notModified(new Date(), 'never'), false)

// APNs answers.
eq('apns 200', apnsVerdict(200), 'ok')
eq('apns 410', apnsVerdict(410, 'Unregistered'), 'drop')
eq('apns bad token', apnsVerdict(400, 'BadDeviceToken'), 'drop')
eq('apns wrong topic for token', apnsVerdict(400, 'DeviceTokenNotForTopic'), 'drop')
eq('apns bad topic (ours)', apnsVerdict(400, 'BadTopic'), 'cert')
eq('apns 403', apnsVerdict(403, 'BadCertificate'), 'cert')
eq('apns 429', apnsVerdict(429, 'TooManyRequests'), 'retry')
eq('apns 503', apnsVerdict(503), 'retry')
eq('apns 400 other', apnsVerdict(400, 'PayloadEmpty'), 'retry')

if (fails.length) { console.error(`check-pass-service: ${fails.length} of ${n} failed`); for (const f of fails) console.error('  ' + f); process.exit(1) }
console.log(`check-pass-service: ${n} cases pass. Register, list, fetch, unregister and the APNs verdicts behave.`)

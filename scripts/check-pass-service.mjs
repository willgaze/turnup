/**
 * The Apple Wallet web service, without a database or Apple (v1.70.2).
 *
 *   node scripts/check-pass-service.mjs
 *
 * Proves the rules in src/lib/pass-service-words.js, and reads the pass body
 * as source to prove only the stage can reach the lock screen: a field with a
 * changeMessage is one Wallet announces when it changes, and the stage is the
 * only field the lock-screen rule in CLAUDE.md allows there.
 */
import { readFileSync } from 'node:fs'
import {
  passAuthToken, walletAuthorised, cleanSerial, cleanOpaque, ourPassType,
  sinceFromTag, updatedSince, notModified,
} from '../src/lib/pass-service-words.js'

let failed = 0
let n = 0
const t = (name, cond) => { n++; if (!cond) { failed++; console.log(`FAIL  ${name}`) } }

const S = 'test-secret'
const tok = passAuthToken('CUTH4PGX', S)

// Auth
t('right token passes', walletAuthorised(`ApplePass ${tok}`, 'CUTH4PGX', S))
t('token for another pass fails', !walletAuthorised(`ApplePass ${tok}`, 'K7M4PQRT', S))
t('wrong scheme fails', !walletAuthorised(`Bearer ${tok}`, 'CUTH4PGX', S))
t('no header fails', !walletAuthorised(null, 'CUTH4PGX', S))
t('no secret: nobody passes', !walletAuthorised(`ApplePass ${passAuthToken('CUTH4PGX', '')}`, 'CUTH4PGX', ''))
t('truncated token fails', !walletAuthorised(`ApplePass ${tok.slice(0, 20)}`, 'CUTH4PGX', S))
t('same derivation as the pass has always carried',
  tok === '' + (await import('node:crypto')).createHmac('sha256', S).update('pass:CUTH4PGX').digest('hex'))

// Inputs
t('serial upper-cased', cleanSerial('cuth4pgx') === 'CUTH4PGX')
t('serial with a slash refused', cleanSerial('../etc') === null)
t('opaque id kept', cleanOpaque('a1b2c3d4e5') === 'a1b2c3d4e5')
t('opaque id with a space refused', cleanOpaque('a b') === null)
t('opaque id too long refused', cleanOpaque('a'.repeat(201)) === null)
t('our pass type', ourPassType('pass.com.getturnup.job', 'pass.com.getturnup.job'))
t('someone else\'s pass type', !ourPassType('pass.com.other', 'pass.com.getturnup.job'))
t('no configured type: nothing is ours', !ourPassType(undefined, undefined))

// Updated since
const rows = [
  { code: 'AAAA1111', updatedAt: '2026-10-23T08:00:00.000Z' },
  { code: 'BBBB2222', updatedAt: '2026-10-23T09:30:00.500Z' },
]
const all = updatedSince(rows, null)
t('no tag: every pass', all.serialNumbers.length === 2)
t('tag is the newest change, in ms', all.lastUpdated === String(Date.parse('2026-10-23T09:30:00.500Z')))
const some = updatedSince(rows, String(Date.parse('2026-10-23T09:00:00Z')))
t('tag: only the newer one', some.serialNumbers.join() === 'BBBB2222')
t('nothing newer: null (204)', updatedSince(rows, all.lastUpdated) === null)
t('junk tag treated as none', sinceFromTag('banana') === null)

// If-Modified-Since
t('same second: not modified', notModified('2026-10-23T09:30:00.500Z', 'Fri, 23 Oct 2026 09:30:00 GMT'))
t('a second later: modified', !notModified('2026-10-23T09:30:01.000Z', 'Fri, 23 Oct 2026 09:30:00 GMT'))
t('no header: modified', !notModified('2026-10-23T09:30:00Z', null))

// Lock screen: only the stage announces itself.
const src = readFileSync('src/lib/passkit.js', 'utf8')
const announced = [...src.matchAll(/\{[^{}]*changeMessage[^{}]*\}/g)].map((m) => (m[0].match(/key:\s*'(\w+)'/) || [])[1])
t('the stage carries a changeMessage', announced.includes('stage'))
t('nothing else does', announced.length === 1)
t('the changeMessage is the stage alone', /changeMessage:\s*'Now: %@'/.test(src))

if (failed) { console.log(`\n${failed} of ${n} failed`); process.exit(1) }
console.log(`pass service: ${n} checks passed`)

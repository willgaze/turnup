/**
 * The wallet pass update service's own half, checked without a database,
 * a certificate or a phone.
 *
 *   node scripts/check-pass-service.mjs
 *
 * What it can prove: the credential on a pass. What it cannot, and what the
 * first real card is for: that Apple's paths are the paths Wallet calls.
 * Apple's documentation renders in JavaScript and would not fetch from the
 * container this was written in, so the four routes are built from the
 * long-stable public spec and every one of them logs a line. If a card is
 * added and the Vercel log stays silent, the paths are the first thing to
 * check — this file cannot tell you that, and says so rather than implying
 * a coverage it does not have.
 */
import { createHmac } from 'node:crypto'

process.env.JWT_SECRET = 'test-secret-not-a-real-one'
process.env.PASSKIT_PASS_TYPE_ID = 'pass.com.getturnup.job'

const { passAuthToken, checkPassAuth, passTypeMatches, tagFor, sinceFromTag } =
  await import('../src/lib/pass-auth.js')

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const CODE = 'K7M4PQRT'
const token = passAuthToken(CODE)
const header = (t) => `ApplePass ${t}`

/* The token ------------------------------------------------------------- */

check(/^[0-9a-f]{64}$/.test(token), 'the token is a sha256 HMAC, hex')
check(token === createHmac('sha256', 'test-secret-not-a-real-one').update(`pass:${CODE}`).digest('hex'),
  'it is an HMAC of the code under JWT_SECRET, derived rather than stored')
check(passAuthToken('OTHERJOB') !== token, 'a different job has a different token')

/* Who gets in ----------------------------------------------------------- */

check(checkPassAuth(header(token), CODE) === true, 'the right token for the right job is accepted')
check(checkPassAuth(header(token), 'OTHERJOB') === false, "one job's token does not open another's")
check(checkPassAuth(header(passAuthToken('OTHERJOB')), CODE) === false, 'and not the other way round either')
check(checkPassAuth(`ApplePass ${token.slice(0, -1)}0`, CODE) === false, 'a near miss is refused')
check(checkPassAuth(`applepass ${token}`, CODE) === true, 'the scheme is matched case-insensitively, as HTTP headers are')
check(checkPassAuth(`  ApplePass   ${token}  `, CODE) === true, 'and around whitespace')

check(checkPassAuth(token, CODE) === false, 'a bare token with no scheme is refused')
check(checkPassAuth(`Bearer ${token}`, CODE) === false, 'and so is the wrong scheme')
check(checkPassAuth('ApplePass', CODE) === false, 'a scheme with no token is refused')
check(checkPassAuth('', CODE) === false, 'an empty header is refused')
check(checkPassAuth(null, CODE) === false, 'a missing header is refused')
check(checkPassAuth(header(token), '') === false, 'and a missing code is refused')

/* Failing closed -------------------------------------------------------- */

// The one that matters: with no secret every token is an HMAC of the empty
// string, so anyone able to compute one would be "authorised". It must refuse
// everything instead, the way requireOperator() does.
const keep = process.env.JWT_SECRET
delete process.env.JWT_SECRET
check(checkPassAuth(header(token), CODE) === false, 'with no JWT_SECRET nobody is authorised, never the reverse')
check(checkPassAuth(header(passAuthToken(CODE)), CODE) === false, 'not even a token computed in the same state')
process.env.JWT_SECRET = keep
check(checkPassAuth(header(token), CODE) === true, 'and it works again once the secret is back')

/* The pass type --------------------------------------------------------- */

check(passTypeMatches('pass.com.getturnup.job') === true, 'our own pass type matches')
check(passTypeMatches('pass.com.someone.else') === false, "somebody else's does not")
check(passTypeMatches('') === false, 'an empty pass type does not')
check(passTypeMatches(undefined) === false, 'nor a missing one')
const keepType = process.env.PASSKIT_PASS_TYPE_ID
delete process.env.PASSKIT_PASS_TYPE_ID
check(passTypeMatches('pass.com.getturnup.job') === false, 'and with none configured nothing matches, rather than everything')
process.env.PASSKIT_PASS_TYPE_ID = keepType

/* The passesUpdatedSince tag -------------------------------------------- */

const when = new Date('2026-10-23T09:15:00Z')
check(tagFor(when) === String(when.getTime()), 'the tag is milliseconds since the epoch')
check(sinceFromTag(tagFor(when)).getTime() === when.getTime(), 'and it reads back to the same instant')

// A device that has never asked sends nothing. That has to mean "everything
// you hold", not "nothing" — otherwise a reinstalled phone never updates
// again, which is a card that is silently wrong for ever.
check(sinceFromTag(undefined).getTime() === 0, 'no tag means the beginning of time, not now')
check(sinceFromTag('').getTime() === 0, 'and so does an empty one')
check(sinceFromTag('nonsense').getTime() === 0, 'and so does a tag that is not a number')
check(sinceFromTag('-5').getTime() === 0, 'and a negative one')
check(sinceFromTag('0').getTime() === 0, 'zero is the beginning of time too')

/* Whether a push can even be attempted ----------------------------------- */

// The audit of 23 Oct 2026, the day the first real card appeared: the private
// key scripts/apple-wallet.sh writes is AES-256 ENCRYPTED, so APNs needs
// PASSKIT_KEY_PASSWORD as well. The gate did not look at it, so with the
// passphrase missing it answered "configured", the TLS handshake failed, the
// error was swallowed (correctly — a stage tap must survive) and every card
// quietly stopped updating with nothing in the log. A gate that opens onto
// nothing is the mistake this product has shipped twice.
const { apnsConfigured, apnsMissing } = await import('../src/lib/pass-auth.js')

const ENCRYPTED = '-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-256-CBC,00\n\nabc\n-----END RSA PRIVATE KEY-----'
const PLAIN = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'

const apns = (key, password) => {
  process.env.PASSKIT_CERT_PEM = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
  process.env.PASSKIT_PASS_TYPE_ID = 'pass.com.getturnup.job'
  if (key === null) delete process.env.PASSKIT_KEY_PEM
  else process.env.PASSKIT_KEY_PEM = key
  if (password === null) delete process.env.PASSKIT_KEY_PASSWORD
  else process.env.PASSKIT_KEY_PASSWORD = password
  return apnsConfigured()
}

check(apns(PLAIN, null) === true, 'an unencrypted key needs no passphrase')
check(apns(ENCRYPTED, 'hunter2') === true, 'an encrypted key with its passphrase is ready to push')
check(apns(ENCRYPTED, null) === false,
  'an encrypted key with NO passphrase is NOT ready, rather than ready and silently broken')
check(apnsMissing().some((m) => m.key === 'PASSKIT_KEY_PASSWORD'),
  'and it names the passphrase, so a card that never updates is diagnosable')
check(apns(null, 'hunter2') === false, 'no key at all is not ready')
check(apnsMissing().some((m) => m.key === 'PASSKIT_KEY_PEM'), 'and it names the key')

delete process.env.PASSKIT_CERT_PEM
check(apnsConfigured() === false, 'and no certificate is not ready')

console.log(failed ? `\nFAILED — ${failed} check(s)` : '\nThe pass credential holds, and a push that cannot be sent says so.')
process.exit(failed ? 1 : 0)

/**
 * The Google Wallet card, decided without a database, a network or a key.
 *
 *   node scripts/check-google-wallet.mjs
 *
 * Google's shapes were checked against their own pages on 25 Oct 2026, not
 * recalled -- recalling Apple's `webServiceURL` cost two days this week. What
 * a check can hold still is the part that is ours: the ids, what the card
 * says, what a stage change sends, and **the 1,800-character ceiling on a
 * save link**, which is the one limit that turns a working button into a
 * button that looks fine and does nothing.
 */
import {
  CLASS_SUFFIX, MAX_JWT, NAME_MAX, ADDRESS_MAX, classId, objectId, buildClass,
  buildObject, saveClaims, saveUrl, jwtTooLong, objectResource, patchForStage,
  glance, cardText,
} from '../src/lib/google-wallet-words.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const ISSUER = '3388000000012345678'
const EMAIL = 'turnup-wallet@turnup-wallet.iam.gserviceaccount.com'
const ORIGIN = 'https://www.getturnup.com'
const STAGE = { key: 'ON_MY_WAY', label: 'On my way', position: '2 of 4' }
const STATUS = {
  code: 'K7M4PQRT',
  customerName: 'Sam Hale',
  jobAddress: '14 Harbour Row, Anytown, AN1 2BC',
  jobSummary: 'Replace the cylinder',
}

/* Where a card lives --------------------------------------------------- */

check(classId(ISSUER) === `${ISSUER}.${CLASS_SUFFIX}`, 'the class id is <issuerId>.<suffix>')
check(objectId(ISSUER, 'K7M4PQRT') === `${ISSUER}.job_k7m4pqrt`, 'an object id is <issuerId>.job_<code>')
check(objectId(ISSUER, 'k7m4pqrt') === objectId(ISSUER, 'K7M4PQRT'), 'and the case of the code does not matter')
check(objectId(ISSUER, 'K7M4/../PQRT') === `${ISSUER}.job_k7m4pqrt`,
  'anything outside Google’s alphabet is dropped, so a code can never climb out of its id')
check(objectId(ISSUER, '') === null, 'no code, no id')
check(objectId('', 'K7M4PQRT') === null, 'no issuer, no id')
check(!objectId(ISSUER, 'K7M4PQRT').endsWith(`.${CLASS_SUFFIX}`),
  'a job id can never collide with the class id')

/* What the card says ---------------------------------------------------- */

const obj = buildObject({ issuerId: ISSUER, status: STATUS, stage: STAGE, tradeName: 'Sam Hale Plumbing', origin: ORIGIN })
const flat = JSON.stringify(obj)

check(obj.classId === classId(ISSUER), 'the object belongs to our one class')
check(obj.header.defaultValue.value === 'On my way', 'the header is the stage, which is what the reader came for')
check(obj.cardTitle.defaultValue.value === 'Sam Hale Plumbing', 'the title is the trade, from a setting')
check(obj.barcode.value === `${ORIGIN}/t/K7M4PQRT`, 'the QR opens the full status page')
check(obj.barcode.alternateText === 'K7M4PQRT', 'with the code readable under it, as on the Apple pass')
check(obj.state === 'ACTIVE', 'the card is active')

// The link is the credential, and a card is as forwardable as a link. What
// the customer told the trade must never be on it -- the same rule as
// publicShape(), checked here because this is a second surface that grew the
// same way the first one did.
for (const secret of ['presence', 'accessNotes', 'doorNote', 'dog', 'housePhoto', 'doorPhoto', 'customerPhone', 'mapPin', 'inboxKey']) {
  check(!flat.includes(secret), `the card carries no ${secret}`)
}
check(!flat.includes('"id"') || !flat.includes('externalId'), 'and no internal identifiers')

/* A card is a glance, and the link has a ceiling ------------------------ */

check(glance('Sam Hale', NAME_MAX) === 'Sam Hale', 'a short name is left alone')
check(glance('x'.repeat(100), 10).length === 10, 'a long one is cut to the limit')
check(glance('x'.repeat(100), 10).endsWith('\u2026'), 'and says it was cut')
check(glance('The Old Coach House, Upper Longbottom Road', 20) === 'The Old Coach\u2026',
  'it cuts on a word where there is one near the limit, rather than mid-word')
check(glance('', 10) === '', 'nothing stays nothing')
check(glance(null, 10) === '', 'and so does nothing at all')

// The same builder makes the card and the update, so the two can never drift
// into saying different things about the same job.
const a = JSON.stringify(cardText({ status: STATUS, stage: STAGE }))
const b = JSON.stringify(buildObject({ issuerId: ISSUER, status: STATUS, stage: STAGE, tradeName: 'T', origin: ORIGIN }).textModulesData)
check(a === b, 'the card and an update are built from one list, so they cannot disagree')

/* A stage change -------------------------------------------------------- */

const patch = patchForStage({ stage: { ...STAGE, key: 'ON_SITE', label: 'On site', position: '3 of 4' }, status: STATUS })
check(patch.header.defaultValue.value === 'On site', 'a stage change sends the new stage')
check(!('barcode' in patch), 'and does not re-send the barcode, which never changes')
check(!('classId' in patch), 'and does not re-send the class')
check(!JSON.stringify(patch).includes('presence'), 'and carries nothing the customer said')

check(objectResource(ISSUER, 'K7M4PQRT').endsWith(`/genericObject/${ISSUER}.job_k7m4pqrt`),
  'the REST resource for an update is the object id')
check(objectResource(ISSUER, 'K7M4PQRT').startsWith('https://walletobjects.googleapis.com/walletobjects/v1/'),
  'on walletobjects.googleapis.com, v1')

/* The save link --------------------------------------------------------- */

const claims = saveClaims({ serviceAccountEmail: EMAIL, issuerId: ISSUER, object: obj, origin: ORIGIN, now: 1760000000000 })
check(claims.iss === EMAIL, 'the JWT is issued by the service account')
check(claims.aud === 'google', "the audience is always 'google'")
check(claims.typ === 'savetowallet', "the type is 'savetowallet'")
check(claims.iat === 1760000000, 'iat is in seconds, not milliseconds')
check(JSON.stringify(claims.origins) === '["www.getturnup.com"]', 'origins names our own host')
check(claims.payload.genericObjects.length === 1, 'one object rides in the payload')
check(!claims.payload.genericClasses,
  'and the class does NOT: carrying it put a real card 294 characters over the ceiling')

const withClass = saveClaims({ serviceAccountEmail: EMAIL, issuerId: ISSUER, object: obj, origin: ORIGIN, withClass: true })
check(withClass.payload.genericClasses[0].id === classId(ISSUER),
  'it can be carried when the class could not be made, and then it is the same ceiling that decides')

check(saveUrl('abc') === 'https://pay.google.com/gp/v/save/abc', 'the save link is pay.google.com/gp/v/save/<jwt>')

/* The ceiling that turns a button into a lie ---------------------------- */

check(MAX_JWT === 1800, "Google's ceiling on a save link is 1,800 characters")
check(jwtTooLong('x'.repeat(1801)) === true, 'a link over it is refused')
check(jwtTooLong('x'.repeat(1800)) === false, 'one exactly at it is not')
check(jwtTooLong('') === false, 'and an empty one is not "too long"')

// The real card has to fit, with room for the signature. The claims are what
// we control; base64url of them plus a 2048-bit RS256 signature is about
// 350 characters on top.
const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url')
const estimate = encoded.length + 400
check(estimate < MAX_JWT,
  `a real card fits in a save link: about ${estimate} characters of ${MAX_JWT}`)

// A long address is the realistic way this breaks, so check the worst one.
const longStatus = { ...STATUS, customerName: 'Christopher Bartholomew-Fetherstonhaugh', jobAddress: 'Flat 14b, The Old Coach House, Someone Memorial Buildings, Upper Longbottom Road, Anytown-upon-Water, AN11 2BC' }
const longObj = buildObject({ issuerId: ISSUER, status: longStatus, stage: STAGE, tradeName: 'Sam Hale Plumbing and Heating Services Limited', origin: ORIGIN })
const longClaims = saveClaims({ serviceAccountEmail: EMAIL, issuerId: ISSUER, object: longObj, origin: ORIGIN })
const longEstimate = Buffer.from(JSON.stringify(longClaims)).toString('base64url').length + 400
check(longEstimate < MAX_JWT,
  `and so does a long name at a long address: about ${longEstimate} of ${MAX_JWT}`)

// A percentage would be a guess. What actually makes this safe is that EVERY
// variable field is capped, so the figure above is not a sample of a long
// card -- it is the longest card that can exist. Check that, rather than
// hoping. If a future field arrives uncapped, these fail and say which.
const monster = buildObject({
  issuerId: ISSUER,
  status: { code: 'ZZZZZZZZ', customerName: 'Q'.repeat(300), jobAddress: 'W'.repeat(300) },
  stage: { label: 'Back on site', position: '10 of 10' },
  tradeName: 'E'.repeat(300),
  origin: ORIGIN,
})
const monsterJson = JSON.stringify(monster)
check(!monsterJson.includes('Q'.repeat(NAME_MAX + 1)), 'a 300-character customer name cannot reach the card')
check(!monsterJson.includes('W'.repeat(ADDRESS_MAX + 1)), 'nor a 300-character address')
check(!monsterJson.includes('E'.repeat(NAME_MAX + 1)), 'nor a 300-character trade name')

const worst = Buffer.from(JSON.stringify(saveClaims({
  serviceAccountEmail: 'a'.repeat(80) + '@a.iam.gserviceaccount.com',
  issuerId: ISSUER, object: monster, origin: ORIGIN,
}))).toString('base64url').length
// An RS256 signature over a 2048-bit service account key is 342 characters of
// base64url; 400 is the allowance, and a header is about 40.
const SIGNATURE = 400
check(worst + SIGNATURE < MAX_JWT,
  `the LONGEST card that can exist still fits: ${worst + SIGNATURE} of ${MAX_JWT}, with every field at its cap`)

console.log(failed
  ? `\nFAILED - ${failed} check(s)`
  : '\nThe Google card says the right things, in a link short enough to survive a browser.')
process.exit(failed ? 1 : 0)

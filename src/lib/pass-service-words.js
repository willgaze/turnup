import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The pure half of the Apple Wallet web service (v1.70.2). No database, no
 * network, so `node scripts/check-pass-service.mjs` can prove it.
 *
 * Why it exists: a pass added to Wallet carried the stage at the moment it was
 * added and never moved again. Job #2742 was Job done on the dashboard and its
 * pass still said "Booked in, Step 1 of 4", because the pass named a web
 * service (`webServiceURL`) that had never been built. Wallet was asking and
 * getting a 404. This is that service, to Apple's spec:
 * https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
 */

// The token Wallet sends back on every call. Derived rather than stored, so
// there is no extra column and nothing to leak from the database: only
// something holding JWT_SECRET can reproduce it. Same derivation the pass has
// carried since it was first built, so passes already in a wallet still work.
export function passAuthToken(code, secret = process.env.JWT_SECRET) {
  return createHmac('sha256', secret || '').update(`pass:${code}`).digest('hex')
}

// "Authorization: ApplePass <token>". Constant-time, and never true without a
// secret: no JWT_SECRET means nobody's token is good, never everybody's.
export function walletAuthorised(header, code, secret = process.env.JWT_SECRET) {
  if (!secret || !code) return false
  const m = /^ApplePass\s+(\S+)$/.exec(String(header || '').trim())
  if (!m) return false
  const want = Buffer.from(passAuthToken(code, secret))
  const got = Buffer.from(m[1])
  return got.length === want.length && timingSafeEqual(got, want)
}

// Serial numbers are tracker codes: the code alphabet, upper case, short.
export function cleanSerial(serial) {
  const s = String(serial || '').toUpperCase()
  return /^[A-Z0-9]{4,32}$/.test(s) ? s : null
}

// deviceLibraryIdentifier and pushToken are opaque strings from Apple. Bound
// them rather than trust them.
export function cleanOpaque(value, max = 200) {
  const s = String(value || '').trim()
  return s && s.length <= max && /^[A-Za-z0-9._-]+$/.test(s) ? s : null
}

// Only answer for our own pass type: anything else is somebody else's pass.
export function ourPassType(passTypeId, configured = process.env.PASSKIT_PASS_TYPE_ID) {
  return Boolean(configured) && passTypeId === configured
}

// The "updated since" tag is a millisecond count. Wallet hands back whatever
// we gave it last time, verbatim.
export function sinceFromTag(tag) {
  const n = Number(tag)
  return Number.isFinite(n) && n > 0 ? new Date(n) : null
}

/**
 * Which of a device's passes changed since the tag it holds.
 * rows: [{ code, updatedAt }]. Returns null for "nothing" (Wallet wants 204).
 */
export function updatedSince(rows, tag) {
  const since = sinceFromTag(tag)
  const changed = rows.filter((r) => !since || new Date(r.updatedAt) > since)
  if (!changed.length) return null
  const latest = Math.max(...changed.map((r) => new Date(r.updatedAt).getTime()))
  return { serialNumbers: changed.map((r) => r.code), lastUpdated: String(latest) }
}

// If-Modified-Since is second-granular; updatedAt is not. A pass is unchanged
// when its updatedAt, floored to the second, is not after the header.
export function notModified(updatedAt, ifModifiedSince) {
  if (!ifModifiedSince) return false
  const ims = Date.parse(ifModifiedSince)
  if (!Number.isFinite(ims)) return false
  return Math.floor(new Date(updatedAt).getTime() / 1000) * 1000 <= ims
}

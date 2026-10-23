/**
 * The credential on a wallet pass.
 *
 * The tracking link's own rule is that the code in the URL is the credential.
 * A pass cannot work that way: Wallet calls the update service from a phone
 * with no cookie and no session, so Apple's design is a token baked into the
 * pass and sent back as `Authorization: ApplePass <token>`.
 *
 * It is DERIVED, not stored: an HMAC of the code under `JWT_SECRET`. So there
 * is no column to add, nothing extra to leak if the database is read, and the
 * token for a job is reproducible only by something holding the secret. It
 * also means revoking a link (`isActive: false`) revokes the pass's service
 * calls too, because every route checks the row as well as the token.
 *
 * Pure and relative-imported so scripts/check-pass-service.mjs can run it
 * without a database or a bundler.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** The token baked into the pass, and sent back on every update call. */
export function passAuthToken(code) {
  return createHmac('sha256', process.env.JWT_SECRET || '').update(`pass:${code}`).digest('hex')
}

/**
 * Is this `Authorization` header the right token for this job?
 *
 * Three things it refuses, each of which is a real way to get this wrong:
 *
 *   - **No JWT_SECRET.** Then every token is an HMAC of the empty string, so
 *     anyone who can compute one is "authorised". It fails closed instead,
 *     the same way `requireOperator()` does.
 *   - **A different scheme.** Apple sends `ApplePass <token>`. A bare token,
 *     or `Bearer`, is not this service's caller.
 *   - **A near miss, in variable time.** `===` on a secret leaks its prefix
 *     to anyone willing to measure, so the compare is `timingSafeEqual` over
 *     equal-length buffers.
 */
export function checkPassAuth(header, code) {
  if (!process.env.JWT_SECRET) return false
  if (!header || !code) return false

  const m = /^ApplePass\s+(.+)$/i.exec(String(header).trim())
  if (!m) return false

  const given = Buffer.from(m[1].trim(), 'utf8')
  const want = Buffer.from(passAuthToken(code), 'utf8')
  if (given.length !== want.length) return false
  return timingSafeEqual(given, want)
}

/**
 * Apple sends the pass type on every call. It must be the one this deployment
 * signs with: a request for somebody else's pass type is not ours to answer,
 * and matching it loosely would let a wrong `PASSKIT_PASS_TYPE_ID` look like
 * it was working right up until the certificate rejected the signature.
 */
export function passTypeMatches(passTypeIdentifier) {
  const ours = process.env.PASSKIT_PASS_TYPE_ID || ''
  return Boolean(ours) && String(passTypeIdentifier || '') === ours
}

/**
 * The `passesUpdatedSince` tag, and reading one back.
 *
 * Apple hands back whatever tag we last gave that device and asks what has
 * changed since. Milliseconds since the epoch is the simplest honest answer:
 * it compares directly against a row's `updatedAt`, and a device that has
 * never asked sends nothing, which must mean "everything you hold", not
 * "nothing" — a zero here is the difference between a card that catches up
 * after a reinstall and one that never updates again.
 */
export const tagFor = (date) => String(new Date(date).getTime())

export function sinceFromTag(tag) {
  const n = Number(tag)
  if (!tag || !Number.isFinite(n) || n < 0) return new Date(0)
  return new Date(n)
}

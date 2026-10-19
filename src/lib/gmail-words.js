/**
 * Connect Gmail: the pure half (src/lib/gmail.js does the OAuth and fetching).
 *
 * Stage 1 of docs/research/inbox-connect.md: the owner's own Google Workspace
 * mailbox, as an Internal app, which Google does not review. The scope is
 * gmail.readonly: there is no narrower scope that can read a body, and
 * gmail.metadata cannot search (both are restricted; see the research).
 *
 * READ THE MINIMUM. The query below is what is asked of Gmail, so a sweep
 * fetches delivery-shaped mail and nothing else: a courier's domain, or a
 * subject that names an order or a parcel. Everything fetched then goes
 * through the same reader as a forwarded email, and what is not an arrival
 * is dropped unread by anyone. Bodies are never stored; the card keeps the
 * row the reader made.
 *
 * Checked by node scripts/check-gmail-poll.mjs.
 */

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
export const GMAIL_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
// The two Google hosts a test can stand in for (a fake on localhost, as the
// ServiceM8 tests do with SM8_API_BASE). Production never sets them.
export const GMAIL_TOKEN = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token'
export const GMAIL_REVOKE = 'https://oauth2.googleapis.com/revoke'
export const GMAIL_API = `${(process.env.GMAIL_API_BASE || 'https://gmail.googleapis.com').replace(/\/$/, '')}/gmail/v1/users/me`

// Couriers and shops whose mail is worth reading, by domain, and the words a
// shop puts in a subject about something coming to the door. Kept short on
// purpose: the reader decides what is an arrival, this only decides what is
// fetched. A domain added here should also be in CARRIERS (arrival-email.js)
// if it is a courier.
export const SENDER_DOMAINS = [
  'royalmail.com', 'parcelforce.com', 'evri.com', 'dpd.co.uk', 'dpdlocal.co.uk', 'dhl.com', 'ups.com',
  'fedex.com', 'inpost.co.uk', 'yodel.co.uk', 'amazon.co.uk', 'amazon.com', 'ikea.com', 'argos.co.uk',
  'johnlewis.com', 'screwfix.com', 'toolstation.com', 'samsung.com', 'apple.com', 'currys.co.uk',
]
export const SUBJECT_WORDS = ['order', 'parcel', 'delivery', 'delivered', 'dispatched', 'despatched', 'shipped', '"on its way"', '"out for delivery"', 'collection', 'tracking']

/** The Gmail search for one sweep: after a moment, delivery-shaped, not junk. */
export function gmailQuery(sinceMs) {
  const after = Math.max(0, Math.floor(Number(sinceMs || 0) / 1000))
  const from = `from:(${SENDER_DOMAINS.join(' OR ')})`
  const subject = `subject:(${SUBJECT_WORDS.join(' OR ')})`
  return `after:${after} -in:spam -in:trash -in:sent (${from} OR ${subject})`
}

/** Gmail hands a raw message back base64url-encoded. */
export function decodeRaw(raw) {
  if (!raw) return ''
  const b64 = String(raw).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64 + '==='.slice((b64.length + 3) % 4), 'base64').toString('utf8')
}

/** Refresh a minute early, so a call never goes out with a token about to die. */
export const needsRefresh = (expiresAt, now = Date.now()) => !expiresAt || new Date(expiresAt).getTime() - now < 60_000

/** Where a sweep starts: after the newest message already read, else a day back. */
export function sweepFrom({ lastSeenAt, connectedAt }, now = Date.now()) {
  if (lastSeenAt) return new Date(lastSeenAt).getTime()
  const since = connectedAt ? new Date(connectedAt).getTime() - 86_400_000 : now - 86_400_000
  return Math.max(0, since)
}

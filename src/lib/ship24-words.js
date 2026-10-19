import { createHmac } from 'node:crypto'

/**
 * Tracking by number: the pure half (src/lib/ship24.js does the fetching).
 *
 * One dispatch email carries the courier's reference. From then on the
 * courier's own scans can move the row, through Ship24's webhooks, without
 * the household forwarding another email. Ship24 was chosen in
 * docs/research/inbox-connect.md: webhooks on every tier, UK couriers, and a
 * free tier big enough for one household.
 *
 * THE RULE STILL HOLDS. A webhook says what the courier has scanned: in
 * transit, out for delivery, delivered. It is a fact about the past, filed as
 * a stage. The courier's estimated delivery date is the courier's claim, and
 * this file does not copy it onto the card; the card says what has happened.
 *
 * Checked by node scripts/check-ship24.mjs with Ship24's own example payload.
 */

/** Ship24's statusMilestone, to the card's stage. Null means "no stage change". */
export const MILESTONE_STAGE = {
  pending: null,                // tracker made, no scan yet
  info_received: null,          // the courier has a label; nothing is moving yet
  in_transit: 'ON_THE_WAY',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  failed_attempt: 'MISSED',
  available_for_pickup: 'MISSED', // left at a shop or locker: the note says so
  delivered: 'DONE',
  exception: null,              // held, returned, damaged: the note says so
}

export const stageForMilestone = (m) => MILESTONE_STAGE[String(m || '').toLowerCase()] ?? null

// The card's own order of stages, so a late webhook about an earlier scan
// cannot move a row backwards. Same table as src/lib/arrivals.js; a MISSED
// can follow anything and anything can follow a MISSED.
const RANK = { ORDERED: 0, BOOKED: 1, ON_THE_WAY: 2, OUT_FOR_DELIVERY: 3, DONE: 4 }
export function nextStage(current, incoming) {
  if (!incoming) return current
  if (incoming === 'MISSED' || current === 'MISSED') return incoming
  return (RANK[incoming] ?? -1) >= (RANK[current] ?? -1) ? incoming : current
}

/**
 * The webhook body, read down to what the card needs: one entry per tracking,
 * with every number the courier knows it by, the milestone, and the courier's
 * latest words (for the row's note, attributed). Tolerates every optional
 * field being absent, as Ship24's docs ask.
 */
export function readWebhook(body) {
  const list = Array.isArray(body?.trackings) ? body.trackings : []
  const out = []
  for (const t of list) {
    const tracker = t?.tracker || {}
    const shipment = t?.shipment || {}
    const events = Array.isArray(t?.events) ? t.events : []
    const latest = events.slice().sort((a, b) => String(b.datetime || b.occurrenceDatetime || '').localeCompare(String(a.datetime || a.occurrenceDatetime || '')))[0] || null
    const numbers = new Set()
    if (tracker.trackingNumber) numbers.add(String(tracker.trackingNumber))
    for (const n of Array.isArray(shipment.trackingNumbers) ? shipment.trackingNumbers : []) if (n?.tn) numbers.add(String(n.tn))
    const milestone = String(shipment.statusMilestone || latest?.statusMilestone || '').toLowerCase() || null
    out.push({
      trackerId: tracker.trackerId ? String(tracker.trackerId) : null,
      clientTrackerId: tracker.clientTrackerId ? String(tracker.clientTrackerId) : null,
      trackingNumbers: [...numbers],
      milestone,
      stage: stageForMilestone(milestone),
      status: latest?.status ? String(latest.status).slice(0, 140) : null,
      location: latest?.location ? String(latest.location).slice(0, 80) : null,
      at: latest?.datetime || latest?.occurrenceDatetime || null,
      courierCode: latest?.courierCode || null,
    })
  }
  return out
}

/**
 * The line the card shows under the row: the courier's own words, said to be
 * theirs. "Delivered to the addressee, SAN RAFAEL" is a fact they recorded;
 * the card repeats it and names them, and never adds a time of its own.
 */
export function noteFor(entry, courier) {
  if (!entry?.status) return null
  const who = courier || 'The courier'
  const where = entry.location ? ` (${entry.location})` : ''
  return `${who} says: ${entry.status}${where}.`
}

/**
 * The webhook URL's secret, derived from JWT_SECRET the way the ServiceM8
 * webhook's is, so connecting Ship24 adds one setting (the API key) and not
 * two. SHIP24_WEBHOOK_TOKEN overrides it.
 */
export function webhookTokenFrom({ SHIP24_WEBHOOK_TOKEN, JWT_SECRET } = {}) {
  if (SHIP24_WEBHOOK_TOKEN) return SHIP24_WEBHOOK_TOKEN
  if (!JWT_SECRET) return null
  return createHmac('sha256', JWT_SECRET).update('ship24-webhook').digest('hex').slice(0, 40)
}

/**
 * The courier's name for Ship24's hint. A shop's dispatch email names the shop
 * as the sender and a courier in the tracking link, so the link's host is the
 * better witness: "Harbour Home" posted it, Royal Mail is carrying it. Ship24
 * detects the courier from the number anyway; this only helps it.
 */
const HOSTS = [
  [/royalmail\.com$/, 'Royal Mail'], [/parcelforce\.com$/, 'Parcelforce'], [/evri\.com$/, 'Evri'],
  [/dpd(local)?\.co\.uk$/, 'DPD'], [/dhl\.com$/, 'DHL'], [/ups\.com$/, 'UPS'], [/fedex\.com$/, 'FedEx'],
  [/inpost\.co\.uk$/, 'InPost'], [/yodel\.co\.uk$/, 'Yodel'], [/amazon\.(co\.uk|com)$/, 'Amazon'],
]
export function courierNameFor(arrival) {
  try {
    const host = new URL(arrival?.trackUrl || '').hostname.replace(/^www\./, '')
    const hit = HOSTS.find(([re]) => re.test(host))
    if (hit) return hit[1]
  } catch { /* no link, or not a URL */ }
  return arrival?.carrier ? String(arrival.carrier).slice(0, 60) : null
}

/** Ship24 sends `Authorization: Bearer <webhook secret>` when one is set in its dashboard. */
export function webhookAuthorised(header, secret) {
  if (!secret) return true // not configured: the URL token is the lock
  return String(header || '') === `Bearer ${secret}`
}

import { NextResponse } from 'next/server'
import { cleanText } from '@/lib/clean-text'
import { createPlace, inboxAddress } from '@/lib/arrivals'
import { INBOUND_HOST, inboundConfigured } from '@/lib/inbound-config'
import { letterboxDns } from '@/lib/dns-check'

/**
 * A household making its own card, from the end of /join (v1.63.0).
 *
 * Until now only the trade could make one, from the dashboard. This is the
 * "let a household make a card themselves" that CLAUDE.md listed as still to
 * do. It is public and unauthenticated, so it is held to the same rules as
 * the waiting list:
 *
 *   - Throttled per IP. Per-instance memory, so a speed bump and not a lock,
 *     the same honesty as the login and the waiting list.
 *   - It takes one thing: a name for the card, through cleanText(). The card
 *     is a link that gets forwarded, so the name is the only thing on it that
 *     the household chose, and /join suggests "Sarah's home" rather than the
 *     street. Nothing else from /join comes here: the pin, the photos and the
 *     people stay on the phone, as /privacy says.
 *   - It hands back both halves, once, to the browser that asked: the code
 *     (read, /h/<code>) and the inbox address (write). That browser is the
 *     household's own; nowhere else ever shows the inbox, and the card itself
 *     never does (cardShape() and scripts/check-public-shape.mjs).
 *
 * GET answers whether the letterbox is actually receiving, so /join shows the
 * forwarding address only when mail sent to it would arrive. Handing out an
 * address nothing is listening on is the push row that opened onto an empty
 * drawer, again.
 */
export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_IP = 3
const hits = new Map()

function tooMany(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  hits.set(ip, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k)
  }
  return recent.length >= MAX_PER_IP
}

// Two DNS-over-HTTPS lookups per ask, on an open URL: remembered for a minute
// per instance, so a page left open or a script cannot turn it into a stream
// of lookups. A minute late in noticing the letterbox open costs nothing.
let lastAsked = { at: 0, receiving: false }

export async function GET() {
  if (Date.now() - lastAsked.at > 60_000) {
    let receiving = false
    try {
      if (await inboundConfigured()) {
        const dns = await letterboxDns(INBOUND_HOST)
        receiving = dns.mailRouted === true
      }
    } catch { /* unknown is not receiving */ }
    lastAsked = { at: Date.now(), receiving }
  }
  return NextResponse.json({ receiving: lastAsked.receiving }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (tooMany(ip)) return NextResponse.json({ error: 'too_many' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const label = cleanText(body?.label, 40)
  try {
    hits.set(ip, [...(hits.get(ip) || []), Date.now()])
    const place = await createPlace(label)
    if (!place) return NextResponse.json({ error: 'not_made' }, { status: 503 })
    return NextResponse.json({ code: place.code, label: place.label, inbox: inboxAddress(place.inboxKey) })
  } catch (error) {
    // Most likely the Place table is missing on this database. Say it did not
    // work rather than hand back a link to a card that does not exist.
    console.error('self-made card failed:', error?.code || error?.message)
    return NextResponse.json({ error: 'not_made' }, { status: 503 })
  }
}

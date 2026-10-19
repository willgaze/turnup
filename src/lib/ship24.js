import { prisma } from '@/lib/prisma'
import { readWebhook, nextStage, noteFor, webhookTokenFrom, webhookAuthorised, courierNameFor } from '@/lib/ship24-words'

/**
 * Tracking by number, through Ship24 (docs.ship24.com).
 *
 * When an arrival has a courier's reference, a tracker is registered with
 * Ship24 and its webhook moves the row from then on: one email in, the rest
 * from the courier's scans. Dark until SHIP24_API_KEY is set, and every call
 * here fails soft: a card never waits on, or breaks because of, a tracking
 * service.
 *
 * Creating a tracker is idempotent at Ship24 (same number, same tracker), so
 * a retry costs nothing. Each tracker is one shipment on the plan, which is
 * why only rows with a known courier and a reference are registered, and only
 * while they are still moving.
 */

const BASE = (process.env.SHIP24_API_BASE || 'https://api.ship24.com').replace(/\/$/, '')
const TIMEOUT_MS = 8_000

export const ship24Configured = () => Boolean(process.env.SHIP24_API_KEY)
export const ship24WebhookToken = () => webhookTokenFrom(process.env)
export const ship24WebhookUrl = (origin) => { const t = ship24WebhookToken(); return t ? `${origin}/api/ship24/webhook/${t}` : null }

async function api(path, init = {}) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...init, signal: ctl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${process.env.SHIP24_API_KEY}`, ...(init.headers || {}) },
    })
    const text = await r.text()
    let json = null; try { json = text ? JSON.parse(text) : null } catch { json = null }
    if (!r.ok) { const e = new Error(`ship24_http_${r.status}${json?.errors?.[0]?.message ? `: ${json.errors[0].message}` : ''}`); e.status = r.status; throw e }
    return json
  } finally { clearTimeout(t) }
}

/** Whether a row is worth a tracker: a courier, a reference, still moving. */
export const trackable = (a) => Boolean(a && a.reference && a.carrier && a.kind === 'PARCEL' && !a.trackerId && !['DONE', 'MISSED'].includes(a.stage))

/**
 * Register one arrival with Ship24. Never throws. Returns the trackerId or
 * null. `clientTrackerId` is our row id, so a webhook can name the row even
 * if the number is one two cards share.
 */
export async function registerTracker(arrival) {
  if (!ship24Configured() || !trackable(arrival)) return null
  try {
    const body = {
      trackingNumber: String(arrival.reference),
      clientTrackerId: arrival.id,
      destinationCountryCode: 'GB',
      ...(courierNameFor(arrival) ? { courierName: courierNameFor(arrival) } : {}),
      ...(arrival.trackUrl ? { trackingUrl: arrival.trackUrl } : {}),
    }
    const r = await api('/public/v1/trackers', { method: 'POST', body: JSON.stringify(body) })
    const trackerId = r?.data?.tracker?.trackerId || null
    if (trackerId) await prisma.arrival.update({ where: { id: arrival.id }, data: { trackerId, trackedAt: new Date() } }).catch(() => {})
    return trackerId
  } catch (error) {
    console.error('ship24 register failed:', error?.message)
    return null
  }
}

/** The sweep: rows that could be tracked and are not yet. Bounded per run. */
export async function registerDue({ limit = 10, days = 14 } = {}) {
  if (!ship24Configured()) return { on: false }
  let rows = []
  try {
    rows = await prisma.arrival.findMany({
      where: { trackerId: null, reference: { not: null }, carrier: { not: null }, kind: 'PARCEL', stage: { notIn: ['DONE', 'MISSED'] }, createdAt: { gte: new Date(Date.now() - days * 86_400_000) } },
      orderBy: { createdAt: 'desc' }, take: limit,
      select: { id: true, reference: true, carrier: true, kind: true, stage: true, trackUrl: true, trackerId: true },
    })
  } catch { return { on: true, registered: 0, error: 'no_table' } }
  let registered = 0
  for (const a of rows) if (await registerTracker(a)) registered += 1
  return { on: true, checked: rows.length, registered }
}

/**
 * A webhook from Ship24: move the rows it names. Returns counts for the log.
 * The route has already checked the URL token; the bearer secret is checked
 * here so the pure reader can be tested without a request.
 */
export async function applyWebhook(body, { authorization } = {}) {
  if (!webhookAuthorised(authorization, process.env.SHIP24_WEBHOOK_SECRET)) return { ok: false, why: 'unauthorised' }
  const entries = readWebhook(body)
  let moved = 0, matched = 0
  for (const e of entries) {
    let rows = []
    try {
      rows = await prisma.arrival.findMany({
        where: { OR: [
          ...(e.trackerId ? [{ trackerId: e.trackerId }] : []),
          ...(e.clientTrackerId ? [{ id: e.clientTrackerId }] : []),
          ...(e.trackingNumbers.length ? [{ reference: { in: e.trackingNumbers } }] : []),
        ] },
        select: { id: true, stage: true, carrier: true, trackerId: true },
      })
    } catch { continue }
    for (const row of rows) {
      matched += 1
      const stage = nextStage(row.stage, e.stage)
      const data = { ...(stage !== row.stage ? { stage } : {}), ...(row.trackerId || !e.trackerId ? {} : { trackerId: e.trackerId, trackedAt: new Date() }) }
      const note = noteFor(e, row.carrier)
      if (note) data.note = note
      if (!Object.keys(data).length) continue
      try { await prisma.arrival.update({ where: { id: row.id }, data }); if (stage !== row.stage) moved += 1 } catch { /* the next webhook retries */ }
    }
  }
  return { ok: true, entries: entries.length, matched, moved }
}

/** For the panel: how many rows are being tracked. */
export async function trackingState() {
  const out = { configured: ship24Configured(), tracked: 0, trackable: 0 }
  try {
    out.tracked = await prisma.arrival.count({ where: { trackerId: { not: null } } })
    out.trackable = await prisma.arrival.count({ where: { trackerId: null, reference: { not: null }, carrier: { not: null }, kind: 'PARCEL', stage: { notIn: ['DONE', 'MISSED'] } } })
  } catch { /* no table yet */ }
  return out
}

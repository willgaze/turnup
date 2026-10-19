import { NextResponse } from 'next/server'
import { ship24Configured, ship24WebhookToken, applyWebhook } from '@/lib/ship24'

/**
 * Where Ship24 posts a courier's scans (src/lib/ship24.js).
 *
 * The token in the path is the lock, as it is for the ServiceM8 webhook and
 * the letterbox: derived from JWT_SECRET, shown once on the dashboard, pasted
 * into Ship24's webhook settings. Ship24 also sends its own bearer secret;
 * set SHIP24_WEBHOOK_SECRET and that is checked too.
 *
 * Always 200 once the token is right. Ship24 retries anything else, and a
 * retry storm on a parse bug would move a row twenty times.
 */
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  const { token } = await params
  const want = ship24WebhookToken()
  if (!want || token !== want) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!ship24Configured()) return NextResponse.json({ ok: true, ignored: 'not_configured' })
  const body = await request.json().catch(() => null)
  const r = await applyWebhook(body, { authorization: request.headers.get('authorization') })
  if (r.ok === false && r.why === 'unauthorised') return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  console.log(`ship24 webhook entries=${r.entries ?? 0} matched=${r.matched ?? 0} moved=${r.moved ?? 0}`)
  return NextResponse.json(r)
}

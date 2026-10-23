import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { gmailState, setPlace, disconnect, pollGmail, redirectUri, saveApp, forgetApp } from '@/lib/gmail'
import { validClientId, validClientSecret } from '@/lib/gmail-words'
import { trackingState, ship24WebhookUrl } from '@/lib/ship24'

/**
 * The household card's two sources beyond forwarding: a connected Gmail
 * inbox (stage 1, the owner's own) and tracking by number through Ship24.
 * Both dark until their setting exists; the panel says what each needs.
 */
export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  const o = origin(request)
  let places = []
  try { places = (await prisma.place.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 20, select: { code: true, label: true } })) } catch { places = [] }
  return NextResponse.json({
    gmail: { ...(await gmailState()), redirectUri: redirectUri(o) },
    tracking: { ...(await trackingState()), webhookUrl: ship24WebhookUrl(o) },
    places,
  })
}

export async function POST(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === 'gmail_disconnect') { await disconnect(); return NextResponse.json({ ok: true }) }
    // The OAuth client, pasted on the phone. Validated loosely; Google is the
    // real judge and the Connect button carries its answer back.
    if (body.action === 'gmail_app_save') {
      const clientId = String(body.clientId || '').trim(), secret = String(body.clientSecret || '').trim()
      if (!validClientId(clientId)) return NextResponse.json({ error: 'bad_client_id' }, { status: 400 })
      if (!validClientSecret(secret)) return NextResponse.json({ error: 'bad_client_secret' }, { status: 400 })
      await saveApp(clientId, secret)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'gmail_app_forget') { await forgetApp(); return NextResponse.json({ ok: true }) }
    if (body.action === 'gmail_place') { await setPlace(body.placeCode); return NextResponse.json({ ok: true }) }
    if (body.action === 'gmail_poll') return NextResponse.json(await pollGmail())
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'no_such_card' ? 404 : 502 })
  }
}

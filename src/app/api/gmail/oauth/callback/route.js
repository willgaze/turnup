import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { gmailConfigured, checkState, exchangeCode } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Google sends the operator back here with a code; the code is swapped for
// tokens and the one row is written. Still operator only: the browser arriving
// here is the one that pressed Connect, cookie and all.
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.redirect(new URL('/login?then=/dashboard', origin(request)), 302)
  if (!gmailConfigured()) return NextResponse.json({ error: 'gmail_not_configured' }, { status: 409 })
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (url.searchParams.get('error')) return NextResponse.redirect(new URL(`/dashboard?gmail=${encodeURIComponent(url.searchParams.get('error'))}#panel-sources`, origin(request)), 302)
  if (!code || !checkState(url.searchParams.get('state'))) return NextResponse.json({ error: 'bad_state' }, { status: 400 })
  try {
    await exchangeCode(code, origin(request))
    return NextResponse.redirect(new URL('/dashboard?gmail=connected#panel-sources', origin(request)), 302)
  } catch (e) {
    console.error('gmail oauth exchange failed:', e?.message)
    return NextResponse.redirect(new URL(`/dashboard?gmail=${encodeURIComponent(e?.message || 'failed')}#panel-sources`, origin(request)), 302)
  }
}

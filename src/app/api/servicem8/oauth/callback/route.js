import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { oauthConfigured, checkState, exchangeCode } from '@/lib/sm8-oauth'

export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Steps 3 and 4: ServiceM8 sends the operator back here with a code; the code
// is swapped for tokens and the row is written. Still operator only: the
// browser arriving here is the one that pressed Connect, cookie and all.
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.redirect(new URL('/login?then=/dashboard', origin(request)), 302)
  if (!(await oauthConfigured())) return NextResponse.json({ error: 'sm8_app_not_configured' }, { status: 409 })
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (url.searchParams.get('error')) return NextResponse.redirect(new URL(`/dashboard?sm8=${encodeURIComponent(url.searchParams.get('error'))}#panel-servicem8`, origin(request)), 302)
  if (!code || !checkState(url.searchParams.get('state'))) return NextResponse.json({ error: 'bad_state' }, { status: 400 })
  try {
    await exchangeCode(code, origin(request))
    return NextResponse.redirect(new URL('/dashboard?sm8=connected#panel-servicem8', origin(request)), 302)
  } catch (e) {
    console.error('sm8 oauth exchange failed:', e?.message)
    return NextResponse.redirect(new URL(`/dashboard?sm8=${encodeURIComponent(e?.message || 'failed')}#panel-servicem8`, origin(request)), 302)
  }
}

import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { oauthConfigured, authorizeUrl } from '@/lib/sm8-oauth'

export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Step 2 of ServiceM8's OAuth: send the signed-in operator to authorise the
// add-on. Operator only, so a stranger cannot start a flow that ends with
// their ServiceM8 account bound to this dashboard.
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  if (!(await oauthConfigured())) return NextResponse.json({ error: 'sm8_app_not_configured' }, { status: 409 })
  return NextResponse.redirect(await authorizeUrl(origin(request)), 302)
}

import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { gmailConfigured, authorizeUrl } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Send the signed-in operator to Google to read their own mailbox. Operator
// only, so a stranger cannot start a flow that binds their inbox to this card.
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  if (!gmailConfigured()) return NextResponse.json({ error: 'gmail_not_configured' }, { status: 409 })
  return NextResponse.redirect(authorizeUrl(origin(request)), 302)
}

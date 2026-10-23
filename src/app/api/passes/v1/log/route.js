import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Wallet reporting a problem with the service ("Web service error for pass
// ..."). Logged where a session can read it in Vercel, nothing stored, and
// always 200: it is Apple telling us something, not asking.
export async function POST(request) {
  try {
    const body = await request.json()
    const logs = Array.isArray(body?.logs) ? body.logs.slice(0, 20) : []
    for (const line of logs) console.warn('wallet log:', String(line).slice(0, 500))
  } catch { /* an unreadable body is still a 200 */ }
  return NextResponse.json({ ok: true })
}

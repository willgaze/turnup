import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Apple Wallet: Wallet posts its own errors about this web service here
 * (v1.70.2). They go to the Vercel log, capped, because a failing
 * registration is otherwise invisible: the pass just never updates.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const logs = Array.isArray(body?.logs) ? body.logs.slice(0, 10) : []
    for (const line of logs) console.warn('wallet log:', String(line).slice(0, 300))
  } catch {}
  return new NextResponse(null, { status: 200 })
}

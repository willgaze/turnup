import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Wallet's own complaints.
 *
 * POST /api/passes/v1/log  {"logs": ["..."]}
 *
 * Apple sends here when it cannot do something with the pass — a bad
 * signature, a URL it could not reach, a certificate it did not trust. It is
 * the only window into why a card is not updating on somebody else's phone,
 * and it is worth having on the day the first real certificate lands.
 *
 * Unauthenticated, as the spec has it, so the body is a stranger's: capped,
 * trimmed and logged as text, never parsed into anything that acts.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const logs = Array.isArray(body?.logs) ? body.logs : []
    for (const line of logs.slice(0, 20)) {
      console.log('pass log:', String(line).slice(0, 500))
    }
  } catch {
    // A log that cannot be read is not worth an error to the phone sending it.
  }
  return NextResponse.json({})
}

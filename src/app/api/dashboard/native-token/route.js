import { NextResponse } from 'next/server'
import { requireOperator, createNativeToken } from '@/lib/operator-auth'

export const dynamic = 'force-dynamic'

/**
 * A bearer token for the native app, issued to a signed-in operator. The app
 * calls this each time it opens and stores the answer in its App Group, where
 * the Live Activity's buttons can read it. See native/README.md.
 */
export async function POST() {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  try {
    return NextResponse.json(await createNativeToken())
  } catch (error) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }
}

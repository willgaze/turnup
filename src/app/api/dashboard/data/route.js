import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { dbReason } from '@/lib/db-errors'
import { exportAll, deleteAccount } from '@/lib/account-data'
import { confirmMatches, exportFilename } from '@/lib/your-data'
import { TRADE_NAME } from '@/lib/trade'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Your data. GET downloads everything as one JSON file; POST deletes the
 * account. Both guard themselves (CLAUDE.md, every operator route).
 */
export async function GET() {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  try {
    const data = await exportAll()
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename()}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('export failed:', error?.message)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

/**
 * Delete the account. The body must carry the business name, typed: the one
 * check that stands between a mis-tap and every job gone. It is checked here,
 * not only in the panel, because the panel is a browser and a browser can be
 * made to send anything.
 */
export async function POST(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  let body = {}
  try { body = await request.json() } catch { /* empty body: refused below */ }
  if (!confirmMatches(body?.confirm, TRADE_NAME)) {
    return NextResponse.json({ error: 'confirm', fix: `Type ${TRADE_NAME} exactly to delete.` }, { status: 400 })
  }
  try {
    const r = await deleteAccount()
    return NextResponse.json({ ok: true, ...r })
  } catch (error) {
    console.error('account delete failed:', error?.message)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { dbReason } from '@/lib/db-errors'
import { pilotNumbers } from '@/lib/pilot'
import { sendWeeklySummary, buildWeeklySummary } from '@/lib/pilot-weekly'

export const dynamic = 'force-dynamic'

/** GET /api/dashboard/pilot?days=30 — the four pilot numbers. Operator only. */
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  const days = Math.min(366, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30))
  const since = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000)
  try {
    const profile = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' }, select: { pilotStart: true, pilotCalls: true, pilotCallsAt: true, pilotSummaryAt: true } }).catch(() => null)
    const [trackers, noAccess, calls] = await Promise.all([
      prisma.tradeStatus.findMany({
        where: { OR: [{ scheduledFor: { gte: since } }, { createdAt: { gte: since } }] },
        select: { id: true, isActive: true, createdAt: true, scheduledFor: true, viewCount: true, presenceAt: true, presenceAskedAt: true, askedAt: true },
      }),
      prisma.noAccess.findMany({ where: { startedAt: { gte: since } }, select: { tradeStatusId: true, startedAt: true } }).catch(() => []),
      // PilotCall is a new table (v1.76.0), so this reads as "no calls
      // logged" wherever the migration has not run rather than taking the
      // panel down with it.
      prisma.pilotCall.findMany({ where: { at: { gte: since } }, select: { id: true, at: true, tradeStatusId: true } }).catch(() => []),
    ])
    const r = pilotNumbers(trackers, noAccess, calls, { days, start: profile?.pilotStart || null, typedBefore: profile?.pilotCalls ?? null })
    return NextResponse.json({ ...r, summaryAt: profile?.pilotSummaryAt || null })
  } catch (error) {
    console.error('pilot numbers failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

/**
 * POST { action: 'summary' } — send this week's summary to the trade's phones
 * now, as a demonstration; it does not move the Monday clock. Operator only.
 * { action: 'preview' } returns the words without sending.
 */
export async function POST(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === 'preview') return NextResponse.json({ body: (await buildWeeklySummary()).body })
    if (body.action === 'summary') return NextResponse.json(await sendWeeklySummary({ force: true }))
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (error) {
    console.error('pilot summary failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { dbReason } from '@/lib/db-errors'
import { pilotNumbers } from '@/lib/pilot'

export const dynamic = 'force-dynamic'

/** GET /api/dashboard/pilot?days=30 — the four pilot numbers. Operator only. */
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  const days = Math.min(366, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30))
  const since = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000)
  try {
    const profile = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' }, select: { pilotStart: true, pilotCalls: true, pilotCallsAt: true } }).catch(() => null)
    const [trackers, noAccess] = await Promise.all([
      prisma.tradeStatus.findMany({
        where: { OR: [{ scheduledFor: { gte: since } }, { createdAt: { gte: since } }] },
        select: { id: true, isActive: true, createdAt: true, scheduledFor: true, viewCount: true, presenceAt: true, presenceAskedAt: true, askedAt: true },
      }),
      prisma.noAccess.findMany({ where: { startedAt: { gte: since } }, select: { tradeStatusId: true, startedAt: true } }).catch(() => []),
    ])
    const r = pilotNumbers(trackers, noAccess, { days, start: profile?.pilotStart || null, calls: profile?.pilotCalls ?? null })
    return NextResponse.json({ ...r, callsAt: profile?.pilotCallsAt || null })
  } catch (error) {
    console.error('pilot numbers failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

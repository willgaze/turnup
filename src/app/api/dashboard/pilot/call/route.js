import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { cleanText } from '@/lib/clean-text'
import { readTap } from '@/lib/tap'

export const dynamic = 'force-dynamic'

/**
 * "They rang to ask when I'm coming."
 *
 * The fourth pilot number, logged as a dated row instead of typed as a
 * running total (see src/lib/pilot.js for why that was the broken one).
 * Nothing here is ever public: a call is a fact about the trade's phone,
 * not something the customer's card says.
 *
 * It replays safely, like every other tap the dashboard makes — the call is
 * logged standing in a lane with one bar, and a flush cut off after the
 * request went must come back as the same call, not a second one.
 */
export async function POST(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  try {
    const body = await request.json().catch(() => ({}))
    const tap = readTap(body)
    const note = cleanText(body?.note) || null

    // A job id is only taken if it is one we actually hold, so a malformed
    // body leaves the call unattached rather than pointing at nothing.
    let tradeStatusId = null
    if (typeof body?.tradeStatusId === 'string' && body.tradeStatusId) {
      const job = await prisma.tradeStatus.findUnique({ where: { id: body.tradeStatusId }, select: { id: true } }).catch(() => null)
      tradeStatusId = job?.id || null
    }

    if (tap.tapId) {
      const already = await prisma.pilotCall.findFirst({ where: { tapId: tap.tapId }, select: { id: true } })
      if (already) return NextResponse.json({ id: already.id, replayed: true })
    }

    // The phone's clock is the honest time of a tap made with no signal, and
    // readTap() is the only thing that decides whether to believe it.
    const at = tap.offline && tap.deviceAt ? tap.deviceAt : new Date()
    const row = await prisma.pilotCall.create({
      data: { at, deviceAt: tap.deviceAt, tapId: tap.tapId, tradeStatusId, note },
      select: { id: true, at: true },
    })
    return NextResponse.json({ id: row.id, at: row.at }, { status: 201 })
  } catch (error) {
    console.error('pilot call failed:', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}

/**
 * Undo. A miscount is worse than no count, and the panel's − button is the
 * only way back: it removes the most recent call, or one named by id.
 */
export async function DELETE(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  try {
    const id = new URL(request.url).searchParams.get('id')
    const row = id
      ? await prisma.pilotCall.findUnique({ where: { id }, select: { id: true } })
      : await prisma.pilotCall.findFirst({ orderBy: { at: 'desc' }, select: { id: true } })
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    await prisma.pilotCall.delete({ where: { id: row.id } })
    return NextResponse.json({ deleted: row.id })
  } catch (error) {
    console.error('pilot call delete failed:', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}

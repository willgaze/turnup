import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { cleanText } from '@/lib/clean-text'
import { dbReason } from '@/lib/db-errors'
import { cleanReviewUrl } from '@/lib/review'

export const dynamic = 'force-dynamic'

const ID = 'singleton'

export async function GET() {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  try {
    const profile = await prisma.tradeProfile.findUnique({ where: { id: ID } })
    // The photo's bytes stay on the server; the panel gets its time and builds the URL.
    if (profile) delete profile.engineerPhotoData
    return NextResponse.json({ profile: profile || null })
  } catch (error) {
    console.error('profile read failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

export async function PUT(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  try {
    const b = await request.json()
    // Only what was sent is changed. The Who to expect form sends the whole
    // profile; the Booking terms panel sends its two numbers. Before this,
    // any PUT without a field nulled it, so saving the terms would have wiped
    // the van.
    const text = (k, max) => (k in b ? { [k]: cleanText(b[k], max) } : {})
    const data = {
      ...text('engineerName', 60),
      ...text('aboutLine', 120),
      ...text('engineerPhoto', 500),
      ...('vehicleReg' in b ? { vehicleReg: cleanText(b.vehicleReg, 12)?.toUpperCase().replace(/[^A-Z0-9]/g, '') || null } : {}),
      ...text('vehicleMake', 40),
      ...text('vehicleModel', 40),
      ...text('vehicleColour', 30),
      ...text('vehiclePhoto', 500),
      ...text('brandLogo', 500),
      // The terms: hours between 1 and 336 (a fortnight), a fee in whole
      // pounds or nothing. Nothing else about a charge is stored anywhere.
      ...('autoFollow' in b ? { autoFollow: Boolean(b.autoFollow) } : {}),
      ...('emailFallback' in b ? { emailFallback: Boolean(b.emailFallback) } : {}),
      // The pilot clock: 'now' starts it today, null clears it, a date sets it.
      ...('pilotStart' in b ? { pilotStart: b.pilotStart === 'now' ? new Date() : b.pilotStart ? (Number.isNaN(new Date(b.pilotStart).getTime()) ? undefined : new Date(b.pilotStart)) : null } : {}),
      // The hand count: a whole number, never below zero, stamped when typed.
      ...('pilotCalls' in b ? (() => {
        const n = Math.round(Number(b.pilotCalls))
        return b.pilotCalls === null ? { pilotCalls: null, pilotCallsAt: null } : Number.isFinite(n) && n >= 0 ? { pilotCalls: Math.min(9999, n), pilotCallsAt: new Date() } : {}
      })() : {}),
      // Only Google's own review surfaces. Anything else is dropped, not stored.
      ...('reviewUrl' in b ? { reviewUrl: cleanReviewUrl(b.reviewUrl) } : {}),
      ...('noticeHours' in b ? { noticeHours: Math.min(336, Math.max(1, Math.round(Number(b.noticeHours)) || 24)) } : {}),
      ...('shortNoticeFee' in b ? { shortNoticeFee: (() => {
        const n = Math.round(Number(b.shortNoticeFee))
        return b.shortNoticeFee === null || b.shortNoticeFee === '' || !Number.isFinite(n) || n <= 0 ? null : Math.min(9999, n)
      })() } : {}),
    }
    const profile = await prisma.tradeProfile.upsert({
      where: { id: ID }, create: { id: ID, ...data }, update: data,
    })
    delete profile.engineerPhotoData
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('profile write failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

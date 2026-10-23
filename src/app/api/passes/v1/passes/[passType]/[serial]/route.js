import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicShape } from '@/lib/trade-status'
import { passkitConfigured, buildSignedPass } from '@/lib/passkit'
import { rpFromRequest } from '@/lib/webauthn'
import { applePassToken, notModified } from '@/lib/pass-update'
import { tokenMatches, passTypeId, passAuthToken } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

// Wallet fetching the latest pass after a push. The same signed pass as
// /api/passes/<code>, behind the pass's own token rather than the URL, and
// with Last-Modified so Wallet can ask "has it changed?" and be told no.
export async function GET(request, { params }) {
  const { passType, serial } = await params
  if (passType !== passTypeId()) return new NextResponse(null, { status: 401 })
  if (!tokenMatches(serial, applePassToken(request.headers.get('authorization')))) return new NextResponse(null, { status: 401 })
  if (!passkitConfigured()) return new NextResponse(null, { status: 503 })
  try {
    const row = await prisma.tradeStatus.findUnique({
      where: { code: serial.toUpperCase() },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!row || !row.isActive) return new NextResponse(null, { status: 404 })
    if (notModified(row.updatedAt, request.headers.get('if-modified-since'))) return new NextResponse(null, { status: 304 })

    const status = publicShape(row)
    const { origin } = await rpFromRequest()
    const buffer = await buildSignedPass(status, { origin, authToken: passAuthToken(status.code) })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date(row.updatedAt).toUTCString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('pass update build failed:', error)
    return new NextResponse(null, { status: 503 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicShape } from '@/lib/trade-status'
import { passkitConfigured, buildSignedPass } from '@/lib/passkit'
import { checkPassAuth, passTypeMatches, passAuthToken } from '@/lib/pass-auth'
import { rpFromRequest } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

/**
 * The current card.
 *
 * GET /api/passes/v1/passes/<passType>/<serial>
 *
 * This is the one that actually moves the card in somebody's pocket: Wallet
 * is told something changed, comes here, and replaces what it holds. It is
 * the same builder as the download route, so the card in a wallet and the
 * card on the page cannot say different things.
 *
 * `If-Modified-Since` is honoured because Wallet sends it and a 304 saves
 * rebuilding and re-signing a pass that has not moved.
 */
export async function GET(request, { params }) {
  const { passTypeId, serial } = await params
  const code = String(serial || '').toUpperCase()

  // Refusals log, for the reason in the registration route beside this one.
  if (!passTypeMatches(passTypeId)) {
    console.log(`pass serve refused: pass type ${passTypeId} is not ours`)
    return new NextResponse(null, { status: 404 })
  }
  if (!checkPassAuth(request.headers.get('authorization'), code)) {
    console.log(`pass serve refused: bad or missing token for ${code}`)
    return new NextResponse(null, { status: 401 })
  }

  try {
    const row = await prisma.tradeStatus.findUnique({
      where: { code },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    })
    // A revoked link must take the card with it. 401 is what Apple's service
    // uses for "this pass is no longer yours", and Wallet removes it.
    //
    // This is checked BEFORE the certificate, and the order is the bug the
    // live test caught: whether the link is revoked is a fact about the card,
    // and whether we can sign a pass is a fact about this deployment. With the
    // certificate gate first, a revoked card in somebody's wallet was told
    // "come back later" instead of being removed.
    if (!row || !row.isActive) return new NextResponse(null, { status: 401 })
    if (!passkitConfigured()) return new NextResponse(null, { status: 503 })

    const ifModified = request.headers.get('if-modified-since')
    if (ifModified) {
      const seen = new Date(ifModified)
      // Second resolution: the header carries no milliseconds, so comparing
      // raw would re-send the pass on every poll within the same second.
      if (!Number.isNaN(seen.getTime()) && Math.floor(row.updatedAt.getTime() / 1000) <= Math.floor(seen.getTime() / 1000)) {
        return new NextResponse(null, { status: 304 })
      }
    }

    const { origin } = await rpFromRequest()
    const buffer = await buildSignedPass(publicShape(row), { origin, authToken: passAuthToken(code) })
    console.log(`pass served code=${code} stage=${row.stage}`)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': row.updatedAt.toUTCString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('pass update build failed:', error?.message)
    return new NextResponse(null, { status: 503 })
  }
}

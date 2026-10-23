import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicShape } from '@/lib/trade-status'
import { passkitConfigured, passkitMissing, buildSignedPass, buildPassJson } from '@/lib/passkit'
import { rpFromRequest } from '@/lib/webauthn'
import { passAuthToken } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

// Public, like the page it mirrors: the code in the URL is the credential.
export async function GET(request, { params }) {
  const { code } = await params
  if (!code || code.length > 32) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  try {
    const row = await prisma.tradeStatus.findUnique({
      where: { code: code.toUpperCase() },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!row || !row.isActive) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const status = publicShape(row)
    const { origin } = await rpFromRequest()

    // ?preview=1 returns the pass body as JSON. It is how the card can be shown
    // and checked before anyone has paid Apple, and it is what the in-app
    // mockup reads, so the mockup cannot drift from the real thing.
    if (new URL(request.url).searchParams.get('preview')) {
      return NextResponse.json({
        configured: passkitConfigured(),
        missing: passkitMissing(),
        pass: buildPassJson(status, { origin, authToken: 'preview' }),
      })
    }

    if (!passkitConfigured()) {
      return NextResponse.json(
        {
          error: 'passkit_not_configured',
          what: 'Apple Wallet needs a signing certificate from the Apple Developer Program.',
          missing: passkitMissing(),
        },
        { status: 503 },
      )
    }

    const buffer = await buildSignedPass(status, {
      origin,
      authToken: passAuthToken(status.code),
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${status.code}.pkpass"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('pass build failed:', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}

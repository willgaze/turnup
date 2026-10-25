import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { publicShape, stageOf, STAGE_ORDER } from '@/lib/trade-status'
import { saveLink } from '@/lib/google-wallet'
import { TRADE_NAME } from '@/lib/trade'
import { rpFromRequest } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

/**
 * The Save to Google Wallet link for one job.
 *
 * Public, like the Apple download beside it: the code in the URL is the
 * credential. It redirects rather than answering JSON, so the button is an
 * ordinary link and Google's page opens in one tap.
 *
 * 404 when there is nothing to give. The button is only drawn once the page
 * has been told the service is configured, so landing on an error would be
 * the empty drawer this product keeps re-opening.
 */
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

    // The same "2 of 4" the Apple pass shows, worked out the same way.
    const stage = stageOf(status.stage)
    const step = STAGE_ORDER.indexOf(stage.key)
    const position = step >= 0 ? `${step + 1} of ${STAGE_ORDER.length}` : null

    const link = await saveLink(status, { stage: { ...stage, position }, tradeName: TRADE_NAME, origin })
    if (!link) return NextResponse.json({ error: 'unavailable' }, { status: 503 })

    console.log(`google wallet: save link made for ${status.code}`)
    return NextResponse.redirect(link, { status: 302 })
  } catch (error) {
    console.error('google wallet: save link failed:', error?.message)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}

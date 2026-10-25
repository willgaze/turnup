import Link from 'next/link'
import { headers } from 'next/headers'
import { isOperator } from '@/lib/operator-auth'
import { countsAsCustomerView } from '@/lib/pilot'
import { prisma } from '@/lib/prisma'
import { publicShape } from '@/lib/trade-status'
import { publicProfile, publicBrand, publicTerms, tradeSeenAt } from '@/lib/profile'
import { TRADE_PHONE, TRADE_PHONE_TEL } from '@/lib/trade'
import StatusTracker from '../StatusTracker'
import { passkitConfigured } from '@/lib/passkit'
import { googleWallet } from '@/lib/google-wallet'
import { reviewUrl } from '@/lib/review'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your job | TurnUp', robots: { index: false, follow: false } }

export default async function TrackPage({ params }) {
  const { code } = await params

  let status = null
  let profile = null
  let brand = null
  let terms = null
  let seenAt = null
  let review = null
  let unavailable = false
  try {
    const row = await prisma.tradeStatus.findUnique({
      where: { code: String(code).toUpperCase() },
      include: { events: { orderBy: { createdAt: 'asc' } }, noAccess: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, startedAt: true, leftAt: true, attempts: true, photoAt: true, reply: true, replyAt: true, fee: true, lat: true, lng: true, accuracy: true } } },
    })
    if (row?.isActive) {
      status = publicShape(row)
      if (status.stage === 'ON_MY_WAY' || status.stage === 'ON_SITE') profile = await publicProfile()
      brand = await publicBrand()
      terms = await publicTerms()
      seenAt = status.stage === 'DONE' ? null : await tradeSeenAt()
      review = status.stage === 'DONE' ? await reviewUrl() : null
      // One visit, one count — this runs per page load (force-dynamic) rather
      // than per poll. Deliberately not awaited: a counter must never hold up
      // or break the customer's page. The trade's own Open buttons and the
      // preview a messaging app fetches the moment the link is pasted are not
      // the customer opening it, and since v1.67.0 they do not count: this is
      // the first pilot number, and it was reading near 100% by construction.
      const ua = (await headers()).get('user-agent') || ''
      if (countsAsCustomerView({ operator: await isOperator().catch(() => false), userAgent: ua })) {
        prisma.tradeStatus
          .update({ where: { id: row.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } })
          .catch(() => {})
      }
    }
  } catch (error) {
    console.error('track lookup failed:', error)
    unavailable = true
  }

  if (!status) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-center">
        <h1 className="text-3xl font-bold">
          {unavailable ? 'Status unavailable right now' : 'That link has expired'}
        </h1>
        <p className="mt-4 text-slate-600">
          {unavailable
            ? 'Try again in a minute. If it still will not load, ring and someone will tell you where things are.'
            : 'Tracking links are switched off once a job is finished and settled.'}
        </p>
        {TRADE_PHONE && (
          <a href={`tel:${TRADE_PHONE_TEL}`}
             className="mx-auto mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white">
            Call {TRADE_PHONE}
          </a>
        )}
        <p className="mt-8 text-sm text-slate-400"><Link href="/" className="underline">TurnUp</Link></p>
      </main>
    )
  }

  // Whether this deployment can sign an Apple Wallet pass. Decided here, on
  // the server, so the client never has to guess from a 503.
  return <StatusTracker initialStatus={status} initialProfile={profile} initialBrand={brand} initialTerms={terms} initialTradeSeenAt={seenAt} initialReviewUrl={review} walletReady={passkitConfigured()} googleReady={Boolean(await googleWallet())} />
}

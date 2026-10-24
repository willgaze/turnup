import { NextResponse } from 'next/server'
import { passTypeMatches, tagFor, sinceFromTag } from '@/lib/pass-auth'
import { serialsChangedSince } from '@/lib/pass-devices'

export const dynamic = 'force-dynamic'

/**
 * "What of mine has changed?"
 *
 * GET /api/passes/v1/devices/<device>/registrations/<passType>?passesUpdatedSince=<tag>
 *
 * Note there is NO Authorization header on this one, by Apple's design: the
 * device library identifier is the only credential, and it only ever yields
 * the serials that device already registered. So this must never widen: it
 * answers with codes this device already holds, never a list of jobs.
 *
 * 204, not an empty 200, when nothing has moved — an empty list in a 200 is
 * read by Wallet as "these changed", and the difference is a phone that
 * re-downloads every pass it holds on a timer.
 */
export async function GET(request, { params }) {
  const { deviceId, passTypeId } = await params
  if (!passTypeMatches(passTypeId)) return new NextResponse(null, { status: 404 })

  try {
    const tag = new URL(request.url).searchParams.get('passesUpdatedSince')
    const since = sinceFromTag(tag)
    const { serialNumbers, lastUpdated } = await serialsChangedSince(String(deviceId), String(passTypeId), since)

    if (!serialNumbers.length) return new NextResponse(null, { status: 204 })
    console.log(`pass changed device=${String(deviceId).slice(0, 8)} n=${serialNumbers.length}`)
    return NextResponse.json({ serialNumbers, lastUpdated: tagFor(lastUpdated) })
  } catch (error) {
    console.warn('pass serials failed:', error?.message)
    // Nothing to report rather than an error: the device asks again shortly,
    // and a 500 here is a card that stops updating for good on some clients.
    return new NextResponse(null, { status: 204 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPassAuth, passTypeMatches } from '@/lib/pass-auth'
import { registerDevice, forgetDevice } from '@/lib/pass-devices'

export const dynamic = 'force-dynamic'

/**
 * Wallet registering a phone for a pass, and dropping it again.
 *
 * POST   /api/passes/v1/devices/<device>/registrations/<passType>/<serial>
 * DELETE the same path
 *
 * These paths are Apple's, not ours: they are fixed by the spec that Wallet
 * calls, and the only part this deployment chooses is the `webServiceURL`
 * prefix in the pass. **They could not be read from the container this was
 * written in** (Apple's documentation renders in JavaScript and would not
 * fetch), so they are written from the long-stable public spec and the first
 * real registration is the proof: every call here logs one line, so the
 * Vercel log says whether Wallet found them. If it is silent after a card is
 * added, the paths are what to check first.
 */
export async function POST(request, { params }) {
  const { deviceId, passTypeId, serial } = await params
  const code = String(serial || '').toUpperCase()

  if (!passTypeMatches(passTypeId)) return new NextResponse(null, { status: 404 })
  if (!checkPassAuth(request.headers.get('authorization'), code)) return new NextResponse(null, { status: 401 })

  try {
    const row = await prisma.tradeStatus.findUnique({ where: { code }, select: { isActive: true } })
    // A revoked or missing job is not a 401: the token was right, the card is
    // simply not a thing any more, and Wallet should stop asking.
    if (!row || !row.isActive) return new NextResponse(null, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const pushToken = String(body?.pushToken || '')
    if (!pushToken) return new NextResponse(null, { status: 400 })

    const { created } = await registerDevice({
      deviceLibraryIdentifier: String(deviceId),
      serialNumber: code,
      passTypeIdentifier: String(passTypeId),
      pushToken,
    })
    console.log(`pass register code=${code} device=${String(deviceId).slice(0, 8)} ${created ? 'new' : 'again'}`)
    return new NextResponse(null, { status: created ? 201 : 200 })
  } catch (error) {
    // The table may not exist yet. Say so rather than 500ing at a phone that
    // will only retry: 503 is the honest "not me, not now".
    console.warn('pass register failed:', error?.message)
    return new NextResponse(null, { status: 503 })
  }
}

export async function DELETE(request, { params }) {
  const { deviceId, passTypeId, serial } = await params
  const code = String(serial || '').toUpperCase()

  if (!passTypeMatches(passTypeId)) return new NextResponse(null, { status: 404 })
  if (!checkPassAuth(request.headers.get('authorization'), code)) return new NextResponse(null, { status: 401 })

  try {
    await forgetDevice({ deviceLibraryIdentifier: String(deviceId), serialNumber: code })
    console.log(`pass unregister code=${code} device=${String(deviceId).slice(0, 8)}`)
  } catch (error) {
    console.warn('pass unregister failed:', error?.message)
  }
  // Always 200: the device wants to forget this pass, and an error here would
  // only make it ask again for something it has already thrown away.
  return new NextResponse(null, { status: 200 })
}

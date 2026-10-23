import { NextResponse } from 'next/server'
import { cleanOpaque, cleanSerial, ourPassType, walletAuthorised } from '@/lib/pass-service-words'
import { register, unregister } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

/**
 * Apple Wallet: a device starts or stops following a pass (v1.70.2).
 * POST   /api/passes/v1/devices/<device>/registrations/<passType>/<serial>
 * DELETE the same. Both carry "Authorization: ApplePass <token>", the token
 * baked into that pass, so only a Wallet holding the pass can register for it.
 * Spec: developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
 */
async function read(request, params) {
  const p = await params
  const deviceId = cleanOpaque(p.device)
  const serial = cleanSerial(p.serial)
  const passTypeId = p.passType
  if (!deviceId || !serial || !ourPassType(passTypeId)) return { error: 404 }
  if (!walletAuthorised(request.headers.get('authorization'), serial)) return { error: 401 }
  return { deviceId, serial, passTypeId }
}

export async function POST(request, { params }) {
  const r = await read(request, params)
  if (r.error) return new NextResponse(null, { status: r.error })
  let body = {}
  try { body = await request.json() } catch {}
  const pushToken = cleanOpaque(body?.pushToken)
  if (!pushToken) return new NextResponse(null, { status: 400 })
  try {
    const created = await register({ ...r, pushToken })
    return new NextResponse(null, { status: created ? 201 : 200 })
  } catch (error) {
    console.error('wallet register failed:', error?.code || error?.message)
    return new NextResponse(null, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const r = await read(request, params)
  if (r.error) return new NextResponse(null, { status: r.error })
  try {
    await unregister(r)
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('wallet unregister failed:', error?.code || error?.message)
    return new NextResponse(null, { status: 500 })
  }
}

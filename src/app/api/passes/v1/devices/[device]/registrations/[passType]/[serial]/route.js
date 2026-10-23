import { NextResponse } from 'next/server'
import { applePassToken } from '@/lib/pass-update'
import { tokenMatches, passTypeId, registerDevice, unregisterDevice } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

// Wallet, on adding a pass: "this phone holds this pass, push me here."
// Guarded by the pass's own authenticationToken; the pass type must be ours.
export async function POST(request, { params }) {
  const { device, passType, serial } = await params
  if (passType !== passTypeId()) return new NextResponse(null, { status: 401 })
  if (!tokenMatches(serial, applePassToken(request.headers.get('authorization')))) return new NextResponse(null, { status: 401 })
  let body = {}
  try { body = await request.json() } catch { body = {} }
  const pushToken = typeof body?.pushToken === 'string' ? body.pushToken.trim() : ''
  if (!/^[A-Za-z0-9]{16,512}$/.test(pushToken) || !/^[A-Za-z0-9._-]{8,128}$/.test(device)) return new NextResponse(null, { status: 400 })
  const result = await registerDevice({ deviceId: device, passType, serial: serial.toUpperCase(), pushToken })
  if (result === 'unavailable') return new NextResponse(null, { status: 503 })
  return new NextResponse(null, { status: result === 'created' ? 201 : 200 })
}

// Wallet, on removing the pass from the phone.
export async function DELETE(request, { params }) {
  const { device, passType, serial } = await params
  if (passType !== passTypeId()) return new NextResponse(null, { status: 401 })
  if (!tokenMatches(serial, applePassToken(request.headers.get('authorization')))) return new NextResponse(null, { status: 401 })
  await unregisterDevice({ deviceId: device, passType, serial: serial.toUpperCase() })
  return new NextResponse(null, { status: 200 })
}

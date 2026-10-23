import { NextResponse } from 'next/server'
import { cleanOpaque, ourPassType, updatedSince } from '@/lib/pass-service-words'
import { devicePasses } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

/**
 * Apple Wallet: which of this device's passes changed since the tag it holds
 * (v1.70.2). No auth header on this one, by Apple's design; it returns codes
 * the device already has and nothing else. 204 when nothing changed.
 */
export async function GET(request, { params }) {
  const p = await params
  const deviceId = cleanOpaque(p.device)
  if (!deviceId || !ourPassType(p.passType)) return new NextResponse(null, { status: 404 })
  try {
    const rows = await devicePasses(deviceId, p.passType)
    const tag = new URL(request.url).searchParams.get('passesUpdatedSince')
    const out = updatedSince(rows, tag)
    return out ? NextResponse.json(out) : new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('wallet list failed:', error?.code || error?.message)
    return new NextResponse(null, { status: 204 })
  }
}

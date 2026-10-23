import { NextResponse } from 'next/server'
import { cleanSerial, notModified, ourPassType, walletAuthorised } from '@/lib/pass-service-words'
import { latestPass } from '@/lib/pass-service'
import { passkitConfigured } from '@/lib/passkit'
import { rpFromRequest } from '@/lib/webauthn'

export const dynamic = 'force-dynamic'

/**
 * Apple Wallet: the latest version of a pass (v1.70.2). Built fresh from the
 * job as it is now, through the same publicShape() and buildPassJson() as
 * the first download, so an updated pass can carry nothing the first one
 * could not. This is the call that fixes "Job done on the dashboard, Booked
 * in on the pass": Wallet asks after a push, and on a pull-to-refresh.
 */
export async function GET(request, { params }) {
  const p = await params
  const serial = cleanSerial(p.serial)
  if (!serial || !ourPassType(p.passType) || !passkitConfigured()) return new NextResponse(null, { status: 404 })
  if (!walletAuthorised(request.headers.get('authorization'), serial)) return new NextResponse(null, { status: 401 })
  try {
    const { origin } = await rpFromRequest()
    const pass = await latestPass(serial, { origin })
    if (!pass) return new NextResponse(null, { status: 404 })
    const lastModified = new Date(pass.updatedAt).toUTCString()
    if (notModified(pass.updatedAt, request.headers.get('if-modified-since'))) {
      return new NextResponse(null, { status: 304, headers: { 'Last-Modified': lastModified } })
    }
    return new NextResponse(pass.buffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': lastModified,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('wallet pass failed:', error?.code || error?.message)
    return new NextResponse(null, { status: 500 })
  }
}

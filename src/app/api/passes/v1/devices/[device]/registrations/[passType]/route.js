import { NextResponse } from 'next/server'
import { sinceDate, updatedSince } from '@/lib/pass-update'
import { passTypeId, passesHeldBy } from '@/lib/pass-service'

export const dynamic = 'force-dynamic'

// Wallet, after a push or on its own schedule: "which of my passes changed?"
// No Authorization header on this one, by Apple's design: the device
// identifier is the secret, 32 random characters the phone made up. The
// answer is a list of job codes, which are credentials, so this is the one
// place a device identifier is worth as much as a code. Written down in
// CLAUDE.md so nobody widens it to carry anything more than serials.
export async function GET(request, { params }) {
  const { device, passType } = await params
  if (passType !== passTypeId()) return new NextResponse(null, { status: 404 })
  const rows = await passesHeldBy({ deviceId: device, passType })
  if (!rows) return new NextResponse(null, { status: 404 })
  const since = sinceDate(new URL(request.url).searchParams.get('passesUpdatedSince'))
  const changed = updatedSince(rows, since)
  if (!changed) return new NextResponse(null, { status: 204 })
  return NextResponse.json(changed, { headers: { 'Cache-Control': 'no-store' } })
}

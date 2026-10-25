import { NextResponse } from 'next/server'
import { requireOperator } from '@/lib/operator-auth'
import { credentialState, saveCredentials, forgetCredentials } from '@/lib/google-wallet'

export const dynamic = 'force-dynamic'

/**
 * The Google Wallet panel's own route. Every handler guards itself, the first
 * statement, as every route under /api/dashboard does.
 *
 * What it may answer with is the state, never the credentials: the key is
 * never returned, and the issuer id only as its last four. The panel needs to
 * know THAT it is set up, not what with.
 */
export async function GET() {
  const gate = await requireOperator()
  if (gate !== true) return NextResponse.json({ error: gate.error }, { status: gate.status })
  return NextResponse.json(await credentialState())
}

export async function POST(request) {
  const gate = await requireOperator()
  if (gate !== true) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await request.json().catch(() => ({}))
  const r = await saveCredentials({
    issuerId: body?.issuerId,
    serviceAccount: body?.serviceAccount,
    privateKey: body?.privateKey,
  })
  if (r.error) {
    // Name the field that is wrong. "Something went wrong" sends somebody back
    // to a console to redo work that was already right.
    const says = {
      issuer_id: 'That issuer ID does not look right. It is the long number from the Google Wallet console, digits only.',
      service_account: 'That service account does not look right. It ends in .iam.gserviceaccount.com',
      private_key: 'That key does not look right. It is the private_key from the JSON file, starting -----BEGIN',
    }
    return NextResponse.json({ error: r.error, says: says[r.error] }, { status: 400 })
  }
  return NextResponse.json(await credentialState())
}

export async function DELETE() {
  const gate = await requireOperator()
  if (gate !== true) return NextResponse.json({ error: gate.error }, { status: gate.status })
  await forgetCredentials()
  return NextResponse.json({ configured: false })
}

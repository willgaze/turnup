/**
 * The Google Wallet card: the half that holds a key and talks to Google.
 *
 * What it SAYS is in google-wallet-words.js, which is pure and checked. This
 * file does three things and nothing else: keep the credentials, sign a save
 * link, and push a change to a card that already exists.
 *
 * **Gated like push and what3words.** With no credentials `googleWallet()`
 * answers null, the button does not render, and nothing here runs. The gate
 * is on the row that shows the button, never inside it -- the push row that
 * opened onto an empty drawer is the mistake being avoided.
 *
 * **The credentials live in a row, not in Vercel.** `GoogleWalletApp` is a new
 * table, so it fails soft until the migration runs. Three rounds of "set these
 * environment variables" were asked for and never happened (CLAUDE.md rule 5),
 * so the ask is a paste on the phone. GOOGLE_WALLET_* environment variables
 * still win wherever all three are set, so nothing that already works stops.
 */
import { createHash, createCipheriv, createDecipheriv, createSign, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { objectId, objectResource, saveClaims, saveUrl, jwtTooLong, buildObject, buildClass, patchForStage } from '@/lib/google-wallet-words'

const ID = 'singleton'
const key = () => createHash('sha256').update(`${process.env.JWT_SECRET}:google-wallet`).digest()

function seal(obj) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64')
}
function open(b64) {
  const buf = Buffer.from(b64, 'base64')
  const d = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
  d.setAuthTag(buf.subarray(12, 28))
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'))
}

/**
 * The credentials, or null. Environment first so an existing setup keeps
 * working; otherwise the row the panel writes.
 *
 * Never returns the private key to anything that did not ask for it by
 * calling this: no route hands it to a browser, and the panel only ever sees
 * the last four of the issuer id.
 */
export async function googleWallet() {
  const { GOOGLE_WALLET_ISSUER_ID: iss, GOOGLE_WALLET_SERVICE_ACCOUNT: email, GOOGLE_WALLET_PRIVATE_KEY: pk } = process.env
  if (iss && email && pk) {
    return { issuerId: iss, serviceAccountEmail: email, privateKey: pk.replace(/\\n/g, '\n'), from: 'env' }
  }
  try {
    const row = await prisma.googleWalletApp.findUnique({ where: { id: ID } })
    if (!row) return null
    const { privateKey } = open(row.cipher)
    return { issuerId: row.issuerId, serviceAccountEmail: row.serviceAccount, privateKey, from: 'row' }
  } catch {
    // The table may not exist yet. Dark, not broken.
    return null
  }
}

/** Save the three values from the panel. The key is sealed before it is stored. */
export async function saveCredentials({ issuerId, serviceAccount, privateKey }) {
  const pk = String(privateKey || '').replace(/\\n/g, '\n').trim()
  if (!/^\d{6,}$/.test(String(issuerId || '').trim())) return { error: 'issuer_id' }
  if (!/@.+\.iam\.gserviceaccount\.com$/.test(String(serviceAccount || '').trim())) return { error: 'service_account' }
  if (!pk.startsWith('-----BEGIN') || !pk.includes('PRIVATE KEY')) return { error: 'private_key' }

  const data = { issuerId: String(issuerId).trim(), serviceAccount: String(serviceAccount).trim(), cipher: seal({ privateKey: pk }) }
  await prisma.googleWalletApp.upsert({ where: { id: ID }, create: { id: ID, ...data }, update: data })

  // Saving ends in a demonstration, not a claim: making the class is the
  // first thing that actually uses all three values together, so it is the
  // cheapest proof that they work. "Saved" on its own would be the panel
  // saying 1 phone registered when nothing had arrived.
  const cls = await ensureClass()
  return { ok: true, classReady: cls.ok, why: cls.ok ? undefined : cls.why }
}

export async function forgetCredentials() {
  await prisma.googleWalletApp.deleteMany({ where: { id: ID } }).catch(() => {})
  return true
}

/** What the panel may see. Never the key, never the whole issuer id. */
export async function credentialState() {
  const g = await googleWallet()
  if (!g) return { configured: false }
  return {
    configured: true,
    from: g.from,
    issuerTail: g.issuerId.slice(-4),
    serviceAccount: g.serviceAccountEmail,
  }
}

/* --- signing ------------------------------------------------------------ */

const b64url = (buf) => Buffer.from(buf).toString('base64url')

/** RS256, by hand: one sign is not worth a dependency and this is the whole of it. */
function signJwt(claims, privateKey) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(claims))
  const signer = createSign('RSA-SHA256')
  signer.update(`${head}.${body}`)
  return `${head}.${body}.${signer.sign(privateKey, 'base64url')}`
}

/**
 * The Save to Google Wallet link for one job, or null if it cannot be made.
 *
 * The class rides along in the JWT, so issuing a card needs no REST call and
 * works the first time with nothing set up beyond the credentials.
 */
export async function saveLink(status, { stage, tradeName, origin }) {
  const g = await googleWallet()
  if (!g || !status?.code) return null
  try {
    const object = buildObject({ issuerId: g.issuerId, status, stage, tradeName, origin })
    if (!object) return null
    const claims = saveClaims({ serviceAccountEmail: g.serviceAccountEmail, issuerId: g.issuerId, object, origin })
    const jwt = signJwt(claims, g.privateKey)
    if (jwtTooLong(jwt)) {
      // A truncated link is a button that looks right and does nothing, which
      // is the failure this product keeps having to fix. Say so rather than
      // hand one over.
      console.warn(`google wallet: save link too long for ${status.code} (${jwt.length} > 1800)`)
      return null
    }
    return saveUrl(jwt)
  } catch (error) {
    console.warn('google wallet: could not build a save link:', error?.message)
    return null
  }
}

/* --- updating a card that is already in a wallet ------------------------ */

/** An access token for the REST API, from the service account. Short-lived, not cached. */
async function accessToken(g) {
  const now = Math.floor(Date.now() / 1000)
  const assertion = signJwt({
    iss: g.serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, g.privateKey)

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!r.ok) throw new Error(`token ${r.status}`)
  return (await r.json()).access_token
}

/**
 * Make the one class, once.
 *
 * Every card belongs to it, and it is NOT carried in the save link because
 * doing so put a real card 294 characters over Google's ceiling. So it is
 * created here when the credentials are saved, and again, harmlessly, on any
 * later save: Google answers 409 when it already exists, which is a success.
 */
export async function ensureClass() {
  const g = await googleWallet()
  if (!g) return { ok: false, why: 'not_configured' }
  try {
    const token = await accessToken(g)
    const r = await fetch('https://walletobjects.googleapis.com/walletobjects/v1/genericClass', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(buildClass(g.issuerId)),
    })
    if (r.ok) { console.log('google wallet: class created'); return { ok: true, made: true } }
    if (r.status === 409) return { ok: true, made: false }   // already there
    const body = await r.text().catch(() => '')
    console.warn(`google wallet: could not make the class: ${r.status} ${body.slice(0, 200)}`)
    return { ok: false, why: `http_${r.status}` }
  } catch (error) {
    console.warn('google wallet: making the class threw:', error?.message)
    return { ok: false, why: 'threw' }
  }
}

/**
 * Tell a Google card its job has moved.
 *
 * Called UN-AWAITED and swallowed, the same rule as `notifyStage()` and
 * `notifyPassUpdated()`: the trade tapped a button on a driveway and Google
 * having a bad afternoon must not turn that into an error.
 *
 * A 404 means no such object -- the customer never added the card, which is
 * the normal case and not a problem. It is logged at the same level as a
 * success because reading silence as evidence is what cost two days on the
 * Apple side, in both directions.
 */
export async function updateGoogleCard(status, { stage }) {
  try {
    const g = await googleWallet()
    if (!g || !status?.code) return { sent: 0 }

    const token = await accessToken(g)
    const r = await fetch(objectResource(g.issuerId, status.code), {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(patchForStage({ stage, status })),
    })

    if (r.status === 404) {
      console.log(`google wallet: no card for ${status.code} (never added)`)
      return { sent: 0 }
    }
    if (!r.ok) {
      console.warn(`google wallet: update failed for ${status.code}: ${r.status}`)
      return { sent: 0 }
    }
    console.log(`google wallet: updated ${status.code} to ${stage?.key || ''}`)
    return { sent: 1 }
  } catch (error) {
    console.warn('google wallet: update threw:', error?.message)
    return { sent: 0 }
  }
}

export { objectId, buildClass }

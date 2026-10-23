/**
 * The Wallet update service: the half that touches the database and Apple.
 *
 * A pass is added once by hand; this is what makes it move afterwards. Wallet
 * registers the phone here (src/app/api/passes/v1/...), and every change to a
 * job calls pushPassUpdate(), which pokes APNs with an empty payload so Wallet
 * fetches the pass again and shows the new stage. The rules it keeps:
 *
 *   - It never throws and never blocks a stage change. Every caller runs it
 *     un-awaited or inside after(), the same as notifyStage().
 *   - A dead token is deleted, not retried (410, BadDeviceToken): same rule
 *     as web push.
 *   - The PassRegistration table is NEW, so it fails soft: no table, no
 *     registrations, and the pass is still a pass.
 *   - It is dark until the pass can be signed (passkitConfigured()), because
 *     the same certificate signs the pass and authenticates to APNs.
 *   - Nothing here decides what the pass says. buildPassJson() does; the only
 *     lock-screen line a pass update produces is the stage field's
 *     changeMessage there, which is the stage and nothing else.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import http2 from 'node:http2'
import { prisma } from '@/lib/prisma'
import { passkitConfigured, pem } from '@/lib/passkit'
import { apnsVerdict } from '@/lib/pass-update'

const APNS = process.env.APNS_HOST || 'https://api.push.apple.com'

/**
 * The token Wallet sends back on every update call. Derived rather than
 * stored, so there is no extra column and no secret to leak from the
 * database: it is only reproducible by something holding JWT_SECRET.
 */
export function passAuthToken(code) {
  return createHmac('sha256', process.env.JWT_SECRET || '').update(`pass:${code}`).digest('hex')
}

/** Fails closed: no JWT_SECRET means no token is ever right. */
export function tokenMatches(code, token) {
  if (!process.env.JWT_SECRET || !code || !token) return false
  const want = Buffer.from(passAuthToken(code))
  const got = Buffer.from(String(token))
  return want.length === got.length && timingSafeEqual(want, got)
}

export const passTypeId = () => process.env.PASSKIT_PASS_TYPE_ID || ''

/** 'created' | 'exists' | 'unavailable' (no table yet) */
export async function registerDevice({ deviceId, passType, serial, pushToken }) {
  try {
    const where = { deviceId_passTypeId_serial: { deviceId, passTypeId: passType, serial } }
    const existing = await prisma.passRegistration.findUnique({ where })
    if (existing) {
      if (existing.pushToken !== pushToken) await prisma.passRegistration.update({ where, data: { pushToken } })
      return 'exists'
    }
    await prisma.passRegistration.create({ data: { deviceId, passTypeId: passType, serial, pushToken } })
    return 'created'
  } catch (error) {
    console.error('pass register failed:', error?.code || error?.message)
    return 'unavailable'
  }
}

export async function unregisterDevice({ deviceId, passType, serial }) {
  try {
    await prisma.passRegistration.deleteMany({ where: { deviceId, passTypeId: passType, serial } })
  } catch (error) {
    console.error('pass unregister failed:', error?.code || error?.message)
  }
}

/** The live jobs a device holds passes for: [{ code, updatedAt }], or null if it holds none. */
export async function passesHeldBy({ deviceId, passType }) {
  try {
    const regs = await prisma.passRegistration.findMany({ where: { deviceId, passTypeId: passType }, select: { serial: true } })
    if (regs.length === 0) return null
    const rows = await prisma.tradeStatus.findMany({
      where: { code: { in: regs.map((r) => r.serial) }, isActive: true },
      select: { code: true, updatedAt: true },
    })
    return rows
  } catch (error) {
    console.error('pass listing failed:', error?.code || error?.message)
    return null
  }
}

/**
 * Tell every phone holding this job's pass to fetch it again. Un-awaited by
 * every caller; swallows everything; returns what it did for the log.
 */
export async function pushPassUpdate(code) {
  if (!code || !passkitConfigured()) return { sent: 0, reason: 'not_configured' }
  let regs = []
  try {
    regs = await prisma.passRegistration.findMany({ where: { serial: code, passTypeId: passTypeId() } })
  } catch (error) {
    return { sent: 0, reason: `no_table:${error?.code || error?.message}` }
  }
  if (regs.length === 0) return { sent: 0, reason: 'no_registrations' }

  let sent = 0, dropped = 0
  for (const reg of regs) {
    const { status, reason } = await apnsPoke(reg.pushToken).catch((error) => ({ status: 0, reason: error?.message || 'network' }))
    const verdict = apnsVerdict(status, reason)
    if (verdict === 'ok') sent++
    else if (verdict === 'drop') {
      dropped++
      await prisma.passRegistration.delete({ where: { id: reg.id } }).catch(() => {})
    } else if (verdict === 'cert') console.error(`pass push: APNs refused our certificate or topic (${status} ${reason}); check PASSKIT_* in Vercel`)
    else console.error(`pass push: APNs ${status || 'unreachable'} ${reason || ''}; will try on the next change`)
  }
  console.log(`pass push code=${code} sent=${sent} dropped=${dropped} of=${regs.length}`)
  return { sent, dropped, of: regs.length }
}

/**
 * One empty push to one token, over HTTP/2 with the pass certificate as the
 * TLS client certificate: Apple's documented way to wake a pass. The topic is
 * the pass type identifier. No apns-push-type, on purpose: the header is
 * required only on watchOS and must match the payload, and an empty payload
 * matches none of the values.
 */
function apnsPoke(pushToken) {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn, v) => { if (!settled) { settled = true; clearTimeout(timer); try { client.close() } catch {} fn(v) } }
    const client = http2.connect(APNS, {
      cert: pem(process.env.PASSKIT_CERT_PEM),
      key: pem(process.env.PASSKIT_KEY_PEM),
      passphrase: process.env.PASSKIT_KEY_PASSWORD || undefined,
    })
    const timer = setTimeout(() => done(reject, new Error('apns_timeout')), 8000)
    client.on('error', (e) => done(reject, e))
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${pushToken}`,
      'apns-topic': passTypeId(),
      'content-type': 'application/json',
    })
    let status = 0, body = ''
    req.on('response', (headers) => { status = Number(headers[':status']) })
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let reason
      try { reason = JSON.parse(body)?.reason } catch { reason = undefined }
      done(resolve, { status, reason })
    })
    req.on('error', (e) => done(reject, e))
    req.end('{}')
  })
}

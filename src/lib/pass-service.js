import http2 from 'node:http2'
import { createPrivateKey } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { publicShape } from '@/lib/trade-status'
import { passkitConfigured, buildSignedPass, pem } from '@/lib/passkit'
import { passAuthToken } from '@/lib/pass-service-words'

/**
 * The database and network half of the Apple Wallet web service (v1.70.2).
 * The rules live in pass-service-words.js; this does the reading, the writing
 * and the one call to Apple.
 *
 * Every function here fails soft. PassRegistration is a new table, so until
 * the build's `prisma db push` has made it a read throws, and that must cost
 * a Wallet update, never a stage change.
 */

// The latest pass for a code, signed, or null if there is no such live job.
export async function latestPass(code, { origin }) {
  const row = await prisma.tradeStatus.findUnique({
    where: { code },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  })
  if (!row || !row.isActive) return null
  const buffer = await buildSignedPass(publicShape(row), { origin, authToken: passAuthToken(row.code) })
  return { buffer, updatedAt: row.updatedAt }
}

// The passes a device holds, with when each last changed.
export async function devicePasses(deviceId, passTypeId) {
  const regs = await prisma.passRegistration.findMany({
    where: { deviceId, passTypeId },
    select: { serial: true },
  })
  if (!regs.length) return []
  return prisma.tradeStatus.findMany({
    where: { code: { in: regs.map((r) => r.serial) }, isActive: true },
    select: { code: true, updatedAt: true },
  })
}

// Register (or refresh the push token of) a device for a pass. true = new.
export async function register({ deviceId, passTypeId, serial, pushToken }) {
  const where = { deviceId_passTypeId_serial: { deviceId, passTypeId, serial } }
  const existing = await prisma.passRegistration.findUnique({ where })
  if (existing) {
    if (existing.pushToken !== pushToken) {
      await prisma.passRegistration.update({ where, data: { pushToken } })
    }
    return false
  }
  await prisma.passRegistration.create({ data: { deviceId, passTypeId, serial, pushToken } })
  return true
}

export async function unregister({ deviceId, passTypeId, serial }) {
  await prisma.passRegistration.deleteMany({ where: { deviceId, passTypeId, serial } })
}

// The Pass Type ID certificate is also the APNs client certificate for pass
// updates. The key is stored encrypted; decrypt it in memory once.
let tlsCache = null
function tlsMaterial() {
  if (tlsCache) return tlsCache
  const key = createPrivateKey({
    key: pem(process.env.PASSKIT_KEY_PEM),
    passphrase: process.env.PASSKIT_KEY_PASSWORD || undefined,
  }).export({ type: 'pkcs8', format: 'pem' })
  tlsCache = { cert: pem(process.env.PASSKIT_CERT_PEM), key }
  return tlsCache
}

function sendOne(session, { pushToken, topic }) {
  return new Promise((resolve) => {
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${pushToken}`,
      'apns-topic': topic,
      'content-type': 'application/json',
    })
    let status = 0
    let body = ''
    req.setEncoding('utf8')
    req.on('response', (h) => { status = h[':status'] })
    req.on('data', (d) => { body += d })
    req.on('end', () => resolve({ status, body }))
    req.on('error', (e) => resolve({ status: 0, body: e?.message || 'error' }))
    req.setTimeout(8000, () => { req.close(); resolve({ status: 0, body: 'timeout' }) })
    // Apple: the payload for a pass update is an empty dictionary. The push
    // carries nothing; Wallet asks the web service what changed.
    req.end('{}')
  })
}

/**
 * Tell every Wallet holding this pass that it changed. Never throws, never
 * awaited on a driveway: called from after() or as a bare promise beside
 * notifyStage(). A 410 from Apple means the device no longer wants it, so the
 * row goes, the same rule as a dead web push subscription.
 */
export async function pushPassUpdate(code, { host = 'https://api.push.apple.com' } = {}) {
  try {
    if (!passkitConfigured() || !code) return { sent: 0 }
    const topic = process.env.PASSKIT_PASS_TYPE_ID
    const regs = await prisma.passRegistration.findMany({ where: { serial: code, passTypeId: topic } })
    if (!regs.length) return { sent: 0 }

    const session = http2.connect(host, tlsMaterial())
    session.on('error', (e) => console.error('wallet push session:', e?.message))
    let sent = 0
    try {
      const tokens = [...new Set(regs.map((r) => r.pushToken))]
      for (const pushToken of tokens) {
        const { status, body } = await sendOne(session, { pushToken, topic })
        if (status === 200) sent++
        else if (status === 410 || (status === 400 && /BadDeviceToken/.test(body))) {
          await prisma.passRegistration.deleteMany({ where: { pushToken, passTypeId: topic } }).catch(() => {})
        } else {
          console.error(`wallet push: ${status} ${body.slice(0, 120)}`)
        }
      }
    } finally {
      session.close()
    }
    return { sent }
  } catch (error) {
    console.error('wallet push failed:', error?.code || error?.message)
    return { sent: 0 }
  }
}

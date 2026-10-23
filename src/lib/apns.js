/**
 * Telling a phone its wallet card has changed.
 *
 * Apple's push for a pass is unusual and the shape is worth writing down,
 * because almost none of it looks like the web push this product already
 * sends to a browser:
 *
 *   - **The payload is empty.** `{}`. It carries no words, makes no sound and
 *     shows nothing on the lock screen. It only tells Wallet to come back and
 *     ask what changed. That is why the lock-screen rule does not need a
 *     vocabulary here: there is nothing to say and no way to say it.
 *   - **The topic is the pass type**, not a bundle id.
 *   - **Authentication is the Pass Type ID certificate itself** — the same
 *     `PASSKIT_CERT_PEM`/`PASSKIT_KEY_PEM` that signs the pass. No separate
 *     key, nothing more for the owner to fetch. That is the whole reason this
 *     can ship the day the certificate lands.
 *   - **It is HTTP/2 only.** `fetch()` in Node will not do a client
 *     certificate over HTTP/2, so this uses `node:http2` directly.
 *
 * Nothing here ever throws. A push that does not land leaves the card showing
 * the stage it was added at, which is exactly where the product is today; a
 * stage change failing because Apple had a bad afternoon would be worse than
 * the thing it is trying to fix. Same rule as `notifyStage()`.
 */
import http2 from 'node:http2'
import { pem } from '@/lib/passkit'

const HOST = 'https://api.push.apple.com'

/** 410 means the device threw the pass away. The row goes; it is not retried. */
export const GONE = 410

export function apnsConfigured() {
  return Boolean(process.env.PASSKIT_CERT_PEM && process.env.PASSKIT_KEY_PEM && process.env.PASSKIT_PASS_TYPE_ID)
}

/**
 * One ping to one device. Resolves `{ status }` and never rejects.
 *
 * The session is opened and closed per call. A pool would be fewer round
 * trips, and would also be a long-lived socket inside a serverless function
 * that may be frozen between invocations — which is how you get a handle that
 * looks open and silently delivers nothing.
 */
export function pushToDevice(token, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!apnsConfigured() || !token) return resolve({ status: 0, error: 'not_configured' })

    let client
    let settled = false
    const done = (out) => {
      if (settled) return
      settled = true
      try { client?.close() } catch { /* already gone */ }
      resolve(out)
    }

    try {
      client = http2.connect(HOST, {
        cert: pem(process.env.PASSKIT_CERT_PEM),
        key: pem(process.env.PASSKIT_KEY_PEM),
        passphrase: process.env.PASSKIT_KEY_PASSWORD || undefined,
      })
      client.on('error', (e) => done({ status: 0, error: e?.message || 'connect_failed' }))

      const body = Buffer.from('{}', 'utf8')
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        'apns-topic': process.env.PASSKIT_PASS_TYPE_ID,
        // A pass update is a background wake, not an alert. Apple rejects a
        // mismatched push-type, and the default for an empty payload is not
        // the one this wants.
        'apns-push-type': 'background',
        'apns-priority': '5',
        'content-type': 'application/json',
        'content-length': body.length,
      })

      let status = 0
      let text = ''
      req.setTimeout(timeoutMs, () => { req.close(); done({ status: 0, error: 'timeout' }) })
      req.on('response', (headers) => { status = Number(headers[':status']) || 0 })
      req.on('data', (chunk) => { text += chunk })
      req.on('error', (e) => done({ status: 0, error: e?.message || 'request_failed' }))
      req.on('end', () => done({ status, reason: text ? safeReason(text) : undefined }))
      req.end(body)
    } catch (e) {
      done({ status: 0, error: e?.message || 'threw' })
    }
  })
}

/** Apple answers a failure with `{"reason":"BadDeviceToken"}`. Keep the word, drop the rest. */
function safeReason(text) {
  try { return JSON.parse(text)?.reason } catch { return undefined }
}

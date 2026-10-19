import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { readRawEmail } from '@/lib/mime'
import { fileEmail } from '@/lib/arrivals'
import { GMAIL_SCOPE, GMAIL_AUTH, GMAIL_TOKEN, GMAIL_REVOKE, GMAIL_API, gmailQuery, decodeRaw, needsRefresh, sweepFrom } from '@/lib/gmail-words'

/**
 * Connect Gmail, stage 1: the owner's own Workspace mailbox feeds one
 * household card, with no forwarding rule.
 *
 * Dark until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, which only the
 * owner can do: the Google Cloud project, the Internal consent screen and the
 * OAuth client are made in their Workspace (docs/connect-gmail.md). No session
 * ever creates one. Tokens are sealed with a key derived from JWT_SECRET, as
 * the ServiceM8 add-on's are, and no route returns them.
 *
 * Every sweep (the five-minute cron) asks Gmail for messages after the newest
 * already read, matching gmailQuery(), at most a couple of dozen, fetches each
 * raw and files it through the same reader a forwarded email goes through.
 * Nothing here throws: a Gmail outage is a quiet sweep, never a broken card.
 */

const MAX_PER_SWEEP = 25
const TIMEOUT_MS = 8_000

export const gmailConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.JWT_SECRET)

const key = () => createHash('sha256').update(`${process.env.JWT_SECRET}:gmail-oauth`).digest()
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

/** A signed, short-lived state so the callback only accepts what we started. */
export function makeState() {
  const ts = Date.now().toString(36)
  return `${ts}.${createHmac('sha256', key()).update(`gmail:${ts}`).digest('hex').slice(0, 24)}`
}
export function checkState(state) {
  const [ts, sig] = String(state || '').split('.')
  if (!ts || !sig) return false
  const want = createHmac('sha256', key()).update(`gmail:${ts}`).digest('hex').slice(0, 24)
  const age = Date.now() - parseInt(ts, 36)
  return sig === want && age >= 0 && age < 10 * 60_000
}

export const redirectUri = (origin) => `${origin}/api/gmail/oauth/callback`

export function authorizeUrl(origin) {
  const u = new URL(GMAIL_AUTH)
  u.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  u.searchParams.set('redirect_uri', redirectUri(origin))
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', GMAIL_SCOPE)
  u.searchParams.set('access_type', 'offline')
  u.searchParams.set('prompt', 'consent')
  u.searchParams.set('include_granted_scopes', 'false')
  u.searchParams.set('state', makeState())
  return u.toString()
}

async function tokenCall(params) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(GMAIL_TOKEN, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...params }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.access_token) throw new Error(`google_token: ${j.error_description || j.error || r.status}`)
    return j
  } finally { clearTimeout(t) }
}

async function gmailGet(path, access) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(`${GMAIL_API}${path}`, { signal: ctl.signal, headers: { Authorization: `Bearer ${access}`, Accept: 'application/json' } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(`gmail_http_${r.status}: ${j?.error?.message || ''}`.trim()); e.status = r.status; throw e }
    return j
  } finally { clearTimeout(t) }
}

/** Swap the code for tokens, read whose inbox it is, write the one row. */
export async function exchangeCode(code, origin) {
  const j = await tokenCall({ code, redirect_uri: redirectUri(origin), grant_type: 'authorization_code' })
  if (!j.refresh_token) throw new Error('google_token: no refresh token (remove the app at myaccount.google.com/permissions and connect again)')
  const tokens = { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 }
  let email = null
  try { email = (await gmailGet('/profile', tokens.access))?.emailAddress || null } catch { email = null }
  const cipher = seal(tokens)
  return prisma.gmailLink.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', cipher, email, connectedAt: new Date() },
    update: { cipher, email, connectedAt: new Date(), lastSeenAt: null, lastOutcome: null },
  })
}

async function accessToken(row) {
  const tokens = open(row.cipher)
  if (!needsRefresh(tokens.expiresAt)) return tokens.access
  const j = await tokenCall({ refresh_token: tokens.refresh, grant_type: 'refresh_token' })
  const fresh = { access: j.access_token, refresh: j.refresh_token || tokens.refresh, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000 }
  await prisma.gmailLink.update({ where: { id: 'singleton' }, data: { cipher: seal(fresh) } }).catch(() => {})
  return fresh.access
}

export async function gmailLink() {
  try { return await prisma.gmailLink.findUnique({ where: { id: 'singleton' } }) } catch { return null }
}

/** For the panel. Never the tokens. */
export async function gmailState() {
  const row = await gmailLink()
  return {
    configured: gmailConfigured(),
    connected: Boolean(row),
    email: row?.email || null,
    placeCode: row?.placeCode || null,
    connectedAt: row?.connectedAt || null,
    lastCheckedAt: row?.lastCheckedAt || null,
    lastSeenAt: row?.lastSeenAt || null,
    lastOutcome: row?.lastOutcome || null,
  }
}

export async function setPlace(placeCode) {
  const code = String(placeCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || null
  if (code) {
    const place = await prisma.place.findUnique({ where: { code } }).catch(() => null)
    if (!place?.isActive) throw new Error('no_such_card')
  }
  return prisma.gmailLink.update({ where: { id: 'singleton' }, data: { placeCode: code } })
}

/** Revoke at Google, then forget. Revocation failing must not keep the row. */
export async function disconnect() {
  const row = await gmailLink()
  if (!row) return
  try {
    const tokens = open(row.cipher)
    await fetch(`${GMAIL_REVOKE}?token=${encodeURIComponent(tokens.refresh || tokens.access)}`, { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch { /* already revoked, or Google is away */ }
  await prisma.gmailLink.delete({ where: { id: 'singleton' } }).catch(() => {})
}

/**
 * One sweep. Returns counts for the cron log: how many Gmail listed, how many
 * were filed on the card, how many the reader dropped.
 */
export async function pollGmail({ now = Date.now() } = {}) {
  if (!gmailConfigured()) return { on: false }
  const row = await gmailLink()
  if (!row) return { on: false, why: 'not_connected' }
  if (!row.placeCode) return { on: true, why: 'no_card_chosen', checked: 0 }
  let place = null
  try { place = await prisma.place.findUnique({ where: { code: row.placeCode } }) } catch { place = null }
  if (!place?.isActive) return { on: true, why: 'card_gone', checked: 0 }

  const outcome = async (text) => prisma.gmailLink.update({ where: { id: 'singleton' }, data: { lastCheckedAt: new Date(), lastOutcome: String(text).slice(0, 120) } }).catch(() => {})
  try {
    const access = await accessToken(row)
    const since = sweepFrom(row, now)
    const list = await gmailGet(`/messages?q=${encodeURIComponent(gmailQuery(since))}&maxResults=${MAX_PER_SWEEP}`, access)
    const ids = (list?.messages || []).map((m) => m.id)
    let filed = 0, dropped = 0, newest = since
    for (const id of ids) {
      const m = await gmailGet(`/messages/${id}?format=raw`, access).catch(() => null)
      if (!m?.raw) continue
      const at = Number(m.internalDate) || now
      if (at <= since) continue
      const read = readRawEmail(decodeRaw(m.raw))
      if (read) {
        const r = await fileEmail({ inboxKey: place.inboxKey, from: read.from, subject: read.subject, text: read.text, receivedAt: new Date(at) })
        if (r.filed) filed += 1; else dropped += 1
      }
      if (at > newest) newest = at
    }
    await prisma.gmailLink.update({ where: { id: 'singleton' }, data: { lastCheckedAt: new Date(), lastSeenAt: new Date(newest), lastOutcome: `checked ${ids.length}, filed ${filed}, dropped ${dropped}` } }).catch(() => {})
    return { on: true, checked: ids.length, filed, dropped }
  } catch (error) {
    const why = error?.status === 401 ? 'Google refused the token: disconnect and connect again' : String(error?.message || 'failed')
    await outcome(`error: ${why}`)
    return { on: true, error: why }
  }
}

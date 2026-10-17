import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

/**
 * TurnUp as a ServiceM8 add-on.
 *
 * The account API key reads jobs, bookings, contacts and message history, and
 * (checked 12 Oct 2026) sends SMS through ServiceM8. What it cannot do is
 * write to the job diary or notify staff: those endpoints answer 403 to a
 * key and want an OAuth add-on. This file is that add-on's half of OAuth:
 * the authorise URL, the code exchange, the refresh, and the two calls that
 * need it. Everything else stays on the key, so nothing here is on the path
 * of a customer's page.
 *
 * Tokens are stored encrypted (AES-256-GCM, key derived from JWT_SECRET) in
 * one row. They are the trade's own ServiceM8 access and worth protecting
 * from a database read, but not worth a second secret to manage.
 */
const AUTH_BASE = (process.env.SM8_OAUTH_BASE || 'https://go.servicem8.com').replace(/\/$/, '')
const API_BASE = (process.env.SM8_API_BASE || 'https://api.servicem8.com').replace(/\/$/, '')
// Only what is used. `create_notifications` was requested here for two
// versions and never called once: TurnUp notifies the trade through its own
// push, not ServiceM8's. ServiceM8's own store requirements make an add-on
// request only the permissions it needs, and asking a trade to grant one
// nothing reads is the same defect as a field on publicShape() nothing shows.
// `vendor` is the account name, which the dashboard prints so the trade can
// see WHICH ServiceM8 account is connected.
export const SCOPES = ['publish_diary_items', 'vendor']
const ID = 'singleton'

export const oauthConfigured = () => Boolean(process.env.SM8_APP_ID && process.env.SM8_APP_SECRET && process.env.JWT_SECRET)

const key = () => createHash('sha256').update(`${process.env.JWT_SECRET}:sm8-oauth`).digest()
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
  return `${ts}.${createHmac('sha256', key()).update(ts).digest('hex').slice(0, 24)}`
}
export function checkState(state) {
  const [ts, sig] = String(state || '').split('.')
  if (!ts || !sig) return false
  const want = createHmac('sha256', key()).update(ts).digest('hex').slice(0, 24)
  const age = Date.now() - parseInt(ts, 36)
  return sig === want && age >= 0 && age < 10 * 60_000
}

export const redirectUri = (origin) => `${origin}/api/servicem8/oauth/callback`

export function authorizeUrl(origin) {
  const u = new URL(`${AUTH_BASE}/oauth/authorize`)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', process.env.SM8_APP_ID)
  u.searchParams.set('scope', SCOPES.join(' '))
  u.searchParams.set('redirect_uri', redirectUri(origin))
  u.searchParams.set('state', makeState())
  return u.toString()
}

async function tokenCall(params) {
  const r = await fetch(`${AUTH_BASE}/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: process.env.SM8_APP_ID, client_secret: process.env.SM8_APP_SECRET, ...params }),
  })
  const text = await r.text()
  let j = null; try { j = JSON.parse(text) } catch { j = null }
  if (!r.ok || !j?.access_token) throw new Error(`sm8_oauth_${r.status}: ${j?.error_description || j?.error || text.slice(0, 120)}`)
  return j
}

async function store(j, previous = {}) {
  const tokens = {
    access: j.access_token,
    refresh: j.refresh_token || previous.refresh || null,
    expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000,
  }
  await prisma.sm8OAuth.upsert({
    where: { id: ID },
    create: { id: ID, cipher: seal(tokens), scope: j.scope || SCOPES.join(' ') },
    update: { cipher: seal(tokens), scope: j.scope || undefined },
  })
  return tokens
}

/** Step 4: the code for tokens. */
export async function exchangeCode(code, origin) {
  const j = await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(origin) })
  await store(j)
  // The account it belongs to, for the panel. Best effort.
  try {
    const v = await oauthApi('api_1.0/vendor.json')
    const name = Array.isArray(v) ? v[0]?.name : v?.name
    if (name) await prisma.sm8OAuth.update({ where: { id: ID }, data: { vendorName: String(name).slice(0, 80) } })
  } catch { /* the panel says connected either way */ }
  return true
}

export async function oauthState() {
  if (!oauthConfigured()) return { configured: false, connected: false }
  try {
    const row = await prisma.sm8OAuth.findUnique({ where: { id: ID } })
    return { configured: true, connected: Boolean(row), scope: row?.scope || null, connectedAt: row?.connectedAt || null, vendorName: row?.vendorName || null }
  } catch { return { configured: true, connected: false, tablesMissing: true } }
}
export const oauthConnected = async () => (await oauthState()).connected === true
export async function disconnect() { await prisma.sm8OAuth.deleteMany({ where: { id: ID } }) }

/** A live access token, refreshed when it is within a minute of expiring. */
async function bearer() {
  const row = await prisma.sm8OAuth.findUnique({ where: { id: ID } })
  if (!row) throw new Error('sm8_oauth_not_connected')
  let t = open(row.cipher)
  if (t.expiresAt - Date.now() < 60_000) {
    if (!t.refresh) throw new Error('sm8_oauth_expired')
    t = await store(await tokenCall({ grant_type: 'refresh_token', refresh_token: t.refresh }), t)
  }
  return t.access
}

async function oauthApi(path, init = {}) {
  const token = await bearer()
  const r = await fetch(`${API_BASE}/${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
  const text = await r.text()
  if (!r.ok) {
    let msg = ''; try { msg = JSON.parse(text)?.message || '' } catch { msg = text.slice(0, 120) }
    throw new Error(`sm8_oauth_http_${r.status}${msg ? `: ${msg}` : ''}`)
  }
  return text ? JSON.parse(text) : null
}

/**
 * One plaintext line in the job diary, attributed to TurnUp. Immutable once
 * written, so the words are the facts and the time: "On my way, 07:42" and
 * nothing a reader could mistake for a promise.
 */
export async function publishDiary(jobUuid, content) {
  return oauthApi('api_1.0/diary.json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_uuid: jobUuid, content: String(content).slice(0, 1000) }),
  })
}

/**
 * Fire-and-forget: a diary line for a tracker that follows a ServiceM8 job,
 * when the add-on is connected. Never awaited on a request path, never
 * throws, logged either way so "did it write?" has an answer.
 */
export async function diaryFor(tracker, text) {
  try {
    if (!tracker?.externalId || !oauthConfigured()) return null
    if (!(await oauthConnected())) return null
    const stamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
    const r = await publishDiary(tracker.externalId, `TurnUp: ${text} (${stamp})`)
    await prisma.sm8Event.create({ data: { event: 'diary.write', jobUuid: tracker.externalId, tradeStatusId: tracker.id, outcome: r?.uuid ? 'written' : 'unknown' } }).catch(() => {})
    return r
  } catch (error) {
    await prisma.sm8Event.create({ data: { event: 'diary.write', jobUuid: tracker?.externalId || null, tradeStatusId: tracker?.id || null, outcome: `error:${String(error?.message || error).slice(0, 80)}` } }).catch(() => {})
    return null
  }
}

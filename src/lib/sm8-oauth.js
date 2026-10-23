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
// Only what is used: diary lines, and the account's name for the panel. The
// add-on asked for create_notifications too and never sent one; ServiceM8's
// store asks for the minimum, so it went (v1.60.0).
export const SCOPES = ['publish_diary_items', 'vendor']
const ID = 'singleton'


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

/**
 * The app's ID and secret: from the environment if both are set, otherwise
 * from the row the ServiceM8 panel writes.
 *
 * WHY THE ROW. The first version needed SM8_APP_ID and SM8_APP_SECRET in
 * Vercel plus a redeploy. Asked three times, by step list and by Cowork, it
 * did not happen; the forwarding setup hit the same wall and was fixed the same
 * way (src/lib/inbound-config.js). When an ask keeps not happening, change the
 * ask: two boxes on the panel, on the phone, and no redeploy.
 *
 * The secret is sealed with the key the tokens already use. Every read is
 * wrapped: Sm8App is a new table, so a missing table means "not configured",
 * which is the safe direction.
 */
export async function appCredentials() {
  if (!process.env.JWT_SECRET) return null
  if (process.env.SM8_APP_ID && process.env.SM8_APP_SECRET) {
    return { appId: process.env.SM8_APP_ID, secret: process.env.SM8_APP_SECRET, source: 'env' }
  }
  try {
    const row = await prisma.sm8App.findUnique({ where: { id: ID } })
    if (!row) return null
    return { appId: row.appId, secret: open(row.cipher).secret, source: 'saved', savedAt: row.savedAt }
  } catch { return null }
}

export const oauthConfigured = async () => Boolean(await appCredentials())

// What ServiceM8 hands out: a numeric-ish App ID and a long hex secret. Checked
// loosely on purpose; the real test is the Connect button, which says plainly
// when ServiceM8 refuses them.
export const validAppId = (v) => /^[A-Za-z0-9_-]{1,64}$/.test(String(v || ''))
export const validAppSecret = (v) => /^\S{8,200}$/.test(String(v || ''))

/** Save the pair from the panel. Replacing it drops any tokens made with the old app. */
export async function saveApp(appId, secret) {
  const prev = await prisma.sm8App.findUnique({ where: { id: ID } }).catch(() => null)
  await prisma.sm8App.upsert({
    where: { id: ID },
    create: { id: ID, appId, cipher: seal({ secret }) },
    update: { appId, cipher: seal({ secret }) },
  })
  if (prev && prev.appId !== appId) await prisma.sm8OAuth.deleteMany({ where: { id: ID } }).catch(() => {})
  return true
}

/** Forget the saved pair and the tokens it made. The environment, if set, is untouched. */
export async function forgetApp() {
  await prisma.sm8OAuth.deleteMany({ where: { id: ID } }).catch(() => {})
  await prisma.sm8App.deleteMany({ where: { id: ID } }).catch(() => {})
  return true
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

export async function authorizeUrl(origin) {
  const app = await appCredentials()
  if (!app) throw new Error('sm8_app_not_configured')
  const u = new URL(`${AUTH_BASE}/oauth/authorize`)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', app.appId)
  u.searchParams.set('scope', SCOPES.join(' '))
  u.searchParams.set('redirect_uri', redirectUri(origin))
  u.searchParams.set('state', makeState())
  return u.toString()
}

async function tokenCall(params) {
  const app = await appCredentials()
  if (!app) throw new Error('sm8_app_not_configured')
  const r = await fetch(`${AUTH_BASE}/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: app.appId, client_secret: app.secret, ...params }),
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
  const app = await appCredentials()
  if (!app) return { configured: false, connected: false }
  // Never the secret, and only the tail of the ID: enough to recognise it.
  const base = { configured: true, source: app.source, appIdTail: String(app.appId).slice(-4) }
  try {
    const row = await prisma.sm8OAuth.findUnique({ where: { id: ID } })
    return { ...base, connected: Boolean(row), scope: row?.scope || null, connectedAt: row?.connectedAt || null, vendorName: row?.vendorName || null }
  } catch { return { ...base, connected: false, tablesMissing: true } }
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
    if (!tracker?.externalId || !(await oauthConfigured())) return null
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

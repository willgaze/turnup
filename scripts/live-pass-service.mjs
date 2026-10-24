/**
 * The wallet pass update service, against a real server and a real database.
 *
 *   bash scripts/local-db.sh
 *   PASSKIT_PASS_TYPE_ID=pass.com.getturnup.job npm run build && npx next start
 *   node scripts/live-pass-service.mjs
 *
 * Why this exists alongside scripts/check-pass-service.mjs, which needs
 * neither: the pure check proves the credential, and it cannot see a handler.
 * **It passed while a revoked card was answered 503 instead of 401** — the
 * certificate gate sat above the row lookup, so a card whose link had been
 * switched off was told "come back later" rather than being removed from the
 * phone. One run of this found it. A check that cannot reach the thing it is
 * about will keep agreeing with you.
 *
 * What is still NOT proved here, and is only proved by a real card in a real
 * wallet: that Apple's paths are the paths Wallet calls. Apple's documentation
 * renders in JavaScript and would not fetch from the container this was
 * written in, so the routes are built from the long-stable public spec. Every
 * one of them logs a line for exactly that reason.
 *
 * It needs the seeded local database because it writes to it: it touches
 * `updatedAt` and flips `isActive` on the seed's own job and puts both back.
 * It refuses to run against anything but localhost for that reason.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const BASE = process.env.BASE || 'http://localhost:3000'
const DB = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/tradestatus'
const CODE = process.env.DEMO_CODE || 'K7M4PQRT'
const TYPE = process.env.PASSKIT_PASS_TYPE_ID || 'pass.com.getturnup.job'
const DEV = 'device-aaaaaaaaaaaa'
const API = `${BASE}/api/passes/v1`

if (!/localhost|127\.0\.0\.1/.test(DB)) {
  console.error('Refusing to run: this writes to the job it tests, so it only runs against a local database.')
  process.exit(1)
}

// The secret the running server is using, not one invented here: the token has
// to be the one it would accept.
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const secretLine = /^JWT_SECRET=(.*)$/m.exec(env)
if (!secretLine) {
  console.error('No JWT_SECRET in .env.local. Run scripts/local-db.sh first.')
  process.exit(1)
}
const SECRET = secretLine[1].trim().replace(/^["']|["']$/g, '')

const tok = (c) => createHmac('sha256', SECRET).update(`pass:${c}`).digest('hex')
const auth = (c) => ({ Authorization: `ApplePass ${tok(c)}` })
const sql = (q) => execFileSync('psql', [DB, '-c', q], { stdio: ['ignore', 'ignore', 'inherit'] })

let failed = 0
const is = (got, want, what) => {
  const ok = got === want
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}${ok ? '' : `  (got ${got}, wanted ${want})`}`)
  if (!ok) failed += 1
}

const reg = (c, o = {}) => `${API}/devices/${o.dev || DEV}/registrations/${o.type || TYPE}/${c}`
const changed = (tag, o = {}) =>
  fetch(`${API}/devices/${o.dev || DEV}/registrations/${o.type || TYPE}${tag === undefined ? '' : `?passesUpdatedSince=${tag}`}`)
const post = (url, body, headers = {}) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

try {
  await fetch(`${BASE}/api/status/${CODE}`)
} catch {
  console.error(`Nothing answering on ${BASE}. Build and start the app first.`)
  process.exit(1)
}

// The running server must know the same pass type, or passTypeMatches() refuses
// every call and all twenty-four checks fail as a wall of 404s that says
// nothing. scripts/local-db.sh REWRITES .env.local, so this is lost every time
// that is re-run -- which is exactly how this was met. Say it in one line.
if (!/^PASSKIT_PASS_TYPE_ID=/m.test(env)) {
  console.error(`No PASSKIT_PASS_TYPE_ID in .env.local, so every route will 404.`)
  console.error(`Add it (scripts/local-db.sh rewrites .env.local and drops it), rebuild, restart:`)
  console.error(`  echo 'PASSKIT_PASS_TYPE_ID="${TYPE}"' >> .env.local`)
  process.exit(1)
}

/* Registering ----------------------------------------------------------- */

is((await post(reg(CODE), { pushToken: 'aa'.repeat(32) }, auth(CODE))).status, 201,
  'a new phone registering gets 201')
is((await post(reg(CODE), { pushToken: 'bb'.repeat(32) }, auth(CODE))).status, 200,
  'the same phone again gets 200, and its push token is replaced rather than duplicated')
is((await post(reg(CODE), {}, { Authorization: `ApplePass ${tok('OTHERJOB')}` })).status, 401,
  "another job's token is refused")
is((await post(reg(CODE), {})).status, 401, 'no Authorization at all is refused')
is((await post(reg(CODE, { type: 'pass.com.someone.else' }), {}, auth(CODE))).status, 404,
  "somebody else's pass type is not ours to answer")
is((await post(reg('ZZZZZZZZ'), {}, auth('ZZZZZZZZ'))).status, 404,
  'a job that does not exist is 404 rather than 401: the token was right, the card is not a thing')
is((await post(reg(CODE), {}, auth(CODE))).status, 400,
  'a registration with no push token is refused, because a row without one never updates anything')

/* What changed ---------------------------------------------------------- */

let r = await changed(undefined)
is(r.status, 200, 'with no tag the device is told everything it holds has moved')
const first = await r.json()
is(JSON.stringify(first.serialNumbers), JSON.stringify([CODE]), 'and that is the one job it registered')
const tag = first.lastUpdated

is((await changed(tag)).status, 204, 'asking again with that tag gets 204, never an empty 200')
is((await changed(Date.now() + 60_000)).status, 204, 'and so does a tag in the future')
is((await changed(undefined, { dev: 'device-never-seen-before' })).status, 204,
  "a device holding nothing is told nothing, and never another device's serials")
is((await changed(undefined, { type: 'pass.com.someone.else' })).status, 404,
  'the wrong pass type is 404 here too')

sql(`UPDATE "TradeStatus" SET "updatedAt" = now() WHERE code = '${CODE}'`)
is((await changed(tag)).status, 200, 'a write to the job makes it changed again, which is what moves a card')

/* The pass itself ------------------------------------------------------- */

is((await fetch(`${API}/passes/${TYPE}/${CODE}`, { headers: auth(CODE) })).status, 503,
  'with no certificate the pass is 503: honest, and not a 500 at a phone that will only retry')
is((await fetch(`${API}/passes/${TYPE}/${CODE}`)).status, 401,
  'and the credential is checked before anything else')

/* A revoked link -------------------------------------------------------- */

sql(`UPDATE "TradeStatus" SET "isActive" = false WHERE code = '${CODE}'`)
try {
  is((await fetch(`${API}/passes/${TYPE}/${CODE}`, { headers: auth(CODE) })).status, 401,
    'a revoked link answers 401 on the pass, so Wallet takes the card off the phone')
  is((await changed(tag)).status, 200,
    'and the revoked card is still reported as changed, so it is allowed to find out it is dead')
  is((await post(reg(CODE), { pushToken: 'cc'.repeat(32) }, auth(CODE))).status, 404,
    'a revoked job accepts no new registrations')
} finally {
  sql(`UPDATE "TradeStatus" SET "isActive" = true WHERE code = '${CODE}'`)
}

/* Wallet's own complaints, and forgetting ------------------------------- */

is((await post(`${API}/log`, { logs: ['Invalid data error reading pass'] })).status, 200,
  "Wallet's log is accepted unauthenticated, as the spec has it")
is((await post(`${API}/log`, { logs: 'not an array' })).status, 200,
  'and a body that is the wrong shape is still 200, because it is a stranger writing')

is((await fetch(reg(CODE), { method: 'DELETE', headers: auth(CODE) })).status, 200,
  'deleting the registration is 200')
is((await fetch(reg(CODE), { method: 'DELETE', headers: auth(CODE) })).status, 200,
  'and deleting it twice is 200 as well: the phone has thrown it away either way')
is((await changed(undefined)).status, 204, 'after which the device holds nothing')

console.log(failed
  ? `\nFAILED - ${failed} check(s)`
  : '\nThe service answers correctly end to end. Only Apple\'s own path spelling is left to a real card.')
process.exit(failed ? 1 : 0)

/**
 * The demo stays on the page.
 *
 *   node scripts/check-demo.mjs
 *
 * Three things, each of which was once untrue (v1.78.0):
 *   1. No component under src/app/t/ calls the global `fetch(` with an
 *      /api/status URL. They go through useStatusFetch(), which the demo
 *      provider turns into an answer on the page. The poll in StatusTracker
 *      is the one allowed global fetch, and it returns early in the demo.
 *   2. demoAnswer() answers every route folder that exists under
 *      src/app/api/status/[code]/, so a new row cannot land on the demo with
 *      a tap that does nothing.
 *   3. Preview wraps itself in DemoProvider, so /demo and /preview both hold.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { demoAnswer, demoRoute, DEMO_ROUTES } from '../src/lib/demo-answers.js'

let fails = 0
const fail = (m) => { fails++; console.error('FAIL', m) }

// 1. no global fetch to the status API from a customer-page component
for (const f of readdirSync('src/app/t').filter((n) => n.endsWith('.jsx'))) {
  const src = readFileSync(`src/app/t/${f}`, 'utf8')
  const hits = [...src.matchAll(/(?<![\w.])fetch\(\s*`\/api\/status\//g)].length
  if (f === 'StatusTracker.jsx') {
    if (hits !== 1) fail(`${f}: expected exactly the one poll fetch, found ${hits}`)
    if (!/if \(demo\) return/.test(src)) fail(`${f}: the poll must return early in the demo`)
  } else if (hits) fail(`${f}: ${hits} global fetch(\`/api/status/...\`) call(s); use useStatusFetch()`)
  if (/statusFetch\(/.test(src) && !/useStatusFetch\(\)/.test(src)) fail(`${f}: calls statusFetch without the hook`)
}

// 2. every route the page can reach is answered
const dir = 'src/app/api/status/[code]'
const routes = readdirSync(dir).filter((n) => statSync(`${dir}/${n}`).isDirectory() && n !== 'calendar')
for (const r of routes) {
  if (!DEMO_ROUTES.includes(r)) fail(`route ${r} exists on disk but is not in DEMO_ROUTES`)
  const a = demoAnswer(`/api/status/K7M4PQRT/${r}`, { method: 'POST', body: '{}' })
  if (!a.ok) fail(`demoAnswer does not answer ${r}`)
}
for (const r of DEMO_ROUTES) if (!routes.includes(r)) fail(`DEMO_ROUTES names ${r}, which is not a route`)

// the shapes the components read
const now = '2026-10-01T08:00:00.000Z'
const eq = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`) }
eq('route tail', demoRoute('/api/status/K7M4PQRT/customer-late'), 'customer-late')
eq('route bare', demoRoute('/api/status/K7M4PQRT'), '')
eq('route other', demoRoute('/api/dashboard/trackers'), null)
eq('ask', demoAnswer('/api/status/K7M4PQRT/ask', { method: 'POST' }, now).body, { askedAt: now })
eq('presence', demoAnswer('/api/status/K7M4PQRT/notes', { method: 'PUT', body: JSON.stringify({ presence: 'IN' }) }, now).body, { presenceAt: now })
eq('access', demoAnswer('/api/status/K7M4PQRT/notes', { method: 'PUT', body: JSON.stringify({ doorToUse: 'side' }) }, now).body, {})
eq('reminder', demoAnswer('/api/status/K7M4PQRT/reminder', { method: 'POST', body: JSON.stringify({ choice: 'OK' }) }, now).body, { reminderReply: 'OK', reminderReplyAt: now })
eq('terms', demoAnswer('/api/status/K7M4PQRT/terms', { method: 'POST' }, now).body, { termsAgreedAt: now, termsAgreed: null })
eq('review', demoAnswer('/api/status/K7M4PQRT/review', { method: 'POST', body: JSON.stringify({ action: 'feedback', text: 'x' }) }, now).body, { feedbackAt: now })
eq('late', demoAnswer('/api/status/K7M4PQRT/customer-late', { method: 'POST', body: JSON.stringify({ minutes: 30 }) }, now).body, { customerLateAt: now })
eq('window', demoAnswer('/api/status/K7M4PQRT/window', { method: 'PUT', body: JSON.stringify({ action: 'agree' }) }, now).body.at, now)
if (demoAnswer('/api/status/K7M4PQRT', { method: 'GET' }).ok) fail('the poll must not be answered ok: the page holds the fixture')
if (demoAnswer('/api/dashboard/trackers', { method: 'POST' }).ok) fail('a dashboard URL must never be answered')

// 3. the fixture is wrapped
const preview = readFileSync('src/app/preview/Preview.jsx', 'utf8')
if (!/<DemoProvider>/.test(preview)) fail('Preview.jsx does not wrap StatusTracker in <DemoProvider>')
const demoPage = readFileSync('src/app/demo/page.js', 'utf8')
if (!/preview\/Preview/.test(demoPage)) fail('demo/page.js no longer draws Preview')

if (fails) { console.error(`check-demo: ${fails} failure(s)`); process.exit(1) }
console.log(`check-demo: ok (${routes.length} routes answered on the page, ${readdirSync('src/app/t').filter((n) => n.endsWith('.jsx')).length} components read)`)

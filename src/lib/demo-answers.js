/**
 * What the demo page says back when one of its buttons is tapped.
 *
 * /demo is the real customer page drawn from a fixture, and until v1.78.0
 * every tap on it posted to the real API under the fixture's code
 * (`/api/status/K7M4PQRT/ask`, and so on). Nothing was there to receive it,
 * which made the taps dead on the page people are sent to try it on, and it
 * meant a worked example was sending traffic at the production database.
 *
 * So in demo mode nothing leaves the browser. Every component on the page
 * sends through `useStatusFetch()` (src/app/t/status-fetch.js); under the
 * demo provider that hands the request here instead, and this file answers
 * the way the route would, using the browser's own clock. Pure: no React, no
 * database, so `node scripts/check-demo.mjs` can prove it answers every
 * route the customer's page has.
 *
 * It is an answer, not a server: nothing is validated, nothing is kept past
 * a reload, and nobody is notified, because there is nobody to notify.
 */

/** The route folders under src/app/api/status/[code]/ that a tap can reach. */
export const DEMO_ROUTES = ['ask', 'customer-late', 'missed', 'no-access', 'notes', 'push', 'reminder', 'review', 'terms', 'window']

/** `/api/status/K7M4PQRT/notes` -> 'notes'; the bare status URL -> ''. */
export function demoRoute(url) {
  const m = String(url || '').match(/\/api\/status\/[A-Z0-9]+\/?([a-z-]*)/i)
  return m ? m[1] : null
}

function parse(body) {
  if (!body) return {}
  if (typeof body === 'object') return body
  try { return JSON.parse(body) || {} } catch { return {} }
}

/**
 * Returns `{ ok, status, body }` for a tap, the shape the real route would
 * answer with the fields the component reads. `now` is an ISO time.
 */
export function demoAnswer(url, init = {}, now = new Date().toISOString()) {
  const route = demoRoute(url)
  const method = String(init.method || 'GET').toUpperCase()
  const body = parse(init.body)
  const ok = (b) => ({ ok: true, status: 200, body: b })
  const no = (status = 404) => ({ ok: false, status, body: { error: 'Not in the demo' } })

  if (route === null) return no()
  if (route === '' ) return no(404) // the poll: the page already holds the fixture
  if (method === 'GET') return no(405)

  switch (route) {
    case 'ask': return ok({ askedAt: now })
    case 'customer-late': return ok({ customerLateAt: body.minutes == null ? null : now })
    case 'missed': return ok({ missedChoice: body.choice || null, missedChoiceAt: now })
    case 'no-access': return ok({ reply: body.choice || null, replyAt: now })
    case 'notes': return ok(body.presence ? { presenceAt: now } : {})
    case 'push': return ok({})
    case 'reminder': return ok({ reminderReply: body.choice || null, reminderReplyAt: now })
    case 'review': return ok(body.action === 'feedback' ? { feedbackAt: now } : { reviewClickedAt: now })
    case 'terms': return ok({ termsAgreedAt: now, termsAgreed: null })
    case 'window': return ok(demoWindow(body, now))
    default: return no()
  }
}

/* The window row builds the next window itself from what it sent and reads
   only `at` back, the time the server stamped. The real state machine is
   src/lib/window.js; this hands back the stamp and echoes the action. */
function demoWindow(body, now) {
  return { at: now, action: body.action || null, start: body.start || null, end: body.end || null }
}

/** A Response-shaped object, so a component cannot tell demo from server. */
export function demoResponse(url, init, now) {
  const a = demoAnswer(url, init, now)
  return { ok: a.ok, status: a.status, json: async () => a.body, text: async () => JSON.stringify(a.body) }
}

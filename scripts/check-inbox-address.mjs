/**
 * Which inbox a forwarded email was addressed to.
 *
 *   node scripts/check-inbox-address.mjs
 *
 * This is the join between a household's mail rule and their card, and the
 * shape of the address it has to read depends on an inbound mail provider that
 * has not been chosen yet. So it is tested against every shape a provider
 * might hand us rather than the one we happen to be using — switching provider
 * must never mean asking a customer to change their forwarding rule twice.
 */
import { inboxKeyFrom, inboxAddress } from '../src/lib/inbox-address.js'

const KEY = 'q7rmt4ndkw82jp'
const CASES = [
  // What is handed out since v1.63.0: one Cloudflare rule for cards@, with
  // subaddressing on, and the key in the plus part.
  [`cards+${KEY}@in.getturnup.com`, KEY],
  [`"Our home" <cards+${KEY}@in.getturnup.com>`, KEY],
  // Our own subdomain, the bare form handed out before v1.63.0.
  [`${KEY}@in.getturnup.com`, KEY],
  // Mail clients put a display name in front of it.
  [`"14 Church Lane" <${KEY}@in.getturnup.com>`, KEY],
  // Angle brackets with no name, and uppercase, which SMTP permits.
  [`<${KEY.toUpperCase()}@IN.GETTURNUP.COM>`, KEY],
  // A provider-hosted address, where the key rides in the plus part. No DNS.
  [`abc123def+${KEY}@inbound.postmarkapp.com`, KEY],
  [`parse+${KEY}@mg.example.net`, KEY],
  // A forward that kept the original recipient in the list: ours still wins.
  [`someone@gmail.com, ${KEY}@in.getturnup.com`, KEY],
  // The apex, in case the MX ends up there rather than on a subdomain.
  [`${KEY}@getturnup.com`, KEY],
  // Nothing of ours and nothing key-shaped.
  ['will@example.com', null],
  ['', null],
  [null, null],
]

let failed = 0
for (const [to, want] of CASES) {
  const got = inboxKeyFrom(to)
  const ok = got === want
  if (!ok) failed += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${JSON.stringify(to)} -> ${JSON.stringify(got)}${ok ? '' : ` (wanted ${JSON.stringify(want)})`}`)
}

// The address we hand out must be one we can read back. Obvious, and exactly
// the kind of pairing that drifts when one side is edited.
const round = inboxKeyFrom(inboxAddress(KEY))
if (round !== KEY) { failed += 1; console.log(`  FAIL  round trip: ${round}`) }
// And it must be the shape the Cloudflare rule matches: cards+<key>@host.
if (!/^cards\+[a-z0-9]+@in\.getturnup\.com$/.test(inboxAddress(KEY))) { failed += 1; console.log(`  FAIL  shape: ${inboxAddress(KEY)}`) }

console.log(failed ? `\nFAILED — ${failed}` : `\nPASSED — ${CASES.length + 2} checks`)
process.exit(failed ? 1 : 0)

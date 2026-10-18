/**
 * Cloudflare Email Worker: the letterbox.
 *
 * Mail addressed to cards+<key>@in.getturnup.com lands here (one Cloudflare
 * routing rule for cards@, subaddressing on: a catch-all works on the apex
 * only, so a subdomain needs a literal rule) and is posted to
 * TurnUp's inbound route, which decides whether it is an arrival and which
 * household card it belongs to.
 *
 * FIFTEEN LINES, NO DEPENDENCIES, AND THAT IS THE DESIGN. This is the one
 * piece of the product that cannot be run locally and whose failures are a
 * line in somebody's Cloudflare log. So it does as close to nothing as
 * possible: it reads the raw message and posts it. Every decision that could
 * be wrong — which carrier, which stage, which card, whether it is an arrival
 * at all — is made back in the repository, where there are tests.
 *
 * Deploy:  cd cloudflare/email-worker && npx wrangler deploy
 * Secret:  npx wrangler secret put INBOUND_TOKEN
 */
export default {
  async email(message, env) {
    const token = env.INBOUND_TOKEN
    const base = env.TURNUP_URL || 'https://www.getturnup.com'
    // No token, nothing to post to. Silence beats a retry storm.
    if (!token) return

    // The whole message, as it arrived. 1 MB is well past any delivery email
    // and well short of anything that would hurt.
    const raw = await new Response(message.raw).text()

    try {
      await fetch(`${base}/api/inbound/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // The envelope recipient is the card's inbox and is more reliable
          // than any header, so it is sent alongside the raw message.
          to: message.to,
          from: message.from,
          raw: raw.slice(0, 1_000_000),
        }),
      })
    } catch (error) {
      // Never throw. A thrown Email Worker bounces the message back to the
      // sender, and a carrier getting a bounce from a customer's forwarding
      // rule is a worse outcome than one parcel not appearing on a card.
      console.error('turnup inbound post failed:', error?.message)
    }
  },
}

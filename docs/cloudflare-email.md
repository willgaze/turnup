# The letterbox: forwarded email into a household card

What has to exist before a forwarded delivery email can land on `/h/<code>`,
why each piece is where it is, and the order to do it in.

Everything here is free. Three of the four steps need a login that only the
owner has, which is why **the steps live on the dashboard** under *Turn on
forwarding* (`src/app/dashboard/InboundSetup.jsx`), with copy buttons and
tappable links, rather than in a terminal. This file is the reference behind
that panel; the panel is the thing anybody should actually follow.

## The shape of it

```
a delivery email
   |  forwarded by a household mail rule
   v
cards+<inboxKey>@in.getturnup.com
   |  MX on the subdomain, Cloudflare Email Routing, one rule for cards@
   v
Email Worker  (cloudflare/email-worker/worker.js)
   |  POST {to, from, raw}
   v
/api/inbound/<INBOUND_EMAIL_TOKEN>
   |  readRawEmail() -> readArrivalEmail() -> fileEmail()
   v
a row on one household card
```

## Why a subdomain and not the apex

Cloudflare Email Routing is a zone-level feature that applies to the apex by
default, and a subdomain is added from the apex's **Settings** page; Cloudflare
then writes that subdomain's own MX, SPF and verification records. Confirmed
against Cloudflare's own docs, 12 Oct 2026.

Using `in.getturnup.com` rather than `getturnup.com` means the main domain's
mail records are never touched, so the owner can have `will@getturnup.com` one
day without unpicking any of this. A catch-all on the apex would have taken
that option away for no gain.

## Why the Worker does almost nothing

Cloudflare hands an Email Worker the raw RFC 822 message and nothing else. The
obvious move is to parse it there, with a library, in an environment that
cannot be run locally and whose failures are a line in a Cloudflare log.

So it does not. The Worker reads the message and posts it; every decision that
could be wrong — which carrier, which stage, which card, whether it is an
arrival at all — is made in this repository, where `node scripts/check-mime.mjs`
and `node scripts/check-arrival-email.mjs` run. The Worker has **no
dependencies** and is about fifteen lines, and should stay that way.

Two rules in it that are not obvious:

- **It never throws.** A thrown Email Worker bounces the message back to the
  sender, and a carrier receiving a bounce from a customer's forwarding rule is
  a worse outcome than one parcel not appearing on a card.
- **It sends `message.to` alongside the raw message.** The envelope recipient
  is the card's inbox and is more reliable than any header; a forwarded email's
  `To:` header is whoever it was *originally* sent to.

`readRawEmail()` in `src/lib/mime.js` prefers `Delivered-To` over `To` for the
same reason, and that is tested.

## The four steps, and who can do them

| | Step | Needs |
|---|---|---|
| — | **Switch it on** | one tap on the dashboard. Writes the password to a row |
| 1 | `getturnup.com` onto Cloudflare DNS, nameservers changed at Hostinger | a Cloudflare account and a Hostinger login |
| 2 | Email Routing on, subdomain `in` added, subaddressing on, the Worker pasted in, one rule `cards@in…` → it | a browser |

**Not a catch-all (corrected 18 Oct 2026, v1.63.0).** Cloudflare's catch-all
works on the apex only; a subdomain takes literal rules. Every card had its own
`<key>@in.getturnup.com`, which would have needed a rule per card. Cards now get
`cards+<key>@in.getturnup.com`: one literal rule for `cards@` with subaddressing
switched on matches them all (RFC 5233, in Cloudflare's docs), and
`inboxKeyFrom()` reads the key out of the plus part. The bare form is still read.
The whole job is a Cowork paste in `docs/cowork-letterbox.md`.

**This used to be four steps and two of them needed a laptop.** The Vercel
environment variable and the wrangler deploy are both gone: the password is
written by the button, and the Worker is handed over with the address and the
password already in it, to paste into Cloudflare's own editor. `wrangler` and
`cloudflare/email-worker/` still exist for anyone who prefers a terminal.

**A Claude session can do none of steps 1 to 4.** Vercel's connector is
read-only for environment variables (403, confirmed more than once — see
CLAUDE.md), and the rest are account logins. What a session *can* do is write
the Worker, write the parsing, test both, and reduce the owner's part to copy
buttons. That is what has been done.

**The token is generated in the browser**, by `crypto.getRandomValues`, for the
same reason the VAPID pair is: a secret generated in a Claude session lands in
a transcript, and one generated on a password website lands on somebody else's
server. The same value goes in two places — Vercel's `INBOUND_EMAIL_TOKEN` and
the Worker's `INBOUND_TOKEN` secret — and nowhere else.

## Changing provider later

Nothing above is load-bearing. `inboxKeyFrom()` already reads an address at the
apex, at a subdomain, or in the plus part of somebody else's hosted address
(`abc123+<key>@their-domain`), and `scripts/check-inbox-address.mjs` proves all
three. The inbound route reads SendGrid's and Mailgun's form posts as well as
JSON. Switching to a paid provider is a DNS record and an environment variable,
not a rewrite — which was the point of writing it that way before knowing which
provider it would be.

## Checking it works

Forward any real delivery email to a card's address. It should appear within a
few seconds. If it does not, in this order:

1. **Was it an arrival at all?** A receipt, a newsletter or an invoice is
   dropped on purpose. Try an "out for delivery" email.
2. **Is the panel still showing?** If *Turn on forwarding* is still on the
   dashboard, `INBOUND_EMAIL_TOKEN` has not reached a deployed build. Setting
   it without redeploying changes nothing.
3. **Cloudflare → Email Routing → Activity log.** It shows every message and
   what happened to it.
4. **`npx wrangler tail`** on the Worker shows the post and any error.

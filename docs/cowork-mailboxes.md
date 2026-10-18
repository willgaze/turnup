# support@ and privacy@, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. A Claude session cannot start Cowork — it hands
over the prompt. There are no Cloudflare tools in a session either (checked,
not assumed, twice).

**Why it is needed.** Two addresses are promised and neither receives anything:

| | Promised where | Needed for |
|---|---|---|
| `privacy@getturnup.com` | on `/privacy`, which is public | a page that gives out a dead address is worse than no page |
| `support@getturnup.com` | the ServiceM8 store listing's Support field | their rules delist an add-on whose support address goes unanswered |

**Check first.** This is done when `getturnup.com` has MX records of its own.
From anywhere:

```bash
curl -s -H 'accept: application/dns-json' \
  'https://dns.google/resolve?name=getturnup.com&type=MX' | grep -c mx.cloudflare.net
```

`0` means not done. Anything above `0` means done, and this job should not be
run again.

**One thing to know before running it.** Today only `in.getturnup.com` has mail
records; the apex is deliberately clear, so `will@getturnup.com` was always
available. This job spends that: Email Routing on the apex writes Cloudflare's
MX records onto `getturnup.com` itself. That is the point — it is what makes an
apex address work at all — but if a real mailbox provider (Google Workspace,
Fastmail) is ever wanted on this domain, those MX records are what it would
replace. Forwarding and a hosted mailbox cannot both own the apex.

---

```
Set up two forwarding addresses on getturnup.com with Cloudflare Email
Routing, so support@getturnup.com and privacy@getturnup.com reach my inbox.

The domain is already on Cloudflare and Email Routing is already working for
the subdomain in.getturnup.com. This adds the apex domain alongside it. Do not
change, delete or disable anything to do with in.getturnup.com - it is live and
a household card depends on it.

1. Open https://dash.cloudflare.com and sign in. Choose getturnup.com.

2. In the left menu find Email, then Email Routing.
   Tell me what the page shows before you change anything: whether Email
   Routing is enabled for getturnup.com itself (not just the subdomain), and
   what is listed under Destination addresses.

3. If there is no verified destination address yet, add one:
   Destination addresses > Add destination address > my own email inbox.
   Cloudflare sends that inbox a verification email. Open it and click the
   link, or nothing will ever arrive. Tell me if the email has not turned up
   after a couple of minutes.

4. Now add the two addresses. Routing rules > Create address.
     - Custom address: support
       Action: Send to an email
       Destination: the verified address from step 3
       Save.
     - Do it again with Custom address: privacy

5. Cloudflare may say it needs to add DNS records to getturnup.com to enable
   Email Routing on the apex, and offer to add them for you. Let it. If it
   instead shows the records to add by hand, show me what it says and stop.

6. Done looks like this, and please actually check it rather than assuming:
     - Routing rules lists support and privacy, both Active.
     - Send a test email from a different account to support@getturnup.com,
       then another to privacy@getturnup.com. Both should land in my inbox
       within a minute or two.
   Tell me whether both arrived. If one did not, say which, and what the
   Routing rules page shows for it.

7. Finally, confirm in.getturnup.com is untouched: DNS > Records, and tell me
   the MX records for in.getturnup.com are still the three route1/route2/
   route3.mx.cloudflare.net entries.

Do not paste any password or verification link into this chat.
```

---

**After it is done**, the ServiceM8 store listing can take
`support@getturnup.com` in its Support field — see `docs/servicem8-listing.md`.
Two blockers left on a public listing after that, both named there: an account
per trade, and the listing's own submission.

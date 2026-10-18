# Switching the letterbox on, as a Cowork job

Standing rule 3 in CLAUDE.md: clicking through a console is a Cowork job, not a
step list. This is the second half of the letterbox (the nameservers were moved
already; checked 18 Oct 2026, `getturnup.com` answers with Cloudflare's).

**Why it changed on 18 Oct (v1.63.0).** The steps before this one said "turn on
the catch-all on in.getturnup.com". Cloudflare's own docs say catch-all rules
work on the apex domain only; a subdomain needs a literal rule per address, and
every card has its own address. So it could never have worked. Cards now get
`cards+<key>@in.getturnup.com`: one rule for `cards@`, with Cloudflare's
subaddressing switched on, takes all of them, and the key rides in the plus part.

**Check first.** The dashboard's *Turn on forwarding* panel ticks itself every
twenty seconds. If *Mail for in.getturnup.com points at Cloudflare* already has a tick, Parts 2 to 4 may be done; *Something has arrived* is the real proof.

---

```
Switch on TurnUp's email letterbox in Cloudflare, so forwarded delivery
emails reach household cards. getturnup.com is already on Cloudflare.

PART 1: get the Worker code from TurnUp
1. Open https://www.getturnup.com/dashboard and sign in (Face ID).
2. Tap "Setup and settings", then open "Turn on forwarding".
3. If there is a button to switch it on, press it once. Steps then appear.
4. Under step 2, press "Copy the Worker". It is now on the clipboard.
   NEVER paste it into this chat or anywhere except the Cloudflare editor
   in Part 3: it contains a password.

PART 2: Email Routing on the subdomain
5. Open https://dash.cloudflare.com and choose getturnup.com.
6. Go to Compute > Email Service > Email Routing.
   If it shows "Get started" or "Enable Email Routing", go through it.
   If it asks to add mail (MX/TXT) records for getturnup.com itself,
   let it: nothing receives mail there today, so nothing changes.
   If it asks for a destination email address, skip it if it lets you;
   if it insists, use will@rosebourneplumbing.co.uk and click the
   verification email.
7. Open Email Routing > Settings.
   Under Subdomains, add:  in.getturnup.com   and submit.
   Switch ON "Subaddressing" (plus addressing).

PART 3: the Worker
8. Go to Workers & Pages > Create > Start with Hello World > Deploy.
   Name it exactly:  turnup-inbound
9. Press "Edit code". Select everything in the editor, delete it,
   paste the clipboard from step 4, and press Deploy.

PART 4: the rule
10. Back to Compute > Email Service > Email Routing > Routing Rules.
    Create routing rule:
      Email pattern:  cards   @   in.getturnup.com
      Action:         Send to a Worker
      Worker:         turnup-inbound
    Save. It should show as Active.

Then check it worked:
- Back on the TurnUp dashboard, "Turn on forwarding" should tick
  "Mail for in.getturnup.com points at Cloudflare" within a few minutes
  (DNS can take longer).
- Tell me what each part showed when it finished, and anything that
  did not match these steps.

Rules:
- Do not change or delete any existing DNS record, especially www and
  the bare getturnup.com, or the website goes down.
- Do not turn on any proxy, SSL, firewall or redirect setting.
- If anything asks me to buy or upgrade, stop and tell me.
- Never paste the Worker code, a password or a token into this chat.
```

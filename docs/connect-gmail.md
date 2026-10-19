# Connect Gmail, stage 1: your own inbox feeds your card

Built 19 Oct 2026 (v1.67.0). Stage 1 of `docs/research/inbox-connect.md`: an
**Internal** Google app, which only people in your Google Workspace can use and
which Google does not review. It replaces the content-compliance forwarding
rule: every five minutes the app reads delivery-shaped mail that arrived since
its last look and files it on one household card, through the same reader a
forwarded email goes through.

What it reads: mail from a courier's or a shop's domain, or with an order or
parcel word in the subject (`SENDER_DOMAINS` and `SUBJECT_WORDS` in
`src/lib/gmail-words.js`), never spam, bin or sent. What it keeps: the row the
reader made (sender, title, reference, stage). No email body is stored. The
permission is `gmail.readonly`; there is no narrower one that can read a body.
Disconnect on the dashboard revokes it at Google and deletes the row.

## What only you can do (one Cowork paste)

No session creates a Google Cloud project or an OAuth client. This is the
paste for Cowork on your Mac, signed in to Chrome as your Workspace account:

```
In Chrome, as my Google Workspace account.
1) Open https://console.cloud.google.com/projectcreate and create a project
   called "TurnUp inbox" in my organisation. Wait for it to be selected.
2) Open https://console.cloud.google.com/apis/library/gmail.googleapis.com
   and press Enable.
3) Open https://console.cloud.google.com/auth/overview and set up the OAuth
   consent screen: app name "TurnUp", user support email me, audience
   INTERNAL, developer contact me. Save. Under Data access, add the scope
   https://www.googleapis.com/auth/gmail.readonly and save.
4) Open https://console.cloud.google.com/auth/clients and create an OAuth
   client: type Web application, name "TurnUp web", authorised redirect URI
   exactly https://www.getturnup.com/api/gmail/oauth/callback. Create it and
   keep the Client ID and Client secret on screen.
5) Open https://vercel.com/willgazes-projects/turnup/settings/environment-variables
   and add two variables for Production, both marked Sensitive:
   GOOGLE_CLIENT_ID = the Client ID, GOOGLE_CLIENT_SECRET = the Client secret.
6) Open https://vercel.com/willgazes-projects/turnup/deployments, open the
   menu on the top deployment, choose Redeploy, and wait until it says Ready.
7) Open https://www.getturnup.com/dashboard, sign in, open Setup and settings,
   find "Where the card hears from", press Connect Gmail, approve, then choose
   the card it feeds and press Check now. Tell me what the panel says.
```

If Google's consent screen offers only External, the account is not in a
Workspace organisation: stop and say so, because stage 1 needs Internal.

## What happens then

- `src/lib/gmail.js` swaps the code for tokens, seals them with a key derived
  from `JWT_SECRET` (as the ServiceM8 add-on's are), and writes one `GmailLink`
  row. No route ever returns a token.
- The five-minute cron calls `pollGmail()`: list messages matching the query
  after `lastSeenAt`, fetch each raw, `readRawEmail()`, `fileEmail()` onto the
  chosen card. Counts go in the cron's JSON (`gmail: { checked, filed, dropped }`).
- **Check now** on the panel runs the same sweep and says what it did, so the
  connection ends in a demonstration, not a sentence.
- A refresh token for an Internal app does not expire on a schedule, but Google
  can revoke it (password change, admin action). The panel then says
  "Google refused the token: disconnect and connect again".

## Not in stage 1

Other households. That is stage 2 (External, Testing, 100 named testers,
seven-day tokens) and stage 3 (verification plus a yearly CASA assessment),
both in the research document with costs and the honest timeline.

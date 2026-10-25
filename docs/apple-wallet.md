# Apple Wallet: from nothing to a signed card

Will has never done this. These are the steps in order, each one a page and a
button, and what the app does at each point. Nothing here needs a Mac.

## 0. Before you ring them

Apple verifies four things for an individual enrolment: **legal name, email,
phone and address**. Three traps, in the order they bite:

- **The Apple ID's own name must be the legal name.** An alias, a nickname or
  "Rosebourne Plumbing" in the first or last name field delays approval by
  itself, before anyone looks at a document. Check it at
  <https://account.apple.com> and fix it before enrolling.
- **P.O. boxes are refused.** The address has to be a real one.
- **The ID has to carry the address.** A UK passport does not show an address;
  a UK photocard driving licence does. If an address is what is in dispute,
  the driving licence is the document that can settle it — have it to hand,
  plus something in the same name and address (bank statement, council tax,
  utility bill) in case they ask for a second.

Have ready on the call: the Apple ID email, the exact address as it appears on
the licence, and the enrolment or case number from the email Apple sent.

It is an **individual** enrolment. A sole trader does not need a D-U-N-S
number, a company website or a work email — those are the organisation route,
and it takes weeks.

## 1. Join the Apple Developer Program (you, ~15 minutes, then a wait)

- Enrol as an **individual** (you are a sole trader; "organisation" needs a
  D-U-N-S number and weeks). Open <https://developer.apple.com/programs/enroll/>
  and press Start Your Enrollment, or do it in the **Apple Developer** app on
  your iPhone, which is quicker because it scans your passport or driving
  licence for the identity check.
- Sign in with your normal Apple ID. It must have two-factor authentication on.
- Pay £79. Apple then verifies you. Usually a day, sometimes two; you get an
  email saying the membership is active.

## Enrolled on 21 Oct 2026. Steps 2 to 4 are one Cowork job on the Mac

The enrolment is through. Steps 2, 3 and 4 below are written out as a single
paste for Cowork in `docs/cowork-apple-wallet.md`: it makes the key in a
folder on the Mac that survives, uploads the request, downloads the
certificate, turns it into the six settings, puts them in Vercel, redeploys
and proves a pass is served. Read on only to understand what that job does.

## 2. Make the key and the request — ONLY once the membership is live

**Do steps 2 to 4 in one sitting, and not before the "your membership is
active" email arrives.** The certificate Apple issues only works with the key
step 2 makes. That key is gitignored, because it is a credential, which means
in a cloud session it lives in that container and dies with it — and approval
takes a day or two, far longer than a container lasts. Start early and the
certificate arrives to find its key gone, and the whole thing starts again.
The script now says this before it does anything.

    bash scripts/apple-wallet.sh csr

It writes `apple/pass.key` (private, gitignored, encrypted with a passphrase
it keeps in `apple/key.password`) and `apple/pass.csr`, the file Apple wants.
It prints the next two links.

## 3. Register the pass type and download the certificate (you, 5 minutes)

- <https://developer.apple.com/account/resources/identifiers/list/passTypeId>
  → **+** → Pass Type IDs → Description `TurnUp job card`, Identifier
  `pass.com.getturnup.job` → Register.
- <https://developer.apple.com/account/resources/certificates/add> → under
  Services pick **Pass Type ID Certificate** → choose `pass.com.getturnup.job`
  → Choose File → `apple/pass.csr` → Continue → **Download**. You get `pass.cer`.

## 4. Turn the certificate into settings (one command)

    bash scripts/apple-wallet.sh finish ~/Downloads/pass.cer

It checks the certificate matches the key, fetches Apple's WWDR G4
intermediate, reads your Team ID and pass type out of the certificate, and
writes six `KEY=value` lines to `apple/turnup.env`. Paste them into
<https://vercel.com/willgazes-projects/turnup/settings/environment-variables>
(Production, Sensitive), then Redeploy. Or `bash scripts/apple-wallet.sh vercel`
does the pasting and the redeploy if the Vercel CLI is signed in.

**The `vercel` step never uploads the key folder** (v1.70.1). Until then its
last line was `vercel --prod --yes`, run in the folder that holds
`apple/pass.key`, and on 21 Oct 2026 that put the folder, key included, on a
production deployment. Now every Vercel command goes through one gate that
allows only commands that upload nothing (`env`, `link`, `redeploy`,
`promote`), they run from an empty temporary folder linked to `turnup` by
name, and the redeploy re-runs the build already live on www.getturnup.com
and promotes it. Never run `vercel` or `vercel --prod` by hand in the key
folder.

## 4a. Replacing the key (`rotate`)

`csr` now stops if `apple/pass.key` exists, because a new key orphans the
certificate Apple issued for the old one. When a key has been exposed:

    bash scripts/apple-wallet.sh rotate

It moves the old key and everything made from it into `apple/old-<time>/`
(kept, never deleted), makes a new key and request, and says what to do next:
steps 3 and 4 again, then `vercel`, then revoke the **old** certificate at
<https://developer.apple.com/account/resources/certificates/list> once a job's
pass link answers 200 with the new one.

## 5. What happens then

- `/api/passes/<code>` starts returning a signed `.pkpass` instead of a 503.
- **Add to Apple Wallet** appears on every live customer page, on Apple devices.
- The homepage frame badge "Built · awaiting Apple" is still a static label in
  `src/app/preview/posters/Posters.jsx`; change it when the first real card is
  in a wallet.

## What the pass does today, honestly

It shows the job's stage with the QR code to the full page, and **since
v1.74.0 it moves itself**. Until then it did not, and the first real card
proved it: job #2742 sat on *Booked in* with no note while the job itself had
said *running about 30 minutes late* fourteen hours earlier. The pass named a
`webServiceURL` nobody had built, so Wallet asked, got a 404, and gave up.

| Route | What Wallet uses it for |
|---|---|
| `POST`/`DELETE` `/api/passes/v1/devices/<device>/registrations/<type>/<code>` | a phone starts or stops following a card |
| `GET /api/passes/v1/devices/<device>/registrations/<type>?passesUpdatedSince=` | what has changed since it last asked |
| `GET /api/passes/v1/passes/<type>/<code>` | the current card, re-signed |
| `POST /api/passes/v1/log` | Wallet's own complaints, which is the only window into why a card is not updating |

A stage tap on the dashboard, or a booking moving in ServiceM8, sends an empty
push to Apple and the card comes back and fetches itself. **The lock screen
reads *Now: On my way*** — the stage, and nothing else, ever: see the
lock-screen rule in CLAUDE.md, and `node scripts/check-pass-service.mjs`,
which refuses any other field that tries to announce itself.

Switching a job's link off takes the card off the phone too: the next time
Wallet asks it is told the pass is no longer theirs.

**The one thing not proved from a container:** that Apple's paths are the
paths Wallet actually calls. Apple's documentation renders in JavaScript and
would not fetch, so the routes are built from the long-stable public spec and
every one of them logs a line. If a card is added and the Vercel log stays
silent, the paths are the first thing to check.

The certificate expires after a year. The `finish` command prints the date;
put it in the diary.

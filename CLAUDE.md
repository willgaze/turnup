# CLAUDE.md — TurnUp

## Talking to Will

Will reads these on a phone, between jobs. Two rules he has had to repeat, so they
are written down:

1. **Every ask of Will comes with a tappable link and the steps.** Never a bare
   command or "do X in Vercel". Say where to go (a link), what to press, in order,
   and what he will see when it worked. A terminal command gets: open Terminal,
   `cd` to the folder (name it), paste this, what the last line should say.
2. **Say it once.** If he has decided (a key he will not rotate, a password he will
   not change), do not raise it again.
3. **Anything that is clicking through Vercel, Anthropic or another console is a
   Cowork job, not a step list.** Four rounds of "open this page, tap that" for
   one environment variable did not land; a single paste into Cowork on his Mac
   did it in one go (11 Oct 2026, `ANTHROPIC_API_KEY`). Write the whole job as
   one prompt he can paste: every URL, every field name, what done looks like,
   and "never paste the key into this chat". A session here cannot start Cowork
   for him; it hands over the prompt.


## This is not Rosebourne Plumbing

**Read this first, because the mistake has been made twice.**

TurnUp (until v1.13.0 called My Trade Status; the GitHub repo is `willgaze/turnup`
since 13 Oct 2026, with the old `tradestatus` name redirecting; the old
`tradestatus.vercel.app` URL, the Prisma models and the `mts-` CSS/cookie prefixes
keep their old names because nobody reads them)
is its own product, in its own repository, with its own database and its own
Vercel project. Anywhere a person reads the name, it is **TurnUp**. Rosebourne Plumbing is a *customer* of it
— the first one, and currently the only one. The two share nothing but an
owner.

If you find yourself editing `rosebourneplumbing`, you are in the wrong repo.
If you are about to write "Rosebourne", "Andover", "Marlborough", "01264" or
"WaterSafe" into this codebase, stop: none of those words belong here, and
`grep -rn "Rosebourne" src/` must stay empty.

The trade's identity comes from environment variables and nowhere else:

```
NEXT_PUBLIC_TRADE_NAME       "Rosebourne Plumbing"
NEXT_PUBLIC_TRADE_PHONE      "01264 502027"
NEXT_PUBLIC_TRADE_PHONE_TEL  "01264502027"
```

Fitting this to a second trade must stay a configuration change, never a code
change. `src/lib/trade.js` is the only place those are read.

## What it is

The status bar the trades never got. A customer gets one link, opens it with no
account, and sees where their job actually is:

**Booked in → On my way → On site → Job done.** *Paused* sits off to one side
with a note saying why, because "waiting on the cylinder" is the thing a
customer most wants said out loud and the thing least often said.

The reference point is the Apple Wallet card you get for a flight, or Shopify's
Shop app for a parcel. Same idea, for physical work at someone's house.

## What it deliberately does not do

**It never invents a time.** No countdown, no ETA, no "with you in 20 minutes",
and nothing anywhere that counts down to an arrival. "On my way" is a fact.
"Set off at 07:42" is a record. One tradesperson cannot keep a promise about
traffic, so the product does not make one on their behalf.

**An agreed window is not the product making a promise.** It is two people
arranging something and the product carrying it, which is a different thing and
is allowed. The line between them is who said it:

| | Allowed? |
|---|---|
| The product working out when they will arrive | **never** |
| The trade proposing hours, the customer agreeing or countering | yes |
| A window only PROPOSED, shown as if settled | **never** — it says whose it is and that it is waiting |

*(The rule used to read "no future feature may introduce one" and the product
grew windows anyway. The owner has affirmed them twice, so the rule is written
to match what is true rather than left to be quietly broken — but the ban on
the product guessing stands, and is the part that matters.)*

Only an **AGREED** window is ever stated as a fact: it is the only one that
goes in the status card, into `windowLabel()`, or into a calendar file as a
timed event. A proposal on the table lives in its own row, which says who
proposed it and that it is waiting. See `src/lib/window.js`.

This is the same discipline as the customer's own site: say what is true and
checkable, never what sounds reassuring.

## How it looks is part of what it says

The customer's page is drawn flat, since v1.51.0: Geist (bundled, via
`geist/font/sans` in `src/app/layout.js`), cards that are a surface and a
hairline with no blur and no shadow, inset grouped lists, dark mode, and a
stage-tinted wash behind it all. **One corner radius**: `--r` in
`src/app/globals.css` is the only corner there is. Every `rounded-*` utility
resolves to it in `tailwind.config.js`, and so does every `shadow-*`, to a
one-pixel ring. Do not reintroduce a second radius or a cast shadow for one
component; if the corner is wrong, change the token. `rounded-full` is for
things that are genuinely round. The class is still called `.glass` because
every screen reaches for the name. That is not decoration. This is a page a sole trader sends to someone's mother, and
one that looks like a form from 2011 says the firm behind it is careless before
a word is read.

**Two colour systems, each with exactly one job.** Mixing them up is how the
page stops meaning anything:

| | Owns | Rotates? |
|---|---|---|
| `THEMES` in `src/lib/version.js` | the page background, and the accent on the landing page, sign-in and dashboard furniture | **yes**, nightly |
| stage tints in `src/app/globals.css` | the five stages, and nothing else | **never** |

A stage colour means something — a customer who has used this twice knows amber
before they have read a word — and a meaning that changes colour every night is
not a meaning. Both lists are curated and contrast-checked; neither is ever
generated at runtime.

A stage sets `--tint` once, via `tone-<tone>` on a wrapper, and the card, the
icon well, the rail and the buttons beneath it all read it. Adding a stage means
adding a tint, not editing five components.

**No emoji anywhere under `src/`.** They render in whatever style the phone
ships, at a weight and colour nobody chose. `src/components/icons.jsx` holds the
drawings; `src/lib/trade-status.js` and `src/lib/presence.js` carry only a name,
because both are imported by API routes and hold no JSX. This check must stay
silent:

```bash
python3 -c "
import re, glob
pat = re.compile('[\U0001F000-\U0001FAFF\u2300-\u27BF\u2B00-\u2BFF\uFE0F]')
for f in glob.glob('src/**/*.js*', recursive=True):
    for i, line in enumerate(open(f, encoding='utf-8'), 1):
        if pat.search(line): print(f'{f}:{i}')
"
```

**Nothing counts down.** The live dot on the rail breathes so the page reads as
current. It measures nothing, and no future animation may imply an arrival time.

## What may go on a lock screen

Push notifications are the least private surface this product touches: they are
read by whoever picks the phone up off the kitchen table, not by whoever holds
the link. So a notification carries **the trade's name and the stage, and
nothing else** — never the address, never the job reference, never the
customer's name, and never `stageNote`, which is free text and could say
anything. Detail lives behind the link, where the code is the credential.
`LINES` in `src/lib/push.js` is the whole vocabulary; adding a field to it is a
privacy decision, not a copy one.

The no-promised-time rule applies here hardest. "Has set off" is a fact. A push
notification is the very worst place to promise an arrival.

**Push never blocks a stage change.** `notifyStage()` is called un-awaited from
the tracker PATCH handler and swallows everything: the trade tapped a button on
a driveway and is waiting on that response, and a push service having a bad
afternoon must not turn it into an error. A 404 or 410 from a push service means
the browser discarded the subscription — delete the row, do not retry it.

**There are two notification buttons and they get mixed up.** **Nudge me** on
the dashboard registers the TRADE's phone; **Tell me when they set off** on a
tracking page registers the CUSTOMER's. Will set up the first while following
instructions written for the second, and could not tell which he had done —
reasonably, because both are a bell icon, both say Add to Home Screen, and
nothing said which was which. Both panels now say whose phone they are for.
**Any instruction about notifications has to name which of the two it means.**

**Setting it up ends with a buzz, not a sentence.** "1 phone registered" is not
the same as a notification arriving, and the gap between them is where somebody
gives up. **Send a test to this phone** in Nudge me pushes a real one and
reports how many phones it reached, so nothing arriving is visible instead of
silent. Any future setup flow that ends in a claim rather than a demonstration
is not finished.

**The iPhone catch.** iOS delivers web push only to a page added to the home
screen; Safari in a tab has no `Notification` API at all, so subscribing does
not fail, it is absent. `src/app/t/Notify.jsx` detects that and shows the
two-tap how-to instead of a button that does nothing. Never replace that with a
button.

**It is invisible until configured.** No `NEXT_PUBLIC_VAPID_PUBLIC_KEY` means
the row does not render and nothing sends. That is the gate that lets this ship
before the keys and the migration exist. The gate has to be on the ROW, not
inside it: for two versions `Notify` returned null without keys while the row
above it still rendered, titled "Tell me when they set off" and promising
"straight to your phone", and opened onto an empty drawer. `PUSH_CONFIGURED` is
exported from `src/app/t/Notify.jsx` for exactly that.

**Turning it on is a panel on the dashboard, not a command.** "Turn on
notifications" appears under Signing in whenever the keys are missing, and
disappears the moment they are set. It makes the VAPID pair **in the browser**
with Web Crypto — a P-256 keypair, public half as the uncompressed point and
private half as the JWK `d`, which is exactly VAPID's format — shows the three
values with copy buttons, and links straight to the Vercel pages. Verified end
to end: a pair generated by that page is accepted by `web-push`, the same
library that sends.

There was a script first, and the script was the wrong answer. It wanted a
cloned repo, Node and a Vercel CLI login on a laptop, from somebody who works
off a phone between jobs. **Told to run it four times, the honest reading is
not that the instruction was unclear.** When an ask keeps not happening, the
ask is the thing to change. `scripts/enable-push.sh` still exists for a laptop:

```bash
bash scripts/enable-push.sh          # safe to re-run; keeps an existing pair
bash scripts/enable-push.sh --rotate # replaces it, and stops every live sub
```

**The key is never made in a Claude session.** The Bash classifier blocks
printing one, which is correct: generated here it lands in a transcript, and
generated on some key-generator website it lands on a stranger's server. Made
by the page it is made on the phone in his hand and sent nowhere. The three
values still have to be carried to Vercel by hand, because:

- The Vercel connector available in a Claude session is **read-only for
  environment variables** — `create_project_env` returns 403 and so does
  listing them. Tried again on 10 Oct against the renamed `turnup` project, in
  case the permissions had moved with it: still 403. Do not try a third time
  and never report it as done. There is no path to setting a Vercel
  environment variable from a session; point at the dashboard panel.
- Even if there were, a private key passed as a tool argument is a private key
  in a transcript. Neither the panel nor the script ever prints one anywhere it
  could be read back.

A deploy is part of the script because `NEXT_PUBLIC_*` is **inlined at build
time**. Setting the variable without rebuilding changes nothing, and the row
stays missing while the dashboard says the key is set.

## The box: ask it or tell it (`src/lib/assistant.js`)

The top of the dashboard is one box. "What's on today?" gets an answer; "on my
way to Whitfield", "paused on Hale, waiting on the cylinder", "I'm about half
an hour late for Beck", "agree Janet's hours" or a pasted booking email gets a
card to confirm. It exists because the dashboard had become a wall of buttons
nobody could learn, and because a good banking app takes "pay this" and hands
back a review screen, not a form. Three rules hold, and they are the rules of
the rest of this file:

- **It proposes, never acts.** `propose()` returns JSON to the browser; the
  trade taps Confirm; `/api/dashboard/trackers` does the work exactly as if
  the form or a stage button had been used. Do not give the model a tool that
  touches the database. An answer is only words. A wrong reading costs one tap.
- **It never promises a time.** The prompt forbids it and `stripTimePromise()`
  is the second lock: "with you by 2" is dropped from the note, with a warning
  on the card, and hours go into the window where the customer can agree or
  counter them. Running late is only 15, 30 or 60, as the trade said, the
  same as the buttons.
- **Its output is untrusted.** `sanitiseProposal()` treats the model's JSON
  as a body from a stranger: `cleanText()`, the stage whitelist, the date and
  time checks, a job id that must be one it was shown, and `windowAgree` only
  when that job has a customer proposal on the table. Adding a field to the
  proposal means adding it there, deliberately.

What reaches the model is the trade's own view of the jobs, behind the
trade's own password, **minus every phone number** (the route's `select`
never includes one), plus the setup facts so "how do I turn on nudges" gets a
true answer. Trade side only: the customer's page is a status bar, and a chat
on that side is how the product started asking the customer things last time.
Invisible until `ANTHROPIC_API_KEY` is set, the same gate as push; the key
never reaches the browser, only the fact that there is one.

**The dashboard teaches itself one tip at a time** (`src/lib/tips.js`): no
jobs yet, a link nobody has opened, no name on the card, nudges not on, Face
ID not set, ServiceM8 not connected, in that order, one at a time, each with
Got it. The seven setup panels sit shut under **Setup and settings**, and a
tip opens the one that is the next thing to do. Do not put a panel back on the
open page because it seems important; it was all important, and it was ten
screens tall.

## The link is the credential

A customer has no login and never will. The code in the URL is the only thing
standing between a stranger and someone's name and home address, so:

- Codes come from `generateCode()` — 8 characters of
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. No 0/O, no 1/I/L, because it gets read
  off a text message.
- Codes are **revocable**. `isActive: false` and the link 404s.
- `/api/status/[code]` returns `publicShape(row)` and never the row. Adding a
  field to the schema does not expose it; you must add it to `publicShape`
  deliberately. Never widen it to include `id`, `externalId`, `viewCount` or
  `lastViewedAt`.
- Every page carries `robots: { index: false }`. A leaked link must never end
  up in a search index.

**One rule decides what `publicShape()` may return:**

> It carries what the **trade** told the **customer**.
> It never carries what the **customer** told the **trade**.

A tracking link gets forwarded — to a partner, into a family group chat, onward
from there. Everything `publicShape()` returns is readable by everyone that link
reaches, for as long as it is live.

That rule was broken once, and nobody noticed because each step was reasonable.
The product grew from *reporting* ("on my way") into *asking* ("will someone be
in?"), the credential never changed to match, and the answers went back onto the
page. Together they were the address, a photo of the house, a photo of the front
door, which door to use, "the gate sticks, park on the verge", whether there is
a dog, "No, I'm out", and "between 09:00 and 11:00" — a door, a time and a way
in, on a link anyone could forward.

So: **customer-supplied answers live on the device that supplied them**
(`src/app/t/own-answers.js`, browser storage) and on the dashboard, which is
behind a password. The customer's own phone prefills their form; a forwarded
link gets a blank one and learns nothing. `presenceAt` is public and `presence`
is not — the page may say *when* someone answered, never *what* they said.

House and door photos are not on the customer page at all. They are wayfinding
for the trade, the customer already knows their own front door, and a photo of
it beside "nobody is in" is the single most valuable thing on that page to
somebody who should not have it.

This check must pass, and it fails loudly with the field named:

```bash
node scripts/check-public-shape.mjs
```
- **`public/sw.js` caches nothing, deliberately.** A service worker's scope is
  the whole origin, and the origin includes `/dashboard` — every customer's name
  and address, behind a password. A caching worker there puts that list in a
  browser store. Offline support is worth having and should come back, but
  scoped and on purpose, never as a side effect of wanting notifications.

## A window is an arrangement, not an announcement

Both ends can propose; the other agrees or counters; a counter is simply a new
proposal from the other side. That is why four columns carry the whole
back-and-forth — there is only ever the offer on the table and who put it
there, never a queue of competing times to reconcile. The state machine is in
`src/lib/window.js` and is the only place that moves it.

**Not a calendar invite, and that was worth checking.** Email invites have had
this since the nineties — `METHOD:REQUEST`, and the recipient's client offers
Accept, Decline and Propose New Time. It is the obvious answer and it does not
work here: it needs the invite to arrive as an email, in an email client, with
a reply address for the `REPLY` to go back to. This product sends a **link, by
text**. An `.ics` opened from a link just adds an event — no buttons, nobody to
reply to. So the negotiation lives in the product, where it works over a texted
link, and the calendar file carries the result once there is one.

**Whose window is public follows the rule above it.** Hours the *trade* put
forward are theirs to publish. Hours the *customer* put forward are not —
"I'm free between 2 and 4" says when a house is occupied, and the link gets
forwarded. Once the trade agrees, it is something the trade is asserting and it
goes public. `publicWindow()` is the only place that decides, and
`scripts/check-public-shape.mjs` proves both directions — that a trade's
proposal reaches its own customer, and that a customer's pending counter does
not reach anyone.

**Times are resolved in the trade's zone, never UTC.** Somebody picking 9am
means nine o'clock where they are, and Britain is an hour ahead of UTC for
seven months of the year — `setUTCHours(9)` stores a window the customer did
not ask for and shows it back to them as 10:00. `atLocalTime()` in
`src/lib/when.js` is the only way to turn "09:00" into an instant.

## A pin is a coordinate, and coordinates are the sharpest thing here

`mapPin` holds a Google Maps URL, and a pin dropped from a phone's GPS is
written into that same column as `…/maps/search/?api=1&query=LAT,LNG` — see
`coordsPinUrl()` in `src/lib/places.js`. That is deliberate: no new columns, no
migration, and `normaliseMapPin()` checks a dropped pin on the way in exactly
as it checks a pasted one. `pinCoords()` reads it back, which is what lets
**Navigate** give turn-by-turn to the exact spot rather than a map centred near
it.

Two rules for anything that touches location:

- **Never ask for it automatically.** `DropPin` fires on a tap and only on a
  tap. Requesting a location on page load is hostile, and iOS refuses a prompt
  with no gesture behind it — so "automatic" means a dialog nobody asked for,
  followed by a denial that needs a trip to Settings to undo.
- **Never take a fix on trust.** A phone indoors can be a hundred metres out,
  which in a terrace is four doors down. The reading carries an accuracy radius;
  anything vaguer than 60m is accepted with a warning that says so. A pin that
  is confidently wrong is worse than no pin, because it sends a van somewhere
  with certainty.

A precise location is the sharpest field this product holds, so it obeys the
rule above it: the trade sees it on the dashboard, the tapping device remembers
it, and it is not in `publicShape()`.

**what3words from a GPS fix needs their API and a paid key.** Checked: the
endpoint is `convert-to-3wa`, the key is required, and the free plan does not
reliably cover it — the entry tier is around £8/month. Not worth it for this,
so the conversion is **gated like push**: `WHAT3WORDS_API_KEY` set and one tap
fills the box; unset and the box shows a link to their map instead, which
finds the phone itself. `src/app/api/w3w/route.js` answers `GET` with
`{configured}` so `FindWords` never renders a button that cannot work — the
same mistake as the push row that opened onto nothing.

The key stays server-side. A what3words key is billable, and a billable key in
client JavaScript is somebody else's monthly invoice.

**Do not invent a what3words URL that carries coordinates.** It could not be
verified from this container (their site 403s a bare curl, and Chromium here
will not trust the egress CA), so the link is the plain
`https://what3words.com/` and their own locate button does the rest. A guessed
third-party URL format that silently stops working is worse than two taps that
always do.

Once there is a pin, three words are not strictly needed — they exist to be
said down a phone, and a pin is better for everything else. They are still
offered because rural customers often know theirs already, and reading three
words down a phone beats describing a gate.

## Every operator route guards itself

`requireOperator()` from `src/lib/operator-auth.js` is the first statement of
every handler under `/api/dashboard`, and `isOperator()` guards the dashboard
layout. There is no middleware and there should not be one — a route protects
itself or it is not protected. Both fail closed: no `JWT_SECRET` means nobody
is an operator, never the reverse.

```bash
python3 - <<'PY'
import re, glob
H = re.compile(r"export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(")
for f in sorted(glob.glob('src/app/api/dashboard/**/route.js', recursive=True)):
    s = open(f).read()
    h, g = len(H.findall(s)), s.count('await requireOperator()')
    if h != g: print(f"{h} handlers, {g} guards  {f}")
PY
```

Silence means every handler is guarded.

## Free text is never trusted

A JSON body can hand you a number where a string belongs. `body.x?.trim()`
then throws a TypeError, the catch block hands it to `dbReason()`, and the
answer is a 503 about the database — sending you to the Neon console over a
malformed request. Everything user-supplied goes through `cleanText()` in
`src/lib/clean-text.js`, which coerces rather than assumes and caps at 500
characters.

## Things that have already gone wrong here

Each of these was live. Do not reintroduce them.

- **`arrivingAt` wiped on arrival.** The stage handler read
  `data.arrivingAt = stage === 'ON_MY_WAY' ? new Date() : null`, so moving to
  On site reset it and "Set off at 14:20" vanished from the customer's page at
  exactly the moment it mattered. Only stamp entering `ON_MY_WAY`; only clear
  going back to `BOOKED`.
- **`viewCount` counted polls.** `StatusTracker` polls every 30 seconds; the
  status route incremented on every response, so a tab left open logged 120
  "views" an hour. Counting belongs on the page, which runs once per visit.
- **A code collision returned a database error.** `code` is unique and
  generated randomly. Retry, do not report a database fault.
- **The login route had no throttle.** One shared password on a public URL.
  Ten attempts per IP per ten minutes. Note honestly in any change here that
  it is per-instance memory, so it is a speed bump, not a lock.
- **Dates tore the page in half.** `toLocaleString()` with no zone runs in UTC
  in a serverless function and in the customer's zone on their phone, so "Set
  off at 07:42" rendered an hour out on one of them. Naming the zone was not
  enough: Node and mobile Safari ship different Unicode locale data, and en-GB
  genuinely disagrees with itself — `Tue 29 Sept` against `Tue, 29 Sept`, `Sep`
  against `Sept`. React saw the mismatch and threw the whole tree away
  mid-hydration. **Every date on a page that renders on both sides goes through
  `src/lib/when.js`**, which uses `Intl` only for the numbers and owns the names
  and separators itself. Never `toLocaleString()` in a component.
- **An input bound to `undefined`.** The create form had a `customerPhone` field
  but `EMPTY` did not, so React treated it as uncontrolled and then complained
  the moment it was typed in. Every key the form renders belongs in `EMPTY`.
- **A forwarded link became a burglary kit.** Covered in full under *The link is
  the credential*. The shape of the mistake is the part worth remembering: no
  single commit did it. The product grew from reporting into asking, each new
  field was reasonable on its own, and the security model was never revisited to
  match. **When this product starts asking the customer something new, stop and
  ask who else can read the answer.**
- **A save wiped what it did not send.** `/api/status/[code]/notes` overwrote
  every access field on every call, so the presence buttons had to re-send the
  door, the dog and the notes just to preserve them — which is why those fields
  were on the page in the first place. It now patches: a field absent from the
  body is a field the caller is not changing.
- **A window was a broadcast pretending to be an arrangement.** The trade could
  set one; the customer could only read it. The first either of them knew that
  09:00 did not suit was a missed doorbell and a second appointment. It is a
  negotiation now. Anything else in this product that one side states *at* the
  other is worth the same look.
- **A time built in UTC came back an hour out.** Covered above under *A window
  is an arrangement*. `setUTCHours()` on a wall-clock time is always wrong for
  seven months of the year.
- **The address is https://www.getturnup.com** (since 8 Oct 2026; `getturnup.com` 308s to it,
  bought on Hostinger, DNS at Vercel). `tradestatus.vercel.app` still serves every link already
  sent and must keep doing so. Passkeys are bound to the host they were enrolled on, so a Face ID
  set up on the old address does not sign in on the new one: enrol again there, once.
- **Deployment protection.** The custom domains and `tradestatus.vercel.app` are open; the generated
  per-deployment URLs are behind Vercel's login. Never put a
  `tradestatus-<hash>-…` URL in front of a customer.
- **`setup.sh` died on its first line of real work.** The push-key block read
  `"${SCOPE_ARGS[@]}"` eighty lines before `SCOPE_ARGS` was defined, and under
  `set -euo pipefail` an unbound variable exits. It also needed a logged-in
  Vercel CLI that did not exist yet at that point. Push setup is its own
  script now. **When adding a step to a setup script, check what it needs has
  already happened** — these scripts are run once, by someone who cannot debug
  them, on the day everything else is also new.
- **Everything on the dashboard was open at once.** Five jobs came to 7,826px
  — nine and a quarter screens — with a 663px empty form above the work and
  every job's link, hours, photos and notes expanded, about 1,068px each. The
  trade scrolled a full screen per job to reach the one they were standing at.
  It was never noticed because looking at the dashboard needs a database and
  nobody had one. **A screen that cannot be run is a screen that does not get
  reviewed**; `scripts/local-db.sh` exists so that is no longer true.
- **The jobs list sorted by `updatedAt desc`.** Which sounds right and means
  the job you have just tapped Done on jumps above the one you are driving to
  next. The order a list is read in is part of what it says; `inRunOrder()` in
  `src/app/api/dashboard/trackers/route.js` is the only place it is decided.
- **A day was treated as a time.** A job booked for a day with no hours
  stores `scheduledFor` at midnight, and the nudge sweep and the customer's
  "Are you still coming?" row both fell back to it as the start of a window:
  the trade was buzzed at one in the morning, the customer's page said *the
  window started at 00:00*, and at ten past two the customer was told their
  window was missed. Found in a listing screenshot on 17 Oct (v1.60.0), the
  day the sweep went from every four hours to every five minutes, which would
  have made it nightly. **Only real hours make a window**: `windowStart`, never
  `scheduledFor`. ServiceM8 bookings always set both.
- **The card said the stage and not the day.** A customer opening a job that
  was only booked got "Booked in", a rail they could already read, and the
  actual answer — Thursday 1 October — two taps down inside "The job",
  truncated. A surface that does not say the thing the reader came for is the
  same defect whatever the surface; it is worth asking of every new one, *what
  did they open this for?*

## Stack and commands

Next.js 15 App Router (JavaScript only), React 19, Tailwind, Prisma + Neon.
Two models, `TradeStatus` and `TradeStatusEvent`, in their own database.

```bash
npm run dev
npm run build
npx prisma db push            # needs DATABASE_URL in the environment, not .env.local
bash scripts/setup.sh         # idempotent: reuses both projects, re-reads Neon's
                              # connection string — also how a rotated password
                              # reaches Vercel
```

`main` is connected to Vercel: a push deploys to production, any other branch
gets a preview.

## Shipping a schema change without taking the product down

**There are two kinds of migration and only one of them is safe to ship ahead
of the migration itself.**

| | If `prisma db push` has not run |
|---|---|
| A **new table** | Fails soft. Every read of it sits in a try/catch, the feature stays dark, nothing else notices. `PushSubscription` works this way. |
| **New columns on an existing table** | Fails **hard, everywhere**. Prisma selects every scalar field on a model, so the new columns are in every query for that table whether or not the new feature is touched. The whole product goes down, and the blast radius is every customer rather than the feature. |

This has happened. v1.9.0 added four columns to `TradeStatus`, the live database
did not have them, and from the moment it deployed every tracking link read
"Status unavailable right now" and the dashboard could not load a job. It had to
be reverted.

So: **columns on an existing table are not shippable until the migration has
run.** Either run it first, or hold the commit. Do not reason from "the push
table shipped fine" — that was a new table, which is the other case.

### New tables are created by the build

Since 9 Oct 2026 `npm run build` runs `prisma db push` before `next build` (see
package.json). An additive change — a new table, a new nullable column — lands
in the live database as part of the deploy, which is how `Sm8Link` and
`Sm8Event` got there. A destructive change is refused by `db push` without
`--accept-data-loss`, the step is allowed to fail (`|| true`), and the build
carries on; so a destructive change still needs a human and still needs the
check below. The v1.9.0 rule stands: a NEW COLUMN that code reads is only safe
because the build now creates it first — if the push step ever fails, every
link is down. Read the build log.

### The check after any deploy that touches the schema

One curl, and it is not optional:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://www.getturnup.com/api/status/ZZZZZZZZ
```

**404 is healthy** — the row was looked for and not found. **503 means the code
and the database disagree**, and every customer link is down right now. A page
that still returns 200 proves nothing: it renders the "unavailable" state with a
perfectly good status code.

Checking the theme colour changed is not this check. The theme comes from a
constant in the bundle and is green while the database is on fire.

## The link ServiceM8 sends (`/j/<job number>`)

ServiceM8 templates can merge the job number and the mobile, and nothing
unguessable (the field list has no uuid or link; checked 9 Oct 2026). So the
booking text carries `/j/{job.generated_job_id}`, and that page shows nothing
until the visitor gives the last four digits of the job contact's mobile or
phone (`phoneMatches` in `src/lib/servicem8.js`). `/j/<number>/<mobile>` skips
the question when the mobile matches, which a template could write too, but
a mobile saved with spaces ends the link early in an SMS, so the page
recommends the plain form. Ten misses on one number rest it for fifteen
minutes, counted in `Sm8Event` (`claim.miss`) so it holds across instances. The tracker is created on first proof
(`findOrCreateForJob`), linked at birth and synced. `/with-servicem8` is the
public how-to and must stay true to what the connector does today.

**What the key can see (checked 12 Oct 2026).** Jobs, bookings (`jobactivity`),
contacts, notes, inbox messages, and the **job email and SMS history**:
`email.json` and `sms.json`, filtered by `related_object_uuid`, with
`direction`, `timestamp`, `to_*`, `opened`/`first_opened_at`/`bounced` on email
and the full text of each. That is how `fetchMessages()` and
`confirmationState()` know whether ServiceM8 sent the link and whether it was
read, and how **This week in ServiceM8** (`Sm8Week.jsx`, `fetchUpcoming()`,
`/api/dashboard/servicem8/week`) answers "did the text go?" from ServiceM8's own
record rather than guessing. Before this the box said it could not look inside
ServiceM8; it can, for reading. The key also **sends SMS** through
`POST /platform_service_sms` (`sendSms()`; tested 12 Oct 2026, the text lands
in the job's SMS history with `regardingJobUUID`), which is what **Send the link
via ServiceM8** does. What it **cannot** do: write to the job diary (403) or
notify staff. Those are the add-on's: `src/lib/sm8-oauth.js` (OAuth, encrypted
tokens in `Sm8OAuth`, `publishDiary()`, `diaryFor()`), steps for the owner in
`docs/servicem8-add-on.md`. `diaryFor()` is fire-and-forget wherever it is
called and a no-op until the add-on is authorised. Texts go through
`src/lib/sm8-words.js` and stay plain ASCII.

**The store listing (`docs/servicem8-listing.md`, `public/servicem8/manifest.json`,
v1.60.0)** is written to ServiceM8's own requirements and the manifest is
validated against their v1 schema. Three things block a *public* listing and
none is code you can finish in an evening: TurnUp serves **one trade** (a
second business pressing Activate lands on this dashboard's sign-in) and there
is **no monitored support mailbox**. The third, a privacy policy page, is done
(v1.61.0): `/privacy` is live and linked from the homepage footer, because the
listing field takes a URL and a document in `docs/` is not one.

**`src/app/privacy/page.js` is a claim about the code, and the code wins.** It
says what is held, who can read it and the one rule the public shape obeys. A
change that widens what `publicShape()` returns, what a notification carries or
what a third party is sent is a change to that page as well; if the page and
the code ever disagree, the page is the defect. It is also the one page in the
product that is deliberately `robots: { index: true }` — a privacy policy
nobody can find is not one. The add-on asks for the
minimum, `publish_diary_items vendor`; it asked for `create_notifications` and
never used it. Keep the listing's words true to what the add-on does, and never
compare it with ServiceM8's own features in the listing: their rules forbid it.

**Follow every booking (`src/lib/sm8-auto.js`, v1.35.0).** When
`TradeProfile.autoFollow` is on, the cron sweep calls `autoFollow()`: every
scheduled visit edited in the last six hours gets its card at once
(`findOrCreateForJob`) and, **ten minutes after the booking was made**, the link
texted through ServiceM8 — unless `confirmationState().linkTexted` says
ServiceM8's own automation already did, in which case `linkSentAt` is set to
that time and nothing is sent. The ten minutes is the automation's head start,
so the two never race to one phone. `linkSentAt` makes it once per job, ever.
**Re-send on a move (v1.38.0):** `toldStart`/`toldEnd`/`toldAt` on the card are
what the customer was last texted. `resendIfMoved()` compares them with the
job's next booking (`bookingMoved()`, five minutes either end) and, once the
edit is ten minutes old, texts `moveText()` once and moves `told*` on. Only
while the card is BOOKED; a job with no booking left is never announced.
Rules that must not drift: never send without the trade's switch on; never send
the link twice; never send to a job that is Completed or Unsuccessful; the texts
are `linkText()` and `moveText()` and nothing else.

## The household card (`/h/<code>`)

The second half of the product, and the one with a market in it. A job link
answers *where is my plumber*. A household card answers **what is happening at
my house this week** — the plumber, the sofa, four parcels, on one list,
because that is how the person living there already thinks about it. A card
that splits trades from parcels makes them do the merging in their head.

**It fills itself from forwarded email, and that is the whole strategy.**
Getting thirteen delivery firms to integrate is not a thing a sole trader can
do. Getting one household to add a forwarding rule is. `src/lib/arrival-email.js`
reads a forwarded email and returns an arrival or **null**; it is pure, has no
database, and `node scripts/check-arrival-email.mjs` is its test: 31 cases, five
of them raw forwarded emails in `scripts/fixtures/forwards/` run through
`readRawEmail()` first, which is the real path.

**Every card email is a forward, so the forward is unwrapped first**
(`unwrapForward()`, v1.64.0). Until then nothing did: a live test on 18 Oct 2026
showed the household ("Me") as the sender and "Fwd: Dispatched: ..." as the
title. Gmail, Apple Mail and Outlook forwards are read, nested ones to the
bottom. **The cost, written down:** inside a forward the carrier's domain is a
line of text the household's own mail client wrote, so it no longer has SPF
behind it. The protection instead is that only the household holds the inbox
key, and anyone holding it could post anything anyway. Without that trade no
forwarded email could ever match a carrier.

**The subject is read before the body.** The sender's headline names the stage
it is about ("Dispatched:", "Delivered:", "Confirmation of your order"); the
body mentions every other stage in passing ("we'll email you when it has been
dispatched", "should be delivered to your address"). Reading the body first is
how, in the same live test, an order confirmation would have become a dispatch
and a dispatch became an arrival.

**An order confirmation is filed as `ORDERED`, not dropped.** It is the first
news of something coming, `RANK` puts it below every later stage, and a shop's
order number is the reference all three of its emails share, so order, dispatch
and delivery move one row forwards. Only digital orders are dropped
(`DIGITAL_ONLY`: e-tickets, gift cards, downloads, subscriptions), because a
household's forwarding rule catches whatever it catches and a row for a thing
that never comes to the door is the card lying.

**Titles name the thing, not the stage.** A stage label at the front of a
subject ("Dispatched:", "Delivered:", "Confirmation of") comes off, because
the card shows the stage above the title. A row keeps its first title, except
that a title this code made up (`isGenericTitle()`: "Samsung UK order", "Evri
parcel", "Delivery from Loaf") gives way to the first later email that names
the thing. Without that, filing the order confirmation first would have pinned
"Confirmation of your order" to the row for good.

Three rules in that parser, each of which cost a bug:

- **Carriers are matched on the sending DOMAIN, never on body text.** A
  subject line can claim to be Royal Mail; a domain has to pass SPF.
- **`FUTURE_TENSE` guards DONE.** A bare `/delivered/` matched "will be
  delivered between 1 and 2 today" and took a parcel off the card while the
  customer was waiting in for it. Every DONE pattern is explicitly past tense:
  it has been delivered, it was left with someone, it is in your safe place.
  A bare `/delivered to/` went the same way on 18 Oct 2026 ("should be
  delivered to your address" in a dispatch email) and is gone; the guard now
  covers should, may, could and left as well.
- **`BOOKED` is the row Shop drops.** Shop's own documentation says forwarding
  works for *"English emails with a tracking number"*. A sofa with two men and
  a Tuesday window has no tracking number anywhere, and nor does a boiler
  service. Those emails say "we will deliver" and a date, so that is what is
  read. That gap is the wedge: **arrivals, not parcels.**

**Nothing on the card is undated and unattributed.** "Evri said today", "Loaf
said tomorrow, 12:00–16:00" — the same discipline as a window, for the same
reason. The product does not work out when something will arrive; it repeats
what the sender said and names them. A row the trade put there says the trade
said it, via `TRADE_NAME`.

**Two secrets per card, and they must never travel together.**

| | Half | Goes to | On the card? |
|---|---|---|---|
| `code` | read | the customer, as `/h/<code>` | yes, it is the URL |
| `inboxKey` | write | a mail rule, as `cards+<key>@in.getturnup.com` | **never** |

Collapsing those two would mean a card forwarded into a family group chat is a
way to post rows onto a stranger's door. `cardShape()` lives in
`src/lib/arrival-card.js` with no database import so
`scripts/check-public-shape.mjs` can prove the inbox key is not in it, the same
way it proves `publicShape()`.

**Stages only move forwards** (`nextStage()` in `src/lib/arrivals.js`). Carriers
email out of order — a "dispatched" can land after an "out for delivery", and a
delayed queue replays yesterday. A card that walks backwards is a card that
lies. `MISSED` is the one exception: it is news whenever it lands.

**The inbound route always answers 200 once the token is good.** A provider
retries a 500, and a retry storm on a parse bug puts one parcel on a card
twenty times. `src/app/api/inbound/[token]/route.js` is provider-agnostic
(SendGrid Inbound Parse, Mailgun, Postmark, Resend) because inbound mail is a
commodity and the first choice of provider is usually the wrong one — reading
all their shapes costs thirty lines and makes a switch a DNS record.

**Windows go in through `atLocalTime()`, never `setUTCHours()`.** Already
caught once here: "between 12 and 4" went in as 12:00Z and came back out as
13:00 on the card. Same bug as the trade's 09:00 window, same fix.

**It is gated, like push.** No `INBOUND_EMAIL_TOKEN` and the dashboard panel
says forwarding is not switched on rather than handing out an address nothing
is listening on. The push row that opened onto an empty drawer is the mistake
being avoided.

**A parcel lands; a person knocks, and the card keeps them apart.** The
headline counts people first, *Coming to the door* comes before *Also
arriving*, and `kindOf()` in `arrival-email.js` decides which is which:
a carrier or a tracking number is a `PARCEL`; an engineer, surveyor, fitter or
installer who "will attend" is a `SERVICE`; a sofa with two men is a
`DELIVERY`. Read conservatively — a jiffy bag in the list of people you have to
be in for makes that list worthless, which is the only thing it has.

Service emails also needed their own BOOKED phrases. Before them a boiler
service and a window survey were dropped entirely, because nothing in a
delivery vocabulary matches "our surveyor will visit on Monday".

**The trade's own job is the one row somebody can move.** `attachTracker()`
puts it on a card from the dashboard and `syncTrackerToCards()` — un-awaited
from the stage handler, same rule as push — keeps it in step. That row is
**owned by the job and overwritten every sync, including backwards**, which is
the exact opposite of `nextStage()` above and deliberately so: a carrier
emailing out of order is noise, a trade un-pausing a job is a fact.
`src/lib/arrival-sync.js` holds the mapping (`ON_SITE` → `HERE`, `PAUSED`
stays `PAUSED` because it is the thing a customer most wants said), is pure,
and `node scripts/check-arrival-sync.mjs` proves nothing the customer told the
trade crosses over and a PROPOSED window is not stated as fact.

**A job is attached by hand and never matched on address.** Two flats share a
postcode; a landlord and a tenant share a door. A card is a link anyone can
forward, so a guessed match would put somebody's name and booking in front of
a stranger. One tap is cheap; that is not.

### The letterbox (`cloudflare/email-worker/`, `src/lib/mime.js`)

Mail reaches a card through Cloudflare Email Routing on the **subdomain**
`in.getturnup.com`, not the apex. Checked against Cloudflare's own docs rather
than assumed: Email Routing is zone-level, a subdomain is added from the apex's
Settings page, and Cloudflare then writes that subdomain's own MX/SPF records —
which leaves `will@getturnup.com` available for ever. A catch-all on the apex
would have spent that for nothing.

**One rule, not a catch-all (v1.63.0).** Cloudflare's catch-all works on the
apex only; a subdomain takes literal rules. So every card's address is
`cards+<key>@in.getturnup.com` (`INBOUND_LOCAL` in `src/lib/inbox-address.js`),
one rule for `cards@` takes them all with Cloudflare's subaddressing switched
on, and the key rides in the plus part. Until then the steps said "catch-all on
the subdomain", which could never have worked. The owner's half is a Cowork
paste: `docs/cowork-letterbox.md`.

**The Worker does almost nothing, and that is the design.** Cloudflare hands it
a raw RFC 822 message in an environment that cannot be run locally and whose
failures are a line in somebody's log. So it reads the message and posts it;
everything that could be wrong is decided back here, where
`node scripts/check-mime.mjs` runs. Keep it at fifteen lines with no
dependencies. Two rules in it that are not obvious:

- **It never throws.** A thrown Email Worker bounces the message back to the
  sender, and a carrier getting a bounce from a customer's forwarding rule is
  worse than one parcel missing off a card.
- **It posts `message.to` as well as the raw message.** The envelope recipient
  is the card's inbox; a forwarded email's `To:` header is whoever it was
  originally sent to. `readRawEmail()` prefers `Delivered-To` for the same
  reason, and that is tested.

`src/lib/mime.js` is deliberately not a complete MIME implementation — it wants
a sender, a recipient, a subject and readable text, not attachments or nested
signatures. Anything it cannot read comes back empty and is dropped, which is
the right answer for a thing it was never sure about. Two traps already caught
by its tests: a capturing group in the boundary `split()` puts `undefined` into
the parts array and throws on an ordinary multipart email, and `=C2=A3` is two
UTF-8 **bytes**, so resolving each escape straight to a character gives a price
that reads as `Â£`.

**Turning it on is one button and two Cloudflare steps**
(`src/app/dashboard/InboundSetup.jsx`, `/api/dashboard/inbound`, reference in
`docs/cloudflare-email.md`). **It was four, and the cut is the lesson.** Two of
those steps needed a laptop: an environment variable in Vercel plus a redeploy,
and a Worker deployed with wrangler. Told to do them, the owner asked twice
more for the whole thing to be set up for him — which is the same signal as the
push script being run none of the four times it was asked for. **When an ask
keeps not happening, change the ask.** So:

- **The password writes itself to a row** (`InboundSecret`, a new table, so it
  fails soft; `src/lib/inbound-config.js`). No Vercel visit, no redeploy.
  `INBOUND_EMAIL_TOKEN` still wins wherever it is set, so nothing that already
  works stops working. Pressing the button twice returns the same password
  rather than stranding a Worker that is already deployed — rotating is its own
  verb (`DELETE`), because it stops every live Worker.
- **The Worker is handed over finished**, with the address and the password
  already in it, to paste into Cloudflare's own editor. The tidier form is a
  wrangler secret; that needs a terminal. Inside a Worker the source is private
  to that account, which is where a secret would have lived anyway, so the cost
  is tidiness and the gain is that it can be done at all.

What is left cannot be deleted by anybody: a Cloudflare account is an account
somebody has to own, and a nameserver change is a domain somebody has to prove
they control. There are no Cloudflare tools in a Claude session — checked, not
assumed — and Vercel's connector is still read-only for environment variables.
The nameserver half is written out as a Cowork job in
`docs/cowork-nameservers.md`, per the standing rule about consoles.

**The panel says where it has got to, and asks the internet rather than the
owner.** `letterboxDns()` in `src/lib/dns-check.js` resolves the apex's NS and
the inbound host's MX; `/api/dashboard/inbound?progress=1` returns that beside
what has actually reached the letterbox, and the checklist refreshes every
twenty seconds. It exists because the owner had to ask a Claude session to run
a DNS query for him to find out whether his own setup had worked.

Two rules in it, both learned the same evening:

- **Asked over DNS-over-HTTPS, from two resolvers, never the local one.** The
  container this was written in answered `ENODATA` for every record, including
  ones that plainly exist. A serverless resolver may be no better.
- **Unknown is its own state and draws the same empty circle as not-yet.** A
  lookup that could not be made must never put a cross beside a step somebody
  has actually done, because that sends them back to undo correct work. And
  DNS is slow: a nameserver change read as "not done" fifteen minutes after it
  was made read as done shortly after — **a stale lookup is not evidence, and
  saying so to the owner was wrong.**

**`seenCount`/`lastSeenResult` make the last line a demonstration, not a
claim.** It says *filed as OUT_FOR_DELIVERY*, or *not an arrival*, or *arrived
but no card address in it* — three different problems with three different
fixes, which all look like silence otherwise. `noteInboundSeen()` is
fire-and-forget from the inbound route for the usual reason: a mail provider
is waiting on that response and retries a slow one.

**A household can make its own card** (v1.63.0): the end of the home path on
`/join` posts a name to `POST /api/places` (public, three an hour per IP) and
gets back the code and the inbox address, once, kept on that phone. Only the
name goes on the card. `GET /api/places` answers `{receiving}` (configured and
MX on the subdomain) and `/join` shows the forwarding address only when it is
true: an address nothing is listening on is the push row that opened onto an
empty drawer.

Still to do: a way to connect a source other than forwarding (Gmail's
`gmail.readonly` is a restricted scope — Google verification plus a CASA
assessment renewed yearly, weeks of lead time and a four-figure annual cost,
which is why forwarding came first).

## When the window arrives and nothing has moved (`src/lib/nudge.js`)

The one thing the card could not do until v1.18.0 was notice that a time the
trade gave had passed. Now: the customer's page shows **Are you still coming?**
once the window has started with the card still Booked in (or ended with
nobody On site); pressing it sets `askedAt` and pushes every `TradeDevice`
(the trade's phones, registered by **Nudge me** on the dashboard). The trade
answers from the card: a stage change, or **15 / 30 / 60 min late**, which
writes `lateMinutes`/`lateAt`, a note with the time, and pushes the customer.
Unasked nudges go to the trade at window start (`nudgeLevel` 1) and window
end (2); an unanswered ask repeats every ten minutes. `nudgeIfDue` runs on
the customer's 30-second poll, after every ServiceM8 sync, and from
`GET /api/cron/nudge`, which **Vercel Cron calls every five minutes**
(`vercel.json`), with `.github/workflows/nudge.yml` as a half-hourly backup.
Before any schedule nothing called it, so a window could pass unnoticed
whenever no customer happened to have their page open — which is the case a
trade cannot rely on.

**It ran on GitHub Actions until v1.56.0, and GitHub ran it every four hours.**
The workflow asked for every five minutes; GitHub's scheduler is best effort
and dropped almost every run (37 runs in total; on 17 Oct at 00:57, 05:29,
09:37, 13:12 and 16:29). So the missed-window notice, the 4pm day-before ask,
the review ask and Follow every booking all fired hours late, and nothing went
red, because a run that never starts cannot fail. It was there because Vercel's
free plan caps cron at once a day, and **a sub-daily cron on that plan fails
the deploy**; the team is on **Pro** (Vercel's 9 Oct email, paid receipts), so
Vercel runs it. If the team ever drops to Hobby, take the cron out of
`vercel.json` first or every deploy fails. **Check a schedule by its log, never
by its config**: Vercel → turnup → Logs, filter `/api/cron/nudge`: one
`sweep by=vercel-cron checked=… nudged=…` line every five minutes (the route
logs it on purpose since v1.60.1; before that a warm sweep logged nothing and
the schedule could not be seen). The GitHub backup is free only because the repo is public.

The route is **open, and that is a choice**: every nudge level fires once and a
repeat is paced to ten minutes inside `nudgeAll()`, whoever calls it, so
hammering it cannot produce extra notifications. A sweep is also throttled to
one per twenty seconds, which caps what an open URL costs the database rather
than what it costs the customer. Setting `CRON_SECRET` makes it require
`Authorization: Bearer <secret>` — the header Vercel Cron sends — and it must
then be set in **both** Vercel and the repository secrets, or the schedule
locks itself out.
Rules that must not drift: the product never estimates a time; a late figure
is only ever one the trade typed, shown with when they said it.

## The day before: will someone be in? (`src/lib/day-before.js`)

The one moment a courier gets right and a trade never had. At **16:00 the
afternoon before** a job, in the trade's zone, the customer is asked once
whether anyone will be in: a push if they switched one on, the page's own row
either way ("Booked for tomorrow, will someone be in?"), and a line in the
timeline saying it was asked. If none of the customer's phones can be
reached, the **trade** is nudged to text the link, because an ask that
reaches nobody is not an ask. The dashboard card says "asked, no answer yet"
until they answer.

The decision is pure and tested without a database
(`node scripts/check-day-before.mjs`, 16 cases, the clock change included);
`askPresenceIfDue()` in `nudge.js` does the sending and runs first in every
`nudgeIfDue` sweep. Rules that must not drift:

- **Once per job.** `presenceAskedAt` is claimed with an atomic `updateMany`
  before anything is sent, so the five-minute cron and the customer's poll
  cannot both send it.
- **It asks, it never promises.** The notification says "booked for tomorrow"
  and nothing else about time. `LINES` and the lock-screen rule above apply.
- **The answer stays private.** `presenceAskedAt` is public (the trade asked);
  `presence` is not. The same line as `presenceAt`.
- The hour is `ASK_HOUR` via `zoned()`, never a UTC comparison.

**The three replies (v1.32.0).** Once `presenceAskedAt` is set and until the
window starts, the customer's page shows `Tomorrow.jsx`: **still fine / someone
else will be in / need to move it**, posted to `/api/status/[code]/reminder`
(`replyReminder()` in `nudge.js`), each one pushed to the trade and written to
`reminderReply`/`reminderReplyAt`. `OK` and `SOMEONE_ELSE` also set `presence`,
so the ask above is answered by the same tap and the door note and the card
never disagree. `MOVE` moves nothing: it is a request, and the hours are agreed
under When suits you? like any other window. `dayWord()` lives in
`src/lib/nudge-words.js` because the page needs it without Prisma. The hours on
the card are stated only when the window is AGREED.

**The pilot is four numbers** (`src/lib/pilot.js`, panel under Setup and
settings, `node scripts/check-pilot.mjs`): links opened, "will someone be in?"
answered, wasted trips (No one home records), and "when are you coming?" calls
to the booking line. The product cannot see a phone ring, so the fourth is
counted by a person and the panel says so; "Are you still coming?" taps are
shown beside it as the nearest thing the product sees, never as calls. Decided
11 Oct 2026: nothing moves on housing or pricing until thirty days of these
are in.

## A tap with no signal still counts (`src/app/dashboard/offline-queue.js`)

Every write from the dashboard that is safe to replay — a stage tap, a note, a
No one home record — goes through `queueFetch()`. If the network is not there
it is written to IndexedDB with the time of the tap (`deviceAt`) and, a moment
later, whatever fix the phone will give, and `flush()` sends the queue in order
on `online`, on the page becoming visible, every twenty seconds, and on load. A
replayed body carries `offline: true`, `deviceAt`, and the fix; `readTap()` in
`src/lib/tap.js` believes `deviceAt` only within the last two days and not in
the future, and marks the fix validated only if it was taken within three
minutes of the tap and within 200 m. `TradeStatusEvent` keeps **both clocks**:
`createdAt` is the server's, `deviceAt` the phone's. `arrivingAt` becomes the
tap's time for On my way, so "Set off at" is true. The customer's timeline shows
the tap's time and "sent HH:MM, when back in signal"; the place is never public.

Why the page and not the service worker: Safari on iOS has no Background Sync,
and that is the phone this runs on. A home-screen app flushes when opened, which
is the moment that matters. Rules that must not drift: a 4xx from the server
settles a queued tap (it was read and refused); a network failure or 5xx keeps
it; order is kept, so On site never overtakes On my way; nothing is dropped;
and nothing is doubled: every replay carries `tapId`, indexed (not unique: a
unique constraint makes `prisma db push` refuse without `--accept-data-loss`,
which the build never passes, and the deploy would then run new code on an old
schema) on the event and on `NoAccess`, so a flush cut off by a page change after the request went but
before the item was deleted replays as the same tap, not a second one.

## The page says how fresh it is, and the customer can be the late one

`StatusTracker` keeps `checkedAt`/`pollFailed` from its own poll and prints them
in the footer ("Updated 10:42" / "Last checked 10:40, not reaching the server"),
set after mount so hydration is untouched. `TradeProfile.lastSeenAt` is stamped
by every dashboard load and by `POST /api/dashboard/seen`, a heartbeat the
dashboard sends once a minute while visible; the status route and page hand it
to the customer as `tradeSeenAt` (never on a DONE job), and the status card says
"Will's phone last reached us at 08:12" once it is fifteen minutes old during
ON_MY_WAY / ON_SITE / PAUSED. It is a time, never a place, and never a guess.

`POST /api/status/[code]/customer-late` takes 15, 30, 60 or null, only while
BOOKED or ON_MY_WAY, writes `customerLateMinutes`/`customerLateAt`, pushes the
trade with "expect them from about HH:MM" (worked out from what the customer
said, which is theirs to say), and writes a diary line. The minutes are the
customer's own answer: `publicShape` carries `customerLateAt` only; the device
remembers its minutes in own-answers, the same line as presence.

## How did it go? (`src/lib/review.js`)

At DONE the customer's page shows `AfterJob.jsx`: **Leave a Google review** (the
trade's `TradeProfile.reviewUrl`, Google hosts only via `cleanReviewUrl()`) and
**Tell Will something** (a private note). **Both doors are always open to every
customer.** Never add a "were you happy?" step before them: inviting only the
customers who seem happy is review gating, which the CMA treats as misleading,
and it is also the quickest way to make the reviews worthless. `reviewAsks()`
runs from the cron two hours after the last DONE event, pushes once per job
(`reviewAskedAt` claimed atomically), and only while a review link is set.
`POST /api/status/[code]/review` records the tap (`reviewClickedAt`) or the
note (`feedbackText`/`feedbackAt`); the note goes to the trade's phone, the
card and the diary, and `publicShape` carries only the two times.

## The native shell (`native/`): the job on the trade's own lock screen

iOS shows buttons and a live card on the lock screen only through a **Live
Activity**, and only a native app can start one. `native/` is a Capacitor
shell whose one screen is the live dashboard (`server.url` in
`capacitor.config.json`, so a Vercel deploy is an app update), plus a
WidgetKit extension (`ios/App/TurnUpWidget`) drawing the job you are on with
On site / Paused / Back on site / Job done buttons. `SetStageIntent.swift`
PATCHes the tracker route like any dashboard tap, carrying a bearer token from
`POST /api/dashboard/native-token`; `requireOperator()` accepts
`Authorization: Bearer` when there is no cookie, same JWT, same secret, same
30 days. `src/lib/native.js` is the dashboard's half and is a no-op outside
the app; `Console.jsx` calls `syncActivity(rows)` on every load.

**Nothing in `native/` is compiled here**: no Xcode in the container. The
Xcode project Capacitor generates has no widget target, so `add-widget.rb`
(the `xcodeproj` gem) adds it, idempotently, and `.github/workflows/ios.yml`
runs it on a macOS runner and uploads to TestFlight once the repository
variable `IOS_SIGNING_READY` and the secrets in `native/README.md` exist. The
lock screen rule for pushes does not apply here: it is the trade's own phone
and their own job.

## Paused, and when you are back (`src/lib/pause.js`)

Paused already carried the reason (the stage note). The return is the trade's
**own choice from seven fixed words** — `PAUSE_BACK`: 30 min, 1 hour, 2 hours,
after lunch, later today, tomorrow, another day — written to `pauseBack` with
`pauseBackAt`, the time it was said. `pausedAt` is stamped on entering Paused;
leaving Paused clears all three (`pauseStampFor()` in the tracker PATCH). The
customer's page reads *Paused at 10:40. Sam says: back in about an hour, said
at 10:40.* and, once the minute-shaped ones run out, *That was 11:40. Still
paused…* — a fact about the clock, not a fresh estimate. `pauseBackLine()` is
the one wording, used by the card, the dashboard banner, the event and the
diary; the push body says the same.

This stays inside the no-promised-time rule the same way "about 30 minutes
late" does: the product never computes a return and never shows a countdown.
Tomorrow and another day carry no clock time at all. Do not add a typed
free-text estimate; seven words are the whole vocabulary so one tap on a
driveway is enough and the customer reads the same sentence every time.

## A revised promise is shown as revised (`revisionFor()` in `src/lib/window.js`)

The window is the one time-shaped thing the trade publishes, and moving it used
to overwrite it: the customer's page said *Between 14:00 and 16:00* as if it
had always said that. Now the **first published hours are written once**
(`windowFirstStart/End/At`) and never again; every later change of published
hours stamps `windowRevisedAt`, `windowRevisedBy` and bumps `windowRevisions`;
`windowShownStart/End` keep the hours the customer could last see, so agreeing
a counter is compared with what stood before the counter and not with itself.
The day does the same with `scheduledWas` (set once) and `scheduledMovedAt`.

**Every write that publishes hours from the trade's side goes through
`revisionFor(current, next, { by })`**: the dashboard PATCH (propose, agree,
clear), and `syncTracker()` when a ServiceM8 booking moves. The customer's own
counter is not the trade publishing anything, so it is neither a first nor a
revision, and `scripts/check-public-shape.mjs` proves a pending counter can
never surface as `was`. Each revision also leaves an event in the record
(*Hours changed from between 09:00 and 11:00 to between 14:00 and 16:00*,
*Moved from Tuesday 13 October to Wednesday 14 October*).

`windowRevisionLine(win, side)` is the one place the words live, read by
`Window.jsx` for the customer and `Console.jsx` for the trade: *Revised 10:02.
They first said between 09:00 and 11:00.* / *Changed at your request, 10:02.*
/ *The hours were withdrawn at 10:02; the day stands.* Do not add a second
wording. A first window carries no line at all.

## Who is coming, with a face (`/api/profile/photo`)

The engineer's photo is **taken on the phone, not pasted as a URL**. `Profile.jsx`
opens the camera (`capture="user"`), squares the picture off on a canvas at 512px
and sends a JPEG data URL to `POST /api/dashboard/profile/photo`, which checks the
JPEG magic bytes, caps it at 450 KB and stores the bytes on
`TradeProfile.engineerPhotoData` with `engineerPhotoAt`. The public
`GET /api/profile/photo` serves the bytes (one day cache; the `?v=<time>` in the
URL from `publicProfile()` busts it on change) and 404s when there is none.
`DELETE` clears it everywhere at once. The dashboard profile GET and PUT **strip
`engineerPhotoData`** before replying; a panel that fetches a profile must never
be sent the bytes.

The face obeys the same gate as the name and the plate: `profile` is `null` on
the public shape until ON_MY_WAY, and `StatusTracker.jsx` shows the strip only at
ON_MY_WAY (*is on the way*) and ON_SITE (*is with you*). The push at those two
stages names the person, the firm, the van and the plate and carries the photo as
`icon`/`image` (`public/sw.js`, `mts-push-v2`). That is still within the lock
screen rule above: it is the trade's own name and face, which is what the customer
is meant to recognise at the door, and never the customer's.

## Terms are agreed, not announced (`src/lib/terms.js`)

The customer's page carries **Before the visit**: the notice the trade asks for
to move or cancel, the short-notice charge if there is one, what happens when
nobody is in, and the 14-day right to cancel. One tap, **Got it, go ahead**,
writes `termsAgreedAt` and `termsAgreed` (a snapshot: the two numbers and the
exact text shown) and an event in the timeline. The numbers live on
`TradeProfile` (`noticeHours`, `shortNoticeFee`, set under **Booking terms** on
the dashboard); the words live in one place, `termsParagraphs()`, so the page,
the dashboard preview and the stored record are the same text.

Why a tap and a snapshot, rather than a line in the confirmation: a charge for
a late cancellation or a missed visit is only enforceable if the customer agreed
it **before the day**, it is a fair estimate of the loss, and notice avoids it
(Consumer Rights Act 2015 Sch 2; GOV.UK's cancellation guidance). And a booking
made by phone or online carries a 14-day cooling-off period in which a trade who
starts without an express request can end up unpaid (Consumer Contracts
Regulations 2013, reg 36). The tap is that request, with a time on it.

Rules that must not drift:

- **TurnUp states a fee; it never takes one, never adds one and never decides
  one is owed.** `recordNoAccess()` writes the figure into the note only when
  `agreedFee(tracker)` finds one in the snapshot, and otherwise writes "Nothing
  is charged" in those words. The figure comes from the **snapshot**, never the
  live profile: a fee raised after the booking is not what they agreed.
- **Nothing is ever un-agreed by a route.** A second POST returns the first
  record. Changing the terms changes future pages; agreed jobs keep their words.
- The confirmation the trade sends (the ServiceM8 line on `/with-servicem8`)
  says the terms and the right to cancel are **on the link**, which is what
  makes the link the durable copy. Do not put a fee in the SMS that the page
  does not also show.

## The homepage shows parts of screens, not phones

Since v1.35.0 the front page explains each thing the app does with a picture of
the part of the screen that does it — the row opened, the stage buttons, the
send box — under a label of a few words, instead of a paragraph beside a whole
phone. The owner's verdict on the page before was that it was a lot of writing
and overwhelming, and a whole device at 250px wide makes the one row being
talked about unreadable. Keep it that way: **add a picture, not a paragraph.**

The pictures live in `public/home/crops/` and come from one script:

```bash
NEXT_PUBLIC_TRADE_NAME="Sam Hale Plumbing" npm run build && npx next start -p 3100 &
BASE=http://localhost:3100 node scripts/capture-home-crops.mjs   # then rebuild
```

It photographs the customer's page from `/preview` one element at a time (the
status card at each stage, each row opened), the hero phone
(`public/home/customer-on-my-way.webp`), the household card it cuts
`house-card` from, and, since v1.58.0, **the trade's screens live too**:
signed in against the seeded local database (`scripts/local-db.sh` first, or
the run says NO SESSION and leaves them), it photographs the sign-in, the stage
buttons, Navigate with the door note, the send box, the new-job form and the
plate field by locator. Until then those six were cut by pixel box from full
captures made at v1.35.0, which is how the homepage showed the glass look for
a week after the flat one shipped: the rule below was kept for the customer's
rows and silently broken for the trade's. Build with
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` set (any string; it is only a photograph) or the
push row cannot be shot. It writes `src/lib/home-crops.json` with each file's
size, which `Shot.jsx` needs. The frame round each picture is flat, like the
app: the one radius and a hairline.
**When a screen changes, re-run it**: a crop of last month's row is a lie
about this month's app. Recapture; never retouch. A look change (v1.51.0)
counts as every screen changing. The poster frames (`public/home/frame-*.webp`,
`src/lib/posters.js`) and the phone screens inside them come from
`scripts/capture-posters.mjs` (v1.63.0): screens first, then
`rm -rf .next/cache/images` and a restart, then `ONLY=frames`, because the
image optimiser caches by URL and a running server shows a re-shot screen's old
self inside the frames. Both capture scripts write the live origin over the
local one before a shot (`asLive`): from v1.58.0 the homepage's "Send it in one
tap" picture showed `http://127.0.0.1:3100/t/...`. `/with-servicem8` uses the
same component and the same folder (`sm8-*`), cut from the captures in
`public/with-servicem8/` with `ONLY=sm8 node scripts/capture-home-crops.mjs`,
which needs no browser; ServiceM8's own screens stay drawn (`Sm8Mocks.jsx`), at
a readable size rather than inside a 150px phone.

The dashboard's setup panels follow the same rule (v1.43.0): Who to expect, Booking
terms and Turn on notifications each show the customer's row they change (`Shot`, the
same crops), ServiceM8 shows its Check In button beside On site, and Nudge me and the
attendance record are drawn in `src/app/dashboard/Pictures.jsx`. The banner words there
are the ones `src/lib/nudge.js` sends; change them there and the drawing follows by
hand. A panel that needs a paragraph to explain itself wants a picture instead.

The `/j/<job number>` claim page follows it too (v1.47.0): drawn as the customer's
page is (glass, wash, `tone-booked`), one line, the box, and under it `Shot`'s
`stage-booked` card so the digits have a visible reason. Its capture on
`/with-servicem8` is `public/with-servicem8/claim.webp` from
`scripts/capture-with-servicem8.mjs`, which needs a stand-in ServiceM8 on
`SM8_API_BASE`; re-shoot it when that page changes.

The household card (v1.58.0): no sentence under the heading, the rows say what they
are; an empty card shows one example row drawn with the real `Row`. The dashboard's
Household cards panel shows `house-card`, cut from `public/home/household.webp`, a 2x
phone shot of `/h/HOME24XK` on the seeded database that every full pass re-takes
(`ONLY=house` re-cuts the existing shot without a browser).
**If that shot says "That card has expired", the seed skipped the Place table**: run
`npx prisma generate` and the seed again. Three diaries photographed that dead end.

The review link (v1.58.0): the Google review field under Who to expect sits beneath
`row-after`, the How-did-it-go row photographed from `/preview?stage=DONE` (the fixture
carries an invented Google link at DONE so both doors show) with `ONLY=after`. The row
itself says one line. The two doors stay open to everyone; see *How did it go?* above.

What this could become (v1.58.0, `src/app/dashboard/Roadmap.jsx`): each roadmap item
shows its screen, from `PICTURE` there: a homepage frame (`public/home/frame-*.webp`,
the files `src/lib/posters.js` lists) or a crop. A frame for an idea is a drawing, and
the chip beside it says Not built; never put a real capture beside an idea. The
sentence and the Needs line open on tap; the live phase is folded behind its count.
A new roadmap item wants a line in `PICTURE` when a screen for it exists.

The wallet section (`src/components/WalletStory.jsx`) is drawn from
`PassCard`, the same component the real pass is built from, so it cannot
drift. It carries the same badges the posters do, and the lock screen shows
the push notification (live) and not the Wallet card (not yet): see *Not built
yet* below, and do not let that section say the card updates itself in Wallet
until the pass web service exists.

## Getting on the list (`/join`, v1.62.0)

The homepage's three-field form became a sign-up whose **card builds as it is
filled in**: trade or home first, then one step at a time, each answer filed
onto a card above (the customer's PassCard for a trade, a household card for a
home) and folded into a row with a tick and an Edit. It is the product
explaining itself with the visitor's own details. Rules that must not drift:

- **Step one is the sign-up.** Email and name go to `/api/waitlist` at step
  one; every later step has a Skip. A form that saves only at the end saves
  nothing for everyone who stops at step four.
- **Only the list's own fields leave the phone**: name (stored in `note`, no
  new column, see v1.9.0), email, trade or `Household`, and the outward
  postcode. The pin, both photos, who else is home and the work address live in
  `localStorage` (`turnup-join-v1`) and nowhere else. A waiting list is not a
  reason to hold a photo of a front door beside an address, and the household's
  names belong to people who have not agreed to anything. `/privacy` says so.
- **Nothing offered that does not exist.** Reading Gmail is shown as *not yet*
  with the reason (Google's restricted-scope audit). The calendar is a feed
  they would subscribe to. Forwarding says it switches on when their place
  opens.
- **The map is OpenStreetMap's tiles in a hand-rolled `TileMap`** (move the
  map, not the pin) over **postcodes.io** for the postcode centre. Both are
  free, keyless and asked by the browser directly. OSM's policy allows light
  use with attribution and can be withdrawn: if `/join` gets real traffic,
  swap the tile URL in `TileMap.jsx` for a paid provider. **Never put Google
  Street View imagery on that page**: Google's terms forbid it beside a
  non-Google map and forbid storing it. "Check the pin on Street View" opens
  Google's own tab, which is allowed.
- The throttle on `/api/waitlist` is five posts an hour per IP, and a trade
  sign-up uses up to three (step one, business, base). Do not add a fourth.

`/for-trades` (one job start to finish, as crops) and `/for-homes` (the
household card) are the audience pages, both in `SiteShell` with the
Trades/Homes nav. **Every grid item may shrink** (`.grid > * { min-width: 0 }`
in `globals.css`): before it, one sideways strip inside a grid made the whole
homepage 917px wide on a 375px phone. Check a page at 320, 375 and 414 before
calling it done; nothing scrolls sideways but a strip that means to.

## Not built yet

**The wallet pass.** This is the premise of the product and it does not exist.
Today the customer gets a web page; the idea is a card that sits in Apple
Wallet and Google Wallet and updates itself. Both need credentials the
repository does not have:

- **Apple Wallet (PassKit)** — an Apple Developer Program membership and a Pass
  Type ID certificate. Everything else is built and tested with a stand-in
  chain (v1.15.4): `bash scripts/apple-wallet.sh csr` makes the key and the
  request, `finish pass.cer` turns Apple's certificate into the six `PASSKIT_*`
  settings (`docs/apple-wallet.md`). The library wants **PEM, never a .p12**.
  Still to build once a real pass is in a wallet: the `/api/passes/v1` web
  service (device registration, "what changed" and APNs pushes) so the card
  updates itself; today a pass shows the stage at the moment it was added.
- **Google Wallet** — a Google Cloud project, a Wallet API issuer account, and
  a service account key.

Until those exist, the honest position is that this is a link, not a card. Do
not describe it as a wallet pass anywhere customer-facing.

## Every build updates the words (Standing Rule 24, Will, 12 Oct 2026)

Several sessions build this app in a day, and the words that describe it fall
behind within a night. Will: "all plans, homepages, guides and instructions
need to be part of the routine updates done every night to make sure
everything is up to date by morning." So **a build is not done until the words
are**, and a push that leaves them stale is a defect:

| What | Where | Must say |
|---|---|---|
| The business plan | `src/lib/plan.js` (STATUS, GTM_PHASES, PRODUCT, MOATS, WALLET, DECISIONS, FACTS_TABLE, `PLAN_META.updated`) | what the app is tonight. `/plan/<code>` is what gets sent to people |
| The homepage and the guide | `src/app/page.js`, `src/app/with-servicem8/page.js`, `public/home/crops/` | every claim true, every picture of the current screen |
| The roadmap | `src/lib/roadmap.js` | shipped is `live`, unshipped is not |
| The instructions | this file, `docs/*.md`, the Claude project description | the section for what changed |
| The record | `src/lib/version.js`, `docs/diary/` | the entry, the folder, the table row |

`node scripts/check-current.mjs` (also `npm run check:current`) checks what a
script can: the changelog's top entry is this version and date, the diary has
its folder and row, the plan's date is within three days of the build, the
roadmap and changelog agree on what is live, and every file the guides name
exists. **It must pass before every push**, nightly or daytime. What it cannot
check, a person reads: the nightly build's step 4 is that reading, against
everything that landed on main since the last night, not only its own change.

## The nightly build

A Routine fires overnight and builds the next version. The rules it works to —
break these and the app gets worse every night, slowly, in ways nobody notices
until it is bad.

**Bump the version and advance the theme.** `src/lib/version.js` holds
`VERSION`, `BUILD_DATE`, `THEME_INDEX` and `CHANGELOG`. Move the index on by
one so the app visibly changes colour, add a changelog entry naming what
actually changed, and set the build date.

**Never invent a colour.** `THEMES` is a curated list of background/accent
pairs. Add one if the list is running short, checking white text on the accent
and dark text on the background for contrast. Generating one at runtime to be
"a colour not used before" produces mud and unreadable text within a week.

**Capture the diary before finishing — against `next start`, never `next dev`.** The dev server paints its own badge over the page and v1.4.0's diary has it in every shot. The script now refuses a dev server; build, then start, then capture.

**Capture the diary before finishing.** `scripts/capture-diary.mjs` writes
`docs/diary/v<version>/`. Nothing in there is ever overwritten, tidied or
deleted: it is the record of what the app looked like on a given day, and it is
wanted for marketing.

**One shot that will not photograph must never cost the rest.** WebP cannot
hold an image taller than 16,383px, which at `deviceScaleFactor: 2` is any page
over about 8,190 CSS pixels. The homepage grew past it, sharp threw, the throw
killed the whole run, and v1.18 to v1.20 recorded almost nothing of the product
— only the plan pages, because those happened to be captured first. Nobody
noticed, because a diary folder with files in it looks finished. A giant page
is now scaled down to fit, every shot is wrapped, and anything missing is named
in the folder's README. **Check the README's "Not captured" line before calling
a build done.**

**The three gaps were filled in on 10 Oct, from the code, not from a later
build.** `v1.18.0`, `v1.19.0` and `v1.20.0` were re-shot by checking out their
own commits (`6a51aab`, `d8d9105`, `698bc93`), building and running each, and
copying only the files that were missing — nothing in those folders was
overwritten. Each README says so. **That is the only acceptable way to backfill
a diary**: photographing today's app into a folder dated last week is not a
record, it is a forgery, and the whole folder exists to be trusted later.
`scripts/` has no tool for this on purpose — it should not be a routine thing
to do.

**It no longer needs a database.** With no `DEMO_CODE` the customer shots come
from `/preview`, which renders the real component from a fixture in
`src/app/preview/Preview.jsx` — invented name, invented address, one job
mid-flight with every row populated, which is the busiest the page ever gets
and so the state worth measuring. That route is a 404 wherever
`VERCEL_ENV === 'production'`, and the gate is on `VERCEL_ENV` rather than
`NODE_ENV` on purpose: `next start` is `NODE_ENV=production` too, and it is the
server the diary is captured against. The dashboard and wallet shots still need
an operator session, and the README says so when they are missing rather than
leaving a silent gap. `playwright` is not a dependency — `npm install --no-save
playwright`, and pass `CHROME_PATH` if the pre-installed browser is a different
build.

`/preview?stage=BOOKED` draws a job nothing has happened to yet. **Look at that
one before changing the card**: it is the state the page spends most of its
life in, it is already short because the note, the set-off time and the hours
are all absent, and a change that reads well on a busy page can leave it
saying nothing at all.

**For the dashboard, run a database.** The fixture only covers the customer's
page, and for several versions that meant the dashboard — the screen the trade
actually uses, every day, on a driveway — simply went unexamined, while the
customer's page got four passes. It had grown to 7,826px.

```bash
bash scripts/local-db.sh        # Postgres, the schema, a day's work, .env.local
npm run build && npx next start
```

A day's work, not five tidy rows: one job finished, one running, one paused on
a part that has not turned up, one where the customer has countered the hours
and had no answer, one booked for next week. **A dashboard only ever seen with
neat data is a dashboard whose awkward states nobody has looked at.** Every
name and address in `scripts/seed-local.mjs` is invented, and the seed refuses
to run unless `DATABASE_URL` points at localhost.

It also makes the privacy boundary checkable for real rather than in the
abstract — fetch `/api/status/<code>` on a seeded job that has a door, a dog,
access notes and a presence answer, and confirm none of it comes back:

```bash
curl -s localhost:3000/api/status/K7M4PQRT | grep -c accessNotes   # 0
```

**Improve one real thing, not five speculative ones.** A nightly build that
churns the interface is worse than one that fixes a defect. Look at what is
actually wrong — read `docs/diary/` against the current build, run the app,
check the roadmap votes in `FeatureInterest` — then do one thing properly and
say what it was.

**Never claim something works when it does not.** The roadmap in
`src/lib/roadmap.js` marks each item `live`, `ready` or `idea`. Moving an item
to `live` means it is live.

**The rules in the rest of this file still apply at 3am.** No promised arrival
times. Nothing hard-coded that belongs in an env var. Every operator route
guards itself. Build and verify before pushing; `main` deploys on push, so a
broken push is a broken product until someone notices.

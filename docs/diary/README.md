# Version diary

One folder per build. Nothing here is ever overwritten or tidied away: it is
the record of what the app looked like on a given day, for checking a change
landed and for marketing later.

Each folder holds the wallet card in its three views, the customer page in
light and dark, the dashboard, the login and the landing page — plus the notes
for that version and the exact colours it wore.

Captured by `scripts/capture-diary.mjs`, which runs against a live server:

```bash
DEMO_CODE=<a tracking code that exists> node scripts/capture-diary.mjs
```

Roughly 700 KB a build, so about 200 MB a year. If it ever gets heavy the
answer is object storage with links from here — not deleting history, which is
the one thing this exists for.

| Version | Date | Theme |
|---|---|---|
| [v1.74.0](./v1.74.0/) | 2026-10-24 | Slate — the wallet card can update itself: the service Wallet calls, built and tested end to end (v1.74.5, 25 Oct: the words say the card is in Apple Wallet; no screen changed but a badge) |
| [v1.73.0](./v1.73.0/) | 2026-10-23 | Moss — every customer event has an email fallback; Connect Gmail parked on Will's rule |
| [v1.72.0](./v1.72.0/) | 2026-10-23 | Plum — Connect Gmail is two boxes on the phone, not Vercel |
| [v1.71.0](./v1.71.0/) | 2026-10-22 | Teal — the ServiceM8 add-on is two boxes on the phone, not two Vercel settings and a redeploy |
| [v1.70.0](./v1.70.0/) | 2026-10-20 | Indigo — Job done? On my way to the next one, offered |
| [v1.69.0](./v1.69.0/) | 2026-10-19 | Clay — the trade's lock screen stops naming customers; one vocabulary, one check |
| [v1.68.0](./v1.68.0/) | 2026-10-19 | Slate — a reminder that stops: three buzzes, nothing overnight, and Stop reminders on the card |
| [v1.67.0](./v1.67.0/) | 2026-10-19 | Moss — the pilot numbers count what they say; Gmail and tracking-by-number sources built, dark until their keys |
| [v1.66.0](./v1.66.0/) | 2026-10-19 | Harbour — Are you still coming? no longer crashes the page at the window; the email reader proven in every client; audit and the inbox-connect plan |
| [v1.65.3](./v1.65.3/) | 2026-10-18 | Ochre — card titles say the thing ("Screwfix order"); Fwd: leftovers hidden |
| [v1.65.2](./v1.65.2/) | 2026-10-18 | Ochre — a link opens the dashboard at the right panel (?open=doors) |
| [v1.65.1](./v1.65.1/) | 2026-10-18 | Ochre — an iPhone forward lands right: the shop, On the way, its date, the Royal Mail number |
| [v1.65.0](./v1.65.0/) | 2026-10-18 | Ochre — no notifications, an email instead: set off, window missed and the day-before ask through ServiceM8; the missed notice no longer waits on a trade phone |
| [v1.64.1](./v1.64.1/) | 2026-10-18 | Plum — Gmail's confirm-forwarding code shows on the card instead of being dropped |
| [v1.64.0](./v1.64.0/) | 2026-10-18 | Plum — the household card reads the email inside the forward; dispatched is on its way; an order goes on as Ordered |
| [v1.63.0](./v1.63.0/) | 2026-10-18 | Teal — a home makes its own card; the letterbox steps fixed (one rule, not a catch-all); posters re-shot |
| [v1.62.0](./v1.62.0/) | 2026-10-17 | Indigo — the homepage fits a phone; /join builds your card as you sign up; /for-trades and /for-homes |
| [v1.61.0](./v1.61.0/) | 2026-10-17 | Clay — the privacy policy is a page, not a draft |
| [v1.60.1](./v1.60.1/) | 2026-10-17 | Slate — the sweep logs a line each run, so the schedule can be seen |
| [v1.60.0](./v1.60.0/) | 2026-10-17 | Slate — a day is not a time: no midnight nudges; the ServiceM8 add-on listing, ready to paste |
| [v1.59.0](./v1.59.0/) | 2026-10-17 | Moss — your job on your lock screen: the iOS app merged, waiting on Apple |
| [v1.58.0](./v1.58.0/) | 2026-10-17 | Harbour — every picture re-shot from the current build, the trade's live; the household card, the review link and the roadmap in pictures |
| [v1.57.0](./v1.57.0/) | 2026-10-17 | Ochre — the words catch up: five live features filed live, the plan read against the live site |
| [v1.56.0](./v1.56.0/) | 2026-10-17 | Plum — nudges on time: the sweep on Vercel Cron every five minutes, GitHub as the backup |
| [v1.55.0](./v1.55.0/) | 2026-10-14 | Turn on forwarding says where it has got to, and checks itself |
| [v1.54.0](./v1.54.0/) | 2026-10-13 | Indigo — Paused says when you expect to be back, in your words with the time you said them |
| [v1.53.0](./v1.53.0/) | 2026-10-13 | Plum — turning forwarding on is one button and two Cloudflare steps, not four with a laptop |
| [v1.52.0](./v1.52.0/) | 2026-10-13 | Slate — a revised promise is shown as revised, with the original kept; every change a line in the record |
| [v1.51.0](./v1.51.0/) | 2026-10-12 | Moss — the flat look: Geist, hairline cards, one corner radius |
| [v1.50.0](./v1.50.0/) | 2026-10-12 | Harbour — who is coming, with a face: a photo taken on the phone, on the card from On my way and in the notification |
| [v1.49.0](./v1.49.0/) | 2026-10-12 | Ochre — the letterbox: the four steps to turn forwarding on, the Cloudflare Worker, and a raw email read into four facts |
| [v1.48.0](./v1.48.0/) | 2026-10-12 | Plum — a parcel lands, a person knocks; your own jobs on a household card, in step with every stage tap |
| [v1.47.0](./v1.47.0/) | 2026-10-12 | Teal — the /j/ claim page in the app's look, with the card it unlocks |
| [v1.46.0](./v1.46.0/) | 2026-10-12 | Indigo — switch a job's link back on; a switched-off card says so in words |
| [v1.45.0](./v1.45.0/) | 2026-10-12 | Indigo — the pilot in four numbers; the six moves reordered; the ask has a reader; every build updates the words |
| [v1.44.0](./v1.44.0/) | 2026-10-12 | Indigo — the dashboard's setup panels in pictures |
| [v1.41.0](./v1.41.0/) | 2026-10-12 | the household card: one door, everything coming to it |
| [v1.31.0](./v1.31.0/) | 2026-10-11 | Plum — asked the day before: will someone be in? |
| [v1.30.0](./v1.30.0/) | 2026-10-11 | Teal — the attendance record: one row per visit, from the taps |
| [v1.26.0](./v1.26.0/) | 2026-10-10 | Clay — A window passing is noticed even when nobody has the page open — a scheduled check every five minutes |
| [v1.24.0](./v1.24.0/) | 2026-10-10 | Slate — Nudge me has a Send a test to this phone button — tap it, your phone buzzes, no job to move |
| [v1.23.0](./v1.23.0/) | 2026-10-10 | Moss — Turn on notifications from the dashboard — no terminal, no laptop, all on your phone |
| [v1.22.0](./v1.22.0/) | 2026-10-10 | Harbour — Are you still coming? One button for the customer once the window has started and the card has not moved |
| [v1.21.0](./v1.21.0/) | 2026-10-10 | Ochre — The what3words box no longer assumes you already know your three words |
| [v1.20.0](./v1.20.0/) | 2026-10-09 | Plum — three moats, six moves, five rivals, seven wedges; free for every sender, enterprise per card |
| [v1.19.0](./v1.19.0/) | 2026-10-09 | Indigo — the card is free; activation, bundles and a payments margin are the business |
| [v1.18.0](./v1.18.0/) | 2026-10-09 | Clay — the plan grew up: pricing, the wallet card, a share link |
| [v1.16.0](./v1.16.0/) | 2026-10-09 | Slate — the business plan lives at /plan |
| [v1.9.0](./v1.9.0/) | 2026-09-30 | Teal — a window is something you agree, not announce |
| [v1.8.0](./v1.8.0/) | 2026-09-30 | Indigo — drop a pin with one tap, from either end |
| [v1.7.0](./v1.7.0/) | 2026-09-30 | Clay — the customer's own answers came off the public page |
| [v1.6.0](./v1.6.0/) | 2026-09-30 | Slate — your phone buzzes when they set off |
| [v1.5.0](./v1.5.0/) | 2026-09-29 | Moss — find the door: Maps, ///what3words and pin links, house and door photos, logo on the pass, dashboard onto the glass |
| [v1.4.0](./v1.4.0/) | 2026-09-29 | Moss — redrawn to the iOS look, every emoji replaced with a drawn icon |
| [v1.3.3](./v1.3.3/) | 2026-09-29 | Harbour — customer page pruned to a glance and rows |
| [v1.3.1](./v1.3.1/) | 2026-09-29 | Harbour — dark-mode background fixed |
| [v1.3.0](./v1.3.0/) | 2026-09-29 | Harbour |

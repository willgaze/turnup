# Listing TurnUp in the ServiceM8 add-on store

*Move 3, step two. The private add-on (`docs/servicem8-add-on.md`) is TurnUp
working on your own account. This is TurnUp in the store, where other
ServiceM8 trades can find it.*

**Do the private add-on first.** You cannot submit a listing for something you
have not run. The store's own checklist opens with "feature complete and tested
in a live environment", and the pre-approval step hands reviewers a *Private
Add-on Install URL* — which only exists once the app exists.

---

## Where the words below came from

Every requirement here was read off ServiceM8's own pages on 17 Oct 2026, not
remembered:

- [Add-on Store](https://developer.servicem8.com/docs/servicem8-add-on-store) — eligibility, revenue share, the seven-step review
- [Add-on Store Requirements](https://developer.servicem8.com/docs/addon-store-requirements) — the listing fields, the image rules, the naming rules

Two things they do **not** publish and you will have to read off the form
itself: the exact pixel sizes for the icon and the screenshots, and the
character limits on the two descriptions. The 30-character name limit is the
only number they state. So: fill the name, the short description and the
privacy link first, see what the form says, and come back here for the long
description.

---

## Three things to fix before you can submit

| | Where it stands |
|---|---|
| **A privacy policy at a public URL** | **Done tonight** — [getturnup.com/privacy](https://www.getturnup.com/privacy), linked from the homepage footer. Read it once; it describes what the app actually does, and if a line is wrong, the line is the bug. |
| **An actively monitored support email** | **Yours to do.** The page says `privacy@getturnup.com` and the listing wants a support address. Neither receives mail yet — `in.getturnup.com` is routed at Cloudflare, the apex is not. One Cloudflare step, below. |
| **Help documentation** | **Mostly done.** [getturnup.com/with-servicem8](https://www.getturnup.com/with-servicem8) is the public how-to and `docs/servicem8-add-on.md` is the connect guide. They cover onboarding and the workflow; neither is written for a trade who is not you. Worth one pass before submitting. |

### The Cloudflare step for the mailbox

Same place you turned on forwarding, one level up — the apex instead of the
subdomain.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **getturnup.com** → **Email** → **Email Routing**.
2. **Routing rules** → **Create address**.
3. Custom address: `privacy` · Action: **Send to an email** · Destination: your own inbox.
4. Do it again for `support`.
5. Cloudflare emails that inbox to verify it. Click the link in that email or nothing arrives.

You will then want `support@getturnup.com` in the listing's support field and
on the privacy page. Say the word and I will change the page.

---

## A conflict worth knowing before you build move 3 any further

ServiceM8's requirements say, flatly:

> Add-ons can't accept, request, manage, or process payments between ServiceM8
> users and their clients. Don't collect credit card or payment details inside
> any ServiceM8 interface.

Two things on the TurnUp roadmap are exactly that: **pay to book** (a call-out
charge or deposit from the card) and **paid on the same page**. Both were
already parked behind the pilot, so nothing changes today — but if TurnUp is
ever listed in the ServiceM8 store, those two cannot live inside a ServiceM8
interface. External payment links are allowed, which is probably the shape they
take anyway. It does not block the listing. It does mean move 3 and the payments
idea pull in different directions, and that is better known now than after the
build.

---

## What the listing has to say about itself

Their naming rules, and how TurnUp sits against each:

| Rule | TurnUp |
|---|---|
| Name ≤ 30 characters, unique | **TurnUp** — 6 |
| No "ServiceM8", "M8", "Mate" or "SM8" in the name | clear |
| No implying you fix a gap in a core feature | **Careful here.** ServiceM8 already ships *Track My Arrival*. The listing must never say TurnUp is better than it, or that it fixes it. The copy below describes what TurnUp does and lets the reader compare. |
| Don't portray it as built or supported by ServiceM8 | the copy says "built by an independent developer" |
| Spell ServiceM8 correctly, no "Service M8" | checked throughout |
| Say which platforms it supports | Online Dashboard **and** App — TurnUp reacts to a check-in made in either |

---

## The copy, ready to paste

### Name

```
TurnUp
```

### Description (short — the line under the name in the store)

```
Your customer gets one link that shows where their job has got to, and every TurnUp event is written into the ServiceM8 job diary.
```

### Long Description

```
TurnUp gives the customer one link, with no account and no app to install, that shows where their job actually is: Booked in, On my way, On site, Job done — and Paused, with the reason, because "waiting on the cylinder" is the thing a customer most wants said out loud.

Connected to ServiceM8, the card follows the job on its own. Check in and the customer sees On site. Complete the job and they see Job done. Nothing is retyped, and nothing needs a second app open on the van's phone.

Every TurnUp event is written back into the ServiceM8 job diary as a line from TurnUp: set off, on site, paused with the note, done, booking terms agreed, nobody home with what was tried, running late, and each reply the customer gave. The job diary stays the one record.

What the customer can do from the link:
- Agree or counter the arrival window, so hours are arranged rather than announced
- Answer "will someone be in?" the afternoon before
- Say they are running late themselves
- Add the visit to their calendar, or navigate to the pin
- Agree your booking terms before the day, with a time on it
- Leave a review or a private note after the job

What TurnUp will not do: it never invents an arrival time. No countdown, no ETA, no "with you in 20 minutes". One van cannot promise traffic, so the product does not promise it on your behalf. "On my way" is a fact; "set off at 07:42" is a record. An arrival window is only ever stated once both ends have agreed it.

TurnUp is built by an independent developer and is not affiliated with or supported by ServiceM8.

Works with the ServiceM8 Online Dashboard and the ServiceM8 app. Built in the UK.
```

### Privacy Policy

```
https://www.getturnup.com/privacy
```

### Support email

```
support@getturnup.com
```

*(once the Cloudflare step above is done — do not paste an address that bounces)*

### Landing page / help documentation

```
https://www.getturnup.com/with-servicem8
```

---

## The screenshots

They want **at least three**, showing real operation. Two rules bite:

- **"Annotations and highlights are allowed; alterations are not."** So these
  are the diary captures, untouched. Do not retouch one to look tidier.
- **"No real business or personal information may appear."** The diary is
  captured against `scripts/seed-local.mjs`, where every name and address is
  invented, so this is already satisfied. One thing to know: the seeded
  addresses use real town names near you (Marlborough, Hungerford, Pewsey).
  They are not anybody's address, but if you would rather the store did not
  show your patch, change the towns in the seed and re-capture. It is a
  one-line change and your call.

Use these three, from `docs/diary/v1.59.0/` (or whatever tonight's build is —
**always the current build**, never an older folder):

| File | Shows | Caption to use |
|---|---|---|
| `customer-light.webp` | The customer's page mid-job | "What your customer sees. One link, no app, no account." |
| `dashboard.webp` | A day's work, stages on every card | "Your day. Tap the stage as it happens, from the driveway." |
| `household.webp` | The household card | "Every visit to one address, on one card." |

A fourth worth adding if the form takes it: `dashboard-setup.webp`, showing
the ServiceM8 panel, captioned "Connect ServiceM8 once. The card follows the
job from then on."

**App screenshots must sit inside an iOS device frame.** All four above are
web captures of the Online Dashboard and the customer's page, so no frame is
needed — but if you add a shot taken on the iPhone, frame it.

---

## The permissions it asks for

Changed tonight, and worth knowing why. TurnUp now asks for two:

| Scope | What for |
|---|---|
| `publish_diary_items` | writing the TurnUp lines into the job diary — the whole point of the add-on |
| `vendor` | the account name, so your dashboard can show *which* ServiceM8 account is connected |

It used to ask for `create_notifications` as well, and never called it once —
TurnUp notifies you through its own push, not ServiceM8's. Their checklist says
an add-on must request "only the data and permissions it needs", and asking a
trade to grant a permission nothing reads is the kind of thing a reviewer
notices. It is gone.

Nothing else is requested. TurnUp does not read the diary (ServiceM8 does not
let add-ons read it), and the texts it sends go through the API key on your own
account, charged to your normal SMS allowance, not through the add-on.

---

## Money

Two options, and the answer is the second one for now:

1. **Charge through ServiceM8.** They bill it with the customer's ServiceM8
   bill and pay you monthly through Stripe. **90% to you, 10% to them.** They
   handle refunds, and may refund up to 90 days, deducted from your payout. It
   suits small recurring fees, which is exactly TurnUp's shape. It needs your
   billing to be in place *before* you submit.
2. **List it free and charge outside, or not at all.**

**List it free.** The thirty-day pilot has not started and TurnUp has no price
yet; deciding one to fill in a form is the tail wagging the dog. Free is also
the fastest listing to get approved, and the 90/10 split will still be there
when there is a number to put in it. If the listing says Free but you later
charge externally, their rules make you say so in the description.

---

## The order it goes in

1. Sign up: [servicem8.com/developer-registration](https://www.servicem8.com/developer-registration) — the `sm8dev` task on the board
2. Create the app and get the App ID and Secret — `docs/servicem8-add-on.md` steps 2–4
3. Put `SM8_APP_ID` and `SM8_APP_SECRET` in Vercel, redeploy, connect — steps 5–6
4. **Use it on your own jobs for a few weeks.** This is the pilot anyway
5. Set up the two mailboxes (above)
6. Fill the listing from this file
7. Share the Private Add-on Install URL for pre-approval
8. Submit through the developer account
9. **Partner Preview** — ServiceM8 releases it to partners and their helpdesk
10. **Public release**, if nothing comes up in preview

Steps 9 and 10 are theirs, not yours, and have no published timetable. Ongoing
after that: they watch the feedback and expect problems fixed quickly.

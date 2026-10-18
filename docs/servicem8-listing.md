# TurnUp in the ServiceM8 Add-on Store — the listing, ready to paste

*Prepared 17 Oct 2026 (v1.60.0) against ServiceM8's own pages: [Add-on Store
Requirements](https://developer.servicem8.com/docs/addon-store-requirements),
[the Add-on Store](https://developer.servicem8.com/docs/servicem8-add-on-store),
[Manifest Reference](https://developer.servicem8.com/docs/manifest-reference) and
[Web Service Hosted Add-ons](https://developer.servicem8.com/docs/web-service-hosted-add-ons).*

## Where it stands

| | State |
|---|---|
| Install on **your own** account (private) | Ready the day the developer account exists: `docs/servicem8-add-on.md` |
| Listing copy, manifest, screenshots | **Done, below** |
| Submit for **public** release | **Blocked**, by three things in the last section |

The private install needs nothing from this file. The public listing does, and
cannot be submitted until the blockers are cleared, because ServiceM8 reviews an
add-on as "feature complete, tested in a live environment".

## What to paste where

In [go.servicem8.com](https://go.servicem8.com) → main menu → **Developer** →
the **TurnUp** item made in `docs/servicem8-add-on.md` step 2.

| Field | Paste |
|---|---|
| Add-on Type | Web Service Hosted (the kind with an App ID and App Secret) |
| Manifest | Upload `public/servicem8/manifest.json`, also served at https://www.getturnup.com/servicem8/manifest.json. Validated against ServiceM8's v1 schema on 17 Oct |
| Return URL | `https://www.getturnup.com/api/servicem8/oauth/callback` |
| Activation URL | `https://www.getturnup.com/api/servicem8/oauth/start` |
| Callback URL | Leave empty. TurnUp adds no button or menu inside ServiceM8, so nothing calls it |
| Name | `TurnUp` (6 of 30 characters; no "ServiceM8", "M8" or "Mate" in it, as the rules require) |
| Description (short) | the line below |
| Long description | the block below |
| Price | Free |
| Privacy Policy | `https://www.getturnup.com/privacy` — live since v1.61.0 |
| Support email | **Blocked**: see the last section |
| Images | the four files in `docs/servicem8-listing/`, plus one more (below) |

### Short description

> A live link for each job, so your customer can see where you are without ringing.

### Long description

> TurnUp gives each job one link your customer opens from a text. No app, no
> account. It says Booked in, On my way, On site, Paused (with your reason) or
> Job done, with the time each happened, your name, your van and your plate.
>
> The day before, it asks once whether someone will be in, and tells you the
> answer. The customer can say which door, whether there is a dog, and agree
> the hours with you. Two hours after Job done it asks how it went: a Google
> review or a private note to you, both open to every customer.
>
> With this add-on connected, each of those moments is written into the job's
> diary in ServiceM8 as a line from TurnUp: set off, on site, paused, done,
> booking terms agreed, no one home, running late, and every reply your
> customer gave. Your job record stays in one place.
>
> TurnUp never tells your customer an arrival time it worked out itself. It
> shows the stage, when you set off, and hours only when you and your customer
> have both agreed them.
>
> Supported: Online Dashboard. TurnUp adds no screen inside the ServiceM8 app;
> you tap stages on TurnUp's own page, on your phone. It asks ServiceM8 for two
> permissions only: to write diary lines, and to read your account name.

Written to the store's rules: it states the platform, names no other add-on,
and does not compare itself with ServiceM8's own features.

### Images

The rules ask for at least three real, unaltered screenshots, showing no real
business or personal information. These four are from the live build, with the
invented trade and customer the diary uses:

| File | Shows |
|---|---|
| `1-customer-on-my-way.png` | The customer's link at On my way: who, the van, set off at 08:00, the agreed hours |
| `2-your-day-one-tap-stages.png` | The trade's day: one tap per stage, the door note, the agreed hours |
| `3-job-done-how-did-it-go.png` | After Job done: a review or a private note |
| `4-booked-will-someone-be-in.png` | Booked in, with Will someone be in? |

**The one still to take: a ServiceM8 job diary with TurnUp's lines in it.** It
can only be photographed on a connected account, and it must be a test job with
an invented customer, never a real one.

### Icon

`https://www.getturnup.com/icon-512.png`: 512 × 512, the size ServiceM8
recommends.

## What blocks the public listing

1. **One business only.** TurnUp today serves one trade, set by Vercel
   settings. A second ServiceM8 business pressing Activate would land on a
   sign-in page for your dashboard. ServiceM8 says the activation link must
   either sign the user in or let them sign up. This is **move 3's real build**:
   an account per trade. It is not small, and it is the thing to decide next.
2. ~~**A privacy policy page.**~~ **Done, v1.61.0**: it is live at
   [getturnup.com/privacy](https://www.getturnup.com/privacy) and linked from
   the homepage footer, which is what the listing field takes — a public URL,
   not a document. Read it once; it is written from what the code does, so a
   line that is wrong is a bug rather than a wording preference. Two things in
   it are still yours to confirm: the contact address below, and that records
   are kept until a job or an account is deleted, with nothing on a timetable.
3. **A monitored support email.** getturnup.com has no mailbox (no MX record,
   checked 17 Oct). The store will delist an add-on whose support address goes
   unanswered.

   It is the same place you turned on forwarding, one level up — the apex
   instead of `in.getturnup.com` — and it is **written out as a Cowork paste
   in `docs/cowork-mailboxes.md`**, not as a step list here. Standing rule 3:
   a console is a Cowork job, because the step list is the form that does not
   get done.

   Two things that paste covers and a step list would not: a destination
   address has to be verified from the inbox or nothing is ever delivered,
   and enabling Email Routing on the apex writes MX records onto
   `getturnup.com` itself. That is what makes an apex address work, and it is
   also what a hosted mailbox provider would later have to replace —
   forwarding and a real mailbox cannot both own the apex.

**A rule that pulls against the roadmap.** ServiceM8's requirements say an
add-on may not "accept, request, manage, or process payments between ServiceM8
users and their clients", and may not collect card details inside any ServiceM8
interface. Two roadmap items are exactly that: pay-to-book (a call-out charge
or deposit from the card) and paid-on-the-same-page. Both are parked behind the
pilot already, so nothing changes today. But if TurnUp is ever in this store,
neither can live inside a ServiceM8 screen. External payment links are allowed,
which is likely the shape they take anyway — worth knowing before they are
built, not after.

Also worth knowing before submitting: ServiceM8 declines add-ons that duplicate
its own features, and it has its own Track My Arrival. TurnUp's case is that it
covers the whole job, the day before to the review, where that covers the drive.
The listing says what TurnUp does and leaves the comparison out, as the rules
require.

## What changed in the app for this

- The add-on asked ServiceM8 for a third permission, staff notifications, and
  never used it. The store asks for the minimum, so it now asks for two
  (`SCOPES` in `src/lib/sm8-oauth.js`).

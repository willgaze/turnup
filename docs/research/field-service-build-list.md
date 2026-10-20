# Field-service build list

What TurnUp copies, improves, prepares for, or refuses, drawn from the
10 October 2026 research report (`reports/Field service apps for one van
trades.md`, 117 sources) and kept current by the weekly landscape routine.
Short enough to read on a phone. One line per item; the report has the why.

**Status key:** Done (version) · Building · Next · Later · Prepare (needs a
capability we do not have) · No.

## What changed this week

- **10 Oct 2026, later still** — customer not home in one tap shipped (1.26.0).
- **10 Oct 2026, later** — window-missed message to the customer shipped (1.24.0).
- **10 Oct 2026** — list created from the first full deep dive. Already live
  before the list existed: arrival window from ServiceM8 (1.17.1), Paused
  visible to the customer, "Are you still coming?" with one-tap late reply
  and trade nudges (1.22.0), the /j/ link in the booking text (1.16.1).

## Tier 1 — what the link needs to survive its first bad day (web, now)

| Feature | Verdict | Status |
|---|---|---|
| Arrival window on every booking, headline above the start time | Copy | Done 1.17.1 (from ServiceM8); manual windows done earlier |
| Booking confirmation carrying cancellation info, express-start request, no-access terms (CCR 2013 regs 28/36) | Improve | Done 1.29.0 — Before the visit on the customer page (notice, charge if any, 14-day right), one-tap Got it, go ahead recorded with the words; Booking terms panel on the dashboard; confirmation line points at it |
| Day-before reminder with reply: confirm / reschedule / someone else will be in | Copy | Done 1.31.0 + 1.32.0 — asked at 16:00 the day before (push + page); replies still fine / someone else / move it reach the trade; SMS via ServiceM8's Booking Reminder automation |
| Household card fed without forwarding: own Gmail inbox (stage 1) | Build | Built 1.67.0, dark until the Google project exists (docs/connect-gmail.md); other households wait on Google review (docs/research/inbox-connect.md) |
| Parcel tracked by its number after one email (Ship24 webhooks) | Build | Built 1.67.0, dark until SHIP24_API_KEY (docs/tracking-by-number.md) |
| Non-push fallback for every customer-critical event | Copy | Partly done 1.65.0 (email) — three of the events, not every one: no one home, running late and paused have no fallback yet (audit 19 Oct). Covered: set off, window missed and the day-before ask go by email through ServiceM8 when no push landed; once each per job, to the email on the ServiceM8 job, switch on the ServiceM8 panel (off by default). SMS for the same three is still the capability to buy |
| Offline tap queue: device time + fix time + server time, "location not validated" flag, never dropped | Improve | Done 1.39.0 — IndexedDB queue in the dashboard page (no background sync on iOS); event keeps deviceAt, server time, fix and fixValidated; customer sees both times |
| Customer page shows "last updated hh:mm" and the last honest stage | Improve | Done 1.40.0 — footer says Updated / Last checked; mid-visit the card says when the trade's phone last reached the server after 15 quiet minutes (dashboard heartbeat) |
| "Customer not home" in one tap: fix, door photo, attempts, wait clock, message with three replies | Copy | Done 1.26.0 (fee deliberately absent; the next step is offered first) |
| Automatic concrete message at window end: wait / later today / rebook | Improve | Done 1.24.0 (the new window is proposed by the trade, never generated) |
| Revised promise shown as revised, original kept | Copy | Done 1.52.0 — first hours and first day kept on the row; the page says Revised hh:mm, they first said…; withdrawal and a customer's agreed counter worded as such; a line in the record for every change |
| Customer buttons before arrival: I'm running late / someone else will let you in / rebook | Copy | Done 1.40.0 — Running late yourself? (15/30/60, I'm there now) joins someone else and move it |
| Paused visible to the customer with reason and expected return | Improve | Done 1.54.0 — Paused + note, plus the trade's own return estimate in seven fixed words with the time it was said; overdue stated as a fact |
| The trade's own job on the lock screen: stage, time, note, stage buttons (Live Activity) | Build | Written 1.55.0 in native/ (Capacitor shell + WidgetKit extension + bearer-token intent); compiles and ships via the macOS workflow once the Apple membership exists |
| Name and photo of who is coming, on the page and in the On-my-way message | Copy | Done (Who to expect, van, name; photo taken on the phone, on the card and in the On-my-way notification, 1.50.0) |

## Tier 2 — the log becomes a booking and evidence system (web, now)

| Feature | Verdict | Status |
|---|---|---|
| Prompted reconstruction: "near this address since 09:04 — use it?", "no activity since 10:40 — were you away?" | Improve | Later — needs fixes captured at each tap first |
| "On my way" offered automatically at the previous job's Job done | Improve | Done 1.70.0 — tap Job done and the card offers On my way to the earliest job still Booked in today, one tap, nothing sent until pressed; "that was the last one today" otherwise |
| Ordered day with running expected start; next customer told only if the shift leaves their window | Improve | Later |
| "You are next" / stop count on the customer page | Improve | Done (position: "You are 2nd today"), a number the trade types; shown only on the day since 1.67.0 |
| Confirmation re-sent on every reschedule, however the booking moved | Copy | Done 1.38.0 — Follow every booking texts the new hours once a move has settled, through ServiceM8, with the old hours in brackets |
| Red "Not sent" badge on the dashboard until the customer has been told | Copy | Done 1.33.0 — This week in ServiceM8 reads ServiceM8's own email/SMS history: Link texted / emailed, opened / not sent, with Text the link in one tap |
| Logged send and logged open of every customer message | Improve | Partly (viewCount, lastViewedAt); per-message log: Later |
| Per-visit status audit, back-dating allowed but labelled | Copy | Partly (events); labelled back-dating: Later |
| Private attachments that never reach the customer page | Copy | Later |
| Write every TurnUp event into the trade's system of record (ServiceM8 diary item, badge) | Improve | Built 1.34.0, waiting on the add-on App ID (docs/servicem8-add-on.md); badge: Later |
| "Certificate issued" optional final stage for notifiable work | Improve | Later — part of process templates |
| Pre-agreed goodwill gesture, configured once, fired on a missed window | Copy | Later |
| Review request after Job done, routed to Google | Copy | Done 1.43.0 — How did it go? on the page at Job done (Google link + a private note to the trade, both always), one push two hours on |

## Tier 3 — gated on a capability we do not have yet

| Feature | Verdict | Needs | Status |
|---|---|---|---|
| Own SMS sending with a sender ID | Prepare | SMS gateway (first to buy) | Prepare |
| Two-way replies in the job timeline, photos from the customer | Prepare | SMS/MMS or WhatsApp Business | Prepare |
| Geofence auto-arrival as a suggestion with undo | Prepare | Native shell (iOS/Android background location) | Prepare |
| Automatic materials-run detection with inferred intervals to confirm | Prepare | Native shell | Prepare |
| Movement-gated live location during On my way only, expiring on arrival | Prepare | Native shell or foreground-only share | Prepare |
| Computed ETA, only with a live feed and a verified address | Prepare | Live feed | Prepare |
| Deposits at booking and pay link on Job done; open banking first | Prepare | Stripe / PayByBank | Prepare (roadmap: payments) |
| Tip on the Job done page | Prepare | Payments | Prepare |
| Connectors after ServiceM8: Google Calendar, Housecall Pro, Jobber, Commusoft | Prepare | Each vendor's API | Prepare |

## Not for us

| Feature | Why not |
|---|---|
| Vehicle-tracker hardware | The dot is the person, not the van |
| Always-on background tracking | Battery and privacy; movement-gated and travel-only or nothing |
| Automatic no-show fees | CRA 2015: only pre-agreed, avoidable, proportionate; offer the next step first |
| System-generated minute promises before travel | Windows for the day; a live ETA only during travel with a feed |
| Password-protected customer portal | The link is the login |
| Multi-year contracts or per-user pricing | Month to month; messages bundled |
| Quoting a competitor's detection figures as our own | Nobody publishes a radius; we do not invent one |

**One disagreement with the report, on purpose.** The report lists an
automated recorded call to the trade under Not for us because no regulated
or delivery ladder uses one. Will asked for it. Kept as an idea
(`late-call` on the roadmap): the call goes to the *trade*, not the
customer, is the trade's own recorded voice, and is the last rung after
push and SMS. It stays an idea until pushes have been tried on real jobs.

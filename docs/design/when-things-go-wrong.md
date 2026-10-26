# When things go wrong on the day

TurnUp's promise is that the card says what has happened. This is what it
does when the thing that should happen does not. Derived from the research
report of 10 October 2026 (`docs/research/reports/`), the regulated-industry
benchmark UK customers already carry (a window not a time; 24 hours' notice
both ways; an automatic, fixed gesture when the trader misses: £32.31 under
Ofcom, £30 under the energy standards), and what the product can do as a web
app today.

## Three rules

1. **Every state change the customer cares about has a non-push fallback.**
   A customer who opened the link once in Safari will never get a push.
   Email now; SMS is the first capability to buy.
2. **Every inference is shown as "we think", with one-tap correction.** Never
   written silently. ServiceM8, Jobber and Timeero all do this; so do we.
3. **No fee is automatic.** The next step is offered first. A charge is only
   ever pre-agreed, avoidable with notice, proportionate, and symmetrical
   (the trade owes a gesture when the trade misses).

And the house rule that outranks all three: **the product never estimates a
time.** A window is the trade's; a late figure is the trade's, shown with
when they said it.

## The eventualities and the default

| # | What happened | What TurnUp does | State |
|---|---|---|---|
| 1 | Both present, on time | On site tap stamps device time, fix (if granted) and server time; card moves | Live |
| 2 | Trade drifting late inside the window | Nothing to the customer; the trade's phone is nudged when the window *starts* with the card still Booked in | Live 1.22.0 |
| 3 | Window ends with no On site | Trade nudged again. Customer sees "Are you still coming?" and asks in one tap; trade answers On my way or 15/30/60 min late | Live 1.22.0 |
| 3b | …and ten minutes pass after the window with nobody On site | The customer is told plainly (sorry, that is on us) with *I'll wait / later today / another day*; their choice lands on the card and the trade's phone; the trade proposes the new window. Push to the trade repeats every ten minutes while a question is open. Later: the pre-agreed goodwill gesture; last rung, a call to the trade in their own recorded voice (idea) | Live 1.24.0 |
| 4 | Trade cancels before the day | Dashboard cancel records notice time; customer gets a rebook link; the 24-hour rule applies to the trade too | Next |
| 5 | Trade cancels en route or same day | Treated as a missed visit: apology, gesture, priority rebook, reason logged | Next |
| 6 | Customer says "I'm running late" | Button on their page with a stated delay up to a cap; trade's expected start shifts; later jobs told only if it leaves their window | Next |
| 7 | Customer not home | One tap on the card starts the clock and takes a fix; knocked / called / texted logged as tried; door photo kept trade-side; "Leave and tell them" sets Paused with a plain note. The customer's page: sorry we missed you, the facts, and I'm here now / later today / another day, pushed to the trade. No fee from here | Live 1.26.0 |
| 8 | Someone else lets the trade in | Allowed if an adult; "Will someone be in?" captures who, before the day; same evidence trail | Partly live |
| 9 | Access refused / unsafe / cannot proceed | Reason + photo; visit marked attended-not-completed; rebook offered; no fee by default | Next |
| 10 | Wrong address | Trade taps "wrong address" with a fix; customer asked to confirm or drop a pin; nobody's no-show unless the customer supplied it | Next (pin drop exists) |
| 11 | No signal | Taps still accepted; device time and last fix stamped; flagged "location not validated"; queued in the browser and synced on reconnect; never dropped | Next |
| 12 | Trade's phone dead | Dashboard shows "no update since hh:mm"; customer page shows the last stage honestly with its time; back-filled later under a "reconstructed" label | Next |
| 13 | Customer's push not delivered | Every customer-critical event goes by email through ServiceM8 when no push landed: set off, window missed, day-before ask, no one home, running late, paused (ServiceM8-linked jobs, switch on the ServiceM8 panel); SMS later; push is the enhancement | Live 1.73.0 |
| 14 | Materials run | Paused with a reason (live) and expected return (next); fix at pause and resume; with a native shell, gaps inferred from fixes and offered to confirm | Partly live |
| 15 | Job overruns | At about three-quarters of the booked duration, ask the trade for a revised finish; recompute the next job; message that customer only if it leaves their window | Later |
| 16 | Customer cancels in the cooling-off period | Honour 14 days unless urgent repair specifically requested; charge proportionately only if an express start request was recorded in the confirmation | Next (confirmation text) |
| 17 | "You never came" | Produce the chain: confirmation sent, reminder reply, link opens, taps with their three timestamps, door photo, message attempts | Partly live (events, views) |

## What a browser cannot do, and what that means

No geofence wake, no location with the screen off, no Background Sync on
Safari, push on iOS only from a Home Screen app. So, until a native shell:

- Proof of attendance is **tap-time evidence**: device time, GPS fix time
  and accuracy if the trade allowed location, server receipt time. All
  three kept. A tap made offline is flagged, never dropped.
- ServiceM8's "looks like you arrived at 09:04, start from then?" becomes
  **prompted reconstruction**: if the On site tap comes with a fix near the
  address and an earlier fix exists from the same page, offer the earlier
  time. Materials runs stay a manual Paused with fixes at pause and resume.
- The native shell, when it comes, adds the suggestion layer on top: iOS
  region monitoring (20 regions, ~200 m realistic, 20 s dwell, Always
  authorisation), Android geofencing (100–150 m, DWELL, 2–6 min latency).
  Still a suggestion with undo, never a silent write.

## Order of work

Tier 1 of `docs/research/field-service-build-list.md`, in this order,
because each one is the next bad day in sequence: the customer-facing
window-end message with options; customer not home in one tap; the
confirmation with terms; the offline tap queue; "last updated" on the
page; customer-side running-late / someone-else / rebook; the day-before
reminder with replies.


*Update 12 Oct 2026: the offline tap queue shipped in 1.39.0 — see CLAUDE.md, "A tap with no signal still counts".*

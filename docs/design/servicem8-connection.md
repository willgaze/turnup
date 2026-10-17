# The ServiceM8 connection: what works today, what needs an add-on, and the plan

*12 October 2026. Written after the box on the dashboard told Will it could not
look inside ServiceM8, and he asked for a better way.*

## What the API key can do, checked against the live account

The connector authenticates with an account API key (`SM8_API_KEY`). Tested on
12 Oct 2026 against job 2742:

| Need | Endpoint | Works with the key? |
|---|---|---|
| The job, by number or uuid | `job.json` | yes |
| Bookings (scheduled visits) and check-ins | `jobactivity.json` | yes, with a `start_date gt` filter for the week ahead |
| The customer on the job, mobile included | `jobcontact.json` | yes |
| **Whether the booking email went, and whether it was opened** | `email.json?$filter=related_object_uuid eq {job}` | **yes** — `direction`, `timestamp`, `to_email`, `subject`, `opened`, `first_opened_at`, `bounced`, full text |
| **Whether the booking text went** | `sms.json?$filter=related_object_uuid eq {job}` | **yes** — `direction`, `timestamp`, `to_phone`, full text |
| Inbox (incoming email and web enquiries) | `inboxmessage.json` | yes |
| Being told when a job moves | webhook subscriptions | yes, five subscriptions live |
| Email and SMS templates | `emailtemplate.json`, `smstemplate.json` | yes, read and write |
| The job diary as a whole | — | **no**: "not an authorised object type". The diary is readable only through ServiceM8's own apps and its MCP connector |
| Sending an SMS through ServiceM8 | `POST /platform_service_sms` with `to` (E.164), `message`, `regardingJobUUID` | **yes** — tested 12 Oct 2026, 200 OK, and the text appeared in the job's `sms.json` history and diary within a second. Charged to the account's SMS allowance. The docs say "Public Applications"; the key works regardless |
| Writing a diary item | `POST /api_1.0/diary.json` | **no with a key** (403, tested 12 Oct 2026): add-ons only, create-only, attributed to the add-on. Needs OAuth scope `publish_diary_items` |
| A button on the job card | add-on Job Action | add-ons only |

So the thing Will asked for on 12 Oct ("check what's on ServiceM8 and whether
the initial email and text with the link has been sent") is answerable from the
key alone. Job 2742: ServiceM8 sent the confirmation **email** at 00:05 on 10 Oct
with the link in it, Will opened it at 20:02 the same day, and **no text was
sent at all**. That is the automation's "Send text message confirmation" method
being off, or the booking not having been made from the job card with Send
Booking Confirmation ticked. ServiceM8 does not send a confirmation for a job
dragged onto the calendar.

## What shipped after that (v1.35.0)

- **Follow every booking** (see Phase 2 below): card at booking, link texted
  ten minutes later unless ServiceM8 already did, one text per job.

## What shipped next (v1.34.0)

- **Send the link via ServiceM8** on This week in ServiceM8: `sendSms()` on the
  key, `regardingJobUUID` set, so the text sits in the job's SMS history and
  diary and the verdict flips to *texted* on the next refresh. The words are
  built once in `src/lib/sm8-words.js` and kept to plain ASCII.
- **The add-on, built and waiting on an App ID.** `src/lib/sm8-oauth.js` holds
  the OAuth flow (authorise, exchange, refresh; tokens AES-256-GCM in `Sm8OAuth`,
  key derived from `JWT_SECRET`), `publishDiary()` and `diaryFor()`. Hooked in:
  trade-made stage changes, running late, terms agreed, no one home and the
  customer's reply, the window missed and the customer's choice, the day-before
  ask and its reply. Scopes requested: `publish_diary_items vendor` — only
  what is called. `create_notifications` was in that list for two versions
  and never used; ServiceM8's store requirements make an add-on ask for only
  what it needs. Routes: `/api/servicem8/oauth/start` and `/callback`, operator only
  with a signed state. Steps for the owner: `docs/servicem8-add-on.md`.

## What shipped first (v1.33.0)

- `fetchMessages(jobUuid)` and `confirmationState()` in `src/lib/servicem8.js`:
  the verdicts *texted and emailed · texted · emailed, opened · emailed, not
  opened yet · emailed, bounced · sent, but without the link · nothing sent*.
- `fetchUpcoming({ days })`: every scheduled visit in the window, de-duplicated,
  with the job, the contact, the verdict and whether a TurnUp card follows it.
  Cached 90 seconds per instance; ServiceM8 allows 180 calls a minute.
- **This week in ServiceM8** on the dashboard (`Sm8Week.jsx`): one row per
  booking, the verdict in colour, *Text the link* (opens Messages with the number
  and the words in, so the trade sends it from their own phone and it costs
  nothing), *Make the card now*, *Open their page*.
- The box is given the same lines and answers "did the link go?" from them.

What this deliberately does not do: send anything itself. A text sent from the
trade's own phone is honest about who sent it and lands in their own Messages
thread; a text sent through ServiceM8 lands in the job diary, which is better,
and is Phase 1.

## The plan for the full connection

**Phase 1 — the add-on (code done, sign-up pending).** A Public Application
that is never listed: ServiceM8's own docs say you "can create a Public
Application and choose not to list it". It gets OAuth scopes the key does not
have:

- Sending the text turned out not to need it: the key sends through
  `platform_service_sms` and the text lands in the diary. Done in 1.34.0.
- Add-on Job Diary items: every TurnUp event (set off 07:42, on site 08:10,
  terms agreed, no one home, customer replied *someone else will be in*) written
  into the job diary, attributed to TurnUp. The trade's system of record then
  holds the evidence without anyone copying it.
- `manage_badges` / notifications: a *Customer not home* badge and a *Running
  late* badge so ServiceM8's own Badge Follow Up automation can act.
- A Job Action button on the job card: *Open in TurnUp*, which opens the card.

What it needs: a ServiceM8 developer account (free), the Addon Kit, a small
serverless function or a route on getturnup.com to hold the OAuth tokens, and
an afternoon. Will installs it on his own account; nobody else sees it until it
is listed.

**Phase 2 — the card made and the link sent the moment a booking is made.
Done in 1.35.0.** `src/lib/sm8-auto.js`: the five-minute cron sweep reads
every scheduled visit edited in the last six hours (`jobactivity` by
`edit_date`), makes the card for any job it does not follow yet, and ten minutes
after the booking was made texts the link through ServiceM8 on the key, unless
the job's SMS history already holds a link text from ServiceM8's own automation.
`linkSentAt` on the tracker makes it once per job, ever. The webhook makes the
card immediately when it hears a job change; the text still waits for the sweep.
Switched on by the trade under ServiceM8 → Follow every booking, because it
spends their SMS credits. **Re-send on a move (1.38.0):** the card keeps the
hours the customer was last told (`toldStart`/`toldEnd`/`toldAt`); when the
sweep sees the next booking differ by five minutes or more at either end and the
edit is ten minutes old, `resendIfMoved()` texts the new hours with the old in
brackets and the same link, once per move. Only while Booked in; a booking taken
off the diary is not announced, because whether that is a cancellation or a
re-plan is the trade's to say.

**Phase 3 — the Store listing.** Only once two or three other trades have
asked. Review, a public listing, and the same add-on for anyone on ServiceM8.

## What not to do

- Do not scrape the diary or drive ServiceM8's web app. The history endpoints
  give the facts that matter, and an add-on gives the rest properly.
- Do not send SMS from TurnUp's own gateway to work around ServiceM8. Two
  threads for one job is the confusion this product exists to remove. When
  TurnUp has its own SMS it will be for trades who do not use ServiceM8.
- Do not claim in any copy that the connector sent a text. Today it opens
  Messages; the trade sends it.

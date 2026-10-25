# Known issues: what a second trade would hit

Written 25 Oct 2026, at go-to-market stop 1. **Ranked: top of the list stops
trade #2 outright; bottom is polish.** Read against the code on `main`
(v1.75.0) plus this branch. Update this file in the same push as any fix
(Standing Rule 24).

Severity: **Blocker** = trade #2 cannot use it. **High** = they can, and it
will bite in week one. **Medium** = it will bite eventually. **Low** = it
looks careless.

## The list

| # | Issue | Severity | Fixed by |
|---|---|---|---|
| 1 | One trade per install | **Blocker** | Stop 5 |
| 2 | One shared sign-in, one owner | **Blocker** | Stop 5 |
| 3 | No trade terms, processor terms or delete/export | **Blocker** | Stop 4 |
| 4 | No Ltd, no ICO fee, no trade-mark search | **Blocker** for a paying trade | Stop 3 |
| 5 | Old Apple certificate not revoked | High | Will, once (below) |
| 6 | Email fallback only for ServiceM8 jobs | High | Stop 5 |
| 7 | Android customers get a link, not a card | High | Google review |
| 8 | Login throttle is per server, not global | Medium | Stop 5 |
| 9 | No backups or restore drill written down | Medium | Stop 5 |
| 10 | Household Gmail needs Google's audit | Medium | after beta |
| 11 | Wallet cards added before v1.74.3 are frozen | Medium | remove and re-add |
| 12 | Cron depends on Vercel Pro | Medium | stay on Pro |
| 13 | Dashboard times use the phone's locale | Low | next dashboard pass |
| 14 | A stray `$SHOT/` folder of screenshots in the repo | Low | tidy chat |

## Detail

**1. One trade per install (Blocker).** The trade's name, phone and time
zone come from `NEXT_PUBLIC_TRADE_*`, inlined at build, and `TradeProfile`
is a single row (`id @default("singleton")`). Every job, card, setting and
pilot number belongs to that one trade. Today a second trade means a second
Vercel project, a second database and a second ServiceM8 add-on, run by Will.
That works for one friendly beta trade by hand; it does not work for ten.
Stop 5 is multi-trade scoping: a `tradeId` on every row, invite-only sign-up.

**2. One shared sign-in (Blocker).** The dashboard is one operator: one
password (`OPERATOR_PASSWORD`) or a passkey, one JWT role, no user table.
Anyone given access sees every job. There is no way to add an apprentice
with less access, or a second trade with their own. Same fix as 1.

**3. Paperwork (Blocker).** `/privacy` is live and true to the code, but
there are no terms a trade agrees to, no data-processing terms (TurnUp holds
the trade's customers' names and addresses, so the trade is the controller
and TurnUp the processor), no account delete or export, and no retention
rule. Stop 4.

**4. Company shell (Blocker for a paying trade).** No Ltd, no ICO fee, no UK
trade-mark search (a US "TURNUP" filing exists; UK clash risk medium). A free
closed beta can start before this; money cannot. Stop 3.

**5. Old Apple certificate (High).** The key leaked on 21 Oct 2026 for about
three minutes. A new key and certificate are live and the old key is no
longer used by anything, but the old certificate is still valid at Apple
until it is revoked, so the leaked key could still sign a pass that looks
like ours until then. Revoke was greyed out on 21 Oct. Will's step:
developer.apple.com/account/resources/identifiers/list/passTypeId, open
`pass.com.getturnup.job`, Revoke the certificate that is NOT named "TurnUp
NEW 20261021". Still greyed out: developer.apple.com/contact.

**6. Email fallback only for ServiceM8 jobs (High).** When a push reaches no
phone, the customer is emailed, through ServiceM8, from the job's contact.
A hand-made card has no email address, so a customer on a hand-made card who
never added the page to their home screen hears nothing until they look. A
trade not on ServiceM8 is in this position for every job.

**7. Android gets a link (High).** Google Wallet is built (v1.75.0) and dark
until the issuer account exists and Google reviews it. Until then an Android
customer gets the page, not a card. Nothing customer-facing says otherwise.

**8. Login throttle (Medium).** Ten attempts per IP per ten minutes, held in
the memory of one server instance. A speed bump, not a lock. Fine for one
owner; not for a product with many sign-ins.

**9. Backups (Medium).** The data is in Neon, which keeps point-in-time
history on its own, but nothing in the repo says how long, how to restore, or
that a restore has ever been tried. A trade's job history is theirs; losing it
is the one thing that ends trust in a day.

**10. Household Gmail (Medium).** Reading other households' inboxes needs
Google's restricted-scope review and a yearly CASA audit (about $540 to
$1,800 a year). Forwarding works today and is enough for beta. See
`docs/research/inbox-connect.md`.

**11. Frozen wallet cards (Medium).** Cards added before v1.74.3 carry the
wrong update address and never move. No migration exists for a pass in a
pocket: remove it from Wallet and add it again from the job page. Only test
cards were added before then.

**12. Cron needs Vercel Pro (Medium).** The nudges, the day-before ask and
Follow every booking run every five minutes on Vercel Cron. On Hobby a
sub-daily cron fails every deploy. If the plan ever drops, take the cron out
of `vercel.json` first.

**13. Dashboard times (Low).** A few dashboard lines in
`src/app/dashboard/Console.jsx` still format times with
`toLocaleTimeString`. The dashboard renders on the trade's own phone, so it
reads right in practice, but it breaks the CLAUDE.md rule that every date
goes through `src/lib/when.js`. The customer's page is clean (MissedYou was
the last one there, fixed at stop 1).

**14. `$SHOT/` (Low).** Five screenshots committed on 30 Sep 2026 under a
folder literally named `$SHOT`, from a shell variable that never expanded.
Harmless, looks careless to anyone reading the repo.

## Fixed at stop 1 (so nobody re-checks them)

| What | Where |
|---|---|
| "Are you still coming?" stopped repeating: max 3, quiet 21:00 to 07:00, ends with the job's day, Stop reminders, no customer name on the lock screen | `src/lib/ask-reminder.js`, `scripts/check-nudge-ask.mjs` |
| Wallet script can never upload the key folder; `csr` refuses over a key; `rotate` | `scripts/apple-wallet.sh`, `scripts/check-wallet-script.sh` (v1.73.1) |
| Pass built from the job's current stage, and updates itself | `src/lib/passkit.js`, `src/app/api/passes/v1/` (v1.74) |
| Late notice and open ask hidden once On site, Paused or Job done | `StillComing.jsx`, `Console.jsx` |
| No key in the repo, its history, any deployment since 13 Oct, or the build output; CI fails if one appears | `scripts/check-no-secrets.mjs`, `.github/workflows/checks.yml`, `.vercelignore` |

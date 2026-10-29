# Security sweep after the 21 Oct 2026 key leak

Run 25 Oct 2026, go-to-market stop 1. **Result: clean.** Names only below;
no value was read or printed.

## What was checked

| Check | How | Result |
|---|---|---|
| Key files in the repo | `git ls-files` against key-shaped names (`apple/`, `*.key`, `*.p12`, `*.cer`, `*.csr`, `*.pem`, `turnup.env`, `key.password`, `.env*`) | none (`.env.example` only, placeholders) |
| Key files in history | every file path in all 260 commits on `main` | none ever committed |
| Secrets in history | `git log -p` on `main` for PEM private keys, Anthropic, GitHub, AWS, Stripe keys, Postgres URLs with passwords | two hits, both harmless: a test fixture whose body is `abc`, and a `grep` for the words in `apple-wallet.sh` |
| Deployments | Vercel, project `turnup`, all 100 deployments 13 to 25 Oct | every one built from a Git commit; **none uploaded from a folder** (the 21 Oct one was deleted) |
| Live site | `https://www.getturnup.com/` + `apple/pass.key`, `apple/key.password`, `apple/turnup.env`, `pass.key`, `turnup.env`, `.env`, `.env.local`, `apple/pass.csr` | all 404 |
| Build output | `next build`, then every file in `.next` | clean; a planted key is caught |

**Not checked, and why:** the values in Vercel. The connector is read-only
for environment variables and answers 403 (CLAUDE.md); a session cannot list
them and should not hold them anyway.

## Every environment variable the code reads

Secret = must never be in the repo, a log, a chat or a `NEXT_PUBLIC_` name.

| Name | Secret? | Notes |
|---|---|---|
| `DATABASE_URL` | **yes** | Neon |
| `JWT_SECRET` | **yes** | sessions, sealed tokens, pass auth; no value = nobody signs in |
| `OPERATOR_PASSWORD` | **yes** | the dashboard password |
| `OPERATOR_EMAIL` | no | |
| `CRON_SECRET` | **yes** | optional; then also a GitHub repo secret |
| `ANTHROPIC_API_KEY` | **yes** | the box on the dashboard |
| `VAPID_PRIVATE_KEY` | **yes** | web push |
| `VAPID_SUBJECT` | no | |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | no | public by design |
| `PASSKIT_KEY_PEM` | **yes** | the key that leaked was the OLD one; this is the new one |
| `PASSKIT_KEY_PASSWORD` | **yes** | |
| `PASSKIT_CERT_PEM`, `PASSKIT_WWDR_PEM` | no | certificates are public |
| `PASSKIT_PASS_TYPE_ID`, `PASSKIT_TEAM_ID` | no | |
| `SM8_API_KEY` | **yes** | ServiceM8 |
| `SM8_APP_SECRET` | **yes** | normally pasted on the dashboard into `Sm8App` instead; `SM8_APP_ID` beside it is not secret |
| `SM8_WEBHOOK_TOKEN` | **yes** | |
| `SM8_API_BASE`, `SM8_OAUTH_BASE` | no | test overrides |
| `GOOGLE_CLIENT_SECRET` | **yes** | normally pasted into `GoogleApp`; `GOOGLE_CLIENT_ID` is not secret |
| `GMAIL_API_BASE`, `GOOGLE_TOKEN_URL` | no | test overrides |
| `INBOUND_EMAIL_TOKEN` | **yes** | normally in `InboundSecret` |
| `INBOUND_EMAIL_HOST`, `INBOUND_EMAIL_LOCAL` | no | |
| `SHIP24_API_KEY`, `SHIP24_WEBHOOK_SECRET` | **yes** | |
| `SHIP24_API_BASE` | no | |
| `WHAT3WORDS_API_KEY` | **yes** | billable |
| `DVLA_API_KEY`, `MOT_API_KEY`, `MOT_CLIENT_SECRET` | **yes** | plate lookup |
| `MOT_CLIENT_ID`, `MOT_TOKEN_URL` | no | |
| `PLAN_SHARE_CODE` | **yes** | who can read `/plan/<code>` |
| `NEXT_PUBLIC_TRADE_NAME`, `_PHONE`, `_PHONE_TEL`, `_TIMEZONE` | no | the trade's identity |
| `NEXT_PUBLIC_CANONICAL_HOST`, `NEXT_PUBLIC_VERCEL_PROJECT_PATH` | no | |
| `DEMO_CODE`, `DEMO_PLACE` | no | diary captures |
| `VERCEL_ENV`, `NODE_ENV` | no | set by the platform |
| `BASE`, `CHROME`, `CHROME_PATH`, `ONLY`, `LOCAL_DB_PORT` | no | scripts only |

Google Wallet's three values (v1.75.0) are pasted on the dashboard, not set
here.

## What now stops it happening again

1. `scripts/apple-wallet.sh` cannot run `vercel deploy` or `--prod`
   (v1.73.1), proved by `scripts/check-wallet-script.sh`.
2. `.vercelignore` drops `apple/`, key files and `.env*` from any upload.
3. `npm run build` ends with `node scripts/check-no-secrets.mjs .next`, so
   **a Vercel build that would serve a key fails and does not deploy.**
4. `.github/workflows/checks.yml` runs the repo scan, the wallet-script
   check, every pure check, `check-current` and the build scan on every push
   and PR.

## Still open

The **old Apple certificate is not revoked**. It is Will's, with his Apple ID:
see `docs/launch/known-issues.md`, item 5.

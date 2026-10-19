# Tracking by number: one email, then the courier's scans move the row

Built 19 Oct 2026 (v1.67.0). When a row on a household card has a courier's
reference (the reader pulls one out of a dispatch email: Royal Mail, Evri, DPD,
DHL, UPS, FedEx, InPost, Parcelforce), a tracker is registered with
[Ship24](https://docs.ship24.com) and Ship24's webhook moves the row from then
on. Nobody forwards the "out for delivery" or the "delivered" email; the
courier's own scan does it.

The rule holds: a scan is a fact about the past and is filed as a stage
(`in_transit` is on its way, `out_for_delivery` is out for delivery,
`delivered` is arrived, a failed attempt or a pickup point is missed). The
courier's **estimated** delivery date is not copied onto the card. The row's
note is the courier's latest words, attributed: "Royal Mail says: Delivered to
the addressee."

Dark until `SHIP24_API_KEY` is set. Every call fails soft; a card never waits
on Ship24.

## What only you can do (one Cowork paste)

```
In Chrome.
1) Open https://www.ship24.com/ and create an account with my work email,
   choosing the free Per-shipment plan (10 shipments a month).
2) Open https://dashboard.ship24.com/integrations/api-keys and copy the
   Default API key.
3) Open https://vercel.com/willgazes-projects/turnup/settings/environment-variables
   and add SHIP24_API_KEY = that key, for Production, marked Sensitive.
4) Open https://vercel.com/willgazes-projects/turnup/deployments, open the
   menu on the top deployment, choose Redeploy, and wait until it says Ready.
5) Open https://www.getturnup.com/dashboard, sign in, open Setup and settings,
   find "Where the card hears from", and copy the Webhook URL shown under
   "Track parcels by their number".
6) Open https://dashboard.ship24.com/integrations/webhooks, add a webhook
   with that URL, and if Ship24 shows a webhook secret, add it to Vercel as
   SHIP24_WEBHOOK_SECRET (Production, Sensitive) and redeploy once more.
7) Tell me what the panel says under "being tracked".
```

## What happens then

- `fileEmail()` calls `registerTracker()` for any parcel row with a courier
  and a reference that is still moving. The five-minute cron also sweeps for
  rows that qualify and have no tracker yet (`registerDue()`, ten per sweep,
  fourteen days back), so rows from before the key existed are picked up.
- Ship24 posts to `/api/ship24/webhook/<token>`. The token is derived from
  `JWT_SECRET` like the ServiceM8 webhook's; `SHIP24_WEBHOOK_TOKEN` overrides
  it. If `SHIP24_WEBHOOK_SECRET` is set the `Authorization: Bearer` header
  Ship24 sends is checked as well. The route answers 200 once the token is
  right, because Ship24 retries anything else.
- Rows are matched by `trackerId`, by our row id (`clientTrackerId`), or by
  any tracking number the courier knows the parcel by. Stages only move
  forwards; Missed is the exception, as everywhere else on the card.
- `node scripts/check-ship24.mjs` runs Ship24's own example payload through
  the reader (21 checks).

## Costs and limits

Ten shipments a month free, then $39 for 1,000 (Ship24's pricing page, read
19 Oct 2026). One tracker is one shipment however long it takes. Only parcel
rows with a known courier are registered; trade visits and deliveries without
a courier never are.

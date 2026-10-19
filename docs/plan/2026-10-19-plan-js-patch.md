# Patch for `src/lib/plan.js`, from the review of 19 Oct 2026

For the session that applies it (the nightly, or whoever next bumps the
version). Every change is an exact old string and its replacement, read from
`main` at v1.65.3. Apply, then set `PLAN_META.updated` to the build date and
run `node scripts/check-current.mjs`.

**Applied 19 Oct 2026, on the owner's word that night.** Another session had
already landed the letterbox, van-lookup and pilot rows and dropped the DVSA
tap (main at v1.68.0); this branch applied the rest to `src/lib/plan.js`. Not
applied, left for the next build because they sit outside `plan.js`: the
roadmap's `dvla` state, the hero sub-line in `sections-now.jsx`, and the DVSA
paragraph in `Profile.jsx`. The text below is the patch as written.

## STATUS

Old:
```
  { item: 'Email letterbox (Cloudflare)', state: 'amber', note: 'getturnup.com is on Cloudflare; Email Routing for in.getturnup.com is not on yet, so nothing arrives' },
```
New:
```
  { item: 'Email letterbox (Cloudflare)', state: 'green', note: 'routing on at Cloudflare since 18 Oct 2026; forwarded delivery emails land on household cards. MX for in.getturnup.com checked in DNS' },
  { item: 'Privacy policy', state: 'green', note: 'a public page, getturnup.com/privacy, since 17 Oct 2026' },
  { item: 'ServiceM8 Add-on Store', state: 'amber', note: 'listing written 17 Oct 2026; public release needs an account per trade and a support mailbox' },
  { item: 'Lock-screen app (iOS)', state: 'amber', note: 'the job as a Live Activity, written 15 Oct 2026; compiles the day the Apple enrolment is active' },
```

Old:
```
  { item: 'Pilot: thirty days, four numbers', state: 'amber', note: 'panel built and ServiceM8 connected; the count has not started' },
```
New:
```
  { item: 'Pilot: thirty days, four numbers', state: 'amber', note: 'panel built, ServiceM8 connected since 9 Oct; the count has not started, and every parked decision waits on it' },
```

## WAITING_ON_OWNER

Move the "Start the thirty-day count" entry to the top of the array. No wording change.

## PRODUCT.does

Old:
```
    { label: 'A household card per address', note: 'the plumber, the sofa, the parcels, from forwarded email' },
```
New:
```
    { label: 'A household card per address', note: 'the plumber, the sofa, the parcels, from forwarded email; a home makes its own on /join' },
    { label: 'Email when no notification lands', note: 'set off, window missed, the day-before ask; through ServiceM8, from the trade’s own address, once per job' },
```

## MOATS

Moat 1, old:
```
    missing: ['A household makes its own card; today the trade gives one', 'Remembered for the next trade', 'Who is allowed to ask if you are in'],
    gate: 'A second trade reads what the first one learned', pct: 70,
```
New (and add the line to `today`):
```
    today: [..., 'A home makes its own card on /join: live 18 Oct 2026'],
    missing: ['Remembered for the next trade', 'Who is allowed to ask if you are in'],
    gate: 'A second trade reads what the first one learned', pct: 75,
```

Moat 3, old:
```
'The email letterbox: a Cloudflare Worker, written; routing not switched on yet'
```
New:
```
'The email letterbox: live at Cloudflare, one rule, every card its own address', 'Email through ServiceM8 when push cannot reach a phone'
```

## GTM_PHASES

Move 3, old:
```
'Add-on listing: written 17 Oct 2026; public release needs an account per trade'
```
New:
```
'Add-on listing: written 17 Oct 2026; public release needs an account per trade and a support mailbox', 'Ask ten ServiceM8 trades, once, whether they would pay £9.99 a month: the research’s one cheap test, before any billing is built'
```

Move 5, old:
```
'The household card exists, 12 Oct 2026; a household makes its own, today the trade gives it'
```
New:
```
'The household card exists, 12 Oct 2026; a home makes its own on /join since 18 Oct'
```

## RISKS

Old:
```
  { label: 'ServiceM8 ships its own pass', likelihood: 'high', answer: 'Be their card first. Public standard', kind: 'estimate' },
```
New:
```
  { label: 'ServiceM8 ships a reopenable status page', likelihood: 'high', answer: 'Be their card first: the add-on in their store, the record they do not keep. Public standard', kind: 'estimate' },
```

## DECISIONS

`firstWedge`, old note:
```
note: 'No incumbent tracker, a repairs manager you can meet, and a tenancy is already an account per address: the first wedge and the first moat are one build.'
```
New:
```
note: 'A live-ETA tracker at some contractors (Fortem), none with Paused, the day-before answer or a record; a repairs manager you can meet; and a tenancy is already an account per address: the first wedge and the first moat are one build.'
```

## FACTS_TABLE

Add, after the Glympse row:
```
  { figure: '£9.99, ~300 trades', what: 'What a monthly trade plan would need for a £36k run rate, by the repo’s own research. Not the decision; the number the decision was made against', source: 'docs/research/shop-competitive-landscape.md, 12 Oct 2026', href: 'https://github.com/willgaze/turnup/blob/main/docs/research/shop-competitive-landscape.md', kind: 'estimate' },
  { figure: 'Fortem On My Way', what: 'A housing repairs contractor already texts the day before and shows a live ETA on the day. No Paused, no answer back, no record', source: 'Housing Technology', href: 'https://www.housing-technology.com/fortem-offers-on-my-way-tracking/', kind: 'fact' },
```

## PLAN_META

```
  updated: '<the build date>',
```

## Van lookup: live, owner confirmed 19 Oct 2026

STATUS, old:
```
  { item: 'Van lookup (DVSA MOT API)', state: 'amber', note: 'DVSA approved 14 Oct; three settings in Vercel to go' },
```
New:
```
  { item: 'Van lookup (DVSA MOT API)', state: 'green', note: 'live since 18 Oct 2026: type the plate, make, model and colour fill themselves in' },
```

WAITING_ON_OWNER: delete the `DVSA keys into Vercel` entry. Three taps remain.

PRODUCT.does, old:
```
    { label: 'Van make, model, colour', note: 'DVSA lookup, pending key' },
```
New:
```
    { label: 'Van make, model, colour', note: 'from the plate, DVSA MOT history; live 18 Oct 2026' },
```

Outside `plan.js`, same build:

- `src/lib/roadmap.js`: `dvla` moves from `ready` to `live`, under Working now; its `needs` line goes.
- `src/app/plan/sections-now.jsx`: the hero sub-line `"Apple, DVSA, ServiceM8"` becomes `"Apple"`.
- `src/app/dashboard/Profile.jsx`: the paragraph telling the owner to register with DVSA and put three settings in Vercel is now for a second trade, not this one; read it before leaving it.

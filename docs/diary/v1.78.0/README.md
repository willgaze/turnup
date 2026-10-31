# v1.78.0 — Plum

**2026-10-31** · background `#f9f4f8` · accent `#7a2f5e`

- The homepage shows the job going round. Beside the headline, the phone now plays thirteen silent seconds of the customer’s page moving Booked in, On my way, On site, Job done, so a stranger gets what this is before reading a word. It loads only when it scrolls into view, shows a still to anyone whose phone is set to less motion, and has no sound. The caption says what it is: what your customer sees, one link, no app.
- The demo stays on the page. Every button on /demo used to send a real request to the server under the made-up job’s code, where nothing was listening: the taps did nothing on the one page people are sent to try, and a worked example was sending traffic at the live database. A tap on the demo is now answered on the page, the way the real page would answer it, and nothing leaves the phone. Two rows at Job done also named the real business on a page that says everything on it is invented; they name the invented one now.
- Changed the card? npm run record:social films it again. It only films a local server, blocks anything that is not a plain read, and stops if the demo ever starts posting again, so the film can never be of real requests.

Not captured this time: the household card (set DEMO_PLACE to a seeded place code); the wallet views and the dashboard (they need an operator session).


### customer-light

![customer-light](./customer-light.webp)

### customer-dark

![customer-dark](./customer-dark.webp)

### customer-booked

![customer-booked](./customer-booked.webp)

### login

![login](./login.webp)

### homepage

![homepage](./homepage.webp)

### homepage-dark

![homepage-dark](./homepage-dark.webp)

### for-trades

![for-trades](./for-trades.webp)

### for-homes

![for-homes](./for-homes.webp)

### join

![join](./join.webp)

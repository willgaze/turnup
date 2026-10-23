# v1.73.0 — Ochre

**2026-10-23** · background `#fbf8f0` · accent `#8a6414`

- The wallet card can now update itself. Wallet registers the phone with the pass web service the pass has advertised since the first one was signed (/api/passes/v1: register, what changed, the latest pass, unregister, log), and every change to a job, a stage tap, a note, a ServiceM8 check-in, a late figure, a wasted trip, pokes Apple's push service with the pass certificate so Wallet fetches the card again. The stage field carries the one change message Wallet may put on the lock screen: the stage, under the trade's name, and nothing else, the same rule as every other notification here. Proven end to end against a stand-in Apple on the local database: 27 cases, the dead-phone cleanup and the client certificate included. Not yet seen on a real phone: the first card that moves on its own is the proof, and the homepage does not say "updates itself" until it has.
- The lock-screen app's signing is one Cowork paste (docs/cowork-testflight.md): the App IDs and the App Group, a distribution certificate made by scripts/ios-signing.sh the way the wallet one was, an App Store Connect key, the app record, six GitHub secrets, Run workflow. The workflow now names the team and signs the archive with the distribution certificate it is given, and the app says it uses no encryption of its own so TestFlight never parks a build on that question.


### wallet-in-stack

![wallet-in-stack](./wallet-in-stack.webp)

### wallet-opened

![wallet-opened](./wallet-opened.webp)

### wallet-alone

![wallet-alone](./wallet-alone.webp)

### customer-light

![customer-light](./customer-light.webp)

### customer-dark

![customer-dark](./customer-dark.webp)

### dashboard

![dashboard](./dashboard.webp)

### dashboard-setup

![dashboard-setup](./dashboard-setup.webp)

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

### household

![household](./household.webp)

### household-dark

![household-dark](./household-dark.webp)

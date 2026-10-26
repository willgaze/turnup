# The lock-screen app onto TestFlight, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. The Apple membership is live (21 Oct 2026) and
the wallet certificate is done and a card has moved in a pocket (25 Oct).
This is the app's own signing: two
App IDs and an App Group, a distribution certificate, an App Store Connect
key, the app record, six GitHub secrets, and one press of Run workflow. The
build itself happens on GitHub's Mac (`.github/workflows/ios.yml`); nothing
here needs Xcode on the owner's machine.

A Claude session cannot start Cowork and cannot do any of this itself: an
Apple account, a GitHub repository's secrets and an App Store Connect key are
all things somebody has to own. It hands over the prompt.

**Check first.** If https://github.com/willgaze/turnup/actions/workflows/ios.yml
shows a green run and TestFlight on the iPhone lists TurnUp, this is done.

---

```
Get the TurnUp iOS app building on GitHub and onto TestFlight, on this Mac, in one go.

Everything lands in ~/TurnUp-Apple/apple/ios. Do not delete it afterwards: the
private key in it is the only one the distribution certificate works with.

0. Check the membership is live.
   Open https://developer.apple.com/account and sign in with my Apple ID
   (approve the two-factor prompt on my phone when it appears; I will tap it).
   Under "Membership details" copy the Team ID: ten capitals and digits.
   Write it down as TEAM.

1. Register the two App IDs and the App Group.
   Open https://developer.apple.com/account/resources/identifiers/list
   a) Press the blue +, choose "App Groups", Continue.
      Description: TurnUp shared    Identifier: group.com.getturnup.app
      Continue, Register.
   b) Press +, choose "App IDs", Continue, choose "App", Continue.
      Description: TurnUp    Bundle ID: Explicit, com.getturnup.app
      In the Capabilities list tick "App Groups".
      Continue, Register.
      Open it from the list, beside App Groups press Configure (or Edit),
      tick group.com.getturnup.app, Continue, Save.
   c) Press +, "App IDs", "App": Description: TurnUp widget
      Bundle ID: Explicit, com.getturnup.app.widget. Tick "App Groups".
      Continue, Register. Open it, Configure App Groups, tick
      group.com.getturnup.app, Save.
   If any of these says it already exists, that is fine: carry on.

2. Make the key and the request.
   Open Terminal and run, one at a time:

     mkdir -p ~/TurnUp-Apple/scripts && cd ~/TurnUp-Apple
     curl -fsSL https://raw.githubusercontent.com/willgaze/turnup/main/scripts/ios-signing.sh -o scripts/ios-signing.sh
     bash scripts/ios-signing.sh csr

   The last lines say "Done. Upload this file to Apple:" and a path ending in
   apple/ios/dist.csr. If it says "Stopped:", tell me what it says.

3. Get the distribution certificate.
   Open https://developer.apple.com/account/resources/certificates/add
   Under "Software" choose "Apple Distribution", Continue.
   Choose File, pick ~/TurnUp-Apple/apple/ios/dist.csr. Continue.
   Press Download. It saves distribution.cer to ~/Downloads.
   If Apple says I already have the maximum number of distribution
   certificates, STOP and tell me; do not revoke anything.

4. Make the App Store Connect key.
   Open https://appstoreconnect.apple.com/access/integrations/api
   (If it asks me to agree to a new agreement first, STOP and tell me.)
   Under "Team Keys" press + (Generate API Key).
   Name: TurnUp CI    Access: Admin
   Generate. Then:
     - press Download API Key. It saves AuthKey_XXXXXXXXXX.p8 to ~/Downloads.
       Apple lets you download it ONCE. If the download does not happen,
       tell me before doing anything else.
     - copy the Key ID (ten characters, beside the key). Write it as KEYID.
     - copy the Issuer ID (at the top of the page, long, with dashes). Write
       it as ISSUER.

5. Create the app record.
   Open https://appstoreconnect.apple.com/apps and press + then New App.
   Platforms: iOS    Name: TurnUp    Primary Language: English (U.K.)
   Bundle ID: com.getturnup.app (pick it from the list)
   SKU: turnup-ios    User Access: Full Access
   Create. If "TurnUp" is taken as a name, use "TurnUp Card" and tell me.

6. Turn it all into GitHub secrets.
   Back in Terminal, with the real file name, KEYID, ISSUER and TEAM in place:

     cd ~/TurnUp-Apple && bash scripts/ios-signing.sh finish ~/Downloads/distribution.cer ~/Downloads/AuthKey_KEYID.p8 KEYID ISSUER TEAM

   The last lines say "Done. Team ..., certificate good until <a date>".
   Write that date down for step 9.
   The file ~/TurnUp-Apple/apple/ios/github.env now has six lines, KEY=value.
   Open https://github.com/willgaze/turnup/settings/secrets/actions
   For each of the six lines press "New repository secret":
     Name:   the part before the first =
     Secret: everything after the first = (two of them are very long single
             lines; that is correct)
     Add secret.
   The six names are:
     IOS_CERT_P12
     IOS_CERT_PASSWORD
     ASC_KEY_ID
     ASC_ISSUER_ID
     ASC_KEY_P8
     APPLE_TEAM_ID
   If a secret with that name already exists, Update it rather than adding a
   second.

7. Switch the workflow on.
   Open https://github.com/willgaze/turnup/settings/variables/actions
   Press "New repository variable". Name: IOS_SIGNING_READY   Value: true
   Add variable.

8. Run it and watch.
   Open https://github.com/willgaze/turnup/actions/workflows/ios.yml
   Press "Run workflow", keep the branch as main, press the green "Run
   workflow". A run appears within a minute. It takes about 15 to 25 minutes.
   If it goes red, open the failed step and copy me the last forty lines; do
   not re-run it more than once.
   When it is green: open https://appstoreconnect.apple.com/apps, open
   TurnUp, press the TestFlight tab. A build appears there within about ten
   minutes of the run finishing, first as "Processing".

9. Get it on my phone.
   On the TestFlight tab, under Internal Testing, press + beside it, name the
   group "Will", tick "Enable automatic distribution", Create. Press + beside
   Testers and add me (will@rosebourneplumbing.co.uk). I will install the
   TestFlight app from the App Store on my iPhone and accept the invite there.
   Tell me when the build shows as "Ready to Test".

   Last: put the certificate expiry date from step 6 in my Google Calendar
   as an all-day event one month before it, titled
   "TurnUp: iOS distribution certificate expires in a month, re-run the TestFlight Cowork job".

Rules:
- Never paste a key, a password, or the contents of github.env, dist.key,
  dist.p12 or the .p8 file into this chat. Read them from the files and put
  them into GitHub yourself.
- Do not delete ~/TurnUp-Apple or anything in it.
- Do not revoke any certificate or key at Apple, and do not make a second
  App Store Connect key if one download fails: tell me.
- If Apple, App Store Connect or GitHub asks me to buy, upgrade or agree to
  anything new, stop and tell me.
- If anything does not match what is written here, stop and tell me what the
  screen says rather than guessing.
```

---

## After it is on the phone

- Open TurnUp from TestFlight, sign in once (the dashboard, in the app's own
  window). Tap On my way on a job: the Live Activity appears on the lock
  screen with the On site / Paused / Job done buttons. That is the thing the
  app exists for, and the first time it has run on a phone.
- The roadmap item `native-app` in `src/lib/roadmap.js` moves to `live`, and
  the plan's STATUS row goes green, in the same push: never before.
- Every push to `main` that touches `native/` then builds and uploads on its
  own, and Mondays always build so a TestFlight build never expires.
- What was not proven from a Claude session, honestly: the workflow has
  never run with a real certificate. The first run is the test, and the
  failed step's log is what to paste back.

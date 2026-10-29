# The iPhone app's signing, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. A Claude session cannot start Cowork and must not
make a signing key (it would die with the container, and land in a
transcript); it hands over the prompt. On the Mac the keys live in a folder
that stays, and they go to GitHub straight from Terminal with `gh secret set`,
so nothing passes through a chat.

**What it unlocks.** `.github/workflows/ios.yml` builds `native/` on GitHub's
Mac and uploads it to TestFlight, but every run so far has been *skipped*,
because the repository variable `IOS_SIGNING_READY` is not set. This job makes
the five secrets that workflow reads, sets the variable, and ends by running
the workflow once, so "done" is a build at Apple rather than a sentence.

**Check first.** If https://github.com/willgaze/turnup/actions/workflows/ios.yml
already shows a green run whose `build` job finished, this job is done. Do not
run it again: a second distribution certificate is a second key, and Apple
allows only a few.

**What is not secret, and is written here on purpose:** the team id
`WTS45T2YD3` (it is in every signed pass), the bundle ids, and the App Group
name. Everything else is.

---

```
Set up signing for the TurnUp iPhone app, on this Mac, in one go.

Everything lands in the folder ~/TurnUp-iOS. Do not delete it afterwards:
the private key in it is the only one the certificate works with.

0a. Check the build is on main.
   Open https://github.com/willgaze/turnup/blob/main/docs/cowork-ios-signing.md
   If GitHub says "404" or "file not found", STOP and tell me: pull
   request #46 has to be merged first, or step 11 runs an old build that
   names no Apple team and fails.

0. Check the tools.
   Open Terminal and run:

     gh auth status

   If it says "Logged in to github.com account willgaze", carry on.
   If it says "command not found": run  brew install gh  and try again.
   If brew is also missing, download the macOS installer from
   https://cli.github.com, install it, and try again.
   If it says "not logged in": run  gh auth login , choose GitHub.com,
   HTTPS, "Login with a web browser", and approve it in the browser.

1. Check the membership.
   Open https://developer.apple.com/account and sign in with my Apple ID
   (approve the two-factor prompt on my phone when it appears; I will tap it).
   Top right should show team WTS45T2YD3. If it does not, STOP and tell me.

2. Register the App Group.
   Open https://developer.apple.com/account/resources/identifiers/list/applicationGroup
   Press the blue + beside Identifiers, choose "App Groups", Continue.
   Description: TurnUp shared
   Identifier:  group.com.getturnup.app
   Continue, then Register.
   If it says the identifier is already in use, that is fine: carry on.

3. Register the app.
   Open https://developer.apple.com/account/resources/identifiers/add/bundleId
   Choose "App IDs", Continue, then "App", Continue.
   Description: TurnUp
   Bundle ID:   Explicit, com.getturnup.app
   Under Capabilities tick "App Groups". Continue, then Register.
   Then open it from the Identifiers list, press "Configure" (or "Edit")
   beside App Groups, tick group.com.getturnup.app, Continue, Save.
   (If it already exists, open it and make sure App Groups is ticked with
   that group; do not make a second one.)

4. Register the lock-screen card.
   Same page again: https://developer.apple.com/account/resources/identifiers/add/bundleId
   App IDs, App.
   Description: TurnUp lock screen
   Bundle ID:   Explicit, com.getturnup.app.widget
   Tick "App Groups", Register, then Configure it with
   group.com.getturnup.app exactly as in step 3.

5. Make the distribution key and request.
   In Terminal, one line at a time:

     mkdir -p ~/TurnUp-iOS && cd ~/TurnUp-iOS && chmod 700 .
     /usr/bin/openssl genrsa -out dist.key 2048
     /usr/bin/openssl req -new -key dist.key -out dist.csr -subj "/CN=TurnUp iOS distribution/O=WTS45T2YD3/C=GB"
     ls

   The last line should list dist.csr and dist.key.

6. Get the certificate.
   Open https://developer.apple.com/account/resources/certificates/add
   Choose "Apple Distribution", Continue.
   Choose File and pick ~/TurnUp-iOS/dist.csr. Continue.
   Press Download. It saves distribution.cer to ~/Downloads.
   If Apple says you already have the maximum number of distribution
   certificates, STOP and tell me. Do not revoke one.

7. Bundle it into a .p12 with a password nobody has to type.
   In Terminal:

     cd ~/TurnUp-iOS
     mv ~/Downloads/distribution.cer dist.cer
     /usr/bin/openssl x509 -inform DER -in dist.cer -out dist.pem
     /usr/bin/openssl rand -base64 24 > p12.password
     /usr/bin/openssl pkcs12 -export -inkey dist.key -in dist.pem -out dist.p12 -passout file:p12.password
     /usr/bin/openssl pkcs12 -in dist.p12 -nokeys -passin file:p12.password | grep -c "BEGIN CERTIFICATE"

   The last line should print 1. If it prints an error instead, STOP and
   tell me the first line of the error (never the password).

8. Make the App Store Connect key.
   Open https://appstoreconnect.apple.com/access/integrations/api
   If it asks to request access to the API, press Request Access and accept.
   Press the + (Generate API Key).
   Name:   TurnUp GitHub build
   Access: Admin
   Press Generate. On the new row press "Download API Key" and confirm.
   It saves a file named AuthKey_XXXXXXXXXX.p8 to ~/Downloads. Apple lets
   you download it ONCE.
   Note two things from the page, into a scratch note on this Mac only,
   never into this chat: the Key ID (the 10 characters on the row) and the
   Issuer ID (the long id above the table).
   Then in Terminal:

     mv ~/Downloads/AuthKey_*.p8 ~/TurnUp-iOS/
     ls ~/TurnUp-iOS

9. Make the app's record at Apple (TestFlight needs one to upload into).
   Open https://appstoreconnect.apple.com/apps
   Press + then "New App".
   Platform: iOS
   Name: TurnUp (if Apple says the name is taken, use "TurnUp for trades")
   Primary language: English (UK)
   Bundle ID: com.getturnup.app
   SKU: turnup-ios
   User access: Full Access
   Press Create. Nothing is published by this; it is only a record.

10. Hand the five secrets to GitHub from Terminal.
    Replace KEYID and ISSUERID with the two values from step 8, typed into
    Terminal yourself:

      cd ~/TurnUp-iOS
      base64 -i dist.p12 | gh secret set IOS_CERT_P12 -R willgaze/turnup
      gh secret set IOS_CERT_PASSWORD -R willgaze/turnup < p12.password
      base64 -i AuthKey_*.p8 | gh secret set ASC_KEY_P8 -R willgaze/turnup
      gh secret set ASC_KEY_ID -R willgaze/turnup --body "KEYID"
      gh secret set ASC_ISSUER_ID -R willgaze/turnup --body "ISSUERID"
      gh secret list -R willgaze/turnup

    The last command should list all five names: ASC_ISSUER_ID, ASC_KEY_ID,
    ASC_KEY_P8, IOS_CERT_P12, IOS_CERT_PASSWORD. It never shows the values.

11. Switch the build on and run it once.

      gh variable set IOS_SIGNING_READY -R willgaze/turnup --body true
      gh workflow run ios.yml -R willgaze/turnup --ref main

    Then open https://github.com/willgaze/turnup/actions/workflows/ios.yml
    The top run should go yellow (running) within a minute. It takes about
    15 to 25 minutes. Wait for it.
    Green: tell me "iOS build green". Within half an hour Apple emails that
    a build is ready in TestFlight.
    Red: open the run, open the red job, scroll to the first red line, and
    tell me the step name and that line. Do not change anything at Apple to
    fix it; the build is mine to fix.

Rules:
- Never paste a key, a password, a Key ID, an Issuer ID, or the contents of
  any file in ~/TurnUp-iOS into this chat.
- Do not delete ~/TurnUp-iOS or anything in it.
- Do not revoke any certificate or key at Apple, and do not touch the
  Pass Type ID certificate (that is the Wallet card, and it works).
- If Apple asks me to buy, upgrade or agree to anything new, stop and tell me.
- If anything does not match what is written here, stop and tell me what the
  screen says rather than guessing.
```

---

## Why it is shaped like this

- **The key is made with `/usr/bin/openssl`, not Homebrew's.** macOS ships
  LibreSSL there, whose `.p12` the runner's `security import` reads. OpenSSL 3
  writes a `.p12` with an algorithm macOS's keychain refuses unless `-legacy`
  is passed, and that failure would surface twenty minutes into a Mac build.
- **The `.p12` password is random and lives in a file**, so it is never typed,
  never read aloud, and goes to GitHub by redirect.
- **The App Store Connect key is Admin** because the workflow archives with
  `-allowProvisioningUpdates`: Xcode makes and refreshes the provisioning
  profiles itself with that key, which a lesser role is not allowed to do.
  That is also why there is no profile to download here.
- **The workflow names the team** (`DEVELOPMENT_TEAM` on the archive and
  `teamID` in the export options). Capacitor's project has none, and automatic
  signing with no team fails before it starts.
- **It ends in a run, not a claim.** "Five secrets set" is not the same as a
  build at Apple, and the gap between them is where it stalls.

## After it is green

M3 on the app plan is done when the `build` job in `ios.yml` succeeds. Then
M4: TestFlight on the phone, tap On my way on the test job #2742 (code
`CUTH4PGX`), and press On site from the lock screen.

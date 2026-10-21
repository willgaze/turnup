# The Apple Wallet certificate, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. The Apple Developer enrolment went through on
21 Oct 2026, so the one thing between the built pass and a card in a wallet
is this certificate. A Claude session cannot start Cowork, and must not make
the key (it would die with the container, and the certificate with it); it
hands over the prompt. On the Mac the key lives in a folder that stays.

**Check first.** If `https://www.getturnup.com/api/passes/<any live code>`
already answers 200, this job is done and must not be run again: a second
certificate for the same pass type is a second key, and the one Vercel holds
is the one that signs.

---

```
Set up the Apple Wallet signing certificate for TurnUp, on this Mac, in one go.

Everything lands in the folder ~/TurnUp-Apple. Do not delete it afterwards:
the private key in it is the only one the certificate works with.

0. Check the membership is live.
   Open https://developer.apple.com/account and sign in with my Apple ID
   (approve the two-factor prompt on my phone when it appears; I will tap it).
   If the page shows "Certificates, Identifiers & Profiles" in the left-hand
   list, carry on. If it still says the enrolment is pending or under review,
   STOP and tell me. Nothing below can work until it is live.

1. Make the key and the request.
   Open Terminal and run, one at a time:

     mkdir -p ~/TurnUp-Apple/scripts && cd ~/TurnUp-Apple
     curl -fsSL https://raw.githubusercontent.com/willgaze/turnup/main/scripts/apple-wallet.sh -o scripts/apple-wallet.sh
     bash scripts/apple-wallet.sh csr

   The last lines should say "Done. Upload this file to Apple:" and a path
   ending in apple/pass.csr. If it says "Stopped:", tell me what it says.

2. Register the pass type.
   Open https://developer.apple.com/account/resources/identifiers/list/passTypeId
   Press the blue + beside Identifiers.
   Choose "Pass Type IDs", Continue.
   Description: TurnUp job card
   Identifier:  pass.com.getturnup.job
   Continue, then Register.
   If it says that identifier already exists, that is fine: carry on.

3. Get the certificate.
   Open https://developer.apple.com/account/resources/certificates/add
   Under "Services" choose "Pass Type ID Certificate", Continue.
   Pick pass.com.getturnup.job from the list, Continue.
   Choose File, and pick ~/TurnUp-Apple/apple/pass.csr. Continue.
   Press Download. It saves pass.cer to ~/Downloads.

4. Turn it into settings.
   Back in Terminal:

     cd ~/TurnUp-Apple && bash scripts/apple-wallet.sh finish ~/Downloads/pass.cer

   The last lines should say "Done. Team ..., pass type pass.com.getturnup.job,
   certificate good until <a date>". Write that date down for step 7.
   If it says "This certificate was not made from", STOP and tell me.

5. Put the six settings into Vercel.
   The file ~/TurnUp-Apple/apple/turnup.env has six lines, each KEY=value.
   Four of the values are very long single lines; that is correct.
   Open https://vercel.com/willgazes-projects/turnup/settings/environment-variables
   For each of the six lines:
     Key:   the part before the first =
     Value: everything after the first = (the whole rest of the line)
     Environments: Production only
     Turn on "Sensitive"
     Save
   If a key with that name already exists, edit it rather than adding a second.
   The six keys are:
     PASSKIT_CERT_PEM
     PASSKIT_KEY_PEM
     PASSKIT_KEY_PASSWORD
     PASSKIT_WWDR_PEM
     PASSKIT_PASS_TYPE_ID
     PASSKIT_TEAM_ID

6. Redeploy.
   Open https://vercel.com/willgazes-projects/turnup/deployments
   On the top Production deployment press the three dots, then Redeploy,
   then Redeploy again in the box. Wait for it to say Ready (about two
   minutes).

7. Prove it worked.
   Open https://www.getturnup.com/dashboard and sign in (my password is on the
   Credentials page in Notion; never paste it into this chat). Open any job
   and copy the 8-letter code from its link, the part after /t/.
   In Terminal, with that code in place of CODE:

     curl -s -o /dev/null -w '%{http_code}\n' https://www.getturnup.com/api/passes/CODE

   200 means a signed pass is being served. 503 means Vercel is missing a
   setting: go back to step 5 and check all six are there, Production,
   then redeploy again.
   Then open that job's page, https://www.getturnup.com/t/CODE, in Safari
   on this Mac and press "Add to Apple Wallet". The card should open in
   a Wallet preview. Tell me what it shows.

   Last: put the certificate expiry date from step 4 in my Google Calendar
   as an all-day event one month before it, titled
   "TurnUp: Apple Wallet certificate expires in a month, re-run the Cowork job".

Rules:
- Never paste a key, a password, or the contents of turnup.env, pass.key or
  key.password into this chat. Read them from the files and type them into
  Vercel yourself.
- Do not delete ~/TurnUp-Apple or anything in it.
- Do not make a second certificate or revoke anything at Apple.
- If Apple or Vercel asks me to buy, upgrade or agree to anything new, stop
  and tell me.
- If anything does not match what is written here, stop and tell me what the
  screen says rather than guessing.
```

---

## After it is in a wallet

- `src/app/preview/posters/Posters.jsx` carries the badge "Built · awaiting
  Apple" on the wallet frame; change it the day the first real card is in a
  wallet.
- The roadmap item `wallet-pass` in `src/lib/roadmap.js` moves to `live`, and
  the plan's STATUS row goes green, in the same push.
- The pass does not yet update itself: that is the PassKit web service
  (`/api/passes/v1/...`) and an APNs push, the next build after this.
- The lock-screen app is the other thing the membership unlocks; its own
  Cowork job (App ID, App Group, distribution certificate, App Store Connect
  key, GitHub secrets) is still to be written. See `native/README.md`.

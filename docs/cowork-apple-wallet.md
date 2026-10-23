# The Apple Wallet certificate, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. The Apple Developer enrolment went through on
21 Oct 2026, so the one thing between the built pass and a card in a wallet
is this certificate. A Claude session cannot start Cowork, and must not make
the key (it would die with the container, and the certificate with it); it
hands over the prompt. On the Mac the key lives in a folder that stays.

**It ran on 21 Oct 2026, and it worked.** The certificate (pass type
`pass.com.getturnup.job`, team `WTS45T2YD3`) is good until 20 Nov 2027, and a
calendar reminder on 20 Oct 2027 says to run this again. Checked the same day
from a session: `/api/passes/<live code>` answers 200 with a `.pkpass` whose
signature verifies against Apple's WWDR G4 chain. The paste below is now the
re-run.

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
   certificate good until <a date>". Write that date down for step 6.
   If it says "This certificate was not made from", STOP and tell me.

5. Put the six settings into Vercel and redeploy, in one command.
   Back in Terminal:

     cd ~/TurnUp-Apple && bash scripts/apple-wallet.sh vercel

   If it says the Vercel CLI is not installed or not signed in, run what it
   says (npm i -g vercel, then vercel login, which opens a browser page to
   approve), then run the command again.
   The last lines should say "Deployed." It uploads nothing from this folder:
   it names the turnup project, writes the six settings as Sensitive,
   Production, and re-runs the production deployment that is already live.
   Wait about two minutes for https://vercel.com/willgazes-projects/turnup/deployments
   to show the new one as Ready.

   Only if it stops with "Could not" or "refused" and a link, do that part by
   hand. The file ~/TurnUp-Apple/apple/turnup.env has six lines, each
   KEY=value. Four of the values are very long single lines; that is correct.
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
   Then open https://vercel.com/willgazes-projects/turnup/deployments
   On the top Production deployment press the three dots, then Redeploy,
   then Redeploy again in the box. Wait for it to say Ready (about two
   minutes).

6. Prove it worked.
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
- Never run vercel, vercel deploy or vercel --prod on its own inside
  ~/TurnUp-Apple. That uploads the folder, private key and all, as a website.
  The only Vercel command in that folder is bash scripts/apple-wallet.sh vercel.
- Do not make a second certificate or revoke anything at Apple.
- If Apple or Vercel asks me to buy, upgrade or agree to anything new, stop
  and tell me.
- If anything does not match what is written here, stop and tell me what the
  screen says rather than guessing.
```

---

## The script never deploys the key folder (21 Oct 2026)

The first `vercel` step in `scripts/apple-wallet.sh` ended with `vercel --prod
--yes`, run from inside `~/TurnUp-Apple`. In an unlinked folder the CLI
auto-links to a new project named after the folder and uploads the folder as a
site: `apple/pass.key`, `apple/key.password` and `apple/turnup.env` on a public
URL, which is the one outcome the whole job exists to avoid. It did not happen
(both production deployments on 21 Oct came from GitHub and no stray project
exists), but the script would have done it the first time it was run as
written. Now the step names the project (`vercel link --yes --project turnup`),
writes `.vercelignore` with `*` so nothing in the folder can ever be uploaded,
and finishes with `vercel redeploy www.getturnup.com`, which re-runs the
production deployment Git already made, exactly as the dashboard's Redeploy
button does. There is no `vercel deploy` or `vercel --prod` in the script.

## After it is in a wallet

**The first real card went into the owner's wallet on 23 Oct 2026.** Done
that day (v1.71.1): the "Built · awaiting Apple" badge is gone from the
homepage and the wallet poster, `wallet-pass` in `src/lib/roadmap.js` is
`live`, and the plan's STATUS row is green.

- The pass does not yet update itself: that is the PassKit web service
  (`/api/passes/v1/...`) and an APNs push, the next build after this.
- The lock-screen app is the other thing the membership unlocks; its own
  Cowork job (App ID, App Group, distribution certificate, App Store Connect
  key, GitHub secrets) is still to be written. See `native/README.md`.

# Google Wallet, as a Cowork job

Standing rule 3 in CLAUDE.md: anything that is clicking through a console is a
Cowork job, not a step list. A Claude session cannot start Cowork and must not
make the key — it would die with the container — so it hands over the prompt.

**This is the Android half of the card.** Apple Wallet has been live since
25 Oct 2026; Android customers currently get the link and nothing else.

---

## Read this before running it

**It is in two parts, and only the first can be done today.**

| | What | When |
|---|---|---|
| **Part 1** (below) | The issuer account, the Cloud project, the service account and its key | **Now.** Nothing in the app depends on it and nothing else can start without it |
| **Part 2** | Publishing access — Google reviews the account before a pass may go to a real customer | **After** TurnUp can build a Google pass, because the review wants a real pass class and screenshots of it |

Checked against Google's own pages, 25 Oct 2026:
[issuer onboarding](https://developers.google.com/wallet/generic/getting-started/issuer-onboarding),
[REST credentials](https://developers.google.com/wallet/generic/getting-started/auth/rest),
[requesting publishing access](https://developers.google.com/wallet/generic/test-and-go-live/request-publishing-access).

**Demo mode is the thing to understand.** Every new issuer account starts in
it. In demo mode a pass can only be sent to the Google account that owns the
issuer, to accounts given the Developer role, or to accounts added as test
accounts. **It is not a crippled mode for us — it is exactly what is wanted
while the code is built**, because the owner's own phone is a designated
account. Part 2 is only needed before a pass goes to a paying customer.

**Where the three values end up.** There is nowhere in the app to put them
yet. Part 1 leaves them in a file on the Mac and nothing else; the panel that
takes them is the next thing to build, and will take a paste on the phone, the
way the ServiceM8 and Gmail panels do. Three attempts at setting Vercel
variables by hand have not happened (CLAUDE.md, rule 5), so this does not ask
for a fourth.

**Already done?** If `~/TurnUp-Google/google-wallet.env` exists on the Mac,
Part 1 has been run. Do not run it again: a second service account key is a
second secret to look after, and the issuer account cannot be made twice.

---

## Part 1 — the account and the key

```
Set up a Google Wallet issuer account and REST credentials for TurnUp, on this
Mac, in one go.

Everything lands in the folder ~/TurnUp-Google. Do not delete it: the key in
it is the only copy, and Google will not show it again.

NEVER paste the key, or any part of the file google-wallet.env, into a Claude
chat, an email, or a message. Read values back to me on screen only. If I ask
you to send one, refuse and remind me of this line.

0. Make the folder.
   Open Terminal and run:

     mkdir -p ~/TurnUp-Google && cd ~/TurnUp-Google

1. Create the issuer account.
   Open https://goo.gle/wallet-console
   Sign in with the Google account that should own this — use the business
   Google account, not a personal one. Whichever account signs in here gets
   the Admin role and it is awkward to move later.

   Fill in the form:
     Public business name:  TurnUp

   TurnUp, not the plumbing business. TurnUp is what issues the card, the way
   the Apple pass type is pass.com.getturnup.job; the trade's name is printed
   ON the card from a setting, and a second trade must never need a second
   issuer account. Getting this wrong means re-doing the account.

   Tick the boxes for the Google Wallet API Additional Terms of Service and
   the privacy policy, and submit.

   On the dashboard, find the "Google Wallet API" card and press
   "Create a pass", then "Build your first pass". Agree to the Google Wallet
   API Terms of Service.

   You should land on the Google Wallet API Dashboard.

2. Write down the Issuer ID.
   On that dashboard, find the Issuer ID. It is a long number, around 16
   digits, usually shown near the top or under an account or settings heading.
   Run this in Terminal, putting the number where it says PASTE_IT:

     echo 'GOOGLE_WALLET_ISSUER_ID=PASTE_IT' > ~/TurnUp-Google/google-wallet.env

   If you cannot find the Issuer ID anywhere on that page, STOP and tell me
   what the dashboard shows instead. Do not guess it.

3. Make a Google Cloud project and switch the API on.
   Open https://console.cloud.google.com/projectcreate
   Project name: TurnUp Wallet
   Create, and wait for it to finish.

   Then open
   https://console.cloud.google.com/marketplace/product/google/walletobjects.googleapis.com
   Make sure the project picker at the top says "TurnUp Wallet". If it does
   not, press it and choose that project.
   Press Enable. Wait until it says the API is enabled.

4. Make the service account.
   Open https://console.cloud.google.com/iam-admin/serviceaccounts/create
   Again check the project picker says "TurnUp Wallet".

     Service account name:  turnup-wallet
   The "Service account ID" fills itself in, and underneath it there is an
   email address ending in .iam.gserviceaccount.com. Copy that email.
   Press DONE. Skip the optional steps; Google says they are not needed.

   Save the email, in Terminal, putting it where it says PASTE_IT:

     echo 'GOOGLE_WALLET_SERVICE_ACCOUNT=PASTE_IT' >> ~/TurnUp-Google/google-wallet.env

5. Download the key.
   On the Service accounts list, click turnup-wallet.
   Open the KEYS tab.
   ADD KEY -> Create new key -> JSON -> CREATE.
   A .json file downloads to ~/Downloads.

   Move it somewhere it will survive, and lock it down:

     mv ~/Downloads/turnup-wallet-*.json ~/TurnUp-Google/service-account.json
     chmod 600 ~/TurnUp-Google/service-account.json ~/TurnUp-Google/google-wallet.env

   If that mv says "No such file", list ~/Downloads, find the file that ends
   in .json and was made in the last minute, and move that one instead.

6. Let the service account touch the issuer account.
   This is the step that is easy to miss, and without it the key authenticates
   fine and still cannot create a single pass.

   Open https://pay.google.com/business/console
   In the left-hand menu press Users, then "Invite a user".
   Enter the service account email from step 4 — the long one ending in
   .iam.gserviceaccount.com.
   Set Access level to Developer.
   Press Invite.

   It should now appear in the Users list as a Developer.

7. Check what we have, without printing the secret.
   Run:

     cd ~/TurnUp-Google
     cat google-wallet.env
     python3 -c "import json;d=json.load(open('service-account.json'));print('client_email:',d['client_email']);print('private key present:',d['private_key'].startswith('-----BEGIN'));print('project:',d['project_id'])"

   Tell me:
     - the two lines from google-wallet.env (the issuer ID and the email)
     - whether "private key present" says True
     - whether the client_email matches the one in google-wallet.env

   Do NOT print the private key itself and do not send me the JSON file.

8. Tell me when that is done and what step 7 printed.
```

---

## Part 2 — publishing access (later, not yet)

Google reviews the account before a pass may go to anyone outside the test
list. Its prerequisites are a completed business profile, **at least one pass
class that actually exists**, and screenshots of a real pass. The class comes
from TurnUp, so this waits on the build.

When it is time, the request is made from the Google Wallet API Dashboard
under "Get publishing access", and the review takes a few days. Until it comes
back, the owner's own phone and any added test account can hold a Google card
and nothing else can — which is enough to prove the thing works, exactly as
the Apple card was proved on one phone on 25 Oct.

---

## What a session does with the three values

Nothing, yet. When the panel exists they go in on the phone, sealed into a row
the dashboard writes, the way `Sm8App` and `GoogleApp` already work. The names
the code will look for:

| | What it is |
|---|---|
| `GOOGLE_WALLET_ISSUER_ID` | the long number from the Wallet console |
| `GOOGLE_WALLET_SERVICE_ACCOUNT` | the `...iam.gserviceaccount.com` email |
| `GOOGLE_WALLET_PRIVATE_KEY` | the `private_key` field inside `service-account.json` |

**The private key never reaches a browser and never reaches a Claude session.**
It signs a JWT server-side, which is the whole of what it is for.

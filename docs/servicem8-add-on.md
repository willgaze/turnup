# Connecting TurnUp to ServiceM8 as an add-on

*For Will. About fifteen minutes, once. Everything TurnUp does with ServiceM8
today runs on the API key; this adds the one thing the key cannot do, which is
write into the job diary.*

## What you get

Every TurnUp event on a job that follows ServiceM8 appears in that job's diary
as a line from TurnUp: set off 07:42, on site 08:10, paused with the note, done,
booking terms agreed, no one home with what was tried, running late, and each
reply the customer gave (still fine, someone else will be in, wants to move it,
will wait, another day). The diary becomes the one record, with nothing copied
by hand.

## The steps

1. **Register as a developer.** Go to
   [servicem8.com/developer-registration](https://www.servicem8.com/developer-registration)
   and sign up. Use your normal ServiceM8 login details where it asks; the
   developer account sits beside your business account.

2. **Create the app.** Log in to [go.servicem8.com](https://go.servicem8.com),
   open the main menu and click **Developer**. Click **Add Item**. Name it
   **TurnUp**. Where it asks for the type, pick the option that is *not* a
   Simple Function (it will be called something like **Web Service Hosted** or
   **Public Application**): that is the kind that gets an App ID and App
   Secret. Save.

3. **Set the Return URL.** On the app's page (ServiceM8 calls it Store Connect)
   set the Return URL to exactly:

   ```
   https://www.getturnup.com/api/servicem8/oauth/callback
   ```

   Leave it unlisted. You do not need to submit it to the Store for it to
   work on your own account.

4. **Copy the two values.** The page now shows an **App ID** and an **App
   Secret**. Keep the secret private.

5. **Put them in Vercel.** Open
   [Vercel → turnup → Environment Variables](https://vercel.com/willgazes-projects/turnup/settings/environment-variables).
   Add `SM8_APP_ID` with the App ID and `SM8_APP_SECRET` with the App Secret,
   both for **Production**, both marked Sensitive. Then
   [Deployments](https://vercel.com/willgazes-projects/turnup/deployments) →
   **⋯** on the top one → **Redeploy**. About a minute.

6. **Connect.** Open [your dashboard](https://www.getturnup.com/dashboard) →
   Setup and settings → **ServiceM8** → **Connect ServiceM8 as an add-on**.
   ServiceM8 asks you to allow two things (write diary items, read the
   account name). Allow, and you land back on the
   dashboard with the panel saying connected.

7. **Check it.** Move any card that follows a ServiceM8 job (your Thimbles job
   2742 is fine) to On my way and back. Open the job in ServiceM8: two new diary
   lines from TurnUp.

## If something is off

- **The Connect button is missing:** the two Vercel settings are not in, or the
  redeploy has not run. The panel says which.
- **ServiceM8 says the redirect does not match:** the Return URL in step 3 must
  be the exact line above, no trailing slash, `www` included.
- **Connected but nothing in the diary:** look under ServiceM8 → Lately on the
  dashboard. A `diary.write` line with `error:` says what ServiceM8 answered.
  Disconnect and connect again if the token was revoked.

## What it does not do, on purpose

- It sends no texts through the add-on. Texts already go through ServiceM8 on
  the key (Send the link via ServiceM8), charged to your normal SMS allowance.
- It never reads the diary: ServiceM8 does not let add-ons read it, only write.
- The tokens are held encrypted in TurnUp's database. Disconnect the add-on on
  the dashboard and they are deleted; revoke it in ServiceM8 and they stop
  working.

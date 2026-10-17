# TurnUp on the lock screen: the native shell

The web app has gone as far as iOS lets a web app go. Notifications reach the
lock screen; buttons on them and a live card that updates in place do not,
because both are **Live Activities**, and only a native app can show one.

This folder is that app. It is deliberately thin:

- **One screen: the dashboard, loaded from www.getturnup.com.** No second copy
  of the UI to keep in step. `capacitor.config.json` points the WebView at the
  live site, so a web build on Vercel is an app update with no App Store
  release.
- **One Live Activity for the job you are on** (`ios/App/TurnUpWidget`): the
  stage, the time it was tapped, the customer's first name and the street, the
  note, and buttons for what comes next: On site, Paused, Back on site, Job
  done. On the lock screen and in the Dynamic Island. No countdown, no
  "arriving in": it reports what happened and predicts nothing, same as the
  customer's card.
- **The buttons are real taps.** `SetStageIntent.swift` PATCHes the same
  tracker route the dashboard does, with a bearer token the app fetched from
  `/api/dashboard/native-token` and stored in the App Group. Same record, same
  push to the customer, same ServiceM8 diary line. The dashboard's next poll
  updates the activity; nothing on the lock screen guesses.
- **The dashboard drives it** (`src/lib/native.js`): every load calls
  `LiveActivity.sync` with the first active job that is On my way, On site or
  Paused, ends it on Job done, and is a no-op in a browser.

## What needs Apple

Everything here is written and nothing here is compiled: this container has no
Xcode. The project builds on a Mac, or on the GitHub macOS runner in
`.github/workflows/ios.yml`, once three things exist:

1. **Apple Developer Program membership** (individual, £79). The enrolment is
   currently stuck "under review"; see the chat of 14 Oct 2026 for the call.
2. **An App ID `com.getturnup.app` with the App Groups capability**, a group
   `group.com.getturnup.app`, and the same group on `com.getturnup.app.widget`.
   Xcode's automatic signing creates these when signed in; the workflow uses
   an App Store Connect API key instead.
3. **Repository secrets** for the workflow: `IOS_CERT_P12` (base64 of the
   distribution certificate), `IOS_CERT_PASSWORD`, `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, `ASC_KEY_P8` (base64). Set the repository variable
   `IOS_SIGNING_READY=true` and the workflow runs on every push to `native`,
   builds, and uploads to TestFlight. Will installs TestFlight on the iPhone
   and gets the build in minutes.

## Building on a Mac, by hand

    cd native && npm install
    npx cap sync ios
    ruby add-widget.rb          # adds the widget target to the Xcode project
    cd ios/App && pod install
    open App.xcworkspace        # pick your team under Signing, run on the phone

`add-widget.rb` is idempotent and is also what the workflow runs. It exists
because Capacitor's generated project has no widget target, and a WidgetKit
extension is a second target with its own bundle id, entitlements and plist.

## What it does not do yet

- **Arrival by location.** A geofence at the job address that asks "looks like
  you've arrived, On site?" is the obvious next piece and needs the native
  app's Always-location permission; the research notes in
  `docs/research/research_notes` cover the limits. Not started.
- **Push-driven activity updates.** When ServiceM8's Check In moves the stage
  while the app is closed, the lock screen learns on the next open. ActivityKit
  push (an APNs `liveactivity` push from the server) fixes that and needs the
  same Apple membership plus an APNs key.
- **Android.** Notification action buttons would give Android most of this from
  the web app alone. Nobody using TurnUp is on Android yet.

# Native push setup (APNs for iOS, FCM for Android)

The code path is complete and ships **dark**: until the env/keys below exist,
the delivery cron returns a dry-run and no native sends happen. This doc lists
the exact steps to turn it on. The `.p8` and the Firebase service-account JSON
are env-only (never commit them). Note: `android/app/google-services.json` is
**not** currently git-ignored (the line in `android/.gitignore` is commented
out) — uncomment it before dropping the file in if you'd rather not commit it.

## What's already wired in the repo

- `@capacitor/push-notifications` installed and synced into **iOS**
  (`ios/App/CapApp-SPM/Package.swift`, `capacitor.config.json`) and **Android**
  (`android/capacitor.settings.gradle`, `capacitor.build.gradle`).
- iOS: APNs forwarding methods in `ios/App/App/AppDelegate.swift`,
  `aps-environment` in `ios/App/App/App.entitlements`, and
  `CODE_SIGN_ENTITLEMENTS` set for Debug + Release in the Xcode project.
- Client registration: `lib/push/native.ts` (+ `reminders.ts` facade) registers
  on the reminders opt-in and deep-links taps to `/prayers/morning|evening`.
- Server send: `app/api/cron/push-deliver/route.ts` → `lib/push/providers/{apns,fcm}.ts`.
- Token storage: `device_push_tokens` table (migration
  `supabase/migrations/20260613_device_push_tokens.sql`) — **apply this migration**.

## iOS — APNs

1. **Apple Developer Program** membership (paid) for the team that owns
   `net.purifyapp.purify`.
2. **APNs Auth Key**: developer.apple.com → Certificates, IDs & Profiles → Keys →
   `+` → enable **Apple Push Notifications service (APNs)** → download the `.p8`
   (you can only download once). Note the **Key ID** and your **Team ID**.
3. **Enable the capability on the App ID**: Identifiers → `net.purifyapp.purify`
   → enable **Push Notifications**. (With Automatic signing, opening the project
   in Xcode and adding the Push Notifications capability will also do this and
   regenerate the provisioning profile.)
4. **Server env** (Render → the web service):
   - `APNS_KEY_P8` = base64 of the `.p8` file contents
     (`base64 -w0 AuthKey_XXXX.p8`)
   - `APNS_KEY_ID` = the Key ID
   - `APNS_TEAM_ID` = your Team ID
   - `APNS_BUNDLE_ID` = `net.purifyapp.purify`
   - `APNS_PRODUCTION` = `true` for App Store / TestFlight builds (the entitlement
     auto-switches to `production` at archive time); leave unset for sandbox/dev.
5. **Build**: `npx cap sync ios`, open `ios/App` in Xcode, confirm the **Push
   Notifications** capability is present, set signing, archive, submit. Push
   requires a real device (the simulator can't receive APNs).

## Android — FCM

1. **Firebase project** (console.firebase.google.com) → add an **Android app**
   with package `net.purifyapp.purify` → download **`google-services.json`** →
   place it at `android/app/google-services.json`. The Gradle scaffolding already
   applies the plugin when the file is present.
2. **Service account** (for server sends): Firebase → Project settings → Service
   accounts → Generate new private key → JSON.
   - `FCM_SERVICE_ACCOUNT_JSON` = base64 of that JSON file
     (`base64 -w0 service-account.json`) on Render.
   - iOS does **not** use Firebase here (we send APNs directly), so no APNs-key
     upload to Firebase is needed.
3. **Build**: `npx cap sync android`, open `android/` in Android Studio, build a
   signed AAB, submit to Play.

## Verify

- **Dry-run (no creds)**: `GET /api/cron/push-deliver` →
  `{"ok":true,"web":{...},"native":{"mode":"dry-run",...}}`.
- **On device** (per platform): install the build → onboarding "prayer
  reminders" → grant the OS prompt → a row appears in `device_push_tokens` with
  the right `platform` → trigger the cron at the user's morning/evening hour →
  the notification arrives → tapping it deep-links to `/prayers/morning`.

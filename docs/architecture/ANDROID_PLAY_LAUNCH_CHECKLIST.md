# Purify — Android / Google Play Launch Checklist

Audited 2026-06-15. Android is the **primary launch lane** (Google Play account
is paid + verified; Apple is on hold, so iOS is documented-but-parked).
Legend: ✅ ready · ⚠️ verify/needs action · ❗ blocker · ⬜ to do.

Scope: wrapper-first Capacitor shell, low-risk polish only. No repo restructure,
no web-app changes, no native rewrite.

## Build output

- ✅ **APK or AAB?** `android-apk.yml` builds **both** — `app-release.aab`
  (Play upload), `app-release.apk` + `app-debug.apk` (sideload testing) — via
  `gradlew assembleDebug assembleRelease bundleRelease`, published to the
  `android-release` GitHub release.
- ✅ **Do we need an AAB?** Yes — Play Console requires an **AAB** for new apps.
  It's produced. (The APKs are for direct device testing only.)

## App identity & versioning

- ✅ **Application ID / package:** `net.purifyapp.purify` (consistent across
  `build.gradle` `namespace`+`applicationId`, `strings.xml` `package_name`, and
  `custom_url_scheme`).
- ⚠️ **versionCode / versionName:** `versionCode 1`, `versionName "1.0"`.
  Fine for the first upload; **every subsequent Play upload needs a higher
  `versionCode`**. Decide the launch version string (e.g. `1.0.0`).
- ✅ **SDK targets:** `minSdk 24`, `compileSdk 36`, **`targetSdk 36`** — above
  Play's current target-API floor (35), so no SDK-level rejection.

## Theme, icons, splash

- ❗→✅ **`colors.xml` was MISSING** (styles.xml referenced undefined
  `@color/colorPrimary|colorPrimaryDark|colorAccent`) → **resource-linking build
  break**. **Fixed**: added `res/values/colors.xml` (grayscale `#101013`).
  Re-run the workflow to confirm a green build.
- ⚠️ **App icon:** adaptive icon present (`mipmap-anydpi-v26/ic_launcher.xml` +
  `ic_launcher_foreground.png` over `ic_launcher_background` `#FFFFFF`). Confirm
  the foreground is the current brand three-bar cross; regenerate via
  `npx capacitor-assets generate` from a 1024 source if stale. A **512×512 icon**
  is also required for the Play listing.
- ⚠️ **Splash:** `drawable-*/splash.png` present (all densities, port+land) via
  `Theme.SplashScreen` → `@drawable/splash`. Verify background `#101013` + brand
  mark; regenerate if it predates the new palette.
- ✅ **Status-bar color/style:** Capacitor `StatusBar` `DARK` @ `#101013` at
  runtime; `colorPrimaryDark` now `#101013`.
- ⚠️ **Navigation-bar color:** not explicitly set (system default). Optional
  polish — set via the StatusBar/NavigationBar plugin if a tinted nav bar is wanted.

## Permissions

- ✅ **Manifest permissions:** `INTERNET` + **`POST_NOTIFICATIONS`** (just added —
  required on Android 13+; the push plugin's manifest did not declare it, so
  reminders would silently fail without it). Minimal permission set = simpler
  Play **Data safety** form.

## In-app behavior to verify on a device build

- ⚠️ **External link behavior:** `server.allowNavigation` is locked to
  `purifyapp.net`, `*.purifyapp.net`, `*.supabase.co`; `@capacitor/browser` is
  not installed. Verify off-domain links (social, donate, email) open in the
  **system browser**, not a dead WebView.
- ⚠️❗ **Google sign-in inside the WebView:** Google **blocks OAuth in embedded
  WebViews** (`disallowed_useragent` / `403 disallowed_useragent`), and the shell
  appends `PurifyNative` to the UA. **High risk** — verify on a real Android
  build. If blocked, route Google auth through **Chrome Custom Tabs** (Browser
  plugin) or a native Google Sign-In, or rely on email auth for v1. Decide before
  upload.
- ⚠️ **Back-button behavior:** hardware back maps to WebView history (Capacitor
  default); verify it exits cleanly at the app root (no blank/stuck screen).
- ✅ **Privacy / Terms / Support links:** `/privacy`, `/terms`, `/support` routes
  exist and are live; **the Play listing requires the privacy-policy URL**
  (`https://purifyapp.net/privacy`).

## Signing & release

- ✅ **Signing setup:** release signed in CI from secrets
  (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD`); no keystore committed. ⚠️ Confirm those 4 repo secrets
  are set, and **enroll in Play App Signing** (Google holds the app signing key;
  your CI key is the *upload* key — back it up safely).
- ✅ **Release build process:** Actions → **"Android build"** → Run workflow →
  download `app-release.aab` from the `android-release` release → upload to Play.
- ✅ **Build workflow on `main`:** `android-apk.yml` is already on the default
  branch (runnable now).

## Play Console listing assets (to prepare)

- ⬜ App icon **512×512** PNG · ⬜ **Feature graphic 1024×500** · ⬜ **2–8 phone
  screenshots** (regenerate from the new grayscale UI) · ⬜ short description
  (≤80 chars) · ⬜ full description (≤4000) · ⬜ category + tags · ⬜ content-rating
  questionnaire · ⬜ **Data safety** form (account, notes/highlights, push token) ·
  ⬜ **privacy policy URL** (`/privacy`) · ⬜ target audience / ads declaration.

## Testing / production access readiness

- ⚠️ **Closed testing requirement:** if the Play account is an **individual**
  developer account created after ~Nov 2023, Google requires a **closed test with
  ≥12 testers opted-in for 14 continuous days** before you can apply for
  production. Organization accounts are exempt. **Confirm account type** — this
  can add ~2 weeks to the production timeline, so start closed testing early.
- ⬜ Create an **internal testing** track first (instant, no 14-day wait) to
  validate the AAB on real devices, then closed testing if required.

## What remains before upload to Play Console

1. ❗ Re-run **Android build** workflow and confirm a **green AAB** (the
   `colors.xml` fix should unblock resource linking).
2. ⚠️ Verify **Google sign-in** + **external links** on a real device (internal
   testing track).
3. ⚠️ Confirm **icon + splash** match the new brand; regenerate if needed.
4. ⬜ Set `versionName` for launch; keep `versionCode` increasing per upload.
5. ⬜ Confirm the 4 signing **secrets** are set; enroll in **Play App Signing**.
6. ⬜ Prepare **listing assets + screenshots + data-safety + privacy URL**.
7. ⚠️ Confirm **account type** → start **closed testing** if the 12-tester/14-day
   rule applies.
8. ⬜ Upload AAB to **internal testing → closed → production**.

## Changes made this pass (low-risk, on `feat/palette-overhaul`)

- Added `android/app/src/main/res/values/colors.xml` (fixes the missing-color
  build break; grayscale values).
- Added `POST_NOTIFICATIONS` to `AndroidManifest.xml` (push on Android 13+).
- (Earlier) native night color `#161219 → #101013` in `capacitor.config.ts`.

No repo restructure, no web-app/Render changes, no native rewrite.

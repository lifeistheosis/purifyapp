# Purify — Android Launch Checklist (single source of truth)

Consolidated 2026-06-29. **This is the one current Android launch tick-list.** It
collects every known Android beta issue and gate into one place, with an owner and a
status per row. It supersedes and reconciles the launch material previously scattered
across:

- `docs/architecture/ANDROID_PLAY_LAUNCH_CHECKLIST.md` (build/config audit)
- `docs/launch/RISK-REGISTER.md` (risk severities)
- `docs/launch/DASHBOARD.md`, `docs/launch/DAILY-SUMMARY.md` (June sprint snapshots)
- `docs/google-play/ANDROID_SUBSCRIPTION_CHECKLIST.md` (Purify Plus billing)
- `docs/google-play/PLAY_STORE_LISTING.md` (store listing + Data safety)

Where those docs disagree with this one, **this file wins** (the older ones are
June-12/16 snapshots and predate Beta 1.6 and the Purify Plus build).

## Current state (verified 2026-06-29)

- **Lane:** Android is the **primary launch lane**. iOS is prepared-but-parked until
  the Apple Developer account is active. Web stays open (no paywall on web).
- **Branch:** ⚠️ **`main` is now the consolidated launch lane** — it contains the
  commit *"consolidate Android launch shell + Beta 1.6 into main"* (`9ebdfed`) plus
  later Theology-hub redesign and native motion/page-fade polish. `launch/android-plus-shell`
  is now **stale**: its 4 "ahead" commits are duplicates of the same Android fixes
  already on `main`, and it is **13 commits behind `main`**. **Build the next AAB from
  `main`, not from the launch branch.**
- **Version:** `versionName "1.6"`; `versionCode` **auto-increments from the CI run
  number** (`android/app/build.gradle`, local fallback `4`). Beta 1.6 "Steadier on
  Android" shipped 2026-06-20.
- **Build:** `.github/workflows/android-apk.yml` produces a signed **AAB** + APKs;
  `targetSdk 36` / `minSdk 24`; release signed in CI from 4 secrets (no keystore
  committed).
- **No code-level launch blockers remain.** Remaining work is external (account
  enrollment, master art, store assets, billing dashboard config) plus a set of
  on-device confirmations.

**Legend:** ✅ done · ⚠️ verify on a device · ❗ blocker · ⬜ to do
**Owner:** **L** = Leona (external / account / artwork) · **C** = code/repo · **T** = device test

## Recheck findings — 2026-06-29 (code-level, not yet device-confirmed)

A fresh read of the actual code behind the 1.6 claims. The fixes are genuinely
implemented (native ID-token sign-in, `EdgeToEdge.enable`, scoped safe-area insets,
back listener), but three gaps were found that plausibly explain "still has issues":

| # | Finding | Why it bites | Severity | Owner |
|---|---|---|---|---|
| R1 | **Native Google sign-in silently falls back to the old broken flow if `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is unset at build time.** `nativeGoogleAvailable()` returns false without it, so `OAuthButtons` reverts to `signInWithOAuth` browser-redirect — the exact "signed in everywhere but here" / PKCE failure 1.6 was meant to kill. | A build missing the env var regresses sign-in to broken | ❗ P1 | L (set env in build) + T |
| R2 | **FIXED (code).** Android hardware back was only intercepted by `BibleSearchOverlay`. Now a shared `useAndroidBack` hook (`lib/platform/useAndroidBack.ts`) is wired into the generic `components/ui/Sheet.tsx`, so every Sheet-based overlay (chapter picker, reader settings, saint TOC) closes on back; `BibleSearchOverlay` was deduped onto the same hook. (The Plus paywall is a `/pricing` route, so default back-navigation is already correct.) | The 1.6 back fix covered one overlay, not the class | ✅ ⚠️ verify on device | C done · T |
| R3 | **The launch branch is stale vs `main`** (see Current state). Building from `launch/android-plus-shell` would ship without the Theology redesign + motion polish that are on `main`. | Wrong build source = missing work | ⚠️ process | L/C |

> R1 verify: confirm `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set in the Android build env
> and its value matches the Web client ID on the Supabase Google provider. Ties to the
> Firebase signing-SHA registration already tracked. R1 is the first thing to check
> against any "Google sign-in still broken" tester report.

## 1. Beta issues collected

### Resolved in Beta 1.6 (from `data/changelog/patches.json`) — confirm they hold

| Issue (as testers reported it) | Status | Owner | Note |
|---|---|---|---|
| Google sign-in left you signed in "everywhere but here" | ✅ ⚠️ | T | Now completes in-app via native account picker — **re-test on a clean device** (this was the highest OAuth-in-WebView risk) |
| Sign-out ended on an error screen | ✅ | T | Now returns quietly to start; smoke-test once more |
| Top of screen slipped under the status bar (Skip, Bible-search Cancel, header unreachable) | ✅ ⚠️ | T | Edge-to-edge / safe-area fixes landed; **re-verify across gesture-nav + 3-button nav** |
| Android back button felt stuck on the search sheet | ✅ | T | Back now closes the search sheet; verify it also exits cleanly at app root |
| Long prayer titles trailed off mid-word | ✅ | — | Fixed |
| Turning on prayer reminders stumbled | ✅ ⚠️ | T | Fixed; verify alongside the `POST_NOTIFICATIONS` runtime prompt (row in §4) |
| App shipped with the placeholder Capacitor icon | ✅ | — | Replaced with the three-bar cross launcher icon |

### Open, Android-relevant (from `docs/launch/RISK-REGISTER.md`)

| # | Issue | Sev | Status | Owner |
|---|---|---|---|---|
| 6 | No 1024×1024 master icon (current 192/512 are placeholder-quality) | P1 | ❗ | L (master art) |
| 7 | No real screenshots (`public/public/*.webp` are competitor refs, unusable) | P1 | ⬜ | L (on-device) |
| 8 | Personal Play account ⇒ 12-tester / 14-day closed test before production | P1 | ⬜ | L (start now) |
| 12 | Campaigns route is a "Coming soon" stub | P2 | ⬜ | C (hide in native) |
| 14 | `language-editor` route reachable by direct URL | P2 | ⚠️ | C (verify gating) |
| 13 | Sign-out must **never** clear `purify:*` localStorage | P1-verify | ⚠️ | T |
| 11 | Supabase OAuth/magic-link redirects could escape `allowNavigation` | P2 | ⚠️ | T |

> iOS-only risk rows (1, 3, 9, 10 and the donation 3.1.1 gate) stay parked with the
> Apple lane — not Android blockers.

## 2. Build / config gate (from the corrected build audit)

| Item | Status | Owner |
|---|---|---|
| Green **AAB** from `android-apk.yml` (after `colors.xml` fix + RevenueCat `npx cap sync android`) | ⚠️ | C/T |
| `versionName "1.6"`, `versionCode` auto-increments per upload (every Play upload needs a higher code) | ✅ | C |
| `targetSdk 36` / `minSdk 24` — above Play's API floor | ✅ | C |
| `INTERNET` + `POST_NOTIFICATIONS` (Android 13+) declared; no `AD_ID` (Facebook SDK dropped) | ✅ | C |
| `res/values/colors.xml` present (was the missing-color resource-linking break) | ✅ | C |
| 4 signing secrets set (`ANDROID_KEYSTORE_BASE64` + password + alias + key password) | ⚠️ | L |
| Enroll in **Play App Signing** (Google holds signing key; CI key is the *upload* key — back it up) | ⬜ | L |
| `GOOGLE_SERVICES_JSON_BASE64` set if push is wanted (build succeeds without it; push then no-ops) | ⚠️ | L |

## 3. Purify Plus / billing (from `ANDROID_SUBSCRIPTION_CHECKLIST.md`)

Model: core is **always free**; Plus adds cross-device sync + Florilegium/custom
collections. Pricing **$9.99/mo · $99/yr** (Plus includes free EIKON shop shipping). Path: **RevenueCat → Google Play Billing**.
Enforcement is **native-only**.

| Item | Status | Owner |
|---|---|---|
| Entitlements spine, paywall UI, webhook — code exists | ✅ | C |
| RevenueCat project + Google Play app (`net.purifyapp.purify`) + service-account creds | ⬜ | L |
| `plus` entitlement; `monthly`/`annual` products in default Offering | ⬜ | L |
| RevenueCat webhook → `https://purifyapp.net/api/billing/revenuecat` + `REVENUECAT_WEBHOOK_SECRET` (test 200) | ⬜ | L |
| Play subscription `purify_plus` with `monthly` ($9.99/P1M) + `yearly` ($99/P1Y) base plans, activated | ⬜ | L |
| License testers added (buy without charge) | ⬜ | L |
| `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` on Render | ⬜ | L |
| `npx cap sync android` + green AAB **with the plugin linked** | ⚠️ | C/T |
| Device test: buy monthly/yearly → webhook → Florilegium + sync unlock; restore; cancel-to-period-end; expiry-to-free; billing-unavailable fallback | ⬜ | T |
| **Launch switch:** set `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE=true` **then rebuild AAB** (inlined at build time — not a runtime flip). Web stays open. | ⬜ | L (last step) |

## 4. Play Console store listing + Data safety (from `PLAY_STORE_LISTING.md`)

| Asset / field | Status | Owner |
|---|---|---|
| App name `Purify: Orthodox Prayer`, short + full description (paste-ready) | ✅ drafted | C |
| Category Books & Reference; tags prayer/bible/christian; content rating (IARC → Everyone) | ⬜ | L |
| Privacy URL `https://purifyapp.net/privacy`; support/marketing URLs | ✅ | C |
| App icon **512×512** PNG | ⬜ | L |
| Feature graphic **1024×500** | ⬜ | L |
| **2–8 portrait, dark-palette screenshots** shot on-device (Today, Bible+commentary, rope, saint, calendar, theology; optional Plus screen) | ⬜ | L |
| **Data safety** — now must declare **in-app purchases** + **purchase history** (plus optional email, anonymized analytics; no third-party sharing; encrypted in transit) | ⬜ | L |
| Subscription disclosure text present near the buy point (in the paywall) | ✅ | C |
| Review notes + password test account + license-tester note | ✅ drafted | L (add account) |

## 5. Forum / community best-practice gate (Capacitor-Android + Play gotchas)

Verification items drawn from common Capacitor/Play launch pitfalls — confirm each on
the **release AAB**, not just a debug APK.

| Check | Status | Owner |
|---|---|---|
| Test the **release AAB via an internal-testing track** — release behaviour (signing, scheme, minify) differs from a debug APK | ⬜ | T |
| **Fresh-install** sanity: Auto Backup is disabled (recent commit), so a reinstall is a clean slate — confirm no stale-state surprises | ⚠️ | T |
| **Edge-to-edge under Android 15+** is enforced by `targetSdk 36` — the 1.6 inset fixes must hold across gesture-nav, 3-button nav, and the portrait lock | ⚠️ | T |
| **`POST_NOTIFICATIONS` runtime prompt** actually fires on Android 13+ when reminders are enabled | ⚠️ | T |
| **Hardware back at app root** exits cleanly (no blank/stuck WebView) | ⚠️ | T |
| **No `AD_ID` permission** leaks back in via any plugin — keeps Data-safety "no advertising ID" true | ⚠️ | C |
| **Off-domain links** (social/donate/email) open in the system browser, not a dead in-app WebView (`allowNavigation` is locked to purifyapp.net + supabase) | ⚠️ | T |
| `assetlinks.json` / App Links: **not needed for v1** (no deep links claimed) — leave off unless deep links are added | ✅ decided | C |

## 6. What remains before production (ordered runbook)

1. ❗ **Green AAB** — run **Android build** workflow; confirm RevenueCat plugin links and `colors.xml` resolves. (C/T)
2. ⚠️ **Internal-testing device pass** — sign-in (re-test Google), navigation, content loading, back/edge-to-edge, reminders prompt. (T)
3. ⬜ **Billing device pass** — buy → webhook → Plus unlock loop, with `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE=true` on a test build. (T)
4. ⬜ **Next beta build** uploaded to internal testing once the above pass. (C/T)
5. ⬜ **Listing assets** — 512 icon, 1024×500 feature graphic, real screenshots, Data safety (incl. IAP + purchase history), content rating. (L)
6. ⬜ **Closed test** — recruit ≥12 testers, run 14 continuous days (personal-account rule). (L)
7. ⬜ **Flip the launch switch** + rebuild, then **promote to production**. (L)

## Externals on the critical path (Leona)

1. Google Play Developer account **enrollment**.
2. **1024×1024 master icon art** (drives the 512 icon + adaptive set).
3. **On-device screenshots** (dark, portrait).
4. **RevenueCat + Play Billing** product/dashboard config.
5. **Play App Signing** enrollment confirmation.

# Purify — Launch App Polish Checklist

Pre-filled from the 2026-06-15 Capacitor audit. Legend: ✅ done · ⚠️ verify on a
device/build · ⬜ to do. Companion to `NATIVE_APP_VISION.md`.

Scope: make the **wrapper-first** iOS/Android builds feel app-like and
submission-ready **without** destabilizing the app. No monorepo move, no native
rewrite, no Render/architecture changes.

## iOS

- ⚠️ **App icon correct** — `ios/App/App/Assets.xcassets/AppIcon.appiconset/` has a
  single 1024px `AppIcon-512@2x.png`. Confirm it's the current brand three-bar
  cross (regenerate via `npx capacitor-assets generate` from a 1024 source if stale).
- ⚠️ **Splash screen correct** — `Splash.imageset` has 2732² assets. Confirm
  background is `#101013` and the mark matches brand (regenerate if needed).
- ✅ **Status-bar color/style** — Capacitor `StatusBar` style `DARK`, color now
  `#101013`; `UIViewControllerBasedStatusBarAppearance = true`.
- ✅ **Safe areas** — `viewport-fit=cover` + `env(safe-area-inset-*)` utilities
  (`globals.css` `safe-pb` / `safe-bottom-pad`); bottom tab bar respects the home
  indicator.
- ✅ **No browser UI** — WKWebView shell, no address bar / browser chrome.
- ⚠️ **External links open properly** — `@capacitor/browser` is NOT installed and
  `allowNavigation` is locked to purifyapp.net/supabase. Verify off-domain links
  (e.g. social, donate) open in the system browser, not dead-end in the WebView.
- ✅/NA **Back behavior** — iOS has no hardware back; in-app nav covers it.
- ⚠️ **Support link works** — `/support` route exists; verify reachable in-shell.
- ⚠️ **Privacy link works** — `/privacy` route exists; verify reachable in-shell.
- ⚠️ **Terms link works** — `/terms` route exists; verify reachable in-shell.
- ⬜ **App Store screenshots ready** — regenerate from the new grayscale UI.
- ⬜ **Build workflow on `main`** — `ios-ipa.yml` currently only on the feature
  branch; add to `main` so it's `workflow_dispatch`-runnable like Android.
- ✅ **Archive/export documented** — `docs/IOS_BUILD_SETUP.md` (unsigned build →
  AltStore/Sideloadly).

## Android

- ⚠️ **App icon correct** — confirm `android/app/src/main/res/mipmap-*` icons are
  the current brand mark (regenerate via `capacitor-assets` if stale).
- ⚠️ **Splash screen correct** — confirm splash background `#101013` + brand mark.
- ✅ **Status/navigation-bar color** — Capacitor config color now `#101013`; ⚠️
  cross-check `res/values/colors.xml` / `styles.xml` (`colorPrimaryDark`) for any
  stale tint.
- ✅ **Safe areas** — same web safe-area handling as iOS.
- ⚠️ **Back-button behavior** — Capacitor maps hardware back to WebView history;
  verify it exits gracefully at the app root (no blank/stuck state).
- ⚠️ **External links open properly** — same check as iOS.
- ⚠️ **Support / Privacy / Terms links** — routes exist; verify reachable in-shell.
- ⬜ **Play Store screenshots ready** — regenerate from the new UI.
- ✅ **Build workflow on `main`** — `android-apk.yml` already on `main`
  (`workflow_dispatch` → signed APK/AAB to `android-release`).
- ✅ **APK/AAB workflow documented** — header docs in `android-apk.yml`.

## Shared

- ✅ **Mobile nav polished** — bottom tab bar + reworked Today/Prayers/Bible/
  Calendar/Discover surfaces (grayscale card language).
- ⚠️ **Login works** — Supabase auth; verify sign-in/out in-shell.
- ⚠️ **Google sign-in checked** — verify OAuth redirect works inside WKWebView /
  Android WebView (app-bound domains can block third-party auth popups).
- ⚠️ **Pricing/support copy clear** — `/pricing` + `/support` exist; verify copy is
  app-store-safe (no external-donation language on native; the shell already hides
  store-noncompliant surfaces via `lib/platform/native.ts`).
- ✅ **Terms live** — `/terms`.
- ✅ **Privacy live** — `/privacy`.
- ⚠️ **No unlicensed audio** — ambience MP3s removed (v9.9); confirm the Prayer
  Rope Anthem rights line is settled before shipping audio.
- ⬜ **Cache version current** — bump the PWA service-worker cache version on the
  release commit so shells pull fresh assets.
- ⬜ **Smoke tests pass** — `npm run typecheck && lint && test:unit` green; spot e2e.
- ⬜ **Accessibility checks** — contrast/labels on the new grayscale surfaces.
- ⬜ **App-store metadata ready** — name, subtitle, description, keywords, privacy
  nutrition labels / data-safety form for both stores.

## Notes / decisions surfaced by the audit

- Native night color was stale (`#161219`); **fixed → `#101013`** in
  `capacitor.config.ts`, both generated `capacitor.config.json`, and both offline
  `index.html` fallbacks. CI `cap sync` regenerates the native configs at build.
- App icons & splash assets predate the new brand mark — **regenerate before
  store screenshots** (`@capacitor/assets` is already a dependency).
- External-link handling and Google sign-in inside the WebView are the two most
  likely review/UX snags — verify on a real device build first.

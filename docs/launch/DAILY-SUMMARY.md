# Daily Sprint Summary

> **Historical sprint log (2026-06-12).** Superseded by
> `docs/launch/ANDROID-LAUNCH-CHECKLIST.md` (2026-06-29) for current launch status.

## v10 feature build — 2026-06-12 (parallel track, committed locally, not pushed)

While the store sprint waits on enrollment + the Mac/icon externals,
began the v10 feature foundation (public launch = subscriptions + the
Plus layer). All dark-launched and held per the commits-only rule.

### Completed
- **Entitlement spine** (commit, dark): lib/entitlements derives the
  locked model (free / Plus / supporter-lifetime-sync) from a new
  RLS-scoped entitlements table; one flag, ENTITLEMENTS_ENFORCED, is
  the whole launch switch; 8 unit tests pin both states incl. the
  supporter = sync-but-not-feature-layer distinction. Ambience rewired
  onto it. Writes are service-role only (admin now, billing webhooks at
  v10).
- **Florilegium** (Plus flagship): local-first store (offline-safe,
  billing-state never touches gathered text), /florilegium hub + detail
  routes behind the plusFeatures gate (open in dark launch), PlusGate
  upgrade panel, /saved entry point, and a sync-target migration
  (florilegia + florilegium_items, client-UUID identity for idempotent
  merge).
- **Gather affordance**: AddToFlorilegium inline popover wired into the
  theology quote cards (browser-proven end to end), and a
  FlorilegiumPickerSheet driven from the Bible verse context menu +
  mobile long-press toolbar (typecheck/lint clean; verse tap-path
  flagged for day-5 device QA).

### Next best v10 increment (pure code, no externals)
Florilegium cross-device sync: mirror the local store to the
florilegia/florilegium_items tables on sign-in (schema + local store
both ready). That makes the flagship a real synced Plus feature. Then:
saint-works reader gather wiring, guided collections, and the billing
integration (gated on store accounts).

## Day 1 (cont.) — 2026-06-12, second session

Code for days 2 and 3 landed a day early; the remaining sprint work is
dominated by external dependencies (enrollment, Mac, artwork).

### Completed
- **P0 closed — 3.1.1 donation gate** (60fce79): /support inside the
  shell renders a compliant page (zero payment links, contact block);
  web unchanged. InstallPrompt never arms in the shell;
  DesktopInstallCTA renders as a plain app link. Found and fixed a
  silent failure: a constant imported out of a "use client" module
  into server code arrives as a client-reference proxy — the token now
  lives in a directive-free module. Verified by curl with both UAs.
- **Copy + legal batch** (625d6d6): "Local profile / Public account"
  retired everywhere (AccountChoice, LocalProfileHero, YouMobile,
  privacy, about, dead i18n keys in 13 locales). New /terms page,
  linked from footer + signup. FAQ gains "Is Purify free?" with the
  Purify Plus + supporter-lifetime-sync promise; pricing panel renamed
  "Purify Plus, when it arrives" (EN+DE). Privacy page now states
  sign-out never deletes device data. 76/76 vitest.
- **Day-3 code half** (8894a76): NativeBridge (splash hide + status
  bar) in the root layout; prayer-rope haptics through the platform
  engine inside the shell (iOS WKWebView has no navigator.vibrate);
  killed a real pre-existing hydration error on /prayers/rope
  (trig float drift server vs browser — coordinates now rounded).
- ShareButton audit: navigator.share is supported by both modern
  WebViews; left as-is, verify in the device pass.

### Remaining blockers (P0/P1)
- P0: **enrollment** — Apple Developer (individual) + Play Console
  (personal). Leona, nothing moves to a store without these.
- P1: 1024×1024 master icon art (Leona), real device screenshots,
  Mac device pass (WKAppBoundDomains SW check, auth flows in shell,
  haptics feel, splash timing).

### Deferred
- PrayerRope jsx-a11y warnings (pre-existing, P2; keyboard handling
  exists at component level).
- Everything in SHIP-HIDE-DEFER §Defer (unchanged).

### Next best action
Day 4 is blocked on externals: Leona enrolls + provides master icon
art; first Mac session does `npx cap sync ios`, opens
ios/App/App.xcodeproj, runs on a device, and walks the REVIEWER-PATH
flow. Until then the highest-value machine-side work is drafting the
day-5 store listing copy (names, subtitles, descriptions, keywords).

## Day 1 — 2026-06-12

### Completed
- Sprint plan approved: Capacitor remote-URL shell, free v1 (no IAP), appId
  `net.purifyapp.purify`, Play personal account (14-day closed test accepted).
- Capacitor 8 scaffolded and committed: ios/ (iPhone-only, portrait,
  WKAppBoundDomains=purifyapp.net + limitsNavigationsToAppBoundDomains),
  android/ (portrait), capacitor.config.ts, offline fallback shell, plugins
  installed (splash-screen, status-bar, haptics, share, network).
  Capacitor 8 uses Swift Package Manager — no CocoaPods step on the Mac.
- Launch artifacts created (dashboard, risk register, ship/hide/defer,
  reviewer path).
- v9.9 content work formally deferred.

### Remaining blockers (P0/P1)
- P0: dev-account enrollment NOT STARTED — **Leona must enroll today**
  (Apple Developer individual; Google Play Console personal).
- P0: donation links inside native shell (fix lands day 2 with the UA gate).
- P1: Terms page, retired account copy, 1024 icon (needs Leona's master
  artwork), real screenshots, device tests.

### Deferred
- All v9.9 content (catena/Topics/Heresies/i18n pipeline) — see SHIP-HIDE-DEFER.

### Next best action
Day 2 batch: lib/platform/native.ts + middleware UA gating; hide
donations/install UI in native; retire "Local profile/Public account" copy;
ship /terms. Deploys to web (the shell loads production).

# Daily Sprint Summary

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

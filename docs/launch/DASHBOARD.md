# Submission Readiness Dashboard

Sprint: 2026-06-12 → 2026-06-19 (submit day 8).
Model: v1 ships **free** — no IAP, nothing gated. Purify Plus + billing land post-launch.

| | Status |
|---|---|
| Days remaining | 7 (day 1 closed; code for days 2-3 done early) |
| Release candidate | none yet — RC freezes day 7 |
| App ID | `net.purifyapp.purify` (locked, both platforms) |
| P0 open | 1 — dev-account enrollment (Leona; external). Donation-link 3.1.1 gate SHIPPED ✅ |
| P1 open | 3 — 1024 icon (needs Leona's master art); real screenshots; device test pass (Mac + Android). Terms ✅, account copy ✅ |
| P2 open | 1 — pre-existing jsx-a11y warnings on PrayerRope click targets (keyboard works; rule can't see it) |
| Apple readiness | scaffold ✅, UA gating ✅, NativeBridge ✅; enrollment NOT STARTED; device test pending |
| Google Play readiness | scaffold ✅; enrollment NOT STARTED; personal account ⇒ 12-tester/14-day closed test ⇒ production ≈ Jun 26+ |
| Billing readiness | N/A by design (free v1; deferred to first post-launch update) |
| Privacy readiness | ✅ — page reworked to launch language + explicit sign-out data-safety sentence; store label mapping in REVIEWER-PATH |
| Screenshot readiness | NOT STARTED — the 9 WebP files in public/public/ are competitor references, unusable |
| Metadata readiness | NOT STARTED (day 5) |
| Testing readiness | web flows verified (support gate, terms, account copy, rope); device passes need Mac (iOS) + Android device/emulator |

## Day map

- D1 ✅ scaffold, artifacts, enrollment kickoff (enrollment itself still on Leona)
- D2 ✅ native gating + copy/legal, deployed (commits 60fce79, 625d6d6)
- D3 ✅ code half (NativeBridge, haptics, hydration fix — 8894a76); device-test half pending Mac
- D4 — icons/splash/signing (needs Leona's master icon art + Mac)
- D5 — screenshots + metadata copy
- D6 — store records + uploads (TestFlight / Play internal)
- D7 — RC freeze, reviewer notes, final smoke, **submit iOS**
- D8 — Play closed-testing live, 12 testers recruited from Discord, respond to Apple

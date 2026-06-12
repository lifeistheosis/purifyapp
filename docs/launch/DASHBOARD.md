# Submission Readiness Dashboard

Sprint: 2026-06-12 → 2026-06-19 (submit day 8).
Model: v1 ships **free** — no IAP, nothing gated. Purify Plus + billing land post-launch.

| | Status |
|---|---|
| Days remaining | 7 (today is day 1) |
| Release candidate | none yet — RC freezes day 7 |
| App ID | `net.purifyapp.purify` (locked, both platforms) |
| P0 open | 2 — donation links visible in native shell (3.1.1); dev-account enrollment not started |
| P1 open | 4 — Terms of Service missing; retired account copy live; 1024 icon missing; real screenshots missing |
| P2 open | 0 tracked yet (sweep on day 5) |
| Apple readiness | scaffold done; enrollment NOT STARTED (Leona, today); build untested on device |
| Google Play readiness | scaffold done; enrollment NOT STARTED; personal account ⇒ 12-tester/14-day closed test ⇒ production ≈ Jun 26+ |
| Billing readiness | N/A by design (free v1; deferred to first post-launch update) |
| Privacy readiness | privacy page comprehensive ✅; needs "Local profile/Public account" section rework; store privacy-label mapping drafted in REVIEWER-PATH |
| Screenshot readiness | NOT STARTED — the 9 WebP files in public/public/ are competitor references, unusable |
| Metadata readiness | NOT STARTED (day 5) |
| Testing readiness | web preview testable now; device passes need Mac (iOS) + Android device/emulator, day 3 |

## Day map

- D1 ✅ scaffold, artifacts, enrollment kickoff
- D2 — native gating + copy/legal (deploys to web)
- D3 — NativeBridge plugins + device tests
- D4 — icons/splash/signing
- D5 — screenshots + metadata copy
- D6 — store records + uploads (TestFlight / Play internal)
- D7 — RC freeze, reviewer notes, final smoke, **submit iOS**
- D8 — Play closed-testing live, 12 testers recruited from Discord, respond to Apple

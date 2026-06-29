# Risk Register

> **Superseded for Android launch tracking (2026-06-29)** by
> `docs/launch/ANDROID-LAUNCH-CHECKLIST.md`, which is the current single tick-list.
> This register is kept for severity/regression context.

Severity: P0 = submission blocker · P1 = launch-critical · P2 = polish · P3 = post-launch.

| # | Issue | Sev | Surface | Repro / evidence | Fix | Status | Regression risk |
|---|---|---|---|---|---|---|---|
| 1 | Donation links (BMC/PayPal/Cash App) visible inside iOS binary — Apple 3.1.1 external-purchase rejection | P0 | /support, footer | Open /support in native shell | Server-side gate on PurifyNative UA → contact block replaces donations | open (day 2) | low — web keeps donations |
| 2 | Dev accounts not started — Apple ~24-48h, Play ID check days | P0 | external | n/a | Leona enrolls TODAY (Apple individual + Play personal) | open — Leona | none |
| 3 | Apple 4.2 "web wrapper" rejection | P1 | whole iOS app | Apple rejects thin webviews | Haptics on rope, splash, status bar, share sheet, portrait-locked iPhone polish; resubmit with native-feature list if rejected | mitigation day 3 | low |
| 4 | Terms of Service page missing | P1 | legal | no /terms route | New app/(app)/terms/page.tsx, linked from signup + footer | open (day 2) | none |
| 5 | Retired "Local profile / Public account" copy | P1 | LocalProfileHero, AccountChoice, YouMobile, privacy page | grep "Local profile" | Rework to free/sync framing | open (day 2) | low |
| 6 | No 1024×1024 icon; current 192/512 tiny (1-3 KB — likely placeholder quality) | P1 | store records | public/icon-*.png | Source master art from Leona, generate set via @capacitor/assets | open (day 4) — needs Leona's master artwork | none |
| 7 | No real screenshots (public/public/*.webp are competitor refs) | P1 | store records | inspect files | Device screenshots day 5 | open | none |
| 8 | Play personal account ⇒ 12-tester/14-day closed test before production | P1 | Play timeline | Play policy for accounts created after Nov 2023 | Submit closed testing day 8; recruit 12 Discord testers; production ≈ Jun 26+ | accepted/planned | none |
| 9 | WKAppBoundDomains side effects (app-bound mode restricts some WKWebView APIs) | P1 | iOS shell | device test day 3 | If breakage: drop the plist key + config flag, accept no-SW iOS (online-only) | open — test day 3 | contained to iOS |
| 10 | Magic-link auth awkward in native shell (mail app round-trip; reviewer hostile) | P1 | sign-in | sign in inside shell | Make password path prominent under isNative(); reviewer account is password-based | open (day 2-3) | low |
| 11 | Supabase OAuth/magic-link redirects could escape allowNavigation and open external browser unexpectedly | P2 | auth flows | device test | Verify redirect URLs stay on purifyapp.net; adjust allowNavigation if needed | open — test day 3 | low |
| 12 | Campaigns route is "Coming soon" shell | P2 | /prayers/campaigns | visit route | Hide link in native shell (day 2 gating batch) | open | none |
| 13 | sign-out must never clear purify:* localStorage | P1 (verify) | data safety | audit says only explicit Clear button clears; confirm by test | Manual smoke-test step; no code change expected | verify day 3 | none |
| 14 | language-editor route reachable by direct URL | P2 | /language-editor | visit while signed out | Verify gating; hide in native if exposed | verify day 2 | low |

## Accepted / by design

- **Purify Plus subscriptions ship in Android v1** (RevenueCat → Google Play Billing;
  $4.99/mo · $29.99/yr). Enforcement is native-only and the core stays free. (This
  reverses the earlier "no IAP in v1" plan — see
  `docs/google-play/ANDROID_SUBSCRIPTION_CHECKLIST.md`.) Push code is ready (delivery
  optional). No deep links (AASA/assetlinks are not review requirements).
- iPad unsupported (TARGETED_DEVICE_FAMILY=1). Portrait-only both platforms.
- iOS offline depends on WKAppBoundDomains test; fallback online-only is acceptable for v1.

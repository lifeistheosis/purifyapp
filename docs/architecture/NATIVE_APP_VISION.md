# Purify — Native App Vision & Launch Bridge

Authored 2026-06-15. Companion to `MONOREPO_MIGRATION_PLAN.md` and
`LAUNCH_APP_POLISH_CHECKLIST.md`.

> Ship safely now. Document the native future now. Build the true native future
> after launch.

## 1. Executive Summary

- The **first store build is wrapper-first**: thin Capacitor 8 shells (iOS +
  Android) that load `https://purifyapp.net`, hardened to feel app-like.
- The **final vision is true native**: iOS in **SwiftUI**, Android in **Kotlin /
  Jetpack Compose**, with the **web app remaining canonical** (Next.js).
- The Capacitor shell is a **bridge**, not the destination — Purify will **not**
  remain a thin wrapper long-term.
- End state: **one source of truth, three app targets** (web / iOS / Android),
  sharing Orthodox content, the Supabase backend, schemas, sync, and entitlements.

## 2. Current State

- **Web:** a single Next.js 16.2.6 / React 19 app at the repo root; deploys to
  `purifyapp.net` via Render (watches `main`).
- **Native:** `ios/` and `android/` Capacitor 8 shells. `appId
  net.purifyapp.purify`, `appName Purify`; `server.url = https://purifyapp.net`
  with `allowNavigation` locked to `purifyapp.net`, `*.purifyapp.net`,
  `*.supabase.co`. The web layer detects the shell via the appended user-agent
  token `PurifyNative` (`lib/platform/native.ts`) and adapts.
- **Native plugins in use:** SplashScreen, StatusBar, Haptics, Network, Share,
  PushNotifications (APNs/FCM), `@capacitor/assets`. iOS uses
  `limitsNavigationsToAppBoundDomains` + `WKAppBoundDomains` for service workers.
- **Benefits today:** one codebase ships three surfaces; content/UX changes go
  live everywhere on a web deploy; native splash/status-bar/push/haptics already
  wired; fast path to the stores.
- **Limitations today:** WebView reading feel vs true native; offline depends on
  the PWA service worker; deep OS integration (widgets, background audio, native
  share sheets, Handoff) is limited; store-review thinness risk if not polished.

## 3. Why Not Rewrite Before Launch

- **Submission is days away (~06-20).** A native rewrite would slip it.
- **Root-relative imports (`@/*→./*`)** make even the monorepo move high-risk; a
  native rewrite is far larger.
- **Render deploy is tied to the root app** (dashboard-configured) — restructuring
  risks breaking production.
- **Launching now buys** real users, feedback, store presence, subscription
  revenue, and a stable baseline to build native against. Native quality is a
  post-launch investment, not a launch blocker.

## 4. Launch Bridge Requirements

The wrapper-first build must satisfy all of these to feel like a real app (see the
checklist doc for status):

- Polished app icon (brand three-bar cross) · native splash · correct status-bar
  style + color · safe-area insets respected · **no browser chrome** · no visible
  web-wrapper artifacts · stable loading · working **support / privacy / terms**
  links · clean external-link handling · app-store-safe copy (no "website"
  language) · no broken routes · iOS build runnable from `main` · Android build
  stable from `main` · no production deploy regressions.

## 5. Final Native Target

**iOS (SwiftUI):** native tab + navigation model; native **Bible Reader**,
**Prayers**, **Today**, **Calendar**, **Saints**, **Account / Plus**; native
reminders (local + APNs); StoreKit 2 subscriptions; native offline storage.

**Android (Kotlin + Jetpack Compose):** native navigation; native **Bible
Reader**, **Prayers**, **Today**, **Calendar**, **Saints**, **Account / Plus**;
Play Billing subscriptions; native notifications (FCM + local); offline storage.

Both consume the **same** Supabase backend, the **built content bundle** from
`packages/content`, and a shared design-token language (visual parity with web).

## 6. Native Priority Order (post-launch)

1. **Native Shell Foundation** — app structure, navigation, auth shell, shared API
   client, local storage, entitlement awareness.
2. **Core Native Reading** — Bible Reader, Prayers, Saints, Today.
3. **Church Year** — Sacred Calendar, fasting, commemorations, daily readings.
4. **Study Libraries** — Councils, Theology, Apologetics, Heresies, Catena.
5. **Purify Plus** — subscriptions, cross-device sync, Florilegium, personal
   library, synced progress.
6. **Community Prayer** — requests, campaigns, counters, comments, **moderation +
   reporting first**, custom campaign designs. (Gated on moderation existing.)

## 7. Shared Content Strategy

**One canonical content source — never duplicated per platform.** Canonical
content: Saints, Prayers, Councils, Theology, Apologetics, Heresies, Catena/
patristic, PD source metadata, Bible metadata, feast/calendar metadata.

Long-term approach:
- Raw source records in a single canonical location (`content/` source, exposed as
  the typed `packages/content` / `packages/content-tools` workspace package).
- App-specific build outputs are **generated** from that source (web import maps,
  iOS `Content.bundle` JSON, Android `assets/` JSON).
- Native apps consume **structured JSON / API / offline bundles** — they never copy
  source.
- **Content versioning via tags** (`content-vYYYY.MM.DD`); each build embeds the
  content version it shipped.

## 8. Backend & Sync Strategy

Shared Supabase backend supports: account, sync, notes, highlights, reading
progress, Florilegium, subscription entitlements, the **pre-launch lifetime sync
entitlement** (`is_supporter`), and future Community Prayer. Native apps consume
the backend through **shared contracts** (typed API client in `packages/api-client`
+ row/RPC schemas in `packages/schemas`), so web/iOS/Android never drift on shape.

## 9. Subscription Strategy

Final state: **Apple subscriptions (iOS)**, **Google Play subscriptions
(Android)**, a **shared entitlement service** across platforms (today's
`lib/entitlements`, `ENTITLEMENTS_ENFORCED` flag). **Do not implement billing
before launch** unless explicitly approved. Likely future homes:

```txt
packages/entitlements/      # platform-agnostic checks + upsert_entitlement contract
apps/ios/Billing/           # StoreKit 2 (or RevenueCat)
apps/android/billing/       # Play Billing (or RevenueCat)
apps/web/src/billing/       # Stripe (desktop PWA)
```

## 10. Risks of Staying Wrapper-Only Too Long

- App feels cheaper than the product deserves; weaker perceived quality.
- Weaker offline experience (SW-bound) and weaker native notifications/reminders.
- **App-store review risk** if the build reads as "just a website".
- Worse Bible-reader feel (scroll/gesture/perf) vs native.
- Weaker subscription trust without native store billing UX.
- Limited platform integration (widgets, background audio, share, Handoff).
- Long-term maintainability strain bending the web app to feel native.

## 11. Post-Launch Migration Plan (stages)

- **Stage 0 — Launch Bridge:** polish Capacitor, submit to both stores.
- **Stage 1 — Monorepo Setup:** move to `apps/web|ios|android` + `content/` +
  `packages/*` (after launch only; see `MONOREPO_MIGRATION_PLAN.md`).
- **Stage 2 — Native Foundations:** real native skeletons (nav, auth, API client,
  storage, entitlement awareness).
- **Stage 3 — Native Core Reader:** native Bible / Prayers / Saints / Today.
- **Stage 4 — Native Subscription/Sync:** native Plus (billing + sync).
- **Stage 5 — Replace Wrapper:** progressively replace WebView dependence screen
  by screen.
- **Stage 6 — Deprecate Thin Shell:** final iOS/Android are true native; the
  Capacitor shell retires.

## 12. Founder Decision Points (need approval)

1. **When** to start post-launch native work (immediately after submission, or
   after first feedback cycle)?
2. **iOS or Android first** (recommend iOS first — stricter review, higher-value
   audience, StoreKit maturity)?
3. **Keep Capacitor as the transition shell** during native build-out (recommended)
   vs hard cut?
4. **Parallel vs sequential** SwiftUI + Compose (recommend sequential — prove the
   pattern on one platform first)?
5. **Canonical content path** — `content/` source + `packages/content` package
   (recommended)?
6. **Subscription timing** — wire billing in the wrapper (web/Stripe + store) for
   v10, or wait for native?
7. **Community Prayer timing** — only after moderation/reporting exists (recommended).

---

## Branching & Releases (binding)

Reject permanent `website` / `ios` / `android` branches. Products are **folders**
(`apps/*`) and **tags**, not branches. Use:

```txt
main · staging · feature/* · release/web-v* · release/ios-v* · release/android-v* · hotfix/*
```

Tags mark shipped builds: `web-v9.9.5`, `ios-v1.0.0`, `android-v1.0.0`,
`content-v2026.06.30`. See `MONOREPO_MIGRATION_PLAN.md` §9 for the full rationale.

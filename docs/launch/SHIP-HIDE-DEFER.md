# Ship / Hide / Defer

> **2026-06-16 update:** Purify Plus subscriptions now ship in v1 on **Android**
> (RevenueCat → Play Billing), reversing the earlier "defer IAP" call. Enforcement
> is **native-scoped**: the Android app gates the Plus layer, the website stays open
> until a web checkout exists. Details: `docs/google-play/ANDROID_SUBSCRIPTION_CHECKLIST.md`.

## Ship (in the v1 binary, as-is)

Bible (+ search, interlinear, commentary/catena), Prayers (rules, Creed, rope, anthem, hours, akathists, learning), Saints (+ works, icons), Calendar (+ fasts, Pascha count), Today, Theology (7 topics), Apologetics (3 entries), Topics, Heresies, Councils (incl. pre-Nicene), Discover, Reading, What's New, FAQ, About, Privacy, Account (sign-in/out, delete, data export surfaces), local notes/highlights/bookmarks/progress, free sync for signed-in users, ambience (ungated), all current locales (en full, de partial, fr editorial preview, rest stubs with honest fallback).

**Android v1 adds: Purify Plus.** Optional auto-renewing subscription ($4.99/mo,
$29.99/yr) via Google Play Billing (RevenueCat). Once enforced on native, gates the
Plus layer: Florilegium / custom collections **and cross-device sync**
(bookmarks/annotations/florilegia). Ambience self-hides (empty catalogue). Core
Orthodox content is never paywalled. Web shows the price-free pricing copy and no buy
buttons, and stays fully open, until web billing exists.

## Hide (native shell only, via PurifyNative UA gate)

- /support donation links (BMC, PayPal, Cash App) → quiet contact block. **3.1.1.**
- Footer donate links.
- InstallPrompt + DesktopInstallCTA + any "install the app" copy (we ARE the app).
- Campaigns link from /prayers (route is an honest "coming soon" shell — no value in the binary).
- Pricing page: on **web** the price-free "what a subscription will fund" copy stays (no buy buttons). On **native** the page also renders the Purify Plus paywall (`PlusPaywall`) with live Play prices and Subscribe/Restore.

## Defer (post-launch backlog, explicitly out of the sprint)

- ~~Purify Plus + IAP~~ — **shipped in Android v1** (see top of file). iOS StoreKit (same RevenueCat integration) and **web checkout (Stripe)** remain deferred; web enforcement (`PLUS_ENFORCED_WEB`) flips only once web billing exists.
- Push notifications.
- Universal/deep links (apple-app-site-association, assetlinks.json).
- iPad layout + screenshots.
- valley.mp3 CDN hosting.
- All v9.9 content work: Catena Aurea ingest, 5 new Topics, 3 new Heresies, Theophylact, language editorial pipeline.
- Discover/nav redesigns beyond what shipped in v9.8.

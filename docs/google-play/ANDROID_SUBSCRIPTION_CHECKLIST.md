# Purify Plus — Android Subscription Checklist

Drafted 2026-06-16. Companion to `docs/architecture/ANDROID_PLAY_LAUNCH_CHECKLIST.md`.
Decision: **Purify Plus subscriptions ship in v1** (Android-first). Billing path:
**RevenueCat → Google Play Billing**. iOS reuses the same RevenueCat integration
when the Apple account unparks.

Legend: ✅ done in code · ⚙️ founder/dashboard action · ⚠️ verify · ❗ blocker.

## The model (unchanged, never paywall core)

Free, always: Scripture, Bible reader, prayer book, saints, councils, theology,
apologetics, heresies, calendar core, patristic/public-domain content, local
notes/highlights/reading. **Purify Plus** adds: cross-device sync, Florilegium /
custom collections, personal library organization, guided collections (later),
ambient prayer (later), future audio. Pre-launch supporters keep **lifetime sync**
(sync only, not the wider Plus layer).

Pricing: **Monthly $9.99**, **Yearly $99**.

## How it is wired (code that already exists on `feat/plus-billing`)

- ✅ **Entitlement store**: `public.entitlements` (`is_supporter`, `plus_until`,
  `plus_source`) + the service-role `upsert_entitlement()` RPC
  (`supabase/migrations/20260612_entitlements.sql`). **No new migration needed.**
- ✅ **Derivation**: `lib/entitlements/entitlements.ts` — `plus_until` in the
  future ⇒ Plus; supporter ⇒ lifetime sync. One timestamp expresses purchase,
  renewal, cancel-still-active, and expiry.
- ✅ **Surface-scoped enforcement** (the key design choice): enforcement is
  per store via `plusEnforcedFor(surface)`, where surface is `"android"`,
  `"ios"`, `"web"` or `"native-unknown"`. `PLUS_ENFORCED_ANDROID` gates the
  Play build; `PLUS_ENFORCED_IOS` is separate and stays off while the App
  Store products sit at MISSING_METADATA; `PLUS_ENFORCED_WEB` stays off until
  a web checkout exists. No surface ever locks users out of something they
  cannot buy on their own store. **All three default false and are
  env-driven**: set `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=true` to throw the Play
  launch switch (no code change).
  The legacy `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE` is still read and still means
  Android, but prefer the explicit name: the same secret used to be passed to
  both `android-apk.yml` and `ios-release.yml`, so it silently reached iOS.
  `"native-unknown"` is what the server reports, since both shells send one
  shared UA token; it enforces only when both stores are launched.
- ✅ **Gated Plus surfaces** (native, once enforced): **Florilegium / custom
  collections** (server-gated in the florilegium pages via `getEntitlements`) and
  **cross-device sync** — bookmarks, annotations, and florilegia sync
  (`lib/sync/*`) now guard on `canSync()` (`lib/entitlements/client.ts`), which is
  native-aware. Ambience self-hides (empty catalogue), so it needs no gate yet.
- ✅ **Native billing client**: `lib/billing/revenuecat.ts` — configure + identify
  (appUserID = Supabase uid), offerings, `purchase`, `restore`, `isPlusActive`,
  manage-subscription deep link. Dynamic-imports the plugin; no-ops on web.
- ✅ **Paywall UI**: `components/billing/PlusPaywall.tsx`, mounted on
  `app/(app)/pricing/page.tsx`. Native-only (returns null on web). Shows Yearly +
  Monthly with live store prices, Subscribe, Restore, Manage, graceful fallback,
  "sign in to subscribe" when signed out.
- ✅ **Webhook**: `app/api/billing/revenuecat/route.ts` — verifies the Authorization
  secret, maps `app_user_id → user_id`, writes `plus_until` via `upsert_entitlement`
  (`plus_source='google'`), preserves `is_supporter`. Handles purchase / renewal /
  cancellation (keeps access to period end) / expiration (auto-frees).

## RevenueCat dashboard (founder) ⚙️

1. Create the RevenueCat project; add the **Google Play** app
   (`net.purifyapp.purify`); upload the Play **service-account credentials** so
   RevenueCat can read purchases.
2. Create one **entitlement** with identifier **`plus`** (must match
   `PLUS_ENTITLEMENT_ID`).
3. Create **products** that point at the Play base plans, attach them to the
   `plus` entitlement, and add them to the **default Offering** as the **Monthly**
   and **Annual** packages (the paywall reads `offering.monthly` / `offering.annual`).
4. Copy the **public Android SDK key** (`goog_…`) → env `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`.
5. Configure the **webhook**: URL `https://purifyapp.net/api/billing/revenuecat`,
   Authorization header value → env `REVENUECAT_WEBHOOK_SECRET` (the route fails
   closed if unset). Send a **test event** and confirm a 200.

## Play Console (founder) ⚙️

1. Subscription product **`purify_plus`** with two base plans:
   - **`monthly`** — auto-renewing, $9.99, P1M.
   - **`yearly`** — auto-renewing, $99, P1Y.
2. Activate both base plans; set prices across markets.
3. Add **license testers** (Setup → License testing) so testers buy without being
   charged.
4. **Data safety**: declare in-app purchases / a subscription, and the account
   email (already declared). See `docs/google-play/PLAY_STORE_LISTING.md`.
5. Listing copy must **not** claim "no purchases" — the listing doc is corrected.

## Env vars to set (Render + CI) ⚙️

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` | Render (public) | client SDK key |
| `REVENUECAT_WEBHOOK_SECRET` | Render (server) | webhook auth; route 503s without it |

(`SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` already exist — the
webhook reuses `createAdminClient()`.)

## Native build step ❗

RevenueCat is a Capacitor native plugin. After install the Android project must be
synced so Gradle picks it up:

```
npx cap sync android
```

Then build the AAB (Actions → **Android build**). Confirm a green build **with the
plugin linked**. The JS dependency is already in `package.json`; the native sync +
build cannot be verified from the dev environment and must run in CI / locally.

## Required behaviors — verify on a real internal-testing device ⚠️

- [ ] Signed-out user sees "sign in to subscribe"; signed-in user sees plans.
- [ ] Live **prices** render (proves the Offering resolves).
- [ ] **Buy Monthly** → Play sheet → success → paywall flips to "You have Purify Plus".
- [ ] **Buy Yearly** likewise.
- [ ] Webhook fires → `entitlements.plus_until` set → with
      `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE=true`, gated surfaces unlock: **Florilegium
      custom collections** AND **cross-device sync** (bookmarks/annotations/florilegia
      start syncing again for the subscriber).
- [ ] With enforcement on and NOT subscribed: sync is silent (no pushes/pulls),
      Florilegium shows the PlusGate — but Scripture, prayers, saints, councils,
      calendar all stay fully usable.
- [ ] **Restore** on a reinstall returns Plus.
- [ ] **Cancel** in Play → access persists until period end (`plus_until` unchanged).
- [ ] **Expiry** → next webhook sets a past `plus_until` → account returns to free.
- [ ] Billing **unavailable** (e.g. no Play account on device) → quiet fallback, no crash.
- [ ] Pre-launch **supporter** row keeps sync after a sub lapses (webhook preserves `is_supporter`).

## Launch switch (last step, after device verification) ⚙️

Set **`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=true`** (Render env plus the GitHub
repo secret, no code change) once the purchase→entitlement→unlock loop is proven
on a device, then rebuild the AAB. Web and iOS both stay open
(`NEXT_PUBLIC_PLUS_ENFORCED_WEB` stays unset until Stripe lands,
`NEXT_PUBLIC_PLUS_ENFORCED_IOS` until the App Store products are approved). Because
the value is inlined at build time, the launch switch requires a rebuild, not just a
runtime env change.

## What blocks production upload ❗

1. Purchase → webhook → entitlement → unlock proven on a device (Florilegium + sync).
2. `npx cap sync android` + a green AAB with the plugin linked.
3. RevenueCat + Play products live and matched (`plus`, `purify_plus`/`monthly`/`yearly`).
4. Env vars set on Render (incl. `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE` at flip time).
5. (Process) the individual-account **closed-test 12-testers/14-day** rule if it
   applies — start internal testing now.

## Out of scope for v1 (documented, deferred)

- Web checkout (Stripe) + flipping `NEXT_PUBLIC_PLUS_ENFORCED_WEB`.
- iOS StoreKit (same RevenueCat integration; unpark when the Apple account is active).

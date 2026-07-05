# Shop Phase 1: EIKON, store-first marketplace foundation

Status: built on `feat/shop-eikon-phase1`, NOT deployed. The whole feature
sits behind `SHOP_ENABLED` and ships dark until suppliers and payments are
connected.

## What exists

One live store, EIKON, a Purify-owned curated icon retailer, on top of a
multi-seller-capable schema (`supabase/migrations/20260704_shop_phase1.sql`):

- `shop_sellers` / `shop_stores` — EIKON seeded (seller_type `purify_owned`,
  verification `purify_operated`, disclosure "EIKON is owned and operated by
  Purify." baked into the store row and rendered on the storefront, product
  pages, checkout, and the site footer).
- `shop_products` + `shop_product_media` + `shop_product_subjects` — catalog,
  imagery (alt text required), and slug links into the saints/feasts/history
  registries.
- `shop_suppliers` + `shop_product_sourcing` — ADMIN-ONLY (RLS with no
  policies; only the service role reads them). Supplier identity, SKUs,
  costs, URLs, and internal notes never reach a browser.
- `shop_icon_requests` — demand collection (anonymous allowed), later the
  seed of the seller-only Demand Board.
- `shop_merchant_applications` + `shop_application_notes` — Sell on Purify
  pipeline; reviewer notes live in a separate admin-only table.
- `shop_orders` + `shop_order_items` — two-stage EIKON fulfillment statuses
  internally; buyers only ever see the simple vocabulary (Order Confirmed /
  Preparing Your Order / Ready to Ship / Shipped / Delivered) via
  `lib/shop/status.ts`.

## Applying the migration

Run `supabase/migrations/20260704_shop_phase1.sql` against the project in the
Supabase SQL editor (same as previous migrations). Idempotent: tables use
`if not exists`, the EIKON seed uses fixed UUIDs with `on conflict do nothing`.

Then seed the catalog (10 products, placeholder prices, service role):

```
node scripts/seed-shop.mjs        # requires SUPABASE_SERVICE_ROLE_KEY in env
```

## Environment

| Var | Meaning |
| --- | --- |
| `SHOP_ENABLED` | `1` renders /shop; otherwise all shop routes 404 and entry points hide. |
| `SHOP_CHECKOUT_ENABLED` | `1` + Stripe keys = live checkout; otherwise "Checkout opens soon" + Notify Me. |
| `STRIPE_SECRET_KEY` | Server-only, `sk_test_…` until launch. Absent = checkout hard-disabled. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/shop/stripe-webhook`. |

## Checkout model (Phase 1)

Single-store, single-item Stripe Checkout. The API route loads price and
availability from `shop_products` server-side (client input is only a product
slug + quantity), creates the order row `pending`, and the webhook flips it
`paid`. No RevenueCat, no in-app purchase, no Connect, no payouts, no
multi-seller cart. With no Stripe account configured the entire path degrades
to the disabled state; nothing 500s.

## Authorization summary

- Admin = `ADMIN_EMAILS` allowlist via `lib/admin/access.ts` (`getAdminUser`),
  same as the rest of the admin panel. All admin shop operations go through
  `app/api/admin/shop/*` with the service role.
- Public tables expose only `published` products / `live` stores through RLS.
- Icon requests + merchant applications are inserted by their API routes
  (zod-validated, rate-limited, service role) so clients can never set
  status columns; owners can SELECT their own rows only.
- Nothing client-side can create sellers or stores. Seller creation happens
  only when an admin approves an application (Phase 2 completes this loop).

## Android / offline

`app/(app)/shop` is stashed from the Android static export
(`scripts/android-build.mjs` STASH_PATHS) — the marketplace is web/PWA-only
in Phase 1 and requires a connection. The saint-page "Icons of This Saint"
rail fetches client-side and renders nothing offline or in the native shell.

## Deliberately out of scope (see the Phase plan)

Stripe Connect, payouts, commissions, multi-seller carts, messaging, demand
board UI, buyer-protection engine, reviews (the storefront renders a reviews
section only when real reviews exist, which is never in Phase 1),
international shipping, tax calculation.

## Open operator decisions before any public launch

- Stripe account + real keys; webhook endpoint registration.
- Supplier selection; real product photos, dimensions, and prices
  (seed prices are placeholders).
- Shipping rates (currently flat $0 in checkout stub) and tax handling.
- Return window final wording (seeded at 30 days).
- support@purifyapp.net mailbox existence.

# Shop Phase 2: Seller Console

Status: built on `feat/shop-eikon-phase1`, NOT deployed. Everything sits
behind `NEXT_PUBLIC_SHOP_ENABLED` with Phase 1 and ships dark.

## What exists

A signed-in console at `/shop/seller` for any user whose account owns a
`shop_sellers` row (Overview, Orders, Messages, Listings, Earnings), plus
the buyer-side halves of the same loops: order detail with "Message the
seller" and "Request a refund" (`/shop/orders/[id]`), and a buyer inbox
(`/shop/messages`).

### Sign-in / authorization model

There is no separate seller login. Sellers sign in with their normal
Purify account; console access is granted by the existence of a
`shop_sellers` row with their `user_id`, and those rows are created only
by an admin act:

1. User applies at `/shop/sell/application` (Phase 1).
2. Admin reviews (`PATCH /api/admin/shop/applications`), sets `approved`.
3. Admin calls `POST /api/admin/shop/applications/provision` — creates the
   seller row (console access starts here) + a DRAFT store, moves the
   application to `store_setup`.
4. Operator flips the store `live` when listings are ready (manual, in DB
   or a future admin surface). Publishing listings requires a live store.

Suspension: `shop_sellers.status != 'active'` locks the console to an
honest notice and every seller API answers 403.

EIKON itself: `20260705_shop_eikon_identity.sql` links the operator
account (lifeistheosis@gmail.com) to EIKON's seller row, so that account
gets the console for the founding store. The account must exist in
auth.users when the migration runs; rerun the UPDATE if it no-ops.

## Migration

`supabase/migrations/20260705_shop_seller_console.sql` — seller
self-select RLS over their sellers/stores/products/media/orders/items,
plus three new surfaces:

- `shop_conversations` + `shop_messages` — buyer ⇄ store threads,
  anchored to an order/product when relevant. Read stamps per side, no
  per-message receipts. Participants SELECT via RLS; writes go through
  API routes (service role) like everything else in the shop.
- `shop_refund_requests` — pipeline `requested → approved|declined`,
  `approved → processed`, buyer may withdraw (`cancelled`). Partial
  unique index = one live request per order.
- `shop_orders.stripe_payment_intent` — recorded by the webhook so
  refunds don't need to rediscover the charge.

Run it in the Supabase SQL editor after the Phase 1 migration; same
idempotency discipline.

## Refund model

- Buyer files a request from the order page (reason + free text; never an
  amount — the amount is settled server-side at decision time).
- Seller approves or declines in the console. Decline requires a note the
  buyer sees.
- Approve with checkout live + a payment intent on file → Stripe refund
  fires immediately, request lands `processed`, order flips
  `refunded/refunded` in the same request.
- Approve without Stripe (dark checkout, missing intent, Stripe error) →
  request parks at `approved` for manual settlement; the buyer sees
  "approved", never a false "refunded".
- Sellers can never CANCEL a paid order (`/api/shop/seller/orders`
  refuses); paid money only moves through this pipeline.

## Order management

`lib/shop/sellerOrders.ts` is the single transition map (UI buttons and
API validation both read it): forward-only
`pending → packaged → shipped → delivered`, cancel only pre-shipment and
only unpaid, tracking number required to mark shipped. Supplier-pipeline
stages remain EIKON/admin territory; the console only offers "packaged"
out of them.

## Earnings

`lib/shop/earnings.ts`, pure functions over the seller's own orders
(RLS-scoped): gross / refunded / net, AOV, refund rate, monthly buckets,
top products. No projections; refunds count in the order's month. Fees
are explicitly out of scope until Stripe Connect (Phase 3).

## Testing

- Unit: `lib/shop/__tests__/{sellerOrders,refunds,earnings}.test.ts`.
- Smoke: `tests/smoke/seller-console.spec.ts` — gate pages signed out,
  API 401/403s, a11y. Green with or without the DB migration, matching
  the shop.spec discipline.

Full signed-in flows need a provisioned seller + applied migration; do a
manual pass on staging before flipping anything live.

## Deliberately out of scope (Phase 3+)

Stripe Connect payouts and fee accounting, partial refunds, image
uploads (listings take URLs for now), conversation close/archive UI,
email notifications for messages/refunds, admin UI for provisioning
(the endpoint exists; the button doesn't), demand board.

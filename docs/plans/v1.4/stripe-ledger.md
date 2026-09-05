# Stripe ledger in the Revenue tab

Reported 2026-09-05: "the full Stripe logs aren't showing in Revenue".
They cannot: nothing in the panel reads Stripe. `app/api/admin/revenue/route.ts`
sums `shop_orders` (settled by `checkout.session.completed` only, zero paid to
date), the typed `donations_monthly` figure, and RevenueCat project metrics,
which need `REVENUECAT_V2_API_KEY` and `REVENUECAT_PROJECT_ID` and return
null without them. Subscription invoices billed through Stripe, refunds,
Stripe fees and payouts appear nowhere.

## Steps

1. `lib/billing/stripeLedger.ts`. `listLedger({ from, to })` pages
   `stripe.balanceTransactions.list` (100 per page, `created` bounds, follow
   `has_more`) and maps each row to
   `{ id, created, type, amount, fee, net, currency, description, source }`.
   `summarise(rows)` groups by type: charge, payment, refund, payout,
   stripe_fee, adjustment, application_fee, transfer. Pure, tested with
   fixture rows. Never throws: a missing key returns `{ configured: false }`.
2. `app/api/admin/revenue/stripe/route.ts`. `getAdminUser()` gate, `?range=`
   in the same vocabulary as the tab (7d, 30d, 90d, ytd, all), 60 second
   in-memory cache per range so a poll never hammers Stripe, `configured`
   flag in the body. The key is `STRIPE_SECRET_KEY`, the one checkout uses.
3. `components/admin/tabs/RevenueTab.tsx`: a "Stripe ledger" card under the
   run-rate card. Totals row: charges, refunds, fees, payouts, net. Then a
   `DataTable` of transactions (date, type, description, gross, fee, net)
   with CSV export. Customer emails, where a description carries one, go
   through `<Email>` so streamer mode masks them. When `configured` is
   false the card says which env var is missing and nothing else.
4. Matching. For each charge, look up `shop_orders.stripe_payment_intent`
   and label it "Shop order #"; an `invoice` on the charge labels it
   "Subscription"; anything else is "Unmatched" and counted, so a payment
   the books never saw is visible as a number, not a mystery.
5. "Realized revenue by source" (`revenue/route.ts`, the `bySource` block):
   when RevenueCat is unconfigured, the subscriptions slice comes from
   Stripe charges tagged Subscription, net of refunds. Labelled "Stripe" so
   it never reads as RevenueCat.
6. Verify `STRIPE_SECRET_KEY` is set on the Render service. It is empty in
   the local `.env.local`, so this can only be checked on the deployed
   panel: the card's `configured` flag is the probe.
7. Tests: mapper and summariser on fixture rows; route returns
   `configured: false` with no key and never 500s; matching labels the
   three cases.
8. Verify signed in on localhost with a test key if the owner provides one,
   otherwise on production after the push. Then 🤫 silent push: admin only.

## Not in this change

- Writing Stripe data into a table. The ledger is read live from Stripe
  and cached a minute; a snapshot table is a later choice if the panel
  needs history Stripe no longer returns.
- RevenueCat. Setting `REVENUECAT_V2_API_KEY` and `REVENUECAT_PROJECT_ID`
  on Render restores the real subscription figure with no code change.

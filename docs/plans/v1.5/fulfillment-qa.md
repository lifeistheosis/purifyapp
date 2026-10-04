# Fulfillment QA: one queue for every physical thing we owe someone

Status: PLAN ONLY. Nothing in here is built. Written 2026-09-12 under a
budget pause; this file is the brief for the session that implements it.

Owner ask, verbatim intent: a Quality Assurance section that tracks every
order we owe a human being, shop orders and EIKON Box claims together, in one
list, sorted by how urgent shipping is, aware that most goods come from a
distributor to Edgar first and only then go to the buyer. Plus: a fix for
buyers who never gave us an address.

---

## 0. The address premise is half wrong, and the half that is wrong is a bug

Before building the popup the owner asked for, read this. The workaround may
be unnecessary for shop orders and is definitely necessary for Plus.

**Shop orders already ask for the address.** `lib/shop/checkout.ts:312` sets
`shipping_address_collection: { allowed_countries: ["US"] }` on the Checkout
Session. Stripe will not let a buyer pay without entering one. So the address
is being collected. If orders show no address, we are losing it after Stripe
has it, not failing to ask.

**Where it is most likely being lost.** `lib/shop/webhookSettlement.ts:144`:

```ts
shipping_address: session.collected_information?.shipping_details ?? null,
```

Two problems in one line.

1. `collected_information.shipping_details` is the shape of newer Stripe API
   versions. Older versions return the same data at `session.shipping_details`,
   and `customer_details.address` carries the billing copy on every version.
   No `apiVersion` is pinned anywhere in `lib/` (grep returns nothing), so the
   SDK uses the Stripe account's default version, which is whatever the
   dashboard says and can change under us. If that default predates
   `collected_information`, this expression is `undefined` on every order.
2. The `?? null` makes the failure silent and destructive. It does not skip
   the column, it writes NULL over it. The webhook is idempotent and can run
   more than once, so a later replay re-nulls a field somebody may have
   filled in by hand.

**Verify before building anything.** This is one probe, not a refactor:

```bash
stripe checkout sessions retrieve <a_real_paid_session_id> | \
  jq '{collected_information, shipping_details, customer_details}'
```

Whichever key holds the address is the one to read. Then check the data:

```sql
select id, created_at, email,
       shipping_address is null as no_address
  from shop_orders
 where payment_status = 'paid'
 order by created_at desc
 limit 50;
```

If every paid row is `no_address = true`, it is the webhook, and the fix is a
three-source fallback plus never overwriting a good value with null:

```ts
const shipping =
  session.collected_information?.shipping_details ??
  session.shipping_details ??
  (session.customer_details?.address
    ? { name: session.customer_details.name, address: session.customer_details.address }
    : null);
// and then, in the update: only include the key when `shipping` is non-null,
// so a replay cannot erase an address we already hold.
```

If rows DO have addresses, then the owner is looking at the wrong screen and
the real problem is that the admin order view does not render
`shipping_address`, which is a display fix, not a data fix.

**Plus/EIKON is the genuine gap.** A Plus subscriber buys through RevenueCat,
Play Billing, or the App Store. None of those hand us a shipping address, and
they never will. `eikon_drop_claims.shipping_address` is `not null` and
`claim_eikon_box()` takes `p_address`, so today the address is demanded at
claim time, inside the claim form. That works, but it puts a five-field form
between a member and the button they came to press, on the one screen where
we want zero friction. This is where the owner's popup belongs.

---

## 1. The address prompt the owner asked for

Not a popup on the buy button. A prompt at the moment it is true.

**Trigger.** When a row enters `needs_address` (see §3): paid or claimed,
and no usable address on file. Surfaces in three places, all reading the same
state:

- a persistent banner on `/account`, dismissible per session, never per user
- an email, sent once on entry to the state, resent at day 3 and day 7
- the EIKON claim screen, which pre-fills from `member_addresses` and only
  shows the full form when that table has nothing for this member

**Reuse, do not rebuild.** `member_addresses` already exists as "where the
NEXT box should go", one row per member, service-role write through
`/api/eikon-box/address`. That route already validates the shape. Extend it
to accept a shop-order context and to backfill an order that is waiting.

**Copy.** "Your order is ready to ship. Tell us where to send it." Not
"enter your address info". No em dashes. Voice is Edgar, the Purify Team.

**The rule that keeps the data honest.** The claim row's
`shipping_address` is a snapshot of where one box went and is frozen once the
row is packed. `member_addresses` is the live default. The migration header
at `supabase/migrations/20260731_eikon_box.sql:127` already says this; the
prompt must write to `member_addresses` AND stamp the snapshot on the open
row, not just one of them.

---

## 2. What the section is

A single admin route, `/admin/fulfillment`, that unions two tables the
codebase deliberately kept apart, and keeps them apart in storage while
showing them as one list.

**Do not merge the tables.** The EIKON migration header spells out why a
claim is not a `shop_orders` row: `app/api/admin/overview` counts every
`shop_orders` row with no filter and pulls `total_cents` into the 30-day
revenue series, so free claims would post as $0 orders and drag the averages
down on the screen the owner reads most. That reasoning still holds. The
union happens in a read layer, `lib/fulfillment/queue.ts`, not in SQL DDL.

The union is cheap because the shapes were built to match: both carry
`shipping_address` in Stripe's exact jsonb form and `outbound_tracking` as a
bare string, on purpose, so one renderer serves both.

**Row shape returned by the queue:**

| field | shop | eikon |
|---|---|---|
| `kind` | `'shop'` | `'eikon'` |
| `ref` | order id | claim id |
| `who` | `email` | `email` |
| `what` | order items | drop title |
| `address` | `shipping_address` | `shipping_address` |
| `paidAt` | `paid_at` | `claimed_at` |
| `stage` | derived, see §3 | derived, see §3 |
| `tracking` | `outbound_tracking` | `outbound_tracking` |
| `value` | `total_cents` | `0`, and it must render as "included with Plus", never as $0 |

---

## 3. Stage, and the two-leg shipping the owner described

The owner's model: distributor ships to Edgar, Edgar ships to the buyer.
Today only the second leg is recorded. `eikon_drops.sourcing_notes` is a free
text scratchpad holding supplier, unit cost, and inbound tracking, and shop
orders have no inbound concept at all.

**Stages, in order:**

1. `needs_address`: money taken, nowhere to send it. Blocks everything.
2. `awaiting_stock`: sourced from a distributor, not yet in Edgar's hands.
3. `ready_to_pack`: stock on hand, address known.
4. `packed`: boxed, label not bought.
5. `shipped`: `outbound_tracking` set.
6. `delivered`.

`needs_address` outranks everything. A row in it is not late, it is stuck,
and the fix is a message to the buyer, not a trip to the post office.

**Inbound leg.** Add to both sides a nullable
`inbound_eta` (date) and `inbound_tracking` (text). Shop products that are
stocked on hand set `inbound_eta` to null and skip `awaiting_stock`. This is
the only new column family the plan asks for.

---

## 4. Urgency, computed not typed

The owner asked for "urgent ship now" as a category. Make it derived, so it
cannot go stale the way a manually set flag does.

```
ageDays      = now - paidAt
promisedDays = 3 for shop, 10 for eikon        (confirm against Terms first)
slack        = promisedDays - ageDays, minus inbound_eta when awaiting stock

URGENT   slack <= 0, or needs_address and ageDays >= 2
SOON     slack <= 2
OK       otherwise
BLOCKED  needs_address and inbound not yet in
```

Sort: URGENT, then SOON, then oldest paid first inside each band. One number,
no dropdown, nothing for the owner to remember to set.

**Before writing the numbers above, read the Terms.** The shipping window we
publish is a legal commitment and it is a stop condition. Do not invent 3 and
10; find what `/terms` and the shop confirmation email actually promise and
use those. If they promise nothing, say so in the PR and ask.

---

## 5. Files, in the order to touch them

1. `lib/shop/webhookSettlement.ts`: the §0 fix. Ship this alone, first, even
   if nothing else gets built. It is losing data right now.
2. `supabase/migrations/2026MMDD_fulfillment.sql`: `inbound_eta`,
   `inbound_tracking` on `shop_orders` and `eikon_drop_claims`. **Merging
   this to main runs the DDL against production.** Owner sign-off on the SQL
   before merge, not after. Show it inline as a copyable block.
3. `lib/fulfillment/queue.ts`: the union read, stage derivation, urgency.
   Pure functions, unit tested, no Supabase calls in the scoring path.
4. `lib/fulfillment/__tests__/queue.test.ts`: the urgency table is exactly
   the kind of thing that rots. Test the boundaries.
5. `app/api/admin/fulfillment/route.ts`: service role, admin guard, projects
   safe columns only. Never returns `sourcing_notes`.
6. `app/admin/fulfillment/page.tsx` + client child. Web-only, so add it to
   the stash list in `scripts/native-build.mjs` alongside the other admin
   trees or the native export breaks.
7. `app/api/eikon-box/address/route.ts`: widen to cover shop orders.
8. The prompt surfaces: account banner, claim screen pre-fill, the email.

## 6. Definition of done

Typecheck 0. Unit tests green. `npm run build:android` and `build:ios` both
export clean, because a new admin tree that is not stashed will break them.
A browser walk of: an order with no address, an order awaiting stock, and a
claim, each showing the right stage and band. Audit ledger updated,
`docs/audit/findings.yaml`, because §0 is a settlement-path change and that
area is audited.

## 7. Open questions for the owner

1. What shipping window do the Terms actually promise, shop and EIKON?
2. Is the distributor per product, or one supplier for everything? If per
   product, `inbound_eta` belongs on the product, not the order.
3. Should a `needs_address` order auto-refund after some number of days of
   silence, or wait forever?

-- Stripe Connect: a store can be paid, and what Purify took is written down.
--
-- WHY THIS EXISTS. There is no Connect primitive anywhere in this codebase.
-- lib/shop/checkout.ts:176 builds its Checkout Session with no
-- payment_intent_data block at all, so there is nowhere for a destination or a
-- fee to live, and every payment the shop has ever taken settles into Purify's
-- own Stripe balance. A seller therefore cannot be paid except by hand, and a
-- refund a seller approves spends Purify's cash rather than theirs. That is
-- also why app/api/shop/seller/refunds/route.ts now stops at 'approved'
-- (20260824, the co-sign): the co-sign exists to be REMOVED by this work.
--
-- ── Two tables, not four columns on shop_stores ──────────────────────────
--
-- The obvious shape is stripe_account_id and commission_rate_bps as columns on
-- shop_stores. That shape leaks the commission to the public internet, and the
-- leak is not theoretical. Measured against production 2026-08-24 with
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, the key that ships inside the client bundle:
--
--     GET /rest/v1/shop_stores?select=*        -> 200, every column
--     GET /rest/v1/shop_stores?select=support_email -> 200
--     GET /rest/v1/shop_sellers?select=legal_name   -> 200, "Purify"
--     GET /rest/v1/shop_reviews?select=*       -> 401 42501   (the control)
--
-- shop_stores carries a `status = 'live'` RLS policy, and RLS is ROW-scoped,
-- never column-scoped. Supabase's default table-wide grant to anon then covers
-- every column that table will ever have. A commission_rate_bps column added
-- there is readable by anyone the moment it exists, which is precisely the
-- disclosure standing rule 9 forbids: an ownership split on a client-facing
-- surface. The shop_reviews control proves the column-grant fix works on this
-- database, because 20260802_revoke_public_user_id.sql already applied it
-- there.
--
-- Converting shop_stores to column grants was the alternative and was
-- rejected: `select=*` STOPS WORKING under column grants (measured above), and
-- lib/shop/catalog.ts:66 and lib/shop/seller.ts:48 both read this table with
-- `select("*")` through a non-service-role client. That is a storefront outage
-- traded for a schema convenience.
--
-- So the money facts live in their own tables with RLS on and NO POLICY AT
-- ALL. No policy means no row is visible to anon or authenticated no matter
-- what any future route asks for; the service role bypasses RLS and is the
-- only reader. The grants are revoked as well, because a table-level grant is
-- what made shop_stores readable in the first place and defence in depth here
-- costs one line.
--
-- ── Why the per-order row exists ─────────────────────────────────────────
--
-- lib/shop/earnings.ts:19 documents netCents as "what the seller actually
-- keeps before fees" while subtracting no fee, because no fee has ever
-- existed. Fixing that sentence needs a number, and the number has to be the
-- one Stripe actually charged, frozen at the moment of the charge. A rate read
-- from the store today would silently restate last quarter's earnings the
-- first time a rate is renegotiated.
--
-- The fee is deliberately NOT a column on shop_orders. shop_orders is read by
-- the BUYER through their own RLS policy, and column grants cannot tell a
-- buyer apart from a seller: both are the `authenticated` role. A buyer being
-- able to query the commission on their own order is the same rule-9
-- disclosure in a smaller window.
--
-- ── The commission floor ─────────────────────────────────────────────────
--
-- 1000 bps, 10%, per the owner's decision, enforced here as well as in
-- lib/shop/connect.ts so neither can drift alone. The 5000 ceiling is not a
-- policy, it is a typo guard: a rate above half is far likelier to be a
-- misplaced digit than an intention, and widening it is a one-line rollback.
--
-- A Purify-operated store simply has no row here. No row means no connected
-- account, which means checkout builds the session exactly as it does today
-- and the rate is never applied to anything. That is how EIKON keeps working
-- unchanged through this migration: it is a partner Purify holds closely, its
-- money already lands in Purify's balance, and nothing about it should move.
--
-- LOCKING. Two CREATE TABLEs and their indexes: no existing table is rewritten
-- and no lock is taken on shop_stores or shop_orders beyond the momentary
-- SHARE the foreign keys need. lock_timeout bounds that to a fail-fast retry.
-- Plain SET rather than SET LOCAL for the reason 20260822_shop_orders_paid_at
-- gives: SET LOCAL outside a transaction is a warning and a no-op.

set lock_timeout = '3s';
set statement_timeout = '30s';

-- ── Per store: can it be paid, and on what terms ─────────────────────────
create table if not exists public.shop_store_payouts (
  store_id uuid primary key references public.shop_stores (id) on delete cascade,
  -- acct_... Null while an account is being created; unique because a Stripe
  -- account belongs to exactly one store.
  stripe_account_id text,
  -- Mirrored from account.updated. NEVER inferred from "we created an
  -- account": Stripe enables charges only after identity and bank details
  -- clear, which can take days and can be revoked later.
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  -- Basis points. 1000 = 10%, the floor the owner set.
  commission_rate_bps integer not null default 1000
    check (commission_rate_bps >= 1000 and commission_rate_bps <= 5000),
  -- When the seller was last sent through onboarding, so the console can tell
  -- "never started" from "started and abandoned".
  onboarding_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shop_store_payouts_account_unique
  on public.shop_store_payouts (stripe_account_id)
  where stripe_account_id is not null;

comment on table public.shop_store_payouts is
  'Stripe Connect state and the negotiated commission, one row per store. Service role only: RLS is on with no policy and the anon/authenticated grants are revoked, because commission_rate_bps is an ownership split and shop_stores is world-readable for live stores. A store with NO ROW here has no connected account, so checkout charges it exactly as it did before Connect existed.';

-- ── Per order: what was actually taken, frozen ───────────────────────────
create table if not exists public.shop_order_fees (
  order_id uuid primary key references public.shop_orders (id) on delete cascade,
  -- The destination at the moment of the charge. Recorded on the ORDER rather
  -- than read back from the store, because a store can be re-onboarded onto a
  -- different account and a refund must reverse to the account that was paid.
  stripe_account_id text not null,
  -- All three frozen: the rate can be renegotiated, and last quarter's
  -- earnings must not restate themselves when it is.
  commission_rate_bps integer not null,
  commission_base_cents integer not null,
  application_fee_cents integer not null,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_fees_account_idx
  on public.shop_order_fees (stripe_account_id, created_at desc);

comment on table public.shop_order_fees is
  'What Purify charged on one order, written by checkout at the moment the Stripe session is created. Frozen, never recomputed. Service role only, for the same reason shop_store_payouts is: a buyer reads shop_orders under their own RLS policy and both parties are the authenticated role, so a fee column on shop_orders would be a commission a buyer could query. Absent row = the order was charged with no connected account.';

-- ── Locked down ──────────────────────────────────────────────────────────
-- RLS with no policy denies every non-service-role read. The REVOKEs are
-- belt to that braces: a table-level grant is exactly what made shop_stores
-- readable, and a future `create policy` written without reading this comment
-- would otherwise open the table in one line.
alter table public.shop_store_payouts enable row level security;
alter table public.shop_order_fees enable row level security;

revoke all on public.shop_store_payouts from anon, authenticated;
revoke all on public.shop_order_fees from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────
--
-- A. Did it apply, and is it actually closed. From a shell:
--
--      curl -s -o /dev/null -w "%{http_code}\n" \
--        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/shop_store_payouts?select=commission_rate_bps" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--
--    401 is the PASS. 200 means the table exists and is readable by the
--    browser bundle, which is the entire failure this file is shaped to avoid;
--    re-run the REVOKEs and look for a policy someone added.
--
--    Then the same URL with the service role key must answer 200 and [].
--
-- B. Nothing changed for EIKON:
--
--      select s.slug, p.store_id is not null as has_payouts_row
--        from public.shop_stores s
--        left join public.shop_store_payouts p on p.store_id = s.id;
--
--    Every row must read has_payouts_row = false immediately after this
--    applies. A store with no row is charged exactly as it was yesterday.
--
-- C. The floor holds:
--
--      insert into public.shop_store_payouts (store_id, commission_rate_bps)
--      values ('<a real store id>', 500);
--
--    Must fail with 23514. Delete the row if it somehow succeeds.
--
-- Rollback:
--   drop table if exists public.shop_order_fees;
--   drop table if exists public.shop_store_payouts;
--
-- Free before any store is onboarded. After onboarding, dropping
-- shop_store_payouts orphans live Stripe accounts: the accounts keep existing
-- and keep holding money, and nothing in this database knows their ids any
-- more. Read them out of the Stripe dashboard first.

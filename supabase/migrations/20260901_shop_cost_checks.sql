-- When a supplier cost was last VERIFIED, and what it was each time.
--
-- ── Why updated_at could not do this job ────────────────────────────────
--
-- shop_product_sourcing already has updated_at, and it is the wrong clock. It
-- moves when anyone edits anything on the row: packaging notes, a lead time, a
-- typo in an internal note. A recheck queue built on it would treat "somebody
-- fixed a spelling mistake in March" as "the price was confirmed in March",
-- which is exactly the false reassurance the queue exists to prevent.
--
-- cost_checked_at moves only when a human or an agent has actually gone and
-- looked at the supplier's price. Null means never, and lib/shop/recheck.ts
-- sorts never above everything.
--
-- ── Why the history is a table and not a column ─────────────────────────
--
-- A single "last cost" answers "what does it cost". It cannot answer "is this
-- supplier drifting", which is the question that decides whether to re-source
-- a product or renegotiate. Three checks at 900, 950 and 1200 cents tell a
-- story that a single 1200 does not, and the story is the reason to act before
-- the margin inverts rather than after.
--
-- Append-only by construction: there is no update path in the API, only
-- inserts. A cost history that can be edited is not a history.
--
-- ── Locking ────────────────────────────────────────────────────────────
--
-- One nullable column with no default, catalog-only on Postgres 11+: no
-- rewrite, no scan. The new table starts empty. lock_timeout bounds the wait
-- rather than the work, and plain SET rather than SET LOCAL for the reason
-- 20260822_shop_orders_paid_at.sql gives.

set lock_timeout = '3s';
set statement_timeout = '30s';

alter table public.shop_product_sourcing
  add column if not exists cost_checked_at timestamptz;

comment on column public.shop_product_sourcing.cost_checked_at is
  'When the supplier cost was last actually verified. NOT updated_at, which moves on any edit to the row. Null means never checked.';

create table if not exists public.shop_cost_checks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.shop_products (id) on delete cascade,
  -- What the supplier was charging when this check was made. Nullable
  -- because "I looked and the product is gone" is a real and important
  -- outcome, and recording it as a cost of zero would be a lie that later
  -- reads as a free product.
  cost_cents integer check (cost_cents >= 0),
  -- What we were selling it for at that moment, so a historic margin can be
  -- reconstructed without joining against a price that has since moved.
  price_cents integer not null check (price_cents >= 0),
  -- 'ok' | 'changed' | 'unavailable' | 'not-found'. Text rather than an enum:
  -- this vocabulary will grow, and an enum makes that a migration.
  outcome text not null default 'ok',
  -- Who or what performed the check. An admin email, or an agent's name.
  checked_by text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists shop_cost_checks_product_idx
  on public.shop_cost_checks (product_id, created_at desc);

alter table public.shop_cost_checks enable row level security;
-- No policies, matching shop_product_sourcing and shop_suppliers above it.
-- Supplier costs are the shop's own commercial position and are never served
-- to a reader; only the service role behind getAdminUser() touches this.

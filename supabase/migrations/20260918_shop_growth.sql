-- Shop growth: more categories, soft delete on main, cart deals, free-shipping
-- threshold, and discount columns on order lines.
--
-- NOT SIGNED OFF. Merging this to main runs it against production through the
-- Supabase integration (AGENTS.md). Every statement is additive or a widened
-- CHECK, and the file is safe to re-run.
--
-- SHIPS DARK where it can. The code tolerates every object here being absent:
-- lib/shop/settings.ts answers the defaults (cart deal off, no free-shipping
-- threshold) when shop_settings is missing, the catalogue filters deleted_at
-- in code after `select *`, and checkout only names the discount columns on a
-- line that actually carries a deal, which needs shop_settings to exist first.
-- The one thing that waits on this file is saving a product into a NEW
-- category or classification: the old CHECKs refuse those values.

-- ---------------------------------------------------------------------
-- (1) Categories. The shop outgrew icons: on production a beanie sits in
--     `crosses`, a ring in `sets`, and flags in `christ`, because there was
--     nowhere else to put them. lib/shop/format.ts CATEGORY_LABELS is the
--     list every form renders and every schema derives from.
-- ---------------------------------------------------------------------
-- Dropped by DEFINITION, not by name. The inline CHECK in
-- 20260704_shop_phase1.sql takes Postgres's generated name, which should be
-- shop_products_category_check, but nothing in this repo has ever dropped it
-- by that name to prove it, and a drop that misses leaves the old list
-- enforced beside the new one. This finds whatever the check is called.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.shop_products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%(category %'
  loop
    execute format('alter table public.shop_products drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.shop_products
  add constraint shop_products_category_check
  check (category in (
    'christ',
    'theotokos',
    'saints',
    'feasts',
    'prayer_corner',
    'crosses',
    'sets',
    'prayer_ropes',
    'incense',
    'jewelry',
    'apparel',
    'flags',
    'home_decor',
    'books'
  ));

-- ---------------------------------------------------------------------
-- (2) Classifications, the honest label for what a thing physically is.
--     Extends 20260714_shop_cross_textile.sql. A beanie is not a woven
--     textile and a ring is not a standard reproduction.
-- ---------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.shop_products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%(classification %'
  loop
    execute format('alter table public.shop_products drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.shop_products
  add constraint shop_products_classification_check
  check (classification in (
    'printed_mounted',
    'standard_reproduction',
    'laminated',
    'wooden',
    'hand_finished_reproduction',
    'prayer_rope',
    'incense',
    'beaded',
    'cross',
    'textile',
    'apparel',
    'jewelry',
    'flag',
    'home_decor',
    'candle',
    'book'
  ));

-- ---------------------------------------------------------------------
-- (3) Soft delete. ALREADY ON PRODUCTION: 20260905_shop_simple.sql ran when
--     release/v1.4 was merged on 2026-09-13, and the revert did not undo it
--     (probed 2026-09-18: shop_products.deleted_at answers 200). Stated here
--     so a database built from main's migrations matches the one main runs
--     against. The policies are the same predicates v1.4 wrote.
-- ---------------------------------------------------------------------
alter table public.shop_products
  add column if not exists deleted_at timestamptz;

drop policy if exists "shop_products_public_select" on public.shop_products;
create policy "shop_products_public_select" on public.shop_products
  for select using (status = 'published' and deleted_at is null);

drop policy if exists "shop_product_media_public_select" on public.shop_product_media;
create policy "shop_product_media_public_select" on public.shop_product_media
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published' and p.deleted_at is null
  ));

drop policy if exists "shop_product_subjects_public_select" on public.shop_product_subjects;
create policy "shop_product_subjects_public_select" on public.shop_product_subjects
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published' and p.deleted_at is null
  ));

-- ---------------------------------------------------------------------
-- (4) Discounts on order lines. unit_price_cents stays what was CHARGED, so
--     every existing reader (the webhook's amount check, refunds, earnings)
--     keeps working unchanged. These two say what it would have been and why
--     it was less, for the owner and for support.
-- ---------------------------------------------------------------------
alter table public.shop_order_items
  add column if not exists list_price_cents integer check (list_price_cents is null or list_price_cents >= 0),
  add column if not exists discount_kind text check (discount_kind is null or discount_kind in ('cart_deal'));

-- ---------------------------------------------------------------------
-- (5) Shop settings. One row (id = 1 by check), edited from the admin Shop
--     tab. No policies at all: the public config route and checkout read it
--     with the service role and expose only the public fields.
--
--     cart_deal_*: a product that has sat in a cart for after_days unlocks
--     percent off for window_hours, never below cost + fees + min_margin
--     (lib/shop/cartDeals.ts). Off until the owner turns it on.
--     free_shipping_threshold_cents: null means off.
--
--     There is deliberately no email switch. The deal shows in the shopper's
--     cart and is never mailed: lib/email/doctrine.ts keeps countdowns and
--     urgency out of the inbox, on the board's Phase 1 instruction.
-- ---------------------------------------------------------------------
create table if not exists public.shop_settings (
  id                            int primary key default 1 check (id = 1),
  cart_deal_enabled             boolean not null default false,
  cart_deal_after_days          int not null default 3 check (cart_deal_after_days between 1 and 60),
  cart_deal_percent             int not null default 10 check (cart_deal_percent between 1 and 50),
  cart_deal_window_hours        int not null default 48 check (cart_deal_window_hours between 1 and 336),
  cart_deal_min_margin_cents    int not null default 100 check (cart_deal_min_margin_cents >= 0),
  free_shipping_threshold_cents int check (free_shipping_threshold_cents is null or free_shipping_threshold_cents >= 0),
  show_cart_demand              boolean not null default true,
  updated_at                    timestamptz not null default now()
);

alter table public.shop_settings enable row level security;

insert into public.shop_settings (id) values (1) on conflict (id) do nothing;

-- Rollback, if it comes to that:
--   drop table if exists public.shop_settings;
--   alter table public.shop_order_items drop column if exists discount_kind, drop column if exists list_price_cents;
--   (the CHECKs can only narrow back once no row carries a new value)

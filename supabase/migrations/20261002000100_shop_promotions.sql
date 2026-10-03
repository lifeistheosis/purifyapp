-- ---------------------------------------------------------------------
-- Standing offers, 2026-10-01: the prayer corner set's discount and the
-- multi-buy. The owner: "if you add more, it's free shipping, or if you add
-- one more, it's discounted", and fifteen or twenty percent off the prayer
-- corner set "when you buy it in a bundle".
--
--   set_discount_*  an icon, a prayer rope and a cross in one order take
--                   this percentage off those three pieces.
--   multi_buy_*     at min_items pieces or more, every piece takes this
--                   percentage off.
--
-- They never stack: each piece is charged the lowest single price it
-- qualifies for, the cart deal included. Purify's own store only. The pricing
-- is lib/shop/promotions.ts, which the cart and checkout both run.
--
-- SIGNED OFF by the owner 2026-10-01 ("merge").
--
-- APPLIED BY HAND: the owner ran this in the Supabase SQL editor on
-- 2026-10-02 and reported it done. Merging did not apply it: the Supabase
-- integration's check failed on 58439dcb, as it has on every push to main
-- since at least 2026-09-30, at an older duplicate version (20260527), so it
-- never reaches newer files. Verified live the same day:
-- /api/shop/catalog/config answers setPercent 15 and multi-buy from 3 pieces
-- at 10%, and the shop's set card shows $74.93 struck to $63.69.
--
-- Dated 20261002, not the day it was written, because 20261001 is already
-- 20261001000000_profiles_badges.sql. Supabase versions a migration by its numeric
-- prefix, and the audit ledger records second-of-the-day files left
-- unapplied before (20260801, 20260802, 20260811); a version of its own
-- keeps this one from being taken as already run.
--
-- LIVE ON FIRST APPLY, ON PURPOSE: both offers are asked for, so the new
-- columns are created switched ON at 15% for the set and 10% from 3 pieces.
-- `add column if not exists` fills that default only when it creates the
-- column, so re-running this file never overrides a later choice made in the
-- admin (Shop, Deals). To ship them dark instead, change the two
-- `default true` below to `default false` before merging.
--
-- Additive and idempotent. The CHECK is widened BEFORE the columns exist, so
-- the code can never read an offer as on while the database would still
-- refuse to record it (lib/shop/settings.ts reads the offers as off until
-- these columns are there; lib/shop/checkout.ts retries a refused line
-- without its discount columns rather than lose it).
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '30s';

-- (1) discount_kind learns the two new reasons. Dropped by DEFINITION, not
--     by name: 20260918000000_shop_growth.sql created it inline, so it carries
--     Postgres's generated name, and a drop that misses would leave the old
--     list enforced beside the new one.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.shop_order_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%discount_kind%'
  loop
    execute format('alter table public.shop_order_items drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.shop_order_items
  add constraint shop_order_items_discount_kind_check
  check (discount_kind is null or discount_kind in ('cart_deal', 'set_bundle', 'multi_buy'));

-- (2) The switches, on the shop's one settings row.
alter table public.shop_settings
  add column if not exists set_discount_enabled boolean not null default true,
  add column if not exists set_discount_percent int not null default 15
    check (set_discount_percent between 1 and 50),
  add column if not exists multi_buy_enabled boolean not null default true,
  add column if not exists multi_buy_min_items int not null default 3
    check (multi_buy_min_items between 2 and 10),
  add column if not exists multi_buy_percent int not null default 10
    check (multi_buy_percent between 1 and 50);

-- Rollback, if it comes to that:
--   alter table public.shop_settings
--     drop column if exists set_discount_enabled,
--     drop column if exists set_discount_percent,
--     drop column if exists multi_buy_enabled,
--     drop column if exists multi_buy_min_items,
--     drop column if exists multi_buy_percent;
--   (the CHECK can only narrow back once no row carries 'set_bundle' or
--   'multi_buy')

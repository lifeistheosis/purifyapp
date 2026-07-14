-- EIKON: allow cross (metal cross on a chain) and textile (woven prostration
-- mat) classifications (Beta 2.0).
--
-- Extends 20260713_shop_prayer_ropes.sql. lib/shop/types.ts +
-- lib/shop/format.ts now carry the 'cross' and 'textile' vocabulary; widen the
-- shop_products.classification check so those dropshipped goods can be seeded.
-- Sellers still cannot list them (shopListingSchema stays icon-only); these are
-- EIKON-sourced.
--
-- Apply in the Supabase SQL editor before re-running scripts/seed-shop.mjs.
-- Safe to re-run.

alter table public.shop_products
  drop constraint if exists shop_products_classification_check;

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
    'textile'
  ));

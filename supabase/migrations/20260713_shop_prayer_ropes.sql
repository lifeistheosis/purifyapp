-- EIKON: allow non-icon devotional classifications (Beta 2.0).
--
-- The shop_products.classification check was limited to the five icon
-- reproduction types. lib/shop/types.ts already anticipates the non-icon
-- devotional goods (prayer ropes, incense, beads), which are dropshipped, not
-- printed by EIKON. Widen the constraint so those can be seeded. Sellers still
-- cannot list them (shopListingSchema stays icon-only); these are EIKON-sourced.
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
    'beaded'
  ));

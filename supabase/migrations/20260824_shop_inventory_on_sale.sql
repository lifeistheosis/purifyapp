-- Stock actually goes down when something sells.
--
-- WHY THIS EXISTS. shop_products.quantity_available is decorative. Checkout
-- reads it and refuses an order that exceeds it (lib/shop/checkout.ts:86-92),
-- the seller console renders it, and NOTHING HAS EVER DECREMENTED IT. The only
-- one-time paid effect on the settlement path is shop_increment_units_sold
-- (20260711_shop_reviews.sql:150), which bumps a counter and leaves stock
-- alone.
--
-- So a ready-to-ship listing with one item in stock can be sold an unbounded
-- number of times, and every buyer after the first is owed something that does
-- not exist. That is a promise a seller cannot keep, made by Purify, on their
-- behalf, and it becomes real the moment an independent seller lists a
-- one-off: an icon they painted once.
--
-- Why it has never bitten: probed 2026-08-24 with the service role, 18
-- products and ZERO paid orders. The paid branch has never run in production
-- at all. This is the cheapest hour it will ever be to fix.
--
-- ── A NEW FUNCTION, NOT A REPLACEMENT ────────────────────────────────────
--
-- `create or replace function shop_increment_units_sold` would need no code
-- change and is exactly the wrong move: the name would keep saying "increment
-- units sold" while the body also wrote stock, so anyone reading the call site
-- or 20260711 would be misled about what settlement does to a product row.
--
-- The old function is deliberately NOT dropped. AGENTS.md is explicit that
-- merged and applied are independently true or false, and
-- lib/shop/webhookSettlement.ts falls back to it when this one is absent, so
-- units_sold keeps working during the window between merge and apply. Drop it
-- in a later file, once this one is confirmed applied.
--
-- ── What it does, and the three things it refuses to do ──────────────────
--
-- greatest(0, ...) rather than a CHECK violation. A settlement webhook must
-- never fail because stock went negative: Stripe would retry a delivered
-- order, and the money has already moved. Overselling is a fact to record and
-- reconcile, not an exception to throw at a payment processor.
--
-- Only rows with a NON-NULL quantity_available are touched. Null means "not
-- tracked", which is what a special-order or made-to-order listing is, and
-- coalescing null to zero would flip every one of them out of stock on the
-- first sale.
--
-- The status flip to out_of_stock applies to ready_to_ship only. A
-- special_order or coming_soon listing that happens to carry a number is not
-- describing a shelf, and forcing it out of stock would remove a listing the
-- seller can still fulfil.
--
-- IDEMPOTENCY IS THE CALLER'S, and it already exists. This function is not
-- idempotent by itself: called twice for one order it decrements twice.
-- settleCheckoutSession only reaches the one-time effects after a guarded
-- UPDATE that matched a row, so a Stripe retry of an already-settled order
-- matches nothing and returns before it gets here (webhookSettlement.ts:159).
-- That is the same protection units_sold has relied on since 2026-07-11.
--
-- LOCKING. Two function definitions and their grants. No table is touched.

set lock_timeout = '3s';
set statement_timeout = '30s';

create or replace function public.shop_apply_paid_inventory(p_order_id uuid)
returns void language sql security definer set search_path = public as $$
  with sold as (
    select product_id, sum(quantity)::int as qty
      from public.shop_order_items
     where order_id = p_order_id and product_id is not null
     group by product_id
  )
  update public.shop_products p
     set units_sold = p.units_sold + s.qty,
         quantity_available = case
           when p.quantity_available is null then null
           else greatest(0, p.quantity_available - s.qty)
         end,
         inventory_status = case
           when p.inventory_status = 'ready_to_ship'
            and p.quantity_available is not null
            and p.quantity_available - s.qty <= 0
           then 'out_of_stock'
           else p.inventory_status
         end,
         updated_at = now()
    from sold s
   where p.id = s.product_id;
$$;

-- Service role only, exactly as the function it supersedes. The settlement
-- webhook is the only caller and it runs with the service role; anything else
-- reaching this would be writing stock from outside the money path.
revoke execute on function public.shop_apply_paid_inventory(uuid) from public;
revoke execute on function public.shop_apply_paid_inventory(uuid) from anon;
revoke execute on function public.shop_apply_paid_inventory(uuid) from authenticated;
grant execute on function public.shop_apply_paid_inventory(uuid) to service_role;

comment on function public.shop_apply_paid_inventory(uuid) is
  'One-time paid effects on the product rows of one order: bump units_sold, decrement quantity_available where it is tracked, and mark a ready_to_ship listing out_of_stock when it reaches zero. NOT idempotent; settleCheckoutSession guarantees one call per order through its guarded UPDATE. Supersedes shop_increment_units_sold, which is kept only so the webhook has something to fall back on between this file merging and being applied.';

-- ── Verification ─────────────────────────────────────────────────────────
--
-- A. Did it apply.
--
--      select proname from pg_proc where proname = 'shop_apply_paid_inventory';
--
--    One row means yes. Once confirmed, lib/shop/webhookSettlement.ts stops
--    needing its fallback and shop_increment_units_sold can be dropped in its
--    own file.
--
-- B. It does the right thing to the right rows. On a scratch product:
--
--      -- tracked, ready to ship, one left
--      select id, quantity_available, inventory_status, units_sold
--        from public.shop_products where id = '<id>';
--      select public.shop_apply_paid_inventory('<an order id containing it>');
--      -- quantity_available 0, inventory_status 'out_of_stock', units_sold +1
--
--    And on a special_order listing with a null quantity, quantity_available
--    must still read null and inventory_status must be unchanged.
--
-- C. Nothing was overwritten:
--
--      select count(*) from public.shop_products where quantity_available < 0;
--
--    Must be zero, always. greatest(0, ...) is why.
--
-- Rollback:
--   drop function if exists public.shop_apply_paid_inventory(uuid);
--
-- Free: the webhook falls back to shop_increment_units_sold, which is still
-- there, and behaviour returns to exactly what it is today. Stock stops moving
-- again, which is the bug, not a loss of data.

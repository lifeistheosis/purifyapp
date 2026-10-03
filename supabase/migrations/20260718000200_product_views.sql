-- Beta 2.x — product view tracking (clicks/views alongside units_sold).
--
-- A per-product view counter, bumped once per browser session when a
-- product detail page is opened (the client dedups; the increment RPC is
-- service-role-only so a browser can never inflate it directly). Sits on
-- shop_products next to units_sold, so the admin catalog read (select *)
-- picks it up with no query change.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

alter table public.shop_products
  add column if not exists view_count int not null default 0;

create or replace function public.shop_increment_product_view(p_product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shop_products
     set view_count = view_count + 1
   where id = p_product_id and status = 'published';
$$;

revoke execute on function public.shop_increment_product_view(uuid) from public;
revoke execute on function public.shop_increment_product_view(uuid) from anon;
revoke execute on function public.shop_increment_product_view(uuid) from authenticated;
grant execute on function public.shop_increment_product_view(uuid) to service_role;

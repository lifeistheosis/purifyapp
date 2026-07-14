-- Shop reviews: reviewer identity (name + location) and an anonymous option.
--
-- Extends 20260711_shop_reviews.sql. Reviews used to render only as "Verified
-- buyer"; the storefront now shows a marketplace-style name ("Markos V.") and
-- location, with a per-review "post anonymously" choice that stores NEITHER
-- (name + location are nulled and the row is flagged anonymous, rendered as
-- "Anonymous" / "?"). Verified purchase is still enforced by the RPC — this only
-- adds how the reviewer is shown, never who may review.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

alter table public.shop_reviews
  add column if not exists display_name text,
  add column if not exists location text,
  add column if not exists anonymous boolean not null default false;

-- Replace the submit RPC with a signature that also records the chosen display
-- name + location (both nulled when the review is anonymous). Dropping the old
-- 3-arg signature also drops its grants; the new grants are re-issued below.
drop function if exists public.shop_submit_review(uuid, int, text);

create or replace function public.shop_submit_review(
  p_product_id uuid,
  p_stars int,
  p_body text,
  p_display_name text,
  p_location text,
  p_anonymous boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_store uuid;
  v_order uuid;
  v_anon  boolean := coalesce(p_anonymous, false);
begin
  if v_user is null then
    raise exception 'Sign in to review.' using errcode = '28000';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Rating must be between 1 and 5 stars.' using errcode = '22023';
  end if;

  select p.store_id into v_store
  from public.shop_products p
  where p.id = p_product_id and p.status = 'published';
  if v_store is null then
    raise exception 'This item is not available.' using errcode = 'P0002';
  end if;

  -- Proof of purchase: a paid order of this product owned by the caller.
  select o.id into v_order
  from public.shop_orders o
  join public.shop_order_items oi on oi.order_id = o.id
  where o.user_id = v_user
    and o.payment_status = 'paid'
    and oi.product_id = p_product_id
  order by o.created_at desc
  limit 1;
  if v_order is null then
    raise exception 'Only verified buyers can review this item.' using errcode = 'P0001';
  end if;

  insert into public.shop_reviews
    (product_id, store_id, user_id, order_id, stars, body,
     display_name, location, anonymous, updated_at)
  values
    (p_product_id, v_store, v_user, v_order, p_stars,
     nullif(btrim(coalesce(p_body, '')), ''),
     case when v_anon then null else nullif(btrim(coalesce(p_display_name, '')), '') end,
     case when v_anon then null else nullif(btrim(coalesce(p_location, '')), '') end,
     v_anon, now())
  on conflict (user_id, product_id) do update
    set stars        = excluded.stars,
        body         = excluded.body,
        order_id     = excluded.order_id,
        display_name = excluded.display_name,
        location     = excluded.location,
        anonymous    = excluded.anonymous,
        updated_at   = now();
end;
$$;

revoke execute on function public.shop_submit_review(uuid, int, text, text, text, boolean) from public;
revoke execute on function public.shop_submit_review(uuid, int, text, text, text, boolean) from anon;
grant execute on function public.shop_submit_review(uuid, int, text, text, text, boolean) to authenticated;

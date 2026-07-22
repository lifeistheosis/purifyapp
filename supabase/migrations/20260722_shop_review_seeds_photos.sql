-- Review photos + unlimited operator seeding.
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.
--
-- (1) photo_urls on both review tables: seeded (and later buyer) reviews can
--     carry images; the storefront renders them when present.
-- (2) The old UNIQUE (user_id, product_id) / (user_id, store_id) constraints
--     made every admin seed OVERWRITE the previous one (all seeds share the
--     admin's user id) — reported as "adding more reviews deletes the old
--     ones". Real buyers still get exactly one editable review per item, so
--     uniqueness becomes PARTIAL: it applies only to purchase-linked rows
--     (order_id is not null). Operator seeds (order_id null) are unlimited.
-- (3) Both submit RPCs are recreated with the partial-index arbiter; their
--     inserts always carry a non-null order_id, so buyer behavior is
--     unchanged (insert once, edits upsert the same row).

-- ---------------------------------------------------------------------
-- (1) Photos
-- ---------------------------------------------------------------------
alter table public.shop_reviews
  add column if not exists photo_urls text[] not null default '{}';
alter table public.shop_store_reviews
  add column if not exists photo_urls text[] not null default '{}';

-- ---------------------------------------------------------------------
-- (2) Partial uniqueness (buyer rows only)
-- ---------------------------------------------------------------------
alter table public.shop_reviews
  drop constraint if exists shop_reviews_user_id_product_id_key;
create unique index if not exists shop_reviews_buyer_once_idx
  on public.shop_reviews (user_id, product_id)
  where order_id is not null;

alter table public.shop_store_reviews
  drop constraint if exists shop_store_reviews_user_id_store_id_key;
create unique index if not exists shop_store_reviews_buyer_once_idx
  on public.shop_store_reviews (user_id, store_id)
  where order_id is not null;

-- ---------------------------------------------------------------------
-- (3) RPCs re-created against the partial arbiter (bodies otherwise
--     identical to 20260718_shop_reviews_v2.sql)
-- ---------------------------------------------------------------------
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

  -- Proof of receipt: a paid AND delivered order of this product, owned by
  -- the caller. Delivery (set by admin fulfillment) is the arrival signal.
  select o.id into v_order
  from public.shop_orders o
  join public.shop_order_items oi on oi.order_id = o.id
  where o.user_id = v_user
    and o.payment_status = 'paid'
    and o.fulfillment_status = 'delivered'
    and oi.product_id = p_product_id
  order by o.created_at desc
  limit 1;
  if v_order is null then
    raise exception 'You can review this once your order has arrived.' using errcode = 'P0001';
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
  on conflict (user_id, product_id) where order_id is not null do update
    set stars        = excluded.stars,
        body         = excluded.body,
        order_id     = excluded.order_id,
        display_name = excluded.display_name,
        location     = excluded.location,
        anonymous    = excluded.anonymous,
        updated_at   = now();
end;
$$;

create or replace function public.shop_submit_store_review(
  p_store_id uuid,
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
  v_live  boolean;
  v_order uuid;
  v_anon  boolean := coalesce(p_anonymous, false);
begin
  if v_user is null then
    raise exception 'Sign in to review.' using errcode = '28000';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Rating must be between 1 and 5 stars.' using errcode = '22023';
  end if;

  select (s.status = 'live') into v_live
  from public.shop_stores s
  where s.id = p_store_id;
  if v_live is null or v_live = false then
    raise exception 'This store is not available.' using errcode = 'P0002';
  end if;

  -- Proof of receipt: any paid AND delivered order from this store.
  select o.id into v_order
  from public.shop_orders o
  where o.user_id = v_user
    and o.store_id = p_store_id
    and o.payment_status = 'paid'
    and o.fulfillment_status = 'delivered'
  order by o.created_at desc
  limit 1;
  if v_order is null then
    raise exception 'You can review this store once an order has arrived.' using errcode = 'P0001';
  end if;

  insert into public.shop_store_reviews
    (store_id, user_id, order_id, stars, body,
     display_name, location, anonymous, updated_at)
  values
    (p_store_id, v_user, v_order, p_stars,
     nullif(btrim(coalesce(p_body, '')), ''),
     case when v_anon then null else nullif(btrim(coalesce(p_display_name, '')), '') end,
     case when v_anon then null else nullif(btrim(coalesce(p_location, '')), '') end,
     v_anon, now())
  on conflict (user_id, store_id) where order_id is not null do update
    set stars        = excluded.stars,
        body         = excluded.body,
        order_id     = excluded.order_id,
        display_name = excluded.display_name,
        location     = excluded.location,
        anonymous    = excluded.anonymous,
        updated_at   = now();
end;
$$;

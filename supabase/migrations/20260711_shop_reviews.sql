-- Shop v2 (Beta 1.9) — verified-buyer ratings, reviews, units sold.
--
-- Same discipline as the rest of the shop: reads are public/RLS-scoped, and the
-- one privileged write (submitting a review) goes through a SECURITY DEFINER
-- RPC that proves the caller actually bought the item, mirroring
-- upsert_entitlement in 20260612_entitlements.sql. A user can never insert a
-- review directly (no INSERT policy); the RPC is the only door.

-- ---------------------------------------------------------------------
-- Reviews. One per (user, product); a buyer editing their review upserts
-- the same row. Body is optional (a star rating alone is a valid review).
-- ---------------------------------------------------------------------
create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products on delete cascade,
  store_id uuid not null references public.shop_stores on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  order_id uuid references public.shop_orders on delete set null,
  stars int not null check (stars between 1 and 5),
  body text check (body is null or char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists shop_reviews_product_idx
  on public.shop_reviews (product_id, created_at desc);
create index if not exists shop_reviews_store_idx
  on public.shop_reviews (store_id);

alter table public.shop_reviews enable row level security;

-- Reviews are public. No insert/update/delete policies: every write flows
-- through shop_submit_review (below), which enforces verified purchase.
drop policy if exists "shop_reviews_public_select" on public.shop_reviews;
create policy "shop_reviews_public_select" on public.shop_reviews
  for select using (true);

-- ---------------------------------------------------------------------
-- Denormalized counters on the product so the catalog card/list reads
-- (select *) carry the rating and units-sold without a per-row join.
--   review_count / rating_total : maintained by the trigger below.
--   units_sold                  : incremented once from the Stripe webhook.
-- Storing rating_total (sum of stars) rather than an average keeps store-level
-- aggregation exact: a store's rating is sum(rating_total)/sum(review_count).
-- ---------------------------------------------------------------------
alter table public.shop_products
  add column if not exists review_count int not null default 0,
  add column if not exists rating_total int not null default 0,
  add column if not exists units_sold int not null default 0;

create or replace function public.shop_reviews_resync(p_product_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.shop_products p
  set review_count = agg.cnt,
      rating_total = agg.total
  from (
    select count(*)::int as cnt, coalesce(sum(stars), 0)::int as total
    from public.shop_reviews
    where product_id = p_product_id
  ) agg
  where p.id = p_product_id;
$$;

create or replace function public.shop_reviews_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    perform public.shop_reviews_resync(old.product_id);
    return old;
  end if;
  perform public.shop_reviews_resync(new.product_id);
  return new;
end;
$$;

drop trigger if exists shop_reviews_sync on public.shop_reviews;
create trigger shop_reviews_sync
  after insert or update or delete on public.shop_reviews
  for each row execute function public.shop_reviews_after_change();

-- ---------------------------------------------------------------------
-- Verified-buyer review upsert. SECURITY DEFINER; auth.uid() identifies
-- the caller (the API calls this with the user's own token). Inserts only
-- when the caller has a PAID order containing the product; raises otherwise
-- so the API can surface an honest "verified buyers only" message.
-- ---------------------------------------------------------------------
create or replace function public.shop_submit_review(
  p_product_id uuid,
  p_stars int,
  p_body text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_store uuid;
  v_order uuid;
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
    (product_id, store_id, user_id, order_id, stars, body, updated_at)
  values
    (p_product_id, v_store, v_user, v_order, p_stars,
     nullif(btrim(coalesce(p_body, '')), ''), now())
  on conflict (user_id, product_id) do update
    set stars      = excluded.stars,
        body       = excluded.body,
        order_id   = excluded.order_id,
        updated_at = now();
end;
$$;

revoke execute on function public.shop_submit_review(uuid, int, text) from public;
revoke execute on function public.shop_submit_review(uuid, int, text) from anon;
grant execute on function public.shop_submit_review(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- Units sold: incremented once from the Stripe webhook on pending -> paid
-- (the webhook's update is idempotent, so this fires exactly once per order).
-- ---------------------------------------------------------------------
create or replace function public.shop_increment_units_sold(p_order_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.shop_products p
  set units_sold = p.units_sold + s.qty
  from (
    select product_id, sum(quantity)::int as qty
    from public.shop_order_items
    where order_id = p_order_id and product_id is not null
    group by product_id
  ) s
  where p.id = s.product_id;
$$;

revoke execute on function public.shop_increment_units_sold(uuid) from public;
revoke execute on function public.shop_increment_units_sold(uuid) from anon;
revoke execute on function public.shop_increment_units_sold(uuid) from authenticated;
grant execute on function public.shop_increment_units_sold(uuid) to service_role;

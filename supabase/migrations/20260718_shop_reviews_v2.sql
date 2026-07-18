-- Shop reviews v2 — delivery-gated product reviews + store-level reviews.
--
-- Extends 20260711_shop_reviews.sql and 20260714_shop_review_identity.sql.
-- Two changes, same discipline as the rest of the shop (reads are public/RLS,
-- the one privileged write goes through a SECURITY DEFINER RPC that proves the
-- caller actually bought AND received the goods):
--
--   (a) shop_submit_review now requires the buyer's order to be DELIVERED, not
--       merely paid. "Arrival confirmed" is exactly the order being marked
--       delivered in the admin Orders tab — that is the confirmation system.
--   (b) a net-new store_reviews table + shop_submit_store_review RPC lets a
--       buyer review the STORE (EIKON) itself, gated on any delivered order
--       from that store. Denormalized counters mirror the product pattern.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

-- =====================================================================
-- (a) Product reviews: delivered gate.
-- Replaces the RPC body only (same 6-arg signature, so grants are kept).
-- The buyer must have a PAID order of this product that has also reached
-- fulfillment_status = 'delivered'. Non-buyers were already blocked; now
-- buyers whose order has not arrived are told to wait.
-- =====================================================================
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

-- =====================================================================
-- (b) Store-level reviews. One per (user, store); a buyer editing their
-- store review upserts the same row. Body optional; identity fields mirror
-- the product review's marketplace-style attribution + anonymous option.
-- =====================================================================
create table if not exists public.shop_store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.shop_stores on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  order_id uuid references public.shop_orders on delete set null,
  stars int not null check (stars between 1 and 5),
  body text check (body is null or char_length(body) between 1 and 4000),
  display_name text,
  location text,
  anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create index if not exists shop_store_reviews_store_idx
  on public.shop_store_reviews (store_id, created_at desc);

alter table public.shop_store_reviews enable row level security;

-- Public read. No insert/update/delete policies: every write flows through
-- shop_submit_store_review (buyer path) or the service role (admin path).
drop policy if exists "shop_store_reviews_public_select" on public.shop_store_reviews;
create policy "shop_store_reviews_public_select" on public.shop_store_reviews
  for select using (true);

-- Denormalized counters on the store, so a catalog store read (select *)
-- carries the store's own rating without a per-row aggregate. rating_total is
-- the sum of stars; the average is store_rating_total / store_review_count.
alter table public.shop_stores
  add column if not exists store_review_count int not null default 0,
  add column if not exists store_rating_total int not null default 0;

create or replace function public.shop_store_reviews_resync(p_store_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.shop_stores s
  set store_review_count = agg.cnt,
      store_rating_total = agg.total
  from (
    select count(*)::int as cnt, coalesce(sum(stars), 0)::int as total
    from public.shop_store_reviews
    where store_id = p_store_id
  ) agg
  where s.id = p_store_id;
$$;

create or replace function public.shop_store_reviews_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    perform public.shop_store_reviews_resync(old.store_id);
    return old;
  end if;
  perform public.shop_store_reviews_resync(new.store_id);
  return new;
end;
$$;

drop trigger if exists shop_store_reviews_sync on public.shop_store_reviews;
create trigger shop_store_reviews_sync
  after insert or update or delete on public.shop_store_reviews
  for each row execute function public.shop_store_reviews_after_change();

-- Verified-buyer store-review upsert. SECURITY DEFINER; auth.uid() is the
-- caller. Requires ANY paid + delivered order from this store owned by the
-- caller; raises otherwise so the API can surface an honest message.
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
  on conflict (user_id, store_id) do update
    set stars        = excluded.stars,
        body         = excluded.body,
        order_id     = excluded.order_id,
        display_name = excluded.display_name,
        location     = excluded.location,
        anonymous    = excluded.anonymous,
        updated_at   = now();
end;
$$;

revoke execute on function public.shop_submit_store_review(uuid, int, text, text, text, boolean) from public;
revoke execute on function public.shop_submit_store_review(uuid, int, text, text, text, boolean) from anon;
grant execute on function public.shop_submit_store_review(uuid, int, text, text, text, boolean) to authenticated;

-- Resync helpers are called from the admin bypass route (service role) after a
-- direct insert/delete. The store-review trigger already resyncs on every write;
-- the explicit grant lets the admin path force a resync belt-and-suspenders.
grant execute on function public.shop_store_reviews_resync(uuid) to service_role;
grant execute on function public.shop_reviews_resync(uuid) to service_role;

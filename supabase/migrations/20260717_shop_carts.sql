-- Beta 2.x — server-side live cart sync + guest carts.
--
-- One row per cart, keyed by a client-generated token (so guests are
-- covered too). A signed-in owner may read their own row; every WRITE goes
-- through the service-role /api/shop/cart/sync route. Analytics/recovery
-- only: this is NEVER trusted for money — checkout still re-prices every
-- line from the catalog (lib/shop/checkout.ts).
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

create table if not exists public.shop_carts (
  cart_token     text primary key,
  user_id        uuid references auth.users on delete set null,
  items          jsonb not null default '[]'::jsonb,   -- [{slug,title,unitPriceCents,quantity}]
  item_count     int not null default 0,
  subtotal_cents int not null default 0,
  currency       text,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index if not exists shop_carts_user_idx on public.shop_carts (user_id);
create index if not exists shop_carts_updated_idx on public.shop_carts (updated_at desc);

alter table public.shop_carts enable row level security;

drop policy if exists "shop_carts_self_select" on public.shop_carts;
create policy "shop_carts_self_select" on public.shop_carts
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: writes are service-role only.

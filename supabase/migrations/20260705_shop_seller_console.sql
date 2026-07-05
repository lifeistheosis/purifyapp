-- Shop Phase 2 — Seller Console: seller sign-in surface, order
-- management, buyer–seller messaging, and a refund pipeline.
--
-- Same discipline as Phase 1: RLS grants sellers and buyers SELECT over
-- exactly the rows that are theirs; every write still flows through API
-- routes with the service role behind zod validation and rate limits,
-- so no status column is ever client-settable. "Seller" here means a
-- shop_sellers row whose user_id equals auth.uid() — seller creation
-- remains an admin act (application approval), so nobody can grant
-- themselves console access.

-- ---------------------------------------------------------------------
-- Sellers see themselves even when suspended (the console shows the
-- suspension honestly instead of vanishing), and see their own store
-- and products in every status, which the public policies don't cover.
-- ---------------------------------------------------------------------
drop policy if exists "shop_sellers_self_select" on public.shop_sellers;
create policy "shop_sellers_self_select" on public.shop_sellers
  for select using (auth.uid() = user_id);

drop policy if exists "shop_stores_owner_select" on public.shop_stores;
create policy "shop_stores_owner_select" on public.shop_stores
  for select using (exists (
    select 1 from public.shop_sellers s
    where s.id = seller_id and s.user_id = auth.uid()
  ));

drop policy if exists "shop_products_owner_select" on public.shop_products;
create policy "shop_products_owner_select" on public.shop_products
  for select using (exists (
    select 1 from public.shop_sellers s
    where s.id = seller_id and s.user_id = auth.uid()
  ));

drop policy if exists "shop_product_media_owner_select" on public.shop_product_media;
create policy "shop_product_media_owner_select" on public.shop_product_media
  for select using (exists (
    select 1 from public.shop_products p
    join public.shop_sellers s on s.id = p.seller_id
    where p.id = product_id and s.user_id = auth.uid()
  ));

-- Sellers read the orders placed with them (fulfillment needs the
-- shipping address; that is normal marketplace operation and the
-- console shows it only to the one seller the buyer bought from).
drop policy if exists "shop_orders_seller_select" on public.shop_orders;
create policy "shop_orders_seller_select" on public.shop_orders
  for select using (exists (
    select 1 from public.shop_sellers s
    where s.id = seller_id and s.user_id = auth.uid()
  ));

drop policy if exists "shop_order_items_seller_select" on public.shop_order_items;
create policy "shop_order_items_seller_select" on public.shop_order_items
  for select using (exists (
    select 1 from public.shop_orders o
    join public.shop_sellers s on s.id = o.seller_id
    where o.id = order_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- Refunds need the payment intent; the webhook records it when the
-- session completes so the refund path never has to call back into
-- Stripe just to find out what to refund.
-- ---------------------------------------------------------------------
alter table public.shop_orders
  add column if not exists stripe_payment_intent text;

-- ---------------------------------------------------------------------
-- Conversations: one thread between a buyer and a store, optionally
-- anchored to an order or a product. Read timestamps live on the
-- conversation (one per side) rather than per-message read receipts —
-- enough to show "unread" badges without message-level bookkeeping.
-- ---------------------------------------------------------------------
create table if not exists public.shop_conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.shop_stores on delete cascade,
  seller_id uuid not null references public.shop_sellers on delete cascade,
  buyer_user_id uuid not null references auth.users on delete cascade,
  order_id uuid references public.shop_orders on delete set null,
  product_id uuid references public.shop_products on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shop_conversations_buyer_idx
  on public.shop_conversations (buyer_user_id, last_message_at desc);
create index if not exists shop_conversations_seller_idx
  on public.shop_conversations (seller_id, last_message_at desc);

alter table public.shop_conversations enable row level security;

drop policy if exists "shop_conversations_buyer_select" on public.shop_conversations;
create policy "shop_conversations_buyer_select" on public.shop_conversations
  for select using (auth.uid() = buyer_user_id);

drop policy if exists "shop_conversations_seller_select" on public.shop_conversations;
create policy "shop_conversations_seller_select" on public.shop_conversations
  for select using (exists (
    select 1 from public.shop_sellers s
    where s.id = seller_id and s.user_id = auth.uid()
  ));

create table if not exists public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.shop_conversations on delete cascade,
  sender text not null check (sender in ('buyer', 'seller')),
  sender_user_id uuid references auth.users on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists shop_messages_conversation_idx
  on public.shop_messages (conversation_id, created_at);

alter table public.shop_messages enable row level security;

drop policy if exists "shop_messages_participant_select" on public.shop_messages;
create policy "shop_messages_participant_select" on public.shop_messages
  for select using (exists (
    select 1 from public.shop_conversations c
    where c.id = conversation_id
      and (
        c.buyer_user_id = auth.uid()
        or exists (
          select 1 from public.shop_sellers s
          where s.id = c.seller_id and s.user_id = auth.uid()
        )
      )
  ));

-- ---------------------------------------------------------------------
-- Refund requests. One ACTIVE request per order (partial unique index);
-- history of declined/cancelled requests is kept. amount_cents null
-- means "full order total at decision time". The pipeline:
--
--   requested → approved   (seller or admin accepts; Stripe refund fires
--                           here when checkout is live, else the request
--                           parks in approved until processed manually)
--             → declined   (seller explains in resolution_note)
--   approved  → processed  (money actually moved; order flips refunded)
--   requested → cancelled  (buyer withdraws)
--
-- Buyers and the order's seller can read; writes are service-role only.
-- ---------------------------------------------------------------------
create table if not exists public.shop_refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders on delete cascade,
  requested_by uuid references auth.users on delete set null,
  reason text not null check (reason in
    ('damaged', 'not_as_described', 'never_arrived', 'wrong_item',
     'change_of_mind', 'other')),
  details text,
  amount_cents integer check (amount_cents > 0),
  status text not null default 'requested' check (status in
    ('requested', 'approved', 'declined', 'processed', 'cancelled')),
  resolution_note text,
  stripe_refund_id text,
  decided_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_refund_requests_order_idx
  on public.shop_refund_requests (order_id, created_at desc);

-- At most one live request per order.
create unique index if not exists shop_refund_requests_one_active
  on public.shop_refund_requests (order_id)
  where status in ('requested', 'approved');

alter table public.shop_refund_requests enable row level security;

drop policy if exists "shop_refund_requests_buyer_select" on public.shop_refund_requests;
create policy "shop_refund_requests_buyer_select" on public.shop_refund_requests
  for select using (exists (
    select 1 from public.shop_orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

drop policy if exists "shop_refund_requests_seller_select" on public.shop_refund_requests;
create policy "shop_refund_requests_seller_select" on public.shop_refund_requests
  for select using (exists (
    select 1 from public.shop_orders o
    join public.shop_sellers s on s.id = o.seller_id
    where o.id = order_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- Ambassadors, 2026-09-30: invited readers who share a link to the shop and
-- earn 10% of the EIKON items they bring in (the owner's choices: 10% on
-- EIKON, invite only, code-only cookie).
--
-- WHAT THIS HOLDS, AND WHAT IT DOES NOT
--   ambassadors         one row per invited reader: their code, their rate,
--                       their Stripe account for payouts.
--   ambassador_clicks   visits to each link, COUNTED PER DAY. There is no
--                       visitor column on purpose: a click is a number, never
--                       a person (the privacy page says so).
--   commission_ledger   one row per referred EIKON order: pending, then
--                       cleared after the refund window, then paid.
--   ambassador_payouts  one Stripe transfer per payout.
--   shop_orders.ambassador_code
--                       the code the buyer arrived with, written by checkout
--                       from the first-party cookie (lib/ambassadors).
--
-- THE LEDGER WRITES ITSELF. A trigger on shop_orders records the commission
-- the moment an order becomes paid, reverses it if the order is refunded or
-- cancelled before payout, and pushes its clearing date back when the order
-- ships or is delivered, so the 30 days of the refund window start when the
-- buyer can actually hold the piece. A processed partial refund reduces the
-- commission by the same share. The hourly maintenance clears what has
-- matured (clear_matured_commissions) and pays cleared balances monthly.
--
-- Only EIKON orders earn: the order's store must belong to the purify_owned
-- seller. Marketplace money belongs to its sellers. A reader cannot earn on
-- their own order.
--
-- Every table is readable by the ambassador it belongs to and writable only
-- by the service role. Additive: nothing existing changes except one nullable
-- column on shop_orders and two triggers that only write to the new tables.
--
-- APPLIED BY HAND: the owner ran this in the Supabase SQL editor on
-- 2026-09-30 and reported it done. Every statement is idempotent (if not
-- exists, or replace, drop then create), so the integration running it again
-- on merge changes nothing.
-- ---------------------------------------------------------------------

create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,23}$'),
  display_name text,
  status text not null default 'active' check (status in ('active', 'paused')),
  commission_bps integer not null default 1000 check (commission_bps between 0 and 5000),
  stripe_account_id text unique,
  payouts_enabled boolean not null default false,
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ambassadors enable row level security;
drop policy if exists "ambassadors_self_select" on public.ambassadors;
create policy "ambassadors_self_select" on public.ambassadors
  for select using (auth.uid() = user_id);

create table if not exists public.ambassador_clicks (
  ambassador_id uuid not null references public.ambassadors on delete cascade,
  day date not null,
  clicks integer not null default 0 check (clicks >= 0),
  primary key (ambassador_id, day)
);

alter table public.ambassador_clicks enable row level security;
drop policy if exists "ambassador_clicks_self_select" on public.ambassador_clicks;
create policy "ambassador_clicks_self_select" on public.ambassador_clicks
  for select using (exists (
    select 1 from public.ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()
  ));

create table if not exists public.ambassador_payouts (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors on delete restrict,
  -- 'YYYY-MM' for the automatic monthly payout, a timestamp for one sent by
  -- hand. Unique per ambassador, so the monthly run can never pay twice.
  period text not null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text unique,
  error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (ambassador_id, period)
);

alter table public.ambassador_payouts enable row level security;
drop policy if exists "ambassador_payouts_self_select" on public.ambassador_payouts;
create policy "ambassador_payouts_self_select" on public.ambassador_payouts
  for select using (exists (
    select 1 from public.ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()
  ));

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors on delete restrict,
  order_id uuid not null unique references public.shop_orders on delete restrict,
  base_cents integer not null check (base_cents >= 0),
  rate_bps integer not null check (rate_bps between 0 and 5000),
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'cleared', 'paid', 'reversed')),
  clears_at timestamptz not null,
  cleared_at timestamptz,
  payout_id uuid references public.ambassador_payouts on delete set null,
  paid_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists commission_ledger_ambassador_idx
  on public.commission_ledger (ambassador_id, status);
create index if not exists commission_ledger_clearing_idx
  on public.commission_ledger (status, clears_at);

alter table public.commission_ledger enable row level security;
drop policy if exists "commission_ledger_self_select" on public.commission_ledger;
create policy "commission_ledger_self_select" on public.commission_ledger
  for select using (exists (
    select 1 from public.ambassadors a where a.id = ambassador_id and a.user_id = auth.uid()
  ));

alter table public.shop_orders
  add column if not exists ambassador_code text;

-- The owner's switch for the monthly automatic payout. Off until turned on.
alter table public.shop_settings
  add column if not exists ambassador_auto_payouts boolean not null default false;

-- ---------------------------------------------------------------------
-- The ledger, written by the orders themselves.
-- ---------------------------------------------------------------------
create or replace function public.shop_order_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  amb public.ambassadors%rowtype;
begin
  -- Paid: record the commission once.
  if new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid'
     and new.ambassador_code is not null then
    select * into amb from public.ambassadors
      where code = new.ambassador_code and status = 'active';
    if found
       and amb.user_id is distinct from new.user_id
       and exists (
         select 1 from public.shop_stores s
         join public.shop_sellers se on se.id = s.seller_id
         where s.id = new.store_id and se.seller_type = 'purify_owned'
       ) then
      insert into public.commission_ledger
        (ambassador_id, order_id, base_cents, rate_bps, amount_cents, clears_at)
      values (
        amb.id,
        new.id,
        greatest(coalesce(new.items_total_cents, 0), 0),
        amb.commission_bps,
        (greatest(coalesce(new.items_total_cents, 0), 0) * amb.commission_bps) / 10000,
        now() + interval '30 days'
      )
      on conflict (order_id) do nothing;
    end if;
  end if;

  -- Refunded or cancelled before it was paid out: nothing is owed.
  if new.payment_status in ('refunded', 'cancelled')
     and old.payment_status is distinct from new.payment_status then
    update public.commission_ledger
      set status = 'reversed', reversed_at = now()
      where order_id = new.id and status in ('pending', 'cleared') and payout_id is null;
  end if;

  -- The refund window runs from when the buyer can hold the piece.
  if new.fulfillment_status is distinct from old.fulfillment_status then
    if new.fulfillment_status = 'shipped' then
      update public.commission_ledger
        set clears_at = greatest(clears_at, now() + interval '45 days')
        where order_id = new.id and status = 'pending';
    elsif new.fulfillment_status = 'delivered' then
      update public.commission_ledger
        set clears_at = greatest(clears_at, now() + interval '30 days')
        where order_id = new.id and status = 'pending';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists shop_order_commission on public.shop_orders;
create trigger shop_order_commission
  after update of payment_status, fulfillment_status on public.shop_orders
  for each row execute function public.shop_order_commission();

-- A processed partial refund takes the same share off a commission not yet paid.
create or replace function public.shop_refund_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'processed'
     and old.status is distinct from 'processed'
     and coalesce(new.amount_cents, 0) > 0 then
    update public.commission_ledger
      set amount_cents = greatest(0, amount_cents - (new.amount_cents * rate_bps) / 10000),
          base_cents = greatest(0, base_cents - new.amount_cents)
      where order_id = new.order_id and status in ('pending', 'cleared') and payout_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists shop_refund_commission on public.shop_refund_requests;
create trigger shop_refund_commission
  after update of status on public.shop_refund_requests
  for each row execute function public.shop_refund_commission();

-- Clearing: pending commissions whose window has passed, on orders still
-- paid and on their way or delivered. Called hourly by lib/ops/maintenance.ts.
create or replace function public.clear_matured_commissions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.commission_ledger l
    set status = 'cleared', cleared_at = now()
    from public.shop_orders o
    where l.order_id = o.id
      and l.status = 'pending'
      and l.clears_at <= now()
      and o.payment_status = 'paid'
      and o.fulfillment_status in ('shipped', 'delivered');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A visit to a link: one more on today's count. Nothing about the visitor.
create or replace function public.ambassador_click(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ambassador_clicks (ambassador_id, day, clicks)
  select a.id, (now() at time zone 'utc')::date, 1
    from public.ambassadors a
    where a.code = lower(p_code) and a.status = 'active'
  on conflict (ambassador_id, day)
    do update set clicks = public.ambassador_clicks.clicks + 1;
$$;

-- Only the server calls these; no reader or visitor can run them.
revoke all on function public.ambassador_click(text) from public, anon, authenticated;
revoke all on function public.clear_matured_commissions() from public, anon, authenticated;
grant execute on function public.ambassador_click(text) to service_role;
grant execute on function public.clear_matured_commissions() to service_role;

-- Rollback, if it comes to that:
--   drop trigger if exists shop_order_commission on public.shop_orders;
--   drop trigger if exists shop_refund_commission on public.shop_refund_requests;
--   drop function if exists public.shop_order_commission(), public.shop_refund_commission(),
--     public.clear_matured_commissions(), public.ambassador_click(text);
--   drop table if exists public.commission_ledger, public.ambassador_payouts,
--     public.ambassador_clicks, public.ambassadors;
--   alter table public.shop_orders drop column if exists ambassador_code;
--   alter table public.shop_settings drop column if exists ambassador_auto_payouts;

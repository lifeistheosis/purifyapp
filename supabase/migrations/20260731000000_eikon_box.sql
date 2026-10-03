-- The EIKON Box: a claim-first monthly drop for active Purify Pro members.
--
-- Purify Pro has promised "a curated monthly box of Orthodox devotional
-- goods" on /premium, /pricing, the native paywall and in the Terms since
-- the tier launched, with nothing behind it. The first Pro subscriber is now
-- paying for it.
--
-- CLAIM-FIRST, because there is no inventory. The owner opens a drop,
-- members claim it inside a window, and the claim COUNT is the purchase
-- order: only then is anything sourced. That is also why the window is
-- enforced in SQL rather than in a route (see claim_eikon_box below).
--
-- A claim is NOT a shop_orders row. It would look like one, and reusing that
-- table would inherit the tracking UI for free, but app/api/admin/overview
-- counts every shop_orders row with no filter and pulls total_cents into the
-- 30-day revenue series unconditionally. Free claims would show up as $0
-- "orders" on the screen the owner reads most and drag the averages down.
-- Beyond that, payment_status has no honest value for a free box
-- (lib/shop/status.ts renders 'pending' as "Awaiting Payment", which is the
-- wrong words on a gift), shop_refund_requests would offer a refund button
-- on it, and store_id/seller_id are NOT NULL so every claim would assert a
-- sale that never happened. The claim table instead mirrors the SHAPE of
-- shop_orders (shipping_address in Stripe's exact jsonb form,
-- outbound_tracking as a bare string) so every existing renderer and the
-- carrier-inference helper work on both without a branch.
--
-- Write posture matches entitlements and gifts: a member may SELECT their
-- own claim and nothing else, and every write goes through the
-- /api/eikon-box routes with the service role. A member must never be able
-- to mark their own claim shipped, or claim without an active pro_until,
-- using the anon key.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

-- ---------------------------------------------------------------------
-- Drops. One per month. No select policy at all: member surfaces read
-- drops only through the API, which projects the safe columns and never
-- sourcing_notes.
-- ---------------------------------------------------------------------
create table if not exists public.eikon_drops (
  id uuid primary key default gen_random_uuid(),
  -- Member-facing name: "The August Box".
  title text not null check (char_length(title) between 1 and 120),
  -- Which month this box is FOR, stored as the first of the month. Separate
  -- from created_at so August's drop can be built in July, and so the
  -- partial unique index below can enforce one live drop per month.
  period_month date not null,
  -- What is inside, in the owner's words. Deliberately allowed to be vague:
  -- the Terms promise a curated selection, never a specific item.
  teaser text check (teaser is null or char_length(teaser) <= 2000),
  image_url text check (image_url is null or char_length(image_url) <= 1000),
  status text not null default 'draft' check (status in
    ('draft', 'open', 'closed', 'fulfilling', 'shipped', 'cancelled')),
  -- The claim window. claim_eikon_box() enforces these timestamps even when
  -- status is still 'open', so forgetting to close a drop on the 11th cannot
  -- leave the window open forever. Status is bookkeeping; the window is the
  -- rule, and the rule is what makes "an unclaimed box is not carried over"
  -- enforceable.
  claims_open_at timestamptz,
  claims_close_at timestamptz,
  -- The owner's sourcing scratchpad: supplier, unit cost, inbound tracking
  -- of the bulk order. Never leaves the admin surface.
  sourcing_notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live drop per month; cancelling frees the month for a redo.
create unique index if not exists eikon_drops_period_idx
  on public.eikon_drops (period_month) where status <> 'cancelled';
create index if not exists eikon_drops_status_idx
  on public.eikon_drops (status, period_month desc);

alter table public.eikon_drops enable row level security;
-- No policies: service-role only.

-- ---------------------------------------------------------------------
-- Claims. One row per member per drop. This row IS the purchase-order line
-- for the owner and the tracking record for the member.
-- ---------------------------------------------------------------------
create table if not exists public.eikon_drop_claims (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.eikon_drops on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- Snapshot, in Stripe's exact shape:
  --   {name, address:{line1,line2,city,state,postal_code,country}}
  -- Identical to shop_orders.shipping_address so the admin renderer and any
  -- future label tooling work on both with no second shape to learn.
  -- Editable by the member until the claim is packed, frozen after, so the
  -- record shows where the box actually went.
  shipping_address jsonb not null,
  -- Contact copy at claim time. auth.users stays the source of truth, but
  -- profiles has no email column, so without this the roster export needs an
  -- auth admin round trip per row.
  email text,
  status text not null default 'claimed' check (status in
    ('claimed', 'packed', 'shipped', 'delivered', 'cancelled')),
  outbound_tracking text
    check (outbound_tracking is null or char_length(outbound_tracking) <= 200),
  -- How much Pro runway the member had when they claimed. Turns "did someone
  -- subscribe, claim, and cancel the same day?" from a billing investigation
  -- into a glance at the roster.
  pro_until_at_claim timestamptz,
  cancel_reason text,
  admin_note text,
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One box per member per drop. This index IS the duplicate-claim guard that
-- claim_eikon_box() leans on. Do not drop it.
create unique index if not exists eikon_drop_claims_unique_idx
  on public.eikon_drop_claims (drop_id, user_id);
create index if not exists eikon_drop_claims_drop_idx
  on public.eikon_drop_claims (drop_id, claimed_at);
create index if not exists eikon_drop_claims_user_idx
  on public.eikon_drop_claims (user_id, claimed_at desc);

alter table public.eikon_drop_claims enable row level security;

drop policy if exists "eikon_drop_claims_self_select" on public.eikon_drop_claims;
create policy "eikon_drop_claims_self_select" on public.eikon_drop_claims
  for select using (auth.uid() = user_id);
-- No insert/update/delete policy.

-- ---------------------------------------------------------------------
-- The member's remembered address. Separate from the claim snapshot on
-- purpose: the snapshot is where a specific box went, this is where the
-- NEXT one should go. One row per member; a full address book is not the
-- problem we have.
-- ---------------------------------------------------------------------
create table if not exists public.member_addresses (
  user_id uuid primary key references auth.users on delete cascade,
  address jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.member_addresses enable row level security;

drop policy if exists "member_addresses_self_select" on public.member_addresses;
create policy "member_addresses_self_select" on public.member_addresses
  for select using (auth.uid() = user_id);
-- No write policy: /api/eikon-box/address validates the shape and writes
-- with the service role, so the stored jsonb can only ever be label-shaped.

-- ---------------------------------------------------------------------
-- Atomic claim.
--
-- Pro is re-checked HERE, in the same call as the insert, so a subscription
-- that lapses between the page load and the button press cannot slip a box
-- through. The unique index makes a double-tap, a retry, or two devices
-- racing yield exactly one claim.
--
-- Returns a RESULT WORD rather than a row-or-nothing: the caller has to be
-- able to tell "not a member" from "window closed" from "already claimed",
-- because each one is different copy on the member's screen.
-- ---------------------------------------------------------------------
create or replace function public.claim_eikon_box(
  p_drop_id uuid,
  p_user_id uuid,
  p_address jsonb,
  p_email text
) returns table (result text, claim_id uuid, claimed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro_until timestamptz;
  v_id uuid;
  v_at timestamptz;
begin
  select e.pro_until into v_pro_until
    from public.entitlements e
   where e.user_id = p_user_id;

  if v_pro_until is null or v_pro_until <= now() then
    return query select 'not_pro'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not exists (
    select 1 from public.eikon_drops d
     where d.id = p_drop_id
       and d.status = 'open'
       and (d.claims_open_at is null or d.claims_open_at <= now())
       and (d.claims_close_at is null or d.claims_close_at > now())
  ) then
    return query select 'closed'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.eikon_drop_claims
      (drop_id, user_id, shipping_address, email, pro_until_at_claim)
  values (p_drop_id, p_user_id, p_address, p_email, v_pro_until)
  on conflict (drop_id, user_id) do nothing
  returning eikon_drop_claims.id, eikon_drop_claims.claimed_at
  into v_id, v_at;

  if v_id is null then
    select c.id, c.claimed_at into v_id, v_at
      from public.eikon_drop_claims c
     where c.drop_id = p_drop_id and c.user_id = p_user_id;
    return query select 'already'::text, v_id, v_at;
    return;
  end if;

  return query select 'ok'::text, v_id, v_at;
end;
$$;

revoke execute on function public.claim_eikon_box(uuid, uuid, jsonb, text) from public;
revoke execute on function public.claim_eikon_box(uuid, uuid, jsonb, text) from anon;
revoke execute on function public.claim_eikon_box(uuid, uuid, jsonb, text) from authenticated;
grant execute on function public.claim_eikon_box(uuid, uuid, jsonb, text) to service_role;

-- ---------------------------------------------------------------------
-- The claim screen carries its own clickwrap: the window rule and the
-- "unclaimed is not carried over" rule are new, and should be agreed rather
-- than merely displayed. Widen the recorded-acceptance vocabulary for it.
-- ---------------------------------------------------------------------
alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_context_check;
alter table public.terms_acceptances
  add constraint terms_acceptances_context_check
  check (context in ('signup', 'checkout', 'eikon_claim'));

-- ---------------------------------------------------------------------
-- Verification.
-- ---------------------------------------------------------------------
select table_name
  from information_schema.tables
 where table_schema = 'public'
   and table_name in ('eikon_drops', 'eikon_drop_claims', 'member_addresses')
 order by table_name;
-- expect exactly three rows

select routine_name
  from information_schema.routines
 where routine_schema = 'public' and routine_name = 'claim_eikon_box';
-- expect one row

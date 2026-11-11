-- Order gifts: every EIKON order comes with Purify Plus, claimed from the QR
-- on the thank-you card in the parcel (https://purifyapp.net/gift).
--
-- The owner's words, 2026-11-06: "make it give free premium, so like a gift
-- ... a gift claim system that automatically links premium to their account.
-- And you also gotta take into account if they already have premium, so it
-- doesn't conflict or like it doesn't add on ... every order is packaged with
-- like 3 months of premium. Well, when we first start, but later on we're
-- gonna switch to 1 month."
--
-- And, the same day, how it works: "we can't do unique links because we're
-- putting it on cards on batches. So it's going to link to purifyapp.net/gift
-- ... if they have the account signed in, then it gives them the gift. But the
-- reason it gives them the gift is because they went through the gift. And
-- also, if their order is marked as delivered." So the gift is never written
-- at checkout or at delivery on its own: only a reader who opens the gift page
-- claims it, and only for an order whose fulfillment_status is 'delivered'.
--
-- WHAT THIS ADDS
--   gifts.order_id            the EIKON order a gift came with. Unique, so an
--                             order pays out once, whoever claims it.
--   eikon_order_by_number()   finds an EIKON order by the 8 characters of its
--                             EIK number, for a reader whose account is not the
--                             one that bought (a parcel given as a present).
--                             The route also asks for the ZIP on the parcel's
--                             label, so an EIK number seen in a support thread
--                             is not enough on its own.
--   claim_order_gift()        the claim: checks the order, checks the reader
--                             has no Plus or Pro running, records the gift and
--                             writes the entitlement in ONE transaction, so a
--                             gift can never be marked claimed without the
--                             Plus behind it (the gap /api/gifts/claim has to
--                             log around).
--
-- SAFE TO RUN TWICE: the column and the index are "if not exists", both
-- functions "create or replace", and the grants and revokes repeat harmlessly.
-- Replayed twice in a row on PGlite (PostgreSQL 18) with stub tables, then 21
-- checks of the claim, 2026-11-11. Stamped 20261111172547 (it was 20261106000000
-- on feat/order-gift) so it runs after the 1.9 branch's own migrations.
--
-- SIGNED: the owner's word to the arbiter, 2026-11-11 about 17:36 UTC, on
-- this SQL as sent to him that day: "yes gift sql".
--
-- HOW LONG: his word the same day, about 17:42 UTC: "1 month for every
-- purchase". One month of Purify Plus, 30 days, for each paid, delivered
-- EIKON order. It is decided in code (lib/gifts/orderGift.ts) and passed in
-- as days, so it needed no change here. The printed card names no number.
--
-- A READER WHO ALREADY HAS PLUS OR PRO: the claim writes NOTHING and answers
-- has_plus. The order's gift stays unclaimed and can be claimed once their
-- plan has ended. It must not stack the way an admin gift does
-- (lib/gifts/grant.ts), for two reasons:
--   1. A store subscription owns plus_until. The RevenueCat webhook writes the
--      store's expiry on every renewal (lib/billing/webhookGrant.ts), so days
--      stacked past it are wiped at the next renewal: a gift that vanishes.
--   2. Google and Apple keep billing through it. Stacking would read as three
--      free months and deliver none.
-- An EIKON Box member is a Pro member, so this answer covers them too.
--
-- KNOWN LIMIT, as for every gift today: a reader who claims and then buys a
-- subscription during the gift has plus_until set to the store's expiry by
-- the webhook; if they cancel before the gift would have ended, the rest of
-- the gift is lost. Solving it needs plus_until split by source (see
-- webhookGrant.ts). Not solved here.
--
-- Same write posture as gifts and entitlements: both functions are service
-- role only, called from app/api/gifts/order and app/api/gifts/order/claim.
--
-- MERGING THIS FILE TO MAIN APPLIES IT TO PRODUCTION (AGENTS.md). Safe to
-- re-run.

alter table public.gifts
  add column if not exists order_id uuid references public.shop_orders (id) on delete set null;

-- One gift per order. This index IS the double-claim guard that
-- claim_order_gift() leans on. Do not drop it.
create unique index if not exists gifts_order_key
  on public.gifts (order_id) where order_id is not null;

-- ---------------------------------------------------------------------
-- An EIKON order by its number. "EIK-72D8D24B" is the first 8 characters of
-- the order's uuid (lib/shop/orderNumber.ts). Answers at most two ids so the
-- caller can refuse the rare number two orders share instead of guessing.
-- ---------------------------------------------------------------------
create or replace function public.eikon_order_by_number(p_hex text)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select o.id
    from public.shop_orders o
   where p_hex ~ '^[0-9a-f]{8}$'
     and o.store_id = '6e1b0000-0000-4000-8000-000000000002'::uuid
     and left(o.id::text, 8) = p_hex
   limit 2;
$$;

revoke execute on function public.eikon_order_by_number(text) from public;
revoke execute on function public.eikon_order_by_number(text) from anon;
revoke execute on function public.eikon_order_by_number(text) from authenticated;
grant execute on function public.eikon_order_by_number(text) to service_role;

-- ---------------------------------------------------------------------
-- The claim. Returns a RESULT WORD, because each answer is different words on
-- the reader's screen:
--   ok             the gift is theirs: plus_until is the new end
--   already        this order's gift was claimed before (by them or anyone)
--   has_plus       Plus or Pro is running: nothing written, plus_until is when it ends
--   not_delivered  the order is paid but not marked delivered yet
--   not_paid       the order is pending, refunded or cancelled
--   no_order       no EIKON order with that id
-- ---------------------------------------------------------------------
create or replace function public.claim_order_gift(
  p_order_id uuid,
  p_user_id uuid,
  p_days integer
) returns table (result text, gift_id uuid, plus_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_status text;
  v_fulfil text;
  v_gift uuid;
  v_plus timestamptz;
  v_pro timestamptz;
  v_until timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 400 then
    raise exception 'claim_order_gift: days out of range (%)', p_days;
  end if;

  -- One claim at a time per reader, so two orders claimed at once cannot both
  -- read "no Plus" and both pay out.
  perform pg_advisory_xact_lock(hashtextextended('claim_order_gift:' || p_user_id::text, 0));

  -- The order, held while we decide, so a refund cannot land in between.
  select o.payment_status, o.fulfillment_status into v_status, v_fulfil
    from public.shop_orders o
   where o.id = p_order_id
     and o.store_id = '6e1b0000-0000-4000-8000-000000000002'::uuid
   for share;
  if not found then
    return query select 'no_order'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if v_status is distinct from 'paid' then
    return query select 'not_paid'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select g.id into v_gift from public.gifts g where g.order_id = p_order_id;
  if found then
    return query select 'already'::text, v_gift, null::timestamptz;
    return;
  end if;

  -- The card is inside the parcel: the gift opens once the order is marked
  -- delivered (the owner's rule, 2026-11-06).
  if v_fulfil is distinct from 'delivered' then
    return query select 'not_delivered'::text, null::uuid, null::timestamptz;
    return;
  end if;

  -- Plus or Pro running: write nothing (see the header).
  select e.plus_until, e.pro_until into v_plus, v_pro
    from public.entitlements e
   where e.user_id = p_user_id
   for update;
  if (v_pro is not null and v_pro > now()) or (v_plus is not null and v_plus > now()) then
    return query select 'has_plus'::text, null::uuid, greatest(v_plus, v_pro);
    return;
  end if;

  v_until := now() + make_interval(days => p_days);

  insert into public.gifts (user_id, tier, days, message, claimed_at, order_id)
  values (p_user_id, 'plus', p_days, null, now(), p_order_id)
  on conflict (order_id) where order_id is not null do nothing
  returning gifts.id into v_gift;
  if v_gift is null then
    select g.id into v_gift from public.gifts g where g.order_id = p_order_id;
    return query select 'already'::text, v_gift, null::timestamptz;
    return;
  end if;

  -- Only Plus moves. is_supporter and pro_until keep what they hold (pro_until
  -- is past or empty here, or we would have answered has_plus).
  insert into public.entitlements (user_id, is_supporter, plus_until, plus_source, updated_at)
  values (p_user_id, false, v_until, 'gift', now())
  on conflict (user_id) do update
     set plus_until  = excluded.plus_until,
         plus_source = excluded.plus_source,
         updated_at  = now();

  return query select 'ok'::text, v_gift, v_until;
end;
$$;

revoke execute on function public.claim_order_gift(uuid, uuid, integer) from public;
revoke execute on function public.claim_order_gift(uuid, uuid, integer) from anon;
revoke execute on function public.claim_order_gift(uuid, uuid, integer) from authenticated;
grant execute on function public.claim_order_gift(uuid, uuid, integer) to service_role;

-- ---------------------------------------------------------------------
-- Verification.
-- ---------------------------------------------------------------------
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'gifts' and column_name = 'order_id';
-- expect one row

select routine_name
  from information_schema.routines
 where routine_schema = 'public'
   and routine_name in ('claim_order_gift', 'eikon_order_by_number')
 order by routine_name;
-- expect two rows

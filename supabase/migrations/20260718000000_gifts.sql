-- Gifts: a Plus/Pro grant the reader CLAIMS, rather than one that lands
-- silently on their account.
--
-- Distinct from the admin comp flow (app/api/admin/subscriptions/comp), which
-- writes the entitlement immediately and sets an absolute window. A gift holds
-- the grant until the reader opens the app and claims it, and claiming
-- EXTENDS whatever time they already have (lib/gifts/grant.ts).
--
-- Same write posture as entitlements: the owner may SELECT their own rows and
-- nothing else. Claiming goes through the service role in
-- app/api/gifts/claim, which is also where the entitlement is written — a
-- reader must never be able to mark their own gift claimed, or grant
-- themselves the tier, with the anon-key SDK.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to
-- re-run.

create table if not exists public.gifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  -- What the box contains. Only subscription time today; the check keeps a
  -- future kind from being written before the claim route understands it.
  tier         text not null check (tier in ('plus', 'pro')),
  days         integer not null check (days > 0 and days <= 3650),
  -- Short note shown on the reveal card ("A gift from Edgar"). Optional.
  message      text,
  created_by_email text,
  created_at   timestamptz not null default now(),
  -- Null until claimed. The claim route flips this in the same transaction
  -- as the entitlement write, so a gift can only pay out once.
  claimed_at   timestamptz
);

-- The pending-gift lookup: the reader's oldest unclaimed gift.
create index if not exists gifts_unclaimed_idx
  on public.gifts (user_id, created_at)
  where claimed_at is null;

alter table public.gifts enable row level security;

drop policy if exists "gifts_self_select" on public.gifts;

-- Read-only, and only your own. No insert/update/delete policy exists for
-- authenticated users at all: the service role (admin create, claim) bypasses
-- RLS and is the only writer.
create policy "gifts_self_select" on public.gifts
  for select using (auth.uid() = user_id);

-- Claim a gift and extend the reader's entitlement in ONE statement, so a
-- double-tap or a retried request cannot pay out twice. The update only
-- matches while claimed_at is null; if it matches nothing, the caller knows
-- the gift was already claimed and writes no entitlement.
--
-- Returns the claimed row so the caller can compute the grant from it.
create or replace function public.claim_gift(
  p_gift_id uuid,
  p_user_id uuid
) returns table (id uuid, tier text, days integer, message text)
language sql
security definer
set search_path = public
as $$
  update public.gifts g
     set claimed_at = now()
   where g.id = p_gift_id
     and g.user_id = p_user_id
     and g.claimed_at is null
  returning g.id, g.tier, g.days, g.message;
$$;

revoke execute on function public.claim_gift(uuid, uuid) from public;
revoke execute on function public.claim_gift(uuid, uuid) from anon;
revoke execute on function public.claim_gift(uuid, uuid) from authenticated;
grant execute on function public.claim_gift(uuid, uuid) to service_role;

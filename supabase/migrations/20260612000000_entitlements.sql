-- v10 — entitlements (dark launch)
-- The locked monetization model for public launch:
--   * Free: the whole library + local reader tools, no account needed.
--   * Purify Plus (subscription): cross-device sync, Florilegium,
--     custom florilegia, guided collections, ambience, future audio.
--   * Pre-launch supporters: LIFETIME cross-device sync. Sync only —
--     not the wider Plus feature set.
--
-- This table ships dark: lib/entitlements derives everything as free
-- until ENTITLEMENTS_ENFORCED flips at v10 launch. Nothing is gated by
-- this migration alone.
--
-- Deliberately a separate table from profiles: profiles has a
-- self-update RLS policy, and entitlement columns there would let a
-- user grant themselves Plus with the anon-key SDK. Here the owner can
-- only SELECT; every write goes through the service role (admin grant
-- endpoints today; RevenueCat / store webhooks at v10).

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  -- Pre-launch supporter: lifetime sync, never expires.
  is_supporter boolean not null default false,
  -- Active Plus subscription, if any. NULL or past = not subscribed.
  plus_until timestamptz,
  -- Where the Plus grant came from: 'apple' | 'google' | 'stripe' |
  -- 'comp' (manual/complimentary). Informational; the expiry governs.
  plus_source text,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_self_select" on public.entitlements;

-- Owner may read their own row. No insert/update/delete policies for
-- authenticated users at all: absence of a row means "no entitlements",
-- and only the service role (which bypasses RLS) writes.
create policy "entitlements_self_select" on public.entitlements
  for select using (auth.uid() = user_id);

-- Service-role helper to grant or update in one call. Used by the
-- admin panel now and by billing webhooks at v10.
create or replace function public.upsert_entitlement(
  p_user_id uuid,
  p_is_supporter boolean,
  p_plus_until timestamptz,
  p_plus_source text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.entitlements (user_id, is_supporter, plus_until, plus_source, updated_at)
  values (p_user_id, p_is_supporter, p_plus_until, p_plus_source, now())
  on conflict (user_id) do update
     set is_supporter = excluded.is_supporter,
         plus_until   = excluded.plus_until,
         plus_source  = excluded.plus_source,
         updated_at   = now();
$$;

revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text) from public;
revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text) from anon;
revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text) from authenticated;
grant execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text) to service_role;

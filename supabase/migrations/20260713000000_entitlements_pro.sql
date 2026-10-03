-- Purify Pro: a second subscription tier above Plus (Beta 2.0).
--
-- Pro is a superset of Plus: a Pro subscriber gets every Plus feature plus the
-- members' layer (a devotional icon mailed monthly + periodic EIKON shop
-- codes). The RevenueCat webhook already writes plus_until for a Pro purchase
-- (Pro grants Plus); this adds pro_until so the TIER itself is recorded, which
-- is what the fulfillment loop needs to know WHO the Pro members are.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to
-- re-run: the column add is guarded and the function is recreated in place.

alter table public.entitlements
  add column if not exists pro_until timestamptz;

-- Recreate the service-role upsert with the new p_pro_until argument. It
-- defaults to null so any 4-argument caller keeps working; the RevenueCat
-- webhook (the only programmatic caller) now passes all five.
drop function if exists public.upsert_entitlement(uuid, boolean, timestamptz, text);

create or replace function public.upsert_entitlement(
  p_user_id uuid,
  p_is_supporter boolean,
  p_plus_until timestamptz,
  p_plus_source text,
  p_pro_until timestamptz default null
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.entitlements
      (user_id, is_supporter, plus_until, plus_source, pro_until, updated_at)
  values
      (p_user_id, p_is_supporter, p_plus_until, p_plus_source, p_pro_until, now())
  on conflict (user_id) do update
     set is_supporter = excluded.is_supporter,
         plus_until   = excluded.plus_until,
         plus_source  = excluded.plus_source,
         pro_until    = excluded.pro_until,
         updated_at   = now();
$$;

revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text, timestamptz) from public;
revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text, timestamptz) from anon;
revoke execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text, timestamptz) from authenticated;
grant execute on function public.upsert_entitlement(uuid, boolean, timestamptz, text, timestamptz) to service_role;

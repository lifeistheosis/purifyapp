-- v9.7 — server-side daily aggregation for the admin Traffic chart.
--
-- Background: the previous traffic route fetched up to ~250k rows
-- (50k sessions + 200k pageviews + 50k profiles) and bucketed in JS.
-- On an active day this silently truncated at the supabase-js client's
-- row-count limit, which manifested as the Pageviews line stuck at 0
-- in the /admin Traffic chart while Visitors and Signups updated
-- correctly. SQL aggregation removes the truncation entirely and runs
-- in a single round-trip.
--
-- Returns one row per UTC day in [p_since, p_since + p_days):
--   day:       date  (UTC calendar day)
--   visitors:  count of analytics_sessions whose first_seen falls on that day
--   views:     count of analytics_pageviews rows whose ts falls on that day
--   signups:   count of profiles whose joined_at falls on that day
--
-- All counts are 0 (not null) for days with no activity, so the chart
-- always has a complete x-axis.

create or replace function public.analytics_daily_buckets(
  p_since timestamptz,
  p_days  int
)
returns table (
  day      date,
  visitors bigint,
  views    bigint,
  signups  bigint
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      (p_since at time zone 'UTC')::date,
      ((p_since at time zone 'UTC')::date + (p_days - 1) * interval '1 day')::date,
      interval '1 day'
    )::date as day
  ),
  v as (
    select (first_seen at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.analytics_sessions
    where first_seen >= p_since
    group by 1
  ),
  pv as (
    select (ts at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.analytics_pageviews
    where ts >= p_since
    group by 1
  ),
  s as (
    select (joined_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.profiles
    where joined_at >= p_since
    group by 1
  )
  select
    d.day,
    coalesce(v.n,  0)::bigint as visitors,
    coalesce(pv.n, 0)::bigint as views,
    coalesce(s.n,  0)::bigint as signups
  from days d
  left join v  on  v.day = d.day
  left join pv on pv.day = d.day
  left join s  on  s.day = d.day
  order by d.day;
$$;

-- Only the service role (admin routes) may call this. Anon and
-- authenticated users get nothing — the function reads analytics
-- tables that have RLS denying them by default.
revoke all on function public.analytics_daily_buckets(timestamptz, int) from public;
grant execute on function public.analytics_daily_buckets(timestamptz, int) to service_role;

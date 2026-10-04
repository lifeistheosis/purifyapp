-- ---------------------------------------------------------------------
-- Admin rollups, 2026-10-03: the Engagement, Content and Audience tabs
-- counted in the database, and one function closed to the public.
--
-- WHY. The API answers at most 1,000 rows however many a query asks for,
-- silently. Three admin routes asked for 50,000 or 200,000 rows and tallied
-- what came back in Node, so each tallied 1,000:
--
--   /api/admin/engagement  1,000 of 230,040 page views in 30 days. It showed
--                          "1,000 views" for every range, 30 days or all time.
--   /api/admin/content     the same 1,000 rows, so a saint with hundreds of
--                          readers showed 0 or 1 views.
--   /api/admin/audience    1,000 of 13,976 sessions in 30 days.
--
-- Measured against production on 2026-10-03 by running those routes and
-- counting the rows each request returned. Paging 230,000 rows into Node on
-- every tab open is the wrong repair, so the counting moves here, the way
-- 20260608000000_analytics_daily_buckets.sql already did for the Traffic chart.
--
-- WHAT THIS ADDS
--   admin_pageview_rollup(p_since)  page views since a moment: totals, by
--                                   section, top pages, most revisited pages,
--                                   and views per saint, council, Bible book
--                                   and topic. One row of jsonb, so the answer
--                                   is never cut at 1,000.
--   admin_audience_rollup(p_since)  sessions since a moment: countries,
--                                   regions, languages, browsers, devices.
--
-- WHAT THIS CLOSES. analytics_daily_buckets was created with
-- `revoke all ... from public`, which is not enough here: Supabase grants
-- EXECUTE on every new function to anon and authenticated by name, and a
-- revoke from public does not touch those. With the public anon key, which
-- ships in every browser, anyone could call it and read daily visitors, page
-- views and sign-ups for any range. Confirmed on production 2026-10-03: an
-- anonymous call answered 200 with a day of counts. The two review resync
-- functions were open too, with no revoke at all. The only callers of all
-- three from outside the database use the service role
-- (app/api/admin/traffic/route.ts, app/api/admin/shop/reviews/route.ts), so
-- closing them changes nothing the app does.
--
-- It creates two functions and changes three grants. It touches no table and
-- no row. Every statement can run twice: create or replace, revoke, grant,
-- and a notify that asks the API to read the functions again.
--
-- HOW THE PAGE VIEW FUNCTION IS WRITTEN, AND WHY. The owner ran a first
-- version of this file by hand on 2026-10-03. It was exact: 229,752 page
-- views in 30 days against a direct count of 229,752. It was also slow. It
-- cleaned every path with a regular expression and counted distinct sessions
-- three times over every row, each a sort: 5 to 8 seconds for a month on
-- production, and it would not have finished for "all time" inside the 8
-- seconds the API allows any statement. The version below reduces the page
-- views to one row per path and session FIRST, by hashing, cleans each
-- distinct path once, and counts from those pairs. Same answers, held equal
-- to the first version and to the tally in lib/admin/rollups.ts on 600,000
-- made-up page views, in about half the time.
--
-- TWO SETTINGS ON IT. work_mem lets a month of those hashes stay in memory
-- instead of spilling to disk. It is 16MB and no more on purpose: a call may
-- use that much several times over, two admin tabs can call at once, and on
-- 600,000 made-up page views 64MB bought nothing for a month and a fifth for
-- all time. statement_timeout lifts the 8 second limit for this one
-- function: the API reads a function's own settings and applies them to the
-- request before it runs. If that ever stops being true the route still
-- answers: on a timeout it counts the newest 20,000 page views and says so.
--
-- APPLIED BY HAND, in the SQL editor: the first version of this file on
-- 2026-10-03, and the page view function below on 2026-10-04. Between the
-- two, every statement here has been run on production by the owner, and
-- the merge runs them once more. Timed on production straight after, with
-- the server key, fifteen calls between 00:34Z and 00:36Z. The machine is
-- shared and its speed moves two or three fold from one minute to the next:
--
--   7 days     0.3 to 3.4 seconds   first version: 1.5 to 4.0
--   30 days    0.7 to 4.8           first version: 5.0 to 7.8
--   90 days    2.2 to 7.7           first version: cancelled at 8
--   all time   5.4 to 9.1           first version: cancelled at 8
--
-- The 9.1 second call answered, which is the proof that the timeout setting
-- is honoured. An anonymous call to each of the five functions answered 401
-- with 42501 before the second version and after it.
--
-- THIS WILL NOT SCALE FOR EVER. Every call reads every page view in its
-- range. At 230,000 new rows a month, "all time" grows by a second or two
-- a month, and passes the 25 seconds allowed here inside a year. From then
-- the tab shows a stated sample for that range. The lasting answer is a
-- small table of daily counts kept as the views arrive, not a faster query.
-- ---------------------------------------------------------------------

create or replace function public.admin_pageview_rollup(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
set work_mem = '16MB'
set statement_timeout = '25s'
as $$
  with raw as (
    -- One row per stored path and session. Everything after this works on
    -- these pairs, never on the page views themselves.
    select path, session_id, count(*)::bigint as views
    from public.analytics_pageviews
    where ts >= p_since
    group by path, session_id
  ),
  names as (
    -- Each distinct stored path cleaned ONCE: no fragment, no query, and one
    -- trailing slash dropped, so /prayers/evening/ and /prayers/evening are
    -- one page. Same rule as cleanPath() in lib/admin/rollups.ts.
    select
      d.path as raw_path,
      coalesce(
        nullif(
          regexp_replace(
            split_part(split_part(coalesce(nullif(d.path, ''), '/'), '#', 1), '?', 1),
            '(.)/$', '\1'),
          ''),
        '/') as path
    from (select distinct path from raw) d
  ),
  pairs as (
    select n.path, r.session_id, sum(r.views)::bigint as views
    from raw r
    join names n on n.raw_path = r.path
    group by n.path, r.session_id
  ),
  pages as (
    select
      path,
      sum(views)::bigint as views,
      count(*)::bigint as visitors,
      (regexp_match(path, '^/*([^/]+)'))[1] as seg1,
      (regexp_match(path, '^/*[^/]+/+([^/]+)'))[1] as seg2
    from pairs
    group by path
  ),
  section_pairs as (
    select g.seg1, p.session_id, sum(p.views)::bigint as views
    from pairs p
    join pages g on g.path = p.path
    group by g.seg1, p.session_id
  ),
  sections as (
    select seg1, sum(views)::bigint as views, count(*)::bigint as visitors
    from section_pairs
    group by seg1
  ),
  slugs as (
    select seg1, seg2, sum(views)::bigint as views
    from pages
    where seg1 in ('saints', 'councils', 'bible', 'topics') and seg2 is not null
    group by seg1, seg2
  ),
  sess as (
    select
      count(*)::bigint as total,
      count(*) filter (
        where (last_seen at time zone 'UTC')::date > (first_seen at time zone 'UTC')::date
      )::bigint as came_back
    from public.analytics_sessions
    where last_seen >= p_since
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'views', (select coalesce(sum(views), 0)::bigint from pages),
      'visitors', (select count(*) from (select session_id from pairs group by session_id) v)
    ),
    'sessions', (
      select jsonb_build_object('total', total, 'returning', came_back) from sess
    ),
    'sections', coalesce((
      select jsonb_agg(
        jsonb_build_object('segment', seg1, 'views', views, 'visitors', visitors)
        order by views desc, seg1 nulls first)
      from sections
    ), '[]'::jsonb),
    'topByVisitors', coalesce((
      select jsonb_agg(
        jsonb_build_object('path', path, 'views', views, 'visitors', visitors)
        order by visitors desc, views desc, path)
      from (select path, views, visitors from pages order by visitors desc, views desc, path limit 25) t
    ), '[]'::jsonb),
    'topByViews', coalesce((
      select jsonb_agg(
        jsonb_build_object('path', path, 'views', views, 'visitors', visitors)
        order by views desc, path)
      from (select path, views, visitors from pages order by views desc, path limit 20) t
    ), '[]'::jsonb),
    'revisited', coalesce((
      select jsonb_agg(
        jsonb_build_object('path', path, 'views', views, 'visitors', visitors)
        order by round(views::numeric / visitors, 2) desc, visitors desc, path)
      from (
        select path, views, visitors from pages
        where visitors >= 5
        order by round(views::numeric / visitors, 2) desc, visitors desc, path
        limit 15
      ) t
    ), '[]'::jsonb),
    'slugs', coalesce((
      select jsonb_agg(
        jsonb_build_object('section', seg1, 'slug', seg2, 'views', views)
        order by seg1, views desc, seg2)
      from slugs
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_audience_rollup(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select
      coalesce(country, 'Unknown') as country,
      country_code,
      nullif(region, '') as region,
      nullif(accept_language, '') as lang,
      coalesce(user_agent, '') as ua
    from public.analytics_sessions
    where first_seen >= p_since
  ),
  tagged as (
    select
      s.*,
      -- Same order and same tests as browserOf() in lib/admin/rollups.ts.
      case
        when ua ~* 'edg/' then 'Edge'
        when ua ~* 'chrome/' and ua !~* 'chromium' then 'Chrome'
        when ua ~* 'firefox/' then 'Firefox'
        when ua ~* 'safari/' then 'Safari'
        when ua ~* 'bot|crawl|spider' then 'Bot'
        else 'Other'
      end as browser,
      (ua ~* 'mobile|android|iphone|ipad') as mobile
    from s
  )
  select jsonb_build_object(
    'total', (select count(*) from tagged),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('name', country, 'code', code, 'count', n) order by n desc, country)
      from (
        select country, min(country_code) as code, count(*)::bigint as n
        from tagged group by country order by count(*) desc, country limit 15
      ) t
    ), '[]'::jsonb),
    'regions', coalesce((
      select jsonb_agg(
        jsonb_build_object('country', country, 'region', region, 'code', code, 'count', n)
        order by n desc, country, region)
      from (
        select country, region, min(country_code) as code, count(*)::bigint as n
        from tagged where region is not null
        group by country, region order by count(*) desc, country, region limit 15
      ) t
    ), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object('code', lang, 'count', n) order by n desc, lang)
      from (
        select lang, count(*)::bigint as n
        from tagged where lang is not null
        group by lang order by count(*) desc, lang limit 15
      ) t
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('name', browser, 'count', n) order by n desc, browser)
      from (select browser, count(*)::bigint as n from tagged group by browser) t
    ), '[]'::jsonb),
    'devices', (
      select jsonb_build_object(
        'mobile', count(*) filter (where mobile),
        'desktop', count(*) filter (where not mobile))
      from tagged
    )
  );
$$;

-- Service role only. Naming anon and authenticated is the point: revoking
-- from public alone leaves the grants Supabase gives those two roles by name.
revoke all on function public.admin_pageview_rollup(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_audience_rollup(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_pageview_rollup(timestamptz) to service_role;
grant execute on function public.admin_audience_rollup(timestamptz) to service_role;

-- The three that were left open. The two resync functions never had their
-- grant to public revoked at all, so that goes too. Nothing that calls them
-- loses anything: the review triggers that run them are security definer and
-- run as the owner, and the admin route uses the service role, which was
-- granted by name in 20260718000300_shop_reviews_v2.sql.
revoke execute on function public.analytics_daily_buckets(timestamptz, int) from public, anon, authenticated;
revoke execute on function public.shop_reviews_resync(uuid) from public, anon, authenticated;
revoke execute on function public.shop_store_reviews_resync(uuid) from public, anon, authenticated;

-- The API keeps its own copy of each function's settings, and the timeout
-- above only counts once it has read it. It re-reads on its own after a
-- change like this one; asking costs nothing and leaves no doubt.
notify pgrst, 'reload schema';

-- Rollback, if it comes to that:
--   drop function if exists public.admin_pageview_rollup(timestamptz);
--   drop function if exists public.admin_audience_rollup(timestamptz);
--   grant execute on function public.analytics_daily_buckets(timestamptz, int) to anon, authenticated;
--   grant execute on function public.shop_reviews_resync(uuid) to public;
--   grant execute on function public.shop_store_reviews_resync(uuid) to public;
--
-- Verification, with the PUBLIC anon key. Before this file the first call
-- answers 200 with counts. After it, all three answer 401 or 403 with 42501:
--   POST $URL/rest/v1/rpc/analytics_daily_buckets  {"p_since":"2026-10-01T00:00:00Z","p_days":1}
--   POST $URL/rest/v1/rpc/admin_pageview_rollup    {"p_since":"2026-10-01T00:00:00Z"}
--   POST $URL/rest/v1/rpc/admin_audience_rollup    {"p_since":"2026-10-01T00:00:00Z"}

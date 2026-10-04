-- ---------------------------------------------------------------------
-- Daily page view counts, 2026-10-04: the Engagement and Content tabs
-- answered from days that are already counted, not from every page view.
--
-- APPLIED BY HAND ON 2026-10-04, BEFORE THIS FILE REACHED main. The owner
-- ran every statement below in the SQL editor. Checked on production the
-- same afternoon, not taken on trust:
--   - The state row said the first 30 days were counted, through
--     2026-06-19, with no error. Eleven calls of the function counted the
--     rest, through 2026-10-03, in 0.8 to 5.3 seconds each.
--   - 618,000 page views over 136 days came to 29,273 rows of counts and
--     3,919 return visits.
--   - For 7, 30 and 90 days and for all time, the daily answer was the
--     same, byte for byte, as a row by row answer taken a moment before or
--     after it: 381 to 515 numbers each. Page views arrive in between, so
--     two row by row answers seconds apart differ by a view or two
--     themselves, and every number of the daily answer lay between them.
--   - The daily path took 0.2 to 0.4 seconds for every range once a
--     connection had run it, 1.2 to 1.8 the first time on a connection, and
--     up to 4.9 while this check's own row by row calls were loading the
--     database. Row by row took 8.3 to 19.3 seconds for all time that
--     afternoon.
--   - The public key was refused on the three tables and the four
--     functions: 401 with 42501.
--
-- WHY. admin_pageview_rollup (20261008000100_admin_rollups.sql) is exact
-- and reads every page view in its range, every time a tab opens. Timed on
-- production on 2026-10-04: 30 days in 0.7 to 5.7 seconds, all time in 5.4
-- to 9.1, on 615,000 rows that grow by 230,000 a month. All time passes the
-- 25 seconds the function allows itself inside a year. A day that is over
-- does not change, so it only has to be counted once.
--
-- WHAT THIS ADDS
--   analytics_daily_counts   one row per day and page, per day and section,
--                            and per day: the views, and how many sessions
--                            opened it for the first time that day.
--   analytics_return_visits  one row for each session that came back, on a
--                            later day, to something it had already opened:
--                            the day it first opened it and the latest day.
--   analytics_daily_state    one row: the last day that has been counted,
--                            and the last error of the daily path, if any.
--   analytics_day_pairs      one day counted from the page views themselves.
--   analytics_daily_close    counts the days that are over and not yet
--                            counted, ten at a time unless told otherwise.
--   admin_pageview_rollup_raw  the function as it was, under a new name.
--   admin_pageview_rollup      the same name, argument and answer as before,
--                            so the code that calls it does not change. It
--                            now adds up the counted days and counts only
--                            today from the page views.
--
-- THE SAME NUMBERS, NOT NEARLY THE SAME. Views add up across days. Visitors
-- do not: a session is a browser tab, a tab in the app can stay alive for
-- days, and on 2026-10-03 the 229 longest sessions of 14,013 made 26% of the
-- month's views. Adding up each day's visitors would count such a session
-- once for every day it opened the morning prayers. So a session is counted
-- for a page on the day it FIRST opened it, and never again. Then, for a
-- window that starts at midnight UTC,
--
--   visitors = the first-time sessions of every day in the window
--            + the sessions that opened it before the window and again in it
--
-- which is every session that opened it in the window, each once. The second
-- line is what analytics_return_visits is for: a session opened it before
-- the window and again inside it exactly when its first day is before the
-- window and its latest day is not. Held equal to
-- admin_pageview_rollup_raw on made-up traffic with sessions that run for
-- weeks, for a window starting on every day there was (see the ledger).
--
-- WHEN IT COUNTS ROW BY ROW INSTEAD. A window that does not start at
-- midnight UTC; a database with more than four days not yet counted; and
-- any error at all in the daily path. The answer is the same either way,
-- only slower, so an error would go unseen: it is logged, and written with
-- its time in analytics_daily_state.last_error, which is the place to look
-- when the tabs are slow again. A statement that runs out of time is not
-- caught: the route then shows a stated sample, as before.
--
-- A DAY IS COUNTED ONCE, a quarter of an hour after it ends, by whichever
-- call to admin_pageview_rollup comes next. Nothing is scheduled and nothing
-- is added to the page view insert. Page views that are later deleted or
-- inserted with an old date do not change a day that was counted. One thing
-- to know before anyone prunes old page views: a day is counted by reading
-- what its sessions opened BEFORE it, so page views may only be pruned for
-- sessions that are finished, or a session older than the pruning looks new
-- again on the days after.
--
-- THE THREE NEW FUNCTIONS TURN JIT OFF for themselves. Compiling a query
-- this size can cost more than running it, and none of them runs long.
--
-- THIS FILE COUNTS THE FIRST 30 DAYS and no more, so that it returns in a
-- few seconds in the SQL editor. The rest are counted ten at a time by the
-- calls that follow, and until they are done the answer comes row by row.
--
-- SAFE TO RUN TWICE: create if not exists, create or replace, revoke, grant,
-- a close that skips what is closed, and a notify.
--
-- TO CHECK, with the public anon key. Each must answer 401 with 42501:
--   GET  $URL/rest/v1/analytics_daily_counts?select=day&limit=0
--   GET  $URL/rest/v1/analytics_return_visits?select=first_day&limit=0
--   GET  $URL/rest/v1/analytics_daily_state?select=closed_through&limit=0
--   POST $URL/rest/v1/rpc/admin_pageview_rollup_raw  {"p_since":"2026-10-01T00:00:00Z"}
-- And with the server key, the two functions must give the same answer for
-- a p_since at midnight UTC.
--
-- TO UNDO. Run the admin_pageview_rollup function from
-- 20261008000100_admin_rollups.sql again, then:
--   drop function if exists public.admin_pageview_rollup_raw(timestamptz);
--   drop function if exists public.analytics_daily_close(integer);
--   drop function if exists public.analytics_day_pairs(date);
--   drop table if exists public.analytics_daily_counts, public.analytics_return_visits, public.analytics_daily_state;
-- ---------------------------------------------------------------------

set statement_timeout = '120s';

create table if not exists public.analytics_daily_counts (
  day date not null,
  level text not null check (level in ('page', 'section', 'all')),
  -- The page's path, the section's first segment ('' for the home page), or ''.
  key text not null,
  views bigint not null,
  -- Sessions that opened it for the first time on this day.
  new_visitors bigint not null,
  primary key (day, level, key)
);

create table if not exists public.analytics_return_visits (
  level text not null check (level in ('page', 'section', 'all')),
  key text not null,
  session_id text not null,
  -- The day this session first opened it, and the latest day it did so
  -- again. A session that opened it on one day only has no row here.
  first_day date not null,
  last_day date not null,
  primary key (level, key, session_id),
  check (first_day < last_day)
);

create table if not exists public.analytics_daily_state (
  only_row boolean primary key default true check (only_row),
  -- The last day counted. Null until the first one is.
  closed_through date,
  -- The last time the daily path failed and the answer was counted row by
  -- row instead: what Postgres said, and when. A success leaves it alone.
  last_error text,
  last_error_at timestamptz
);

alter table public.analytics_daily_counts enable row level security;
alter table public.analytics_return_visits enable row level security;
alter table public.analytics_daily_state enable row level security;
-- No policy on purpose: service role only, like the tables they are counted from.
revoke all on public.analytics_daily_counts from anon, authenticated;
revoke all on public.analytics_return_visits from anon, authenticated;
revoke all on public.analytics_daily_state from anon, authenticated;
grant all on public.analytics_daily_counts to service_role;
grant all on public.analytics_return_visits to service_role;
grant all on public.analytics_daily_state to service_role;

-- One UTC day, from the page views: a row for each page, each section and
-- the whole site, per session, with the day that session first opened it.
create or replace function public.analytics_day_pairs(p_day date)
returns table (level text, key text, session_id text, views bigint, first_day date)
language sql
stable
set search_path = public
set jit = off
as $$
  with raw as (
    -- The day's page views, through the index on ts.
    select v.path, v.session_id, count(*)::bigint as views
    from public.analytics_pageviews v
    where v.ts >= (p_day::timestamp at time zone 'UTC')
      and v.ts < ((p_day + 1)::timestamp at time zone 'UTC')
    group by v.path, v.session_id
  ),
  carried as (
    -- The day's sessions that were already here before the day began. Asked
    -- one session at a time, through the index on session_id.
    select s.session_id
    from (select distinct r.session_id from raw r) s
    where (
      select true from public.analytics_pageviews x
      where x.session_id = s.session_id
        and x.ts < (p_day::timestamp at time zone 'UTC')
      limit 1
    )
  ),
  before as (
    -- What those sessions opened before the day, and when first. Again one
    -- session at a time: there are few of them and each has few rows.
    select x.path, c.session_id, min(x.ts) as first_ts
    from carried c
    cross join lateral (
      select e.path, e.ts
      from public.analytics_pageviews e
      where e.session_id = c.session_id
        and e.ts < (p_day::timestamp at time zone 'UTC')
    ) x
    group by x.path, c.session_id
  ),
  names as (
    -- Each stored path cleaned ONCE: no fragment, no query, and one trailing
    -- slash dropped. Same rule as cleanPath() in lib/admin/rollups.ts and as
    -- admin_pageview_rollup_raw below.
    select
      d.path as raw_path,
      coalesce(
        nullif(
          regexp_replace(
            split_part(split_part(coalesce(nullif(d.path, ''), '/'), '#', 1), '?', 1),
            '(.)/$', '\1'),
          ''),
        '/') as path
    from (select r.path from raw r union select x.path from before x) d
  ),
  named as (
    select n.raw_path, n.path,
           coalesce((regexp_match(n.path, '^/*([^/]+)'))[1], '') as seg1
    from names n
  ),
  seen as (
    select n.path, n.seg1, r.session_id, sum(r.views)::bigint as views
    from raw r
    join named n on n.raw_path = r.path
    group by n.path, n.seg1, r.session_id
  ),
  past as (
    select n.path, n.seg1, x.session_id, min(x.first_ts) as first_ts
    from before x
    join named n on n.raw_path = x.path
    group by n.path, n.seg1, x.session_id
  ),
  pairs as (
    select 'page'::text as level, s.path as key, s.session_id, s.views from seen s
    union all
    select 'section', s.seg1, s.session_id, sum(s.views)::bigint from seen s group by s.seg1, s.session_id
    union all
    select 'all', '', s.session_id, sum(s.views)::bigint from seen s group by s.session_id
  ),
  firsts as (
    select 'page'::text as level, p.path as key, p.session_id, p.first_ts from past p
    union all
    select 'section', p.seg1, p.session_id, min(p.first_ts) from past p group by p.seg1, p.session_id
    union all
    select 'all', '', p.session_id, min(p.first_ts) from past p group by p.session_id
  )
  select p.level, p.key, p.session_id, p.views,
         coalesce((f.first_ts at time zone 'UTC')::date, p_day) as first_day
  from pairs p
  left join firsts f
    on f.level = p.level and f.key = p.key and f.session_id = p.session_id
$$;

-- Count the days that are over and not yet counted, oldest first, at most
-- p_max_days of them. Answers how many it counted.
create or replace function public.analytics_daily_close(p_max_days integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
set jit = off
as $$
declare
  -- A day is over a quarter of an hour after midnight UTC, so that a page
  -- view stamped just before midnight has been committed.
  v_last date := ((now() - interval '15 minutes') at time zone 'UTC')::date - 1;
  v_day date;
  v_done integer := 0;
begin
  -- One closer at a time. Whoever does not get the lock counts nothing and
  -- reads what is there, which is still exact. The lock goes with the
  -- transaction.
  if not pg_try_advisory_xact_lock(hashtextextended('public.analytics_daily_close', 0)) then
    return 0;
  end if;

  select s.closed_through + 1 into v_day from public.analytics_daily_state s;
  if v_day is null then
    select (min(v.ts) at time zone 'UTC')::date into v_day from public.analytics_pageviews v;
    if v_day is null then
      return 0;
    end if;
  end if;

  while v_day <= v_last and v_done < p_max_days loop
    with pairs as materialized (
      select * from public.analytics_day_pairs(v_day)
    ),
    counted as (
      insert into public.analytics_daily_counts (day, level, key, views, new_visitors)
      select v_day, p.level, p.key, sum(p.views)::bigint,
             count(*) filter (where p.first_day = v_day)
      from pairs p
      group by p.level, p.key
    )
    insert into public.analytics_return_visits (level, key, session_id, first_day, last_day)
    select p.level, p.key, p.session_id, p.first_day, v_day
    from pairs p
    where p.first_day < v_day
    on conflict (level, key, session_id) do update
      set last_day = greatest(public.analytics_return_visits.last_day, excluded.last_day);

    insert into public.analytics_daily_state (only_row, closed_through)
    values (true, v_day)
    on conflict (only_row) do update set closed_through = excluded.closed_through;

    v_day := v_day + 1;
    v_done := v_done + 1;
  end loop;

  return v_done;
end;
$$;

-- The function as 20261008000100_admin_rollups.sql wrote it, word for word,
-- under a new name: every page view in the range, counted row by row.
create or replace function public.admin_pageview_rollup_raw(p_since timestamptz)
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

-- Same name, same argument, same answer as before. For a window that starts
-- at midnight UTC it adds up the counted days and counts only the days still
-- open from the page views. For anything else, and on any error, it counts
-- row by row.
create or replace function public.admin_pageview_rollup(p_since timestamptz)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
set work_mem = '16MB'
set statement_timeout = '25s'
set jit = off
as $$
declare
  v_from date := (p_since at time zone 'UTC')::date;
  v_today date := (now() at time zone 'UTC')::date;
  v_closed date;
  v_out jsonb;
  v_error text;
begin
  if p_since is null or p_since <> (v_from::timestamp at time zone 'UTC') then
    return public.admin_pageview_rollup_raw(p_since);
  end if;

  begin
    perform public.analytics_daily_close(10);
    select s.closed_through into v_closed from public.analytics_daily_state s;
    -- Every day after the last counted one is counted from the page views
    -- on the spot. That is today, yesterday for a quarter of an hour, and a
    -- few more when the counting is behind. More than four and it is
    -- cheaper to count the whole window row by row this once.
    if v_closed is null or v_today - v_closed > 4 then
      return public.admin_pageview_rollup_raw(p_since);
    end if;

    with open_days as (
      select o.day, p.level, p.key, p.session_id, p.views, p.first_day
      from (select v_closed + g as day from generate_series(1, v_today - v_closed) g) o
      cross join lateral public.analytics_day_pairs(o.day) p
      where o.day >= v_from
    ),
    counts as (
      -- `<= v_closed` on purpose: another call may be counting a day right
      -- now, and its rows must not be added to the same day counted here.
      select c.level, c.key, c.views, c.new_visitors
      from public.analytics_daily_counts c
      where c.day >= v_from and c.day <= v_closed
      union all
      select o.level, o.key, sum(o.views)::bigint, count(*) filter (where o.first_day = o.day)
      from open_days o
      group by o.day, o.level, o.key
    ),
    back as (
      -- Sessions that opened it before the window and again inside it. A
      -- row another call is writing right now can only say what is true of
      -- the page views, and the `union` counts a session once, so this needs
      -- no `<= v_closed`.
      select r.level, r.key, r.session_id
      from public.analytics_return_visits r
      where r.first_day < v_from and r.last_day >= v_from
      union
      select o.level, o.key, o.session_id
      from open_days o
      where o.first_day < v_from
    ),
    keyed as (
      select a.level, a.key, a.views, (a.fresh + coalesce(b.n, 0))::bigint as visitors
      from (
        select c.level, c.key, sum(c.views)::bigint as views, sum(c.new_visitors)::bigint as fresh
        from counts c
        group by c.level, c.key
      ) a
      left join (
        select k.level, k.key, count(*)::bigint as n from back k group by k.level, k.key
      ) b on b.level = a.level and b.key = a.key
    ),
    pages as (
      select
        k.key as path,
        k.views,
        k.visitors,
        (regexp_match(k.key, '^/*([^/]+)'))[1] as seg1,
        (regexp_match(k.key, '^/*[^/]+/+([^/]+)'))[1] as seg2
      from keyed k
      where k.level = 'page'
    ),
    sections as (
      select nullif(k.key, '') as seg1, k.views, k.visitors
      from keyed k
      where k.level = 'section'
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
        'views', coalesce((select k.views from keyed k where k.level = 'all'), 0),
        'visitors', coalesce((select k.visitors from keyed k where k.level = 'all'), 0)
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
    )
    into v_out;

    return v_out;
  exception when others then
    -- Not a statement that ran out of time: `others` leaves that one alone.
    -- Written down where the server key can read it, because nothing else
    -- would say that the quick path had stopped working.
    v_error := sqlstate || ' ' || sqlerrm;
    raise log 'admin_pageview_rollup: the daily counts failed (%), counting row by row', v_error;
    begin
      insert into public.analytics_daily_state (only_row, last_error, last_error_at)
      values (true, v_error, now())
      on conflict (only_row) do update
        set last_error = excluded.last_error, last_error_at = excluded.last_error_at;
    exception when others then
      -- A read-only transaction cannot write it down. The answer still comes.
      null;
    end;
    return public.admin_pageview_rollup_raw(p_since);
  end;
end;
$$;

-- Service role only, and anon and authenticated named: a revoke from public
-- alone leaves the grants Supabase gives those two roles by name (F-32).
revoke all on function public.analytics_day_pairs(date) from public, anon, authenticated;
revoke all on function public.analytics_daily_close(integer) from public, anon, authenticated;
revoke all on function public.admin_pageview_rollup_raw(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_pageview_rollup(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_pageview_rollup_raw(timestamptz) to service_role;
grant execute on function public.admin_pageview_rollup(timestamptz) to service_role;

-- The first 30 days. The rest follow ten at a time, with the calls. If the
-- counting fails here the file still finishes, the reason is written in
-- analytics_daily_state, and the function goes on counting row by row.
do $$
begin
  perform public.analytics_daily_close(30);
exception when others then
  insert into public.analytics_daily_state (only_row, last_error, last_error_at)
  values (true, sqlstate || ' ' || sqlerrm, now())
  on conflict (only_row) do update
    set last_error = excluded.last_error, last_error_at = excluded.last_error_at;
end;
$$;

-- The function went from stable to volatile, and the API runs a function in
-- a read-only transaction until it has read that. It re-reads on its own
-- after a change like this one; asking costs nothing and leaves no doubt.
notify pgrst, 'reload schema';

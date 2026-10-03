-- Imported reports become real data.
--
-- The CSV import engine kept everything in localStorage, so a report lived in
-- one browser, did not follow the operator to another machine, and was replaced
-- rather than extended by the next import. These tables make it durable and
-- make successive exports ACCUMULATE.
--
-- The source is Google Play Console, and that decides the design. Its exports
-- are rolling windows: the same day appears in file after file, and Google
-- REVISES recent days after first publishing them. So a merge has to answer two
-- questions, and both are answered here rather than in application code.
--
-- QUESTION ONE: may an absent value erase a present one? No, and the schema
-- makes it impossible rather than merely discouraged. `value` is NOT NULL and
-- nothing writes a null: a day with no measurement simply has no row. That is
-- already how the rest of the engine behaves, so nothing downstream changes.
-- lib/admin/insights/calendar.ts gates on `point && point.value !== null`, and
-- lastMeasuredDay skips nulls, which means a missing row and a stored null were
-- always indistinguishable. Storing only measurements removes the whole class
-- of "a re-import blanked my numbers".
--
-- QUESTION TWO: when two files disagree about a day, which wins? The one from
-- the export that had seen more. `observed_through` records the exporting
-- FILE's own last day, not the wall clock. Ranking by import time would be the
-- obvious choice and is the wrong one: re-importing a file downloaded last week
-- has the newest import time and would overwrite good figures with stale ones.
-- The upsert's WHERE clause is the entire guarantee, and it lives in the
-- database so no code path can bypass it.

create table if not exists public.insight_series (
  id            text primary key,
  -- The three parsed parts of a Play Console header, kept so the id never has
  -- to be taken apart again and so a rename can be spotted by a human.
  metric        text not null,
  qualifiers    text not null default '',
  dimension     text not null default '',
  label         text not null,
  -- Decides whether the series is summed or read at its latest point. Changing
  -- it retroactively would reinterpret every point already stored, so a later
  -- import that disagrees is reported rather than applied.
  kind          text not null check (kind in ('stock', 'flow')),
  -- The full original header. This is what makes a future id-scheme change
  -- mechanical rather than a guess.
  source_header text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.insight_points (
  series_id        text not null
                     references public.insight_series (id) on delete cascade,
  day              date not null,
  -- NOT NULL on purpose. See the header: absence is "not measured".
  value            double precision not null,
  -- The exporting file's last day. Freshness, not recency of import.
  observed_through date not null,
  primary key (series_id, day)
);

create index if not exists insight_points_day_idx
  on public.insight_points (day);

create table if not exists public.insight_goals (
  id         text primary key,
  -- Deliberately NOT a foreign key. A goal whose series has not been imported
  -- yet is a normal state, and the panel renders it as "not measured" rather
  -- than refusing to store it. A cascade here would delete targets when a
  -- report was cleared, which is the opposite of what a goal is for.
  series_id  text not null,
  label      text not null,
  period     text not null check (period in ('daily', 'weekly', 'monthly')),
  target     double precision not null check (target >= 0),
  paused     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insight_imports (
  id             bigserial primary key,
  label          text not null,
  imported_at    timestamptz not null default now(),
  imported_by    text,
  row_count      integer not null default 0,
  series_count   integer not null default 0,
  points_written integer not null default 0,
  -- Points the merge did not alter: either already identical, or from an
  -- export that had seen less than what is stored. Recorded rather than
  -- discarded so a re-import can say "435 already current" instead of looking
  -- like it silently did nothing. Named "skipped" in the function that
  -- produces it.
  points_skipped integer not null default 0,
  first_day      date,
  last_day       date
);

alter table public.insight_series  enable row level security;
alter table public.insight_points  enable row level security;
alter table public.insight_goals   enable row level security;
alter table public.insight_imports enable row level security;

-- No policies, deliberately, matching expense_lines and api_bible_usage. These
-- are admin-owned operational tables: the service role writes them and the
-- routes that read them already sit behind getAdminUser. RLS on with no policy
-- means anon and authenticated see nothing at all, which is the intent.

comment on table public.insight_series is
  'Series from imported CSV reports. id is the parsed Play Console header identity.';
comment on table public.insight_points is
  'One measurement per series per day. No row means not measured; nulls are never stored.';
comment on column public.insight_points.observed_through is
  'Last day covered by the export that produced this point. A later import only wins if it saw at least as much.';
comment on table public.insight_goals is
  'Targets. series_id is intentionally not a foreign key: a goal may outlive a report.';
comment on table public.insight_imports is
  'One row per import, for provenance and for reporting what a re-import actually changed.';

-- The merge.
--
-- A function rather than a client-side upsert because the Supabase JS client
-- cannot express a conditional DO UPDATE, and the condition IS the guarantee.
-- Keeping it here means no code path can import points without the staleness
-- check, including a future one written by someone who has not read this file.
--
-- Takes the whole batch as one JSONB array, so a 435 point import is one round
-- trip rather than 435.
--
-- Returns what actually changed. `skipped` covers two cases deliberately merged
-- into one number: a point already identical, and a point from an export that
-- had seen less than what is stored. Both mean "nothing was altered", which is
-- what a re-import needs to be able to say, and neither is an error.
create or replace function public.merge_insight_points(p_points jsonb)
returns table (written integer, skipped integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer := 0;
  did   integer := 0;
begin
  select count(*)::integer into total from jsonb_array_elements(p_points);

  with incoming as (
    select
      (e ->> 'series_id')::text            as series_id,
      (e ->> 'day')::date                  as day,
      (e ->> 'value')::double precision    as value,
      (e ->> 'observed_through')::date     as observed_through
    from jsonb_array_elements(p_points) e
  ),
  ins as (
    insert into public.insight_points (series_id, day, value, observed_through)
    select series_id, day, value, observed_through from incoming
    on conflict (series_id, day) do update
      set value            = excluded.value,
          observed_through = excluded.observed_through
      -- Newer or equal coverage AND something actually different. The first
      -- half rejects a stale file; the second stops a re-import of the same
      -- file from reporting hundreds of writes that changed nothing.
      where excluded.observed_through >= public.insight_points.observed_through
        and (excluded.value is distinct from public.insight_points.value
             or excluded.observed_through > public.insight_points.observed_through)
    returning 1
  )
  select count(*)::integer into did from ins;

  written := did;
  skipped := total - did;
  return next;
end;
$$;

revoke all on function public.merge_insight_points(jsonb) from public;
revoke all on function public.merge_insight_points(jsonb) from anon;
revoke all on function public.merge_insight_points(jsonb) from authenticated;

comment on function public.merge_insight_points(jsonb) is
  'Merge a batch of points. A point only wins if its export saw at least as much as the stored one. Service role only.';

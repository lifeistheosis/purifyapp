-- ---------------------------------------------------------------------
-- Streaks, 2026-10-02: the owner asked for a streak on every profile, in
-- red, with up to three hidden saves (docs/plans/v1.5/MASTER.md, B). This
-- is the database half; the rules are in lib/streak/compute.ts.
--
-- WHAT THIS ADDS
--   prayer_completions.streak_ok
--       Whether a mark may count toward a streak, set by trigger when the
--       row arrives. A mark for a day more than 35 days before it reached
--       us, or more than a day ahead, is kept as history but does not
--       count, so nobody can type in a year of days. A phone holds 30 days
--       (lib/rhythm/marks.ts), so one that was offline for a month still
--       counts in full. Every row already here counts. An update never
--       changes it.
--   reader_streaks
--       One row per reader: the run, the best, the last day kept, the
--       hidden saves, the days the streak badges were reached, written by
--       the server after it walks the ledger. Service role only: the saves
--       never reach a browser, and nobody writes their own number.
--   reader_kept_days(uuid)
--       The distinct days a reader kept, for the server to walk. Service
--       role only.
--   profiles.show_streak
--       The reader can keep the flame off their profile. On by default.
--       Written by /api/profile/me with the service role, so no browser
--       grant.
--
-- SAFE TO RUN TWICE. Nothing is dropped but this file's own trigger, which
-- it recreates at once.
-- ---------------------------------------------------------------------

alter table public.prayer_completions
  add column if not exists streak_ok boolean not null default true;

create or replace function public.prayer_completions_streak_gate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.streak_ok := new.prayed_on >= (now() at time zone 'utc')::date - 35
                 and new.prayed_on <= (now() at time zone 'utc')::date + 1;
  else
    new.streak_ok := old.streak_ok;
  end if;
  return new;
end;
$$;

drop trigger if exists prayer_completions_streak_gate on public.prayer_completions;
create trigger prayer_completions_streak_gate
  before insert or update on public.prayer_completions
  for each row execute function public.prayer_completions_streak_gate();

create table if not exists public.reader_streaks (
  user_id     uuid primary key references auth.users on delete cascade,
  run         integer not null default 0 check (run >= 0),
  best        integer not null default 0 check (best >= 0),
  last_kept   date,
  saves       smallint not null default 1 check (saves between 0 and 3),
  last_save   date,
  save_seen   date,
  m7          date,
  m40         date,
  m100        date,
  tz          text check (tz is null or char_length(tz) <= 64),
  computed_at timestamptz not null default now()
);

alter table public.reader_streaks enable row level security;
revoke all on public.reader_streaks from anon, authenticated;
grant all on public.reader_streaks to service_role;

create or replace function public.reader_kept_days(p_user uuid)
returns table (day date)
language sql
stable
security definer
set search_path = public
as $$
  select distinct c.prayed_on
  from public.prayer_completions c
  where c.user_id = p_user and c.streak_ok
  order by 1;
$$;

revoke all on function public.reader_kept_days(uuid) from public, anon, authenticated;
grant execute on function public.reader_kept_days(uuid) to service_role;

alter table public.profiles
  add column if not exists show_streak boolean not null default true;

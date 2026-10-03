-- Count API.Bible calls, so the 150,000 a month ceiling can be reported
-- against instead of guessed at.
--
-- WHY THIS EXISTS. Purify serves NIV, NKJV and NLT under the American Bible
-- Society and Biblica agreements, whose free tier caps calls at 150,000 a
-- month. Nothing counted them, so the admin panel had to show that limit as
-- "not measured". Reporting zero instead would have been a lie: production
-- serves licensed chapters today.
--
-- THE HARD PART IS NOT COUNTING, IT IS NOT OVERCOUNTING.
--
-- lib/bible/api-bible.ts fetches with `next: { revalidate: 60 * 60 * 6 }`, so
-- a chapter is really requested from API.Bible at most four times a day no
-- matter how many readers open it. Counting every call to
-- fetchLicensedChapter would therefore count READER PAGE VIEWS, not API calls,
-- and would overstate usage by orders of magnitude. On a licence ceiling that
-- is not a harmless error: it would raise an upgrade alarm, and the whole
-- point of the alarm is that it means something.
--
-- So a call is counted only when it is the first one for a given chapter
-- inside a given six-hour cache window, which is exactly when the cache misses
-- and a real request goes out. api_bible_call_keys holds one row per real
-- call and its unique constraint is what does the deduplication; the daily
-- counter is incremented only when that insert actually inserts.

create table if not exists public.api_bible_usage (
  day        date primary key,
  calls      integer not null default 0 check (calls >= 0),
  updated_at timestamptz not null default now()
);

-- One row per real call. `key` is bibleId : chapterId : six-hour bucket, which
-- mirrors what the fetch cache keys on.
create table if not exists public.api_bible_call_keys (
  key        text primary key,
  day        date not null,
  created_at timestamptz not null default now()
);

create index if not exists api_bible_call_keys_day_idx
  on public.api_bible_call_keys (day);

alter table public.api_bible_usage enable row level security;
alter table public.api_bible_call_keys enable row level security;

-- No policies, deliberately. Nothing but the service role touches these: they
-- are a compliance counter, not reader data, and the admin route that reports
-- them already runs behind getAdminUser with the service key.

comment on table public.api_bible_usage is
  'Daily count of real API.Bible requests, for the 150k/month free-tier ceiling.';
comment on table public.api_bible_call_keys is
  'Deduplication keys, one per real API.Bible request. Prunable after ~40 days.';

-- The increment.
--
-- ATOMIC, and that is why this is a function rather than a read-then-write in
-- TypeScript. Chapters are fetched concurrently; a select followed by an
-- update loses increments under any real traffic, and a counter that silently
-- undercounts is worse than none because it reports comfort.
--
-- Returns true when it actually counted, so the caller can tell a real request
-- from a duplicate without a second round trip.
create or replace function public.bump_api_bible_calls(p_key text, p_day date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  counted boolean := false;
begin
  insert into public.api_bible_call_keys (key, day)
  values (p_key, p_day)
  on conflict (key) do nothing;

  -- FOUND is true only when the insert above actually inserted a row, which
  -- is precisely the cache-miss case this is here to count.
  if found then
    insert into public.api_bible_usage (day, calls, updated_at)
    values (p_day, 1, now())
    on conflict (day) do update
      set calls = public.api_bible_usage.calls + 1,
          updated_at = now();
    counted := true;
  end if;

  return counted;
end;
$$;

revoke all on function public.bump_api_bible_calls(text, date) from public;
revoke all on function public.bump_api_bible_calls(text, date) from anon;
revoke all on function public.bump_api_bible_calls(text, date) from authenticated;

comment on function public.bump_api_bible_calls(text, date) is
  'Count one API.Bible request, deduplicated by cache-window key. Service role only.';

-- Housekeeping. The keys table exists only to deduplicate inside a six-hour
-- window, so anything older than a month is dead weight. The daily counts it
-- produced are kept forever; they are one small row a day.
create or replace function public.prune_api_bible_call_keys()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.api_bible_call_keys
     where day < (current_date - interval '40 days')
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.prune_api_bible_call_keys() from public;
revoke all on function public.prune_api_bible_call_keys() from anon;
revoke all on function public.prune_api_bible_call_keys() from authenticated;

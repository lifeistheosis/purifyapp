-- Today's Catechism: the question bank mirror, the day's sets, each reader's
-- own attempts, the aggregate per-question counters, and a small table of
-- aggregate product events.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites,
-- not because it is proposed for merge.
--
-- SHIPS DARK. Every reader of these tables tolerates their absence:
--   - the page never reads the database at all. The bank is
--     data/catechism/questions.json and the day's set is a pure function of
--     (bank, date, reckoning), so /catechism works with none of this applied.
--   - /api/catechism/attempt answers 503 on a missing table and the client
--     keeps the attempt on the device, which is where it was written first.
--   - the stats and event routes drop the write and answer ok.
--   - the admin tab says "table absent" and shows the bank from the file.
--
-- WHAT IS NOT HERE. No timer, no streak, no expiry, no per-reader row on the
-- anonymous path. quiz_question_stats and analytics_events hold counts and
-- names only; nothing in either can be joined back to a person.
--
-- Safe to re-run.

-- 1. quiz_questions ----------------------------------------------------------
-- A mirror of data/catechism/questions.json, written by scripts/quiz-import.ts
-- with the service role. The file is canonical; this copy exists so the admin
-- correct-rate view can name a question beside its counters without reading
-- the repo. Readable by everyone: every row is already public on the page.

create table if not exists public.quiz_questions (
  id              uuid primary key,
  type            text not null check (type in ('multiple_choice', 'true_false', 'fill_word')),
  prompt          text not null,
  -- text[] as jsonb, exactly four for multiple_choice, absent otherwise.
  options         jsonb,
  -- int (multiple_choice index), bool (true_false) or text[] (fill_word).
  answer          jsonb not null,
  explanation     text not null,
  -- A site path into free content: /saints/{slug}, /saints/{s}/{w}#s{n},
  -- /heresies/{slug}, /councils/{slug}, /topics/{slug}, /bible/{book}/{n},
  -- or a prayer route. Checked against the registries at import.
  source_ref      text not null,
  tags            text[] not null default '{}',
  -- { saint?: slug, feast?: "MM-DD", reading?: { book, chapter } } or null.
  calendar_anchor jsonb,
  reviewed_by     text not null,
  published_at    date,
  retired_at      date,
  updated_at      timestamptz not null default now()
);

alter table public.quiz_questions enable row level security;

drop policy if exists "quiz_questions_select_all" on public.quiz_questions;
create policy "quiz_questions_select_all" on public.quiz_questions
  for select
  using (true);
-- No write policies: the import script writes with the service role.

-- 2. quiz_daily --------------------------------------------------------------
-- The five ids for a (date, reckoning), as the attempt route saw them. Written
-- lazily by that route with the service role the first time anyone records an
-- attempt for the day; there is no nightly job. Informational: the set is a
-- pure function and can always be recomputed from the bank.

create table if not exists public.quiz_daily (
  date         date not null,
  reckoning    text not null check (reckoning in ('new', 'old')),
  question_ids uuid[] not null,
  created_at   timestamptz not null default now(),
  primary key (date, reckoning)
);

alter table public.quiz_daily enable row level security;

drop policy if exists "quiz_daily_select_all" on public.quiz_daily;
create policy "quiz_daily_select_all" on public.quiz_daily
  for select
  using (true);

-- 3. quiz_attempts -----------------------------------------------------------
-- One row per signed-in reader per (date, reckoning). The id is generated on
-- the client so a retried POST cannot record twice; the unique key is what
-- refuses a second attempt on the same day. `answers` is the graded list:
-- [{ question_id, answer, correct }]. Self-only, like bookmarks.

create table if not exists public.quiz_attempts (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  reckoning    text not null check (reckoning in ('new', 'old')),
  answers      jsonb not null default '[]'::jsonb,
  score        int not null default 0 check (score >= 0 and score <= 5),
  completed_at timestamptz not null default now(),
  unique (user_id, date, reckoning)
);

create index if not exists quiz_attempts_user_idx
  on public.quiz_attempts (user_id, date desc);

alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts_self_all" on public.quiz_attempts;
create policy "quiz_attempts_self_all" on public.quiz_attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. quiz_question_stats -----------------------------------------------------
-- How often each question was shown and how often it was answered correctly,
-- across everyone, signed in or not. Counts only: no reader, no session, no
-- date. Service role only; bumped through the function below.

create table if not exists public.quiz_question_stats (
  question_id uuid primary key,
  shown       int not null default 0,
  correct     int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.quiz_question_stats enable row level security;
-- No policies. Only the service role reads or writes.

-- Called by /api/catechism/attempt (after a signed-in attempt is recorded)
-- and by /api/catechism/stats (the anonymous path, which sends only these two
-- id lists). `correct_ids` is counted only where it also appears in
-- `question_ids`, so a caller cannot mark correct what it did not show.
create or replace function public.bump_quiz_stats(
  question_ids uuid[],
  correct_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quiz_question_stats (question_id, shown, correct, updated_at)
  select q, 1, case when q = any (correct_ids) then 1 else 0 end, now()
  from unnest(question_ids) as q
  on conflict (question_id) do update
    set shown = public.quiz_question_stats.shown + 1,
        correct = public.quiz_question_stats.correct + excluded.correct,
        updated_at = now();
end
$$;

revoke all on function public.bump_quiz_stats(uuid[], uuid[]) from public;
revoke all on function public.bump_quiz_stats(uuid[], uuid[]) from anon, authenticated;
grant execute on function public.bump_quiz_stats(uuid[], uuid[]) to service_role;

-- 5. analytics_events --------------------------------------------------------
-- Aggregate product events: a name, a small props object, a time. Written by
-- /api/track/event with the service role. Deliberately NO session id and no
-- user id, unlike analytics_sessions: the catechism events say that a
-- catechism was started or completed and with what score, never by whom.
-- Disclosed on /privacy beside the analytics tables.

create table if not exists public.analytics_events (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  props jsonb not null default '{}'::jsonb,
  ts    timestamptz not null default now()
);

create index if not exists analytics_events_name_ts_idx
  on public.analytics_events (name, ts desc);

alter table public.analytics_events enable row level security;
-- No policies. Only the service role reads or writes.

-- Study Collections: the collection definitions, each reader's own progress,
-- and the palette a reader applied after the entitlement check.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites,
-- not because it is proposed for merge.
--
-- SHIPS DARK. Every reader of these tables tolerates their absence:
--   - the pages never read the database at all. The collections are
--     data/catechism/collections.json and the progress a page shows is the
--     device's own set, so /catechism/collections works with none of this
--     applied.
--   - /api/catechism/progress answers 503 on a missing table and the client
--     keeps the set on the device, which is where it was written first.
--   - the sign-in pull swallows the error and the device set stands.
--   - PUT /api/account/theme still makes its entitlement decision and answers
--     200 with stored:false when user_theme is not there.
--
-- WHAT IS NOT HERE. No decay, no expiry, no reset. correct_question_ids only
-- ever grows (the route unions; nothing deletes) and completed_at is written
-- once and never cleared, so a bank that grows later cannot revoke a
-- completion. No column on any of these can be joined by another reader.
--
-- Safe to re-run.

-- 1. collections ------------------------------------------------------------
-- A mirror of data/catechism/collections.json, written by scripts/quiz-import.ts
-- --mirror with the service role. The file is canonical; this copy exists so
-- the admin panel can name a collection beside its counters without reading
-- the repo. Readable by everyone: every row is already public on the page.

create table if not exists public.collections (
  slug        text primary key,
  name        text not null,
  description text not null,
  -- The study tag on the questions. Every published question carrying it
  -- belongs to the collection.
  tag         text not null,
  -- A READING_THEMES id flagged `collection` (lib/reader/readingModes.ts).
  theme_id    text not null,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.collections enable row level security;

drop policy if exists "collections_select_all" on public.collections;
create policy "collections_select_all" on public.collections
  for select
  using (true);
-- No write policies: the import script writes with the service role.

-- 2. collection_progress ----------------------------------------------------
-- One row per signed-in reader per collection: the ids of its questions they
-- have answered rightly, and when the set first covered every published
-- question. Self-only, like quiz_attempts; the progress route reads and
-- upserts it as the user, and the sign-in pull reads it the same way.

create table if not exists public.collection_progress (
  user_id              uuid not null references auth.users (id) on delete cascade,
  slug                 text not null,
  correct_question_ids uuid[] not null default '{}',
  completed_at         timestamptz,
  updated_at           timestamptz not null default now(),
  primary key (user_id, slug)
);

alter table public.collection_progress enable row level security;

drop policy if exists "collection_progress_self_all" on public.collection_progress;
create policy "collection_progress_self_all" on public.collection_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. user_theme -------------------------------------------------------------
-- The palette a reader applied, written by PUT /api/account/theme with the
-- service role AFTER deriveEntitlements has answered for the surface. Self
-- select only and no write policy, so a client cannot grant itself a palette
-- by writing the table directly.

create table if not exists public.user_theme (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  theme_id   text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_theme enable row level security;

drop policy if exists "user_theme_self_select" on public.user_theme;
create policy "user_theme_self_select" on public.user_theme
  for select
  using (auth.uid() = user_id);
-- No insert, update or delete policies: the route writes with the service role.

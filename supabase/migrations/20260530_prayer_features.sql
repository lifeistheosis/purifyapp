-- v7.1 — prayer features (chotki, diptychs, completions sync)
-- Four new tables + two enum extensions, all RLS-self-scoped.
--
-- The localStorage primitives stay the canonical store on a given device
-- (everything works signed-out). These tables are the mirror that makes
-- "Sign in to sync across devices" actually true. Same posture as
-- bookmarks / annotations.

-- 1. prayer_completions ------------------------------------------------------
-- One row per (user, rule, date). Primary key on the tuple makes re-sync
-- idempotent. `dates[]` on the client is reconstructed from server rows
-- on first sign-in.
create table if not exists public.prayer_completions (
  user_id     uuid not null references auth.users on delete cascade,
  rule_id     text not null,
  prayed_on   date not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, rule_id, prayed_on)
);

create index if not exists prayer_completions_user_idx
  on public.prayer_completions (user_id, prayed_on desc);

alter table public.prayer_completions enable row level security;

drop policy if exists "prayer_completions_self_all" on public.prayer_completions;
create policy "prayer_completions_self_all" on public.prayer_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. intentions_living -------------------------------------------------------
-- The diptych of the living. Server columns mirror the JSON shape kept in
-- `purify.intentions.living` on the client. `id` is a uuid generated
-- client-side so an entry that was created offline merges cleanly later.
create table if not exists public.intentions_living (
  user_id      uuid not null references auth.users on delete cascade,
  id           uuid not null,
  name         text not null,
  relationship text,
  note         text,
  nameday      text,            -- 'MM-DD' format, optional
  tags         text[] not null default '{}',
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists intentions_living_user_idx
  on public.intentions_living (user_id, added_at desc);

alter table public.intentions_living enable row level security;

drop policy if exists "intentions_living_self_all" on public.intentions_living;
create policy "intentions_living_self_all" on public.intentions_living
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. intentions_departed -----------------------------------------------------
-- Same shape; `repose` (YYYY-MM-DD) replaces `nameday`. Yearly anniversary
-- surfacing on /prayers/today reads this.
create table if not exists public.intentions_departed (
  user_id      uuid not null references auth.users on delete cascade,
  id           uuid not null,
  name         text not null,
  relationship text,
  note         text,
  repose       date,
  tags         text[] not null default '{}',
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists intentions_departed_user_idx
  on public.intentions_departed (user_id, added_at desc);

alter table public.intentions_departed enable row level security;

drop policy if exists "intentions_departed_self_all" on public.intentions_departed;
create policy "intentions_departed_self_all" on public.intentions_departed
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. rope_sessions -----------------------------------------------------------
-- One row per chotki session. The yearly counter on the rope screen
-- aggregates these. Sessions are immutable; deleting a row is fine but
-- updates are not expected.
create table if not exists public.rope_sessions (
  user_id      uuid not null references auth.users on delete cascade,
  id           uuid not null,
  started_at   timestamptz not null,
  knots        integer not null check (knots >= 0),
  line         text,            -- which prayer line was used
  primary key (user_id, id)
);

create index if not exists rope_sessions_user_started_idx
  on public.rope_sessions (user_id, started_at desc);

alter table public.rope_sessions enable row level security;

drop policy if exists "rope_sessions_self_all" on public.rope_sessions;
create policy "rope_sessions_self_all" on public.rope_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Extend bookmarks.kind to include 'prayer' -------------------------------
-- Existing constraint only knows about bible-verse / bible-chapter /
-- writing-section. Drop + recreate so the bookmark control on the prayer
-- reader can write a 'prayer' bookmark with locator {ruleId, prayerId}.
alter table public.bookmarks drop constraint if exists bookmarks_kind_check;
alter table public.bookmarks add constraint bookmarks_kind_check
  check (kind in ('bible-verse', 'bible-chapter', 'writing-section', 'prayer'));

-- Widen the locator-uniqueness index to cover the new fields. We do this
-- by dropping the old index and recreating with the prayer locator keys
-- (ruleId, prayerId) coalesced in too.
drop index if exists bookmarks_user_locator_idx;
create unique index bookmarks_user_locator_idx on public.bookmarks (
  user_id,
  kind,
  coalesce(locator->>'book', ''),
  coalesce(locator->>'chapter', ''),
  coalesce(locator->>'verse', ''),
  coalesce(locator->>'saintSlug', ''),
  coalesce(locator->>'workSlug', ''),
  coalesce(locator->>'sectionN', ''),
  coalesce(locator->>'ruleId', ''),
  coalesce(locator->>'prayerId', '')
);

-- 6. Extend annotations.kind to include 'prayer' -----------------------------
alter table public.annotations drop constraint if exists annotations_kind_check;
alter table public.annotations add constraint annotations_kind_check
  check (kind in ('bible-verse', 'saint-paragraph', 'prayer'));

drop index if exists annotations_user_locator_idx;
create unique index annotations_user_locator_idx on public.annotations (
  user_id,
  kind,
  coalesce(locator->>'book', ''),
  coalesce(locator->>'chapter', ''),
  coalesce(locator->>'verse', ''),
  coalesce(locator->>'saintSlug', ''),
  coalesce(locator->>'workSlug', ''),
  coalesce(locator->>'sectionN', ''),
  coalesce(locator->>'paragraphIdx', ''),
  coalesce(locator->>'ruleId', ''),
  coalesce(locator->>'prayerId', '')
);

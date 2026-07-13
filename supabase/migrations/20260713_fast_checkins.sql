-- Fasting tracker check-ins (Beta 2.0).
--
-- The fasting tracker lets a reader mark each day against the calendar's fast
-- rule: kept, partial, or broken, and watch a running streak. Like the rest of
-- the reading layer it is LOCAL-FIRST (lib/fasting/tracker.ts holds the marks
-- on the device, so the tracker and its streak work for everyone, free, and
-- offline). This table is the cross-device SYNC TARGET, written only when the
-- reader holds Purify Plus, exactly as bookmarks and florilegia sync
-- (see 20260612_florilegia.sql).
--
-- One row per (user, day). The id is the client-generated UUID so a local mark
-- and its server row share identity and the two-way merge stays idempotent.
-- RLS scopes every row to its owner (self-select, self-write). No service role
-- needed: a reader only ever touches their own marks. Apply after the base
-- schema.

create table if not exists public.fast_checkins (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  -- The calendar day being marked, in the reader's own local date.
  day date not null,
  -- How the day was kept against its fast rule.
  status text not null check (status in ('kept', 'partial', 'broken')),
  -- Snapshot of the day's fast kind (the FastKind at mark time) so a history
  -- read keeps its meaning even if a later rule computation shifts.
  fast_kind text,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One mark per day; a re-mark updates the same row (client upsert on conflict).
  unique (user_id, day)
);

create index if not exists fast_checkins_user_day_idx
  on public.fast_checkins (user_id, day desc);

alter table public.fast_checkins enable row level security;

drop policy if exists "fast_checkins_self_all" on public.fast_checkins;
create policy "fast_checkins_self_all" on public.fast_checkins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

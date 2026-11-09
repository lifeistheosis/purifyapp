-- What a reader keeps that no table holds yet, carried between their devices
-- (1.9, PLAN row 29, s5-09 of docs/1.9-build/ideas.json: "Sync everything
-- kept: plan progress, Remember progress, place, palette, settings").
--
-- NOT APPLIED. NOT A MIGRATION YET. This file waits for the owner's sign-off
-- (AGENTS.md: a production schema change is his to approve before it runs).
-- It lives in docs/, not supabase/migrations/, so that no merge to main can
-- run it by itself. On his word it is either run by hand in the SQL editor,
-- or copied into supabase/migrations/<YYYYMMDDHHMMSS>_user_kept.sql (a version
-- later than every file there) so the integration runs it.
--
-- Until it exists the app keeps all of this on the device, as it does today:
-- lib/sync/kept.ts asks for the table first and does nothing while it is
-- absent (the journal's sync, lib/sync/journal.ts, waited the same way).
--
-- Written to run twice: every statement is "if not exists" or is preceded by
-- its own "drop ... if exists".
--
-- One row per reader per slice, the slice a small JSON value the app merges
-- item by item, the newer copy of each winning:
--   plans     each reading plan's progress, and when a plan was started over
--   remember  Remember the verse's schedule, verse by verse (not the verses'
--             words, which the app fetches again)
--   places    where the reader is in the Bible and in each long work
--   reading   the reading palette, size, typeface, line spacing and Focus
-- The slice names are checked here so the table cannot grow into a store for
-- anything else without a new migration.
--
-- Reads and writes are the reader's own, proven by RLS: a row is theirs by
-- user_id = auth.uid(), and nobody else's can be read or written. Carrying a
-- library across devices is the Purify Plus layer; the app asks canSync()
-- before it reads or writes here (lib/entitlements/client.ts), as every sync
-- module does.
--
-- Check after running (200 with an empty list means it is there):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/user_kept?select=slice&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.user_kept (
  user_id uuid not null references auth.users on delete cascade,
  slice text not null check (slice in ('plans', 'remember', 'places', 'reading')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slice),
  -- A slice is a few kilobytes; this is a ceiling against a runaway client,
  -- not a size anyone reaches by reading.
  constraint user_kept_value_size check (octet_length(value::text) <= 262144)
);

alter table public.user_kept enable row level security;

drop policy if exists "user_kept_own_select" on public.user_kept;
create policy "user_kept_own_select" on public.user_kept
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_kept_own_insert" on public.user_kept;
create policy "user_kept_own_insert" on public.user_kept
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_kept_own_update" on public.user_kept;
create policy "user_kept_own_update" on public.user_kept
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_kept_own_delete" on public.user_kept;
create policy "user_kept_own_delete" on public.user_kept
  for delete
  using (auth.uid() = user_id);

-- Signed-in readers only; the anonymous key reads and writes nothing here.
revoke all on public.user_kept from anon;
grant select, insert, update, delete on public.user_kept to authenticated;

-- Shared journal pages (1.9, docs/1.9-build/JOURNAL.md, step 3: "sharing a
-- page, one at a time, three a month").
--
-- Signed off by the owner on 2026-11-09 (docs/1.9-build/BRAINSTORM.md, his
-- answer to the sheet's 4: "Four is fine, but I didn't put the SQL yet"), so
-- it moved here from docs/1.9-build/sql/shared-pages.sql, word for word below
-- this header, for the integration to run on the merge to main. The copy in
-- docs stays as the SQL to paste into the editor, should he run it by hand
-- first or the integration's check be red (AGENTS.md).
--
-- Written to run twice: every statement is "if not exists" or is preceded by
-- its own "drop ... if exists", so a run by hand before the merge does not
-- stop the integration's run after it.
--
-- What it holds, and why:
--   shared_pages        a COPY of a page at the moment it was shared (the
--                       page itself stays on the reader's device and in
--                       journal_entries); its owner; when; whether withdrawn,
--                       hidden by moderation, or reviewed (a page is kept out
--                       of search engines until reviewed_at is set).
--   shared_page_reports one report per reader per page, for the moderation
--                       queue.
-- Reads are proven by RLS (an owner sees their own shares). Nobody writes
-- from the app: the share, the withdrawal and the report go through
-- app/api/journal/share (zod, a rate limit, the service role), which is also
-- where the month's count is made, never trusted from the app. The public
-- page at /p/<id> reads with the service role, and only a share that is
-- neither withdrawn nor hidden.
--
-- Check after running (200 with an empty list means it is there):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/shared_pages?select=id&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.shared_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  -- The journal entry it was shared from (the device's own id); not a foreign
  -- key, since journal_entries may not hold it yet (sync is Plus).
  record_id uuid,
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  hidden_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists shared_pages_owner_created_idx
  on public.shared_pages (owner_id, created_at desc);

alter table public.shared_pages enable row level security;

drop policy if exists "shared_pages_owner_select" on public.shared_pages;
create policy "shared_pages_owner_select" on public.shared_pages
  for select
  using (auth.uid() = owner_id);

-- No insert, update or delete policy, on purpose: writes are the service
-- role's alone, through the API route.

create table if not exists public.shared_page_reports (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.shared_pages on delete cascade,
  reporter_id uuid not null references auth.users on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create unique index if not exists shared_page_reports_once
  on public.shared_page_reports (page_id, reporter_id);

alter table public.shared_page_reports enable row level security;

-- No policies at all: the reports are read and written by the service role.

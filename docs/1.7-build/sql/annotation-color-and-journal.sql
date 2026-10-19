-- Purify 1.7: a highlight's colour on the server, and the journal's own entries.
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). It is deliberately NOT in supabase/migrations: a file
-- there is applied to production when it is merged to main, and this one
-- waits for your word. Safe to run more than once (every statement is "if not
-- exists" or drops what it recreates). Nothing is deleted.
--
-- What it does:
--   1. annotations.color: the colour a reader chose for a highlight. Until it
--      exists every highlight comes back yellow on a second device. The app
--      asks for the column first (a probe) and sends or reads a colour only
--      once it answers, so the app works the same before this runs.
--   2. journal_entries: what a reader writes in the journal itself (a
--      reflection, a prayer, an answer to a reading plan's question), with
--      what it was written about. Until it exists the entries are kept on the
--      device; once it exists they sync, and a removal travels as deleted_at.
--      Each reader sees and writes only their own rows (RLS).
--
-- What the app sends (lib/sync/journal.ts, toRow):
--   id uuid (made on the device), kind, body, prompt {key?, text} or null,
--   source {type: "verse" | "chapter" | "plan-day", ...} or null,
--   created_at, updated_at, deleted_at.
--
-- Read back after running (one line each is enough):
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'annotations' and column_name = 'color';
--   select count(*) from public.journal_entries;
--
-- Or from outside, with the anon key (200 means the column or table is there,
-- 400/42703 that the column is not, 404/PGRST205 that the table is not):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/annotations?select=color&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/journal_entries?select=id&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

-- 1. Highlight colours reach the server -------------------------------------
alter table public.annotations add column if not exists color text;
alter table public.annotations drop constraint if exists annotations_color_check;
alter table public.annotations add constraint annotations_color_check
  check (color is null or color ~ '^[a-z]{1,16}$');

-- 2. The journal's own entries ----------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('reflection', 'prayer', 'question')),
  body text not null default '' check (char_length(body) <= 20000),
  prompt jsonb check (prompt is null or (jsonb_typeof(prompt) = 'object' and char_length(prompt::text) <= 1000)),
  source jsonb check (source is null or (jsonb_typeof(source) = 'object' and char_length(source::text) <= 1000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists journal_entries_user_updated_idx
  on public.journal_entries (user_id, updated_at desc);

alter table public.journal_entries enable row level security;

drop policy if exists "journal_entries_self_all" on public.journal_entries;
create policy "journal_entries_self_all" on public.journal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

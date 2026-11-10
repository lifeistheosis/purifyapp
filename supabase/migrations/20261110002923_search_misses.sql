-- What readers search for and do not find (1.9, admin item A11; Edgar's yes
-- of 2026-11-09 with the three limits, the arbiter's item 31; the privacy
-- line approved the same day: "When a search finds nothing, we keep the words
-- you searched, never who you are, for 90 days, so we can add what readers
-- are looking for. Anything that looks like an email address or a phone
-- number is removed before it is kept.").
--
-- SIGNED OFF: his yes to items 57 and 65 of 2026-11-10 ("all recs": all of
-- 1.9's database changes go live with the release, the arbiter's reading).
-- A migration from that day, moved here from docs/1.9-build/sql/: the 1.9
-- merge runs it (the Supabase Preview check), and if that check is red,
-- his backup is to paste this file by hand (docs/1.9-build/OWNER-STEPS.md,
-- R3). Never edit it once it has reached main: write a new file.
--
-- Written to run twice: every statement is "if not exists" or is preceded by
-- its own "drop ... if exists".
--
-- WHY. Search runs on the reader's own device, over the library the app
-- carries, so a search that finds nothing has never reached anyone. "Let the
-- counts choose the content" (BRAINSTORM.md) has had no count for the plainest
-- signal there is: a reader asking for something Purify does not have.
--
-- The three limits, as he approved them: never who searched (no account, no
-- device, no address: a row is the words, the day, the language and the kind
-- of device); kept 90 days (the maintenance heartbeat deletes older rows,
-- lib/ops/maintenance.ts); and anything that looks like an email address or
-- a phone number is dropped before it is kept, on the device and again on the
-- server (lib/search/missWords.ts). The day, not the time, for the same
-- reason the lock counts keep only the day.
--
-- Who can do what: nobody through the API keys. RLS is on with no policy, so
-- only the service role reads or writes: the search route writes, the admin
-- reads.
--
-- Check after running (200 with an empty list means it is there):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/search_misses?select=id&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.search_misses (
  id bigint generated always as identity primary key,
  day date not null default current_date,
  -- The words, lower-cased and trimmed, 2 to 80 characters.
  words text not null check (char_length(words) between 2 and 80),
  -- The app's language when the search was made: "en", "pt-BR".
  locale text check (locale is null or char_length(locale) <= 12),
  platform text check (platform is null or platform in ('web', 'android', 'ios', 'desktop'))
);

create index if not exists search_misses_day_idx on public.search_misses (day desc);

alter table public.search_misses enable row level security;

-- No policy of any kind, on purpose: service role only.

comment on table public.search_misses is
  'Searches that found nothing (A11): the words, the day, the language and the kind of device; never who searched. Kept 90 days. Service role only.';

-- Errors readers hit, in one list (1.9, admin item A10; Edgar's yes of
-- 2026-11-09, the arbiter's item 30; the privacy line approved the same day:
-- "When something fails, the app reports the page, the app version and the
-- kind of device, never who you are.").
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
-- WHY. This repository has twice shipped a fault that only production showed
-- (CLAUDE.md: "prod-only 500s"), and the admin's Services page can say only
-- whether the services answer and whether the last deploy built. Nothing
-- says what failed for a reader, or how often. Two sources fill this table:
-- the website's own server, when a page or a route throws (instrumentation's
-- onRequestError), and the apps and the website's pages, when something
-- fails on a reader's screen (their reports go through a rate-limited route).
--
-- What a row holds, and what it never holds: the page's path (never its
-- query string, which can carry an address or a token), what failed, an
-- error's message cut to 300 characters with anything that looks like an
-- email address or a long number removed, the app version, the kind of
-- device, and a status code for a failed request. Never an account, an IP
-- address, a cookie or a header. Rows older than 14 days are deleted by the
-- maintenance heartbeat (lib/ops/maintenance.ts).
--
-- Who can do what: nobody through the API keys. RLS is on with no policy, so
-- only the service role reads or writes.
--
-- Check after running (200 with an empty list means it is there):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/app_errors?select=id&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- server: a page or route threw on the website's server; screen: something
  -- failed on a reader's screen; request: a call the app made came back failed.
  source text not null check (source in ('server', 'screen', 'request')),
  -- The path, never the query string.
  page text check (page is null or char_length(page) <= 300),
  message text check (message is null or char_length(message) <= 300),
  -- A route's own name for itself (app/api/x/route), when the server knows it.
  route text check (route is null or char_length(route) <= 200),
  status integer check (status is null or (status >= 100 and status <= 599)),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  platform text check (platform is null or platform in ('web', 'android', 'ios', 'desktop'))
);

create index if not exists app_errors_at_idx on public.app_errors (at desc);

alter table public.app_errors enable row level security;

-- No policy of any kind, on purpose: service role only.

comment on table public.app_errors is
  'Errors readers hit (A10): the page, what failed, the app version and the kind of device; never the reader. Kept 14 days. Service role only.';

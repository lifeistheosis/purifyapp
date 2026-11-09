-- Take a chant recording down in one tap (1.9, admin item A7; Edgar's yes of
-- 2026-11-09, "add that to the admin panel"; the arbiter's item 29).
--
-- NOT APPLIED. NOT A MIGRATION YET. This file waits for the owner's sign-off
-- (AGENTS.md: a production schema change is his to approve before it runs).
-- It lives in docs/, not supabase/migrations/, so that no merge to main can
-- run it by itself. On his word it is either run by hand in the SQL editor,
-- or copied into supabase/migrations/<YYYYMMDDHHMMSS>_chant_pulls.sql (a
-- version later than every file there) so the integration runs it.
--
-- Written to run twice: every statement is "if not exists" or is preceded by
-- its own "drop ... if exists".
--
-- WHY. Every installed app asks the website which chant recordings may play
-- (public/audio/chants/live.json, lib/chants/live.ts), and fails closed: a
-- recording the list does not name does not play, and a saved copy is taken
-- off the phone. Today the list is a file, so taking a recording down means a
-- change to the code and a push of the website, which is the owner's to make
-- and can wait hours. With this table the admin's switch takes it down in
-- minutes: the website serves the file's list less every recording switched
-- off here, to the apps already installed, at the address they already ask.
--
-- One row per recording that has been switched, by its "<slug>/<variant id>"
-- (lib/chants/media.ts, variantRef). `pulled` says where the switch stands;
-- turning a recording back on keeps the row, so who took it down, when and
-- why stay on record.
--
-- Who can do what: nobody through the API keys. RLS is on with no policy, so
-- only the service role reads or writes: the admin's route writes, and the
-- route that serves the live list reads.
--
-- Check after running (200 with an empty list means it is there; a client key
-- sees no rows, by design):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/chant_pulls?select=ref&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.chant_pulls (
  -- "<slug>/<variant id>", as live.json names a recording.
  ref text primary key check (ref ~ '^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*$'),
  -- True while the recording is down; false once it is switched back on.
  pulled boolean not null default true,
  -- Why, in his words: a rights holder's request, a fault in the recording.
  reason text check (reason is null or char_length(reason) <= 500),
  -- The admin who last moved the switch, by email.
  changed_by text check (changed_by is null or char_length(changed_by) <= 320),
  pulled_at timestamptz,
  restored_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.chant_pulls enable row level security;

-- No policy of any kind, on purpose: service role only.

comment on table public.chant_pulls is
  'Chant recordings switched off from the admin (A7). The website serves live.json less every row with pulled = true. Service role only.';

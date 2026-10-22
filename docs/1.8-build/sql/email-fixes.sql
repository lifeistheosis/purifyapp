-- Purify 1.8 email fixes (the audit of 2026-10-22).
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). Deliberately NOT in supabase/migrations: a file there
-- is applied to production on merge, and this waits for your word. Safe to run
-- more than once. Nothing is deleted.
--
-- 1. email_suppressions: the "do not send" list. Resend reports each bounce
--    and spam complaint to /api/email/resend-webhook, which writes here, and
--    every send checks here first (lib/email/suppression.ts). A hard bounce or
--    three soft ones stop all mail to the address; a complaint stops list
--    mail. Until this runs, every send goes as before.
-- 2. email_webhook_events: the id of each Resend delivery already handled, so
--    a retry cannot count one bounce twice. Until this runs the webhook
--    answers 500 and Resend keeps retrying for a day, losing nothing.
-- 3. email_preferences.monthly_note: the monthly note gets its own switch,
--    apart from the Sunday calendar. Everyone who had "What is new in the
--    library" on keeps both. Until this runs the monthly note follows the
--    weekly switch, as it did.
--
-- Both tables: written and read only by the website's server (RLS on, no
-- policies).
--
-- Read back after running:
--   select count(*) from public.email_suppressions;
--   select count(*) filter (where monthly_note) from public.email_preferences;

create table if not exists public.email_suppressions (email text primary key, hard boolean not null default false, complained boolean not null default false, soft_bounces integer not null default 0, last_event text, last_detail text, last_event_at timestamptz, created_at timestamptz not null default now());

alter table public.email_suppressions enable row level security;

create table if not exists public.email_webhook_events (id text primary key, type text not null, received_at timestamptz not null default now());

alter table public.email_webhook_events enable row level security;

alter table public.email_preferences add column if not exists monthly_note boolean;

update public.email_preferences set monthly_note = product_updates where monthly_note is null;

alter table public.email_preferences alter column monthly_note set default false;

alter table public.email_preferences alter column monthly_note set not null;

-- Rollback, if it comes to that (sends go as before):
--   drop table if exists public.email_suppressions;
--   drop table if exists public.email_webhook_events;
--   alter table public.email_preferences drop column if exists monthly_note;

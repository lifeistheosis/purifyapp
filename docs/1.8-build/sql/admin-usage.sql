-- Purify 1.8 admin silent patch: the admin's own usage log.
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). It is deliberately NOT in supabase/migrations: a file
-- there is applied to production when it is merged to main, and this one
-- waits for your word. Safe to run more than once. Nothing is deleted.
--
-- What it does: one table that records how the admin is used, by admin
-- accounts only: which view was open and for how long, which buttons were
-- pressed (their words, with numbers blanked and anything with an @ dropped),
-- and where the next move went. Readers are never written here. Written and
-- read only by the website's server (the service role) through
-- /api/admin/usage; the readout is Admin > Audit log > Your use.
--
-- Until it runs, the admin works as before, the log is simply not kept, and
-- Your use says the table is missing.
--
-- The shape of each value is checked by the route (zod in lib/admin/usage.ts)
-- before anything is written, so the table carries no checks of its own: the
-- first version's regex checks failed to paste into the SQL editor
-- (2026-10-20, "syntax error at or near )").
--
-- Read back after running:
--   select kind, tab, count(*) from public.admin_usage group by 1, 2 order by 3 desc;
-- (rows appear a few seconds after the admin is opened).

create table if not exists public.admin_usage (
  id bigint generated always as identity primary key,
  "at" timestamptz not null default now(),
  actor_email text,
  kind text not null,
  tab text not null,
  ms integer,
  from_tab text,
  label text
);

create index if not exists admin_usage_at_idx on public.admin_usage ("at" desc);

alter table public.admin_usage enable row level security;

comment on table public.admin_usage is
  'How the admin is used, by admin accounts only: views opened and for how long, buttons pressed, next view. Service role only (no policies).';

-- Rollback, if it comes to that (the admin keeps working, the log stops):
--   drop table if exists public.admin_usage;

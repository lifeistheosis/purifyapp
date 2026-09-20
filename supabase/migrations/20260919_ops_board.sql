-- 20260919_ops_board.sql
--
-- NOT SIGNED OFF UNTIL THE OWNER RUNS IT. Merging this to main runs it on
-- production (AGENTS.md, "Merging a migration to main runs DDL against prod").
--
-- Two tables, for the two things the admin panel could not do:
--
-- 1. email_jobs: a bulk email that takes more than one day.
--
--    Resend's plan sends 100 emails a day for the whole account. The terms
--    notice is owed to 2,083 accounts, so it reached 165 of them on
--    2026-09-15 and stopped, because finishing meant pressing Send again
--    every morning and nobody did. A job is that send, remembered: who it is
--    for, who goes first, how many a day, and where it got to. The hourly
--    heartbeat sends the next share (lib/email/jobs.ts).
--
--    NO SECOND LOCK. Every copy still goes through email_sends under the same
--    "<mailing>:<user>" key, so a job cannot send anyone a mailing twice, and
--    the people who already have it are skipped.
--
--    mailing_key is UNIQUE: one job per mailing, so two presses of Send are
--    one send.
--
-- 2. admin_tasks: the week's board.
--
--    The rhythm (board message Monday, note by Thursday, update before the
--    week ends, calendar email Sunday, the monthly note and the EIKON Box
--    drop) lived nowhere but memory. lib/admin/planner.ts generates those
--    deadlines and lib/admin/plannerEvidence.ts ticks the ones the data shows
--    are already done, so this table only holds what a person added or
--    marked: rule_key is the generated task it stands for, null for a task
--    somebody wrote themselves.
--
-- Both are service-role only: RLS on, no policies, like push_broadcasts and
-- email_sends. Nothing client-side reads either one.

create table if not exists public.email_jobs (
  id              uuid primary key default gen_random_uuid(),
  -- 'terms_changed', or a campaign kind ('weekly', 'monthly', 'release', …).
  kind            text not null,
  -- The dedupe-key prefix every copy is sent under: 'terms:2026-08-14'.
  mailing_key     text not null unique,
  subject         text not null,
  audience        text not null
                  check (audience in ('all_accounts', 'shop_offers', 'product_updates')),
  audience_order  text not null default 'oldest'
                  check (audience_order in ('oldest', 'newest', 'active', 'least_emailed')),
  -- A ceiling of the owner's own, under the day's budget. Null = the budget.
  per_day         integer check (per_day is null or per_day > 0),
  -- What to render: the terms version, or the campaign's body as it was read.
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'running'
                  check (status in ('running', 'paused', 'done', 'expired', 'cancelled')),
  -- Counted from email_sends after each run, never incremented blindly.
  total           integer not null default 0,
  sent            integer not null default 0,
  failed          integer not null default 0,
  -- The last run's one line for the panel: held, resting, quota stopped.
  note            text,
  -- A list email is about its own week. Past this, the job ends unsent.
  expires_at      timestamptz,
  last_run_at     timestamptz,
  finished_at     timestamptz,
  created_by_email text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists email_jobs_status_idx on public.email_jobs (status, created_at);

alter table public.email_jobs enable row level security;

comment on table public.email_jobs is
  'One bulk email that sends a share a day until everyone owed it has it. email_sends is still the per-reader lock.';

create table if not exists public.admin_tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 160),
  notes           text,
  category        text not null default 'task'
                  check (category in ('update', 'notes', 'board', 'email', 'shop', 'eikon', 'task')),
  due_on          date not null,
  status          text not null default 'open'
                  check (status in ('open', 'done', 'skipped')),
  -- The generated deadline this row stands for ('update:2026-W38'), unique so
  -- one deadline cannot be marked twice. Null for a task somebody added.
  rule_key        text unique,
  auto            boolean not null default false,
  done_at         timestamptz,
  created_by_email text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists admin_tasks_due_idx on public.admin_tasks (due_on, status);

alter table public.admin_tasks enable row level security;

comment on table public.admin_tasks is
  'The admin week board. Generated deadlines live in code; this holds what a person added or marked.';

-- v7.0 — admin panel v2
-- Three tables backing the new operator-grade panels:
--   1. expense_lines      — source of truth for the /support expense list,
--                           so admin edits propagate without a redeploy.
--   2. donations_monthly  — daily snapshot of BMC monthly raised + supporter
--                           count, so the Sustainability tab can chart real
--                           month-over-month history instead of synthesizing it.
--   3. locale_status      — ship/stage gate per locale, so an admin can
--                           promote a locale from draft → staged → shipped
--                           after the editorial team has hand-checked it.
--
-- All three are RLS-locked with no policies, i.e. service-role only —
-- same posture as analytics_sessions and saint_overrides.

-- 1. expense_lines -----------------------------------------------------------
create table if not exists public.expense_lines (
  id            bigserial primary key,
  label         text not null,
  monthly_cents integer not null check (monthly_cents >= 0),
  note          text,
  category      text,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now(),
  updated_by_email text
);

alter table public.expense_lines enable row level security;

create index if not exists expense_lines_active_sort_idx
  on public.expense_lines (active, sort_order);

-- 2. donations_monthly -------------------------------------------------------
-- One row per (snapshot_date, year_month). Daily cron upserts the current
-- month's row with the latest BMC totals; older months freeze when the
-- calendar rolls over (no row mutation after month end).
create table if not exists public.donations_monthly (
  year_month       text primary key,             -- 'YYYY-MM'
  total_cents      integer not null default 0,
  supporters       integer not null default 0,
  goal_cents       integer not null default 37500,
  snapshot_date    date not null default current_date,
  updated_at       timestamptz not null default now()
);

alter table public.donations_monthly enable row level security;

create index if not exists donations_monthly_date_idx
  on public.donations_monthly (snapshot_date desc);

-- 3. locale_status -----------------------------------------------------------
-- status values: 'draft' | 'staged' | 'shipped'. draft = hidden from the
-- locale switcher; staged = visible only with ?preview=1; shipped = live.
create table if not exists public.locale_status (
  locale            text primary key,
  status            text not null default 'draft'
                    check (status in ('draft','staged','shipped')),
  coverage_pct      integer,                     -- last computed % vs en
  missing_keys      integer,                     -- last computed gap count
  last_reviewed_at  timestamptz,
  reviewer_email    text,
  notes             text,
  updated_at        timestamptz not null default now()
);

alter table public.locale_status enable row level security;

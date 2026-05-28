-- v6.5 — admin panel extensions
-- Two small additions that back the new tabbed admin dashboard's write actions:
--   1. saint_overrides — admin-controlled overrides for saint registry flags
--      (today: just `complete`; future: featured, hidden, etc). The saint
--      page reads this at request time and merges over the static registry.
--   2. csp_reports.dismissed_at — soft-dismiss of CSP reports from the panel
--      so they fall out of the "active" view without losing the historical row.

-- 1. Saint overrides ---------------------------------------------------------
create table if not exists public.saint_overrides (
  slug             text primary key,
  complete         boolean,                         -- nullable = "no override"
  updated_at       timestamptz not null default now(),
  updated_by_email text
);

alter table public.saint_overrides enable row level security;
-- No policies: service-role only (admin server actions).

-- 2. CSP report dismissal ----------------------------------------------------
alter table public.csp_reports
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissed_by_email text;

create index if not exists csp_reports_dismissed_idx
  on public.csp_reports (dismissed_at);

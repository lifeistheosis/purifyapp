-- v5.5 — CSP violation report sink
-- Browsers POST a JSON body to /api/csp-report when the Content-Security-Policy
-- (initially Report-Only) is violated. We persist a trimmed copy so we can
-- review what would break before enforcing the policy.

create table if not exists public.csp_reports (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  document_uri text,
  referrer text,
  blocked_uri text,
  violated_directive text,
  effective_directive text,
  source_file text,
  line_number int,
  column_number int,
  disposition text,                  -- "enforce" | "report"
  user_agent text,
  ip_hash text                       -- sha256(ip || daily_salt), never raw IP
);

create index if not exists csp_reports_received_idx on public.csp_reports (received_at);
create index if not exists csp_reports_directive_idx on public.csp_reports (violated_directive);

alter table public.csp_reports enable row level security;
-- No policies: service-role insert only; admin reads via the admin client.

-- Goals measured by the hour, and a record of what was sent about them.
--
-- ── Why not insight_goals.period = 'hourly' ────────────────────────────
--
-- Because that table grades imported store reports, whose Point type is
-- `day: YYYY-MM-DD`: one measurement per day. Adding 'hourly' to its period
-- check would create goals that can never be measured, which is worse than
-- not offering them.
--
-- These measure live analytics instead, where the granularity exists:
-- analytics_pageviews.ts and analytics_sessions.first_seen are timestamps, and
-- 20260521_analytics.sql already indexes both.
--
-- ── The second table is what stops the phone buzzing twelve times ──────
--
-- The evaluator runs on a cron. Whatever interval that cron uses, an hour
-- contains several runs, and every one of them would find the same goal in the
-- same hit state. hourly_goal_notifications records (goal, hour, kind) with a
-- unique index, so the second attempt to send is refused by the DATABASE
-- rather than by a check the caller can forget.
--
-- The hour key is UTC text, YYYY-MM-DDTHH, deliberately. A local key would let
-- a daylight-saving hour recur and send everything twice. Quiet hours are
-- local, because those are about somebody being asleep; the bucket is UTC,
-- because that is about identity.
--
-- ── Locking ────────────────────────────────────────────────────────────
--
-- Two new tables, both empty. Nothing existing is touched.

set lock_timeout = '3s';
set statement_timeout = '30s';

create table if not exists public.hourly_goals (
  id uuid primary key default gen_random_uuid(),
  -- Which live number this watches. Text rather than an enum: this list will
  -- grow, and an enum makes each addition a migration.
  metric text not null check (
    metric in ('visitors', 'pageviews', 'signups', 'revenue_cents')
  ),
  -- Cents for revenue_cents, a plain count for the others.
  target integer not null check (target >= 0),
  paused boolean not null default false,
  notify_on_hit boolean not null default true,
  notify_on_miss boolean not null default false,
  -- LOCAL hours, 0-23. Equal values mean never quiet, which is the safer
  -- default to guess: always-quiet would disable notifications invisibly.
  quiet_from_hour smallint not null default 22 check (quiet_from_hour between 0 and 23),
  quiet_to_hour smallint not null default 7 check (quiet_to_hour between 0 and 23),
  -- IANA zone the quiet window is read in. The owner's clock, not the server's.
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One goal per metric. Two targets for the same number is a contradiction the
-- evaluator would have to pick a winner for, so the database refuses it.
create unique index if not exists hourly_goals_metric_unique
  on public.hourly_goals (metric);

alter table public.hourly_goals enable row level security;
-- No policies: service-role only, like every other admin-owned table here.

create table if not exists public.hourly_goal_notifications (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.hourly_goals (id) on delete cascade,
  -- 'YYYY-MM-DDTHH', UTC. See the header for why this is not local.
  hour_key text not null,
  kind text not null check (kind in ('hit', 'miss')),
  -- What the metric read when this was sent, so the record is auditable
  -- without recomputing a window that has since moved.
  value integer not null,
  target integer not null,
  sent_at timestamptz not null default now()
);

-- THE DEDUPE, enforced here rather than in the caller. A cron that runs every
-- five minutes finds the same hit twelve times in an hour; this is what makes
-- the second through twelfth attempts fail instead of buzzing a phone.
create unique index if not exists hourly_goal_notifications_once
  on public.hourly_goal_notifications (goal_id, hour_key, kind);

create index if not exists hourly_goal_notifications_recent_idx
  on public.hourly_goal_notifications (sent_at desc);

alter table public.hourly_goal_notifications enable row level security;
-- No policies: service-role only.

-- Unified admin activity log: who did what, when.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites,
-- not because it is proposed for merge.
--
-- WHY. Actor is recorded ad hoc today under five different column names across
-- ten tables: created_by_email, updated_by_email, dismissed_by_email,
-- removed_by_email, handled_by_email, admin_email, imported_by. Of the 48
-- mutating operations under app/api/admin, 13 record an actor. The rest record
-- nothing, and the tables carrying the highest-consequence writes have no
-- actor column at all: entitlements, shop_refund_requests, shop_orders,
-- shop_stores, shop_sellers, shop_products.
--
-- So "who granted that comp" has no answer, and a comp grant is destructive:
-- it replaces plus_until rather than extending it, overwrites plus_source, and
-- nulls pro_until. Comp a paying subscriber and the record that they ever paid
-- is gone, by nobody.
--
-- ADDITIVE. Every existing per-table actor column stays exactly where it is.
-- This migrates no data and backfills nothing.
--
-- SERVICE ROLE ONLY, no policies, exactly like public.push_broadcasts. The
-- admin routes write it through createAdminClient(); nothing else touches it.
--
-- lib/admin/activityLog.ts is ALREADY WIRED and already shipping. It writes one
-- structured line to stdout first and unconditionally, then attempts this
-- insert and swallows 42P01 (undefined_table). So the call sites work today
-- with the table absent, and light up the moment this applies, with no further
-- edits. That is deliberate: AGENTS.md records that migrations have sat on main
-- unapplied for over a week, and a logger that assumed the table would have
-- turned that window into a 500 on every comp grant.
--
-- Safe to re-run.

create table if not exists public.admin_activity_log (
  id          uuid primary key default gen_random_uuid(),
  -- Nullable on purpose. Every existing call site writes `adminUser.email ?? null`,
  -- and a row with an unknown actor is worth more than a failed insert.
  actor_email text,
  action      text not null,
  entity_type text not null,
  -- text, not uuid: a comp grant's entity is an email as often as a user id.
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_activity_log_created_idx
  on public.admin_activity_log (created_at desc);

create index if not exists admin_activity_log_actor_idx
  on public.admin_activity_log (actor_email, created_at desc);

create index if not exists admin_activity_log_entity_idx
  on public.admin_activity_log (entity_type, entity_id, created_at desc);

alter table public.admin_activity_log enable row level security;
-- No policies. Only the service role reads or writes.

-- ── After applying ────────────────────────────────────────────────────────
--
-- Confirm it landed (AGENTS.md's probe recipe):
--
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/admin_activity_log?select=id&limit=1" \
--     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
--
-- 200 means it exists. Before this migration the same probe returns 404.
--
-- Then perform one comp grant and confirm a row appears with the correct
-- actor_email and a `previous` object in detail. Until then the same record is
-- in the Render deploy log, greppable as `"tag":"admin-activity"`.
--
-- The admin-facing view ships with this migration and not before: AGENTS.md
-- forbids patch notes claiming a feature gated on an unapplied migration, and
-- an Activity tab rendering an empty list is exactly that claim.
--
-- Rollback:
--   drop table if exists public.admin_activity_log;

-- The weekly board message at the top of /whats-new, editable from /admin.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites.
--
-- WHY. The board message is the first thing a reader meets on /whats-new and
-- it lived in data/changelog/board.json, so writing one meant a commit and a
-- deploy. The release notes moved to patch_notes on 2026-09-04; this is the
-- same move for the message above them.
--
-- SHIPS DARK. lib/whatsNew/boardLive.ts falls back to data/changelog/board.json
-- when this table is absent, empty, or unreadable, and the admin tab says so
-- and offers "Adopt all". The native app never reads this table: the static
-- export bundles board.json, kept current with `node scripts/patch-notes.mjs pull`.
--
-- SERVICE ROLE ONLY, no policies, exactly like public.patch_notes.
--
-- Safe to re-run.

create table if not exists public.board_messages (
  id               uuid primary key default gen_random_uuid(),
  -- ISO week label, "2026-W31". Human bookkeeping, unique so a week is written once.
  week             text not null unique,
  -- What sorts. Newest published by date is the one readers see.
  date             date not null,
  eyebrow          text not null default 'This week at Purify',
  headline         text not null default '',
  -- text[] as jsonb, one string per paragraph.
  body             jsonb not null default '[]'::jsonb,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  published_at     timestamptz,
  updated_at       timestamptz not null default now(),
  updated_by_email text,
  created_at       timestamptz not null default now()
);

create index if not exists board_messages_date_idx
  on public.board_messages (status, date desc);

alter table public.board_messages enable row level security;
-- No policies. Only the service role reads or writes.

-- ── After applying ────────────────────────────────────────────────────────
--
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/board_messages?select=id&limit=1" \
--     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
--
-- 200 means it exists. Then open /admin?tab=patch-notes and press Adopt all
-- on the Board message card.
--
-- Rollback:
--   drop table if exists public.board_messages;

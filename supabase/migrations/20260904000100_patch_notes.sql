-- Patch notes as data: what /whats-new publishes, editable from /admin, plus a
-- review queue for edits the agent proposes.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites,
-- not because it is proposed for merge.
--
-- WHY. Release notes were a 1,600 line literal inside app/(app)/whats-new/
-- page.tsx, duplicated by hand in data/changelog/patches.json, and held
-- together by a test that regex-scraped the TSX. Correcting one word meant a
-- commit and a Render deploy, there was no draft state, and there was no way
-- for the agent to hand the owner a proposed edit for review rather than
-- writing it straight into source.
--
-- SHIPS DARK. lib/whatsNew/notes.ts falls back to data/changelog/entries.json
-- when this table is absent, empty, or unreadable, and the admin tab says so
-- and offers "Adopt all" to seed it, exactly like expense_lines. The native
-- app never reads this table at all: the static export bundles entries.json,
-- kept current with `node scripts/patch-notes.mjs pull`.
--
-- SERVICE ROLE ONLY, no policies, exactly like public.expense_lines. The admin
-- routes write it through createAdminClient(); the propose script writes
-- patch_note_revisions with the service role from .env.local; nothing else
-- touches either table.
--
-- Safe to re-run.

create table if not exists public.patch_notes (
  id               uuid primary key default gen_random_uuid(),
  -- "1.3", "Beta 2.4". Unique, because the page keys releases by it.
  version          text not null unique,
  -- The short headline beside the version: "A way back, and a saint who was only a name".
  kind             text not null default '',
  -- A real date. The page shows "August 28, 2026"; lib/whatsNew/dates.ts converts.
  date             date not null,
  -- The one-line title for the hero chip. Not rendered yet; patches.json still
  -- feeds the chip. Carried so the chip can move here later without a schema change.
  title            text not null default '',
  blurb            text not null default '',
  -- text[] as jsonb, one string per bullet, in display order.
  items            jsonb not null default '[]'::jsonb,
  -- draft = admin only; published = on /whats-new.
  status           text not null default 'draft' check (status in ('draft', 'published')),
  published_at     timestamptz,
  updated_at       timestamptz not null default now(),
  updated_by_email text,
  created_at       timestamptz not null default now()
);

create index if not exists patch_notes_date_idx
  on public.patch_notes (date desc, version desc);

alter table public.patch_notes enable row level security;
-- No policies. Only the service role reads or writes.

-- One proposed change to one note. The owner reviews it in /admin the way a
-- Word reviewer handles a tracked change: accept, deny, or edit it and send it
-- back with a note.
create table if not exists public.patch_note_revisions (
  id                uuid primary key default gen_random_uuid(),
  -- Null proposes a NEW note; set, it proposes a change to that one. Cascade:
  -- a deleted note takes its pending revisions with it.
  note_id           uuid references public.patch_notes(id) on delete cascade,
  version           text not null,
  -- 'claude' for the agent, otherwise the admin email that proposed it.
  author            text not null,
  -- The sentence the queue shows: "Claude changed the blurb and item 3".
  summary           text not null,
  -- Snapshot of the live note at proposal time, so the diff is against what
  -- was actually there and not against whatever the row says now. Null for a
  -- new note.
  before            jsonb,
  -- The full proposed entry: {version, kind, date, title, blurb, items}.
  after             jsonb not null,
  -- pending   = waiting on the owner
  -- accepted  = applied to patch_notes
  -- denied    = closed, with review_note saying why
  -- suggested = the owner rewrote `after` and wrote review_note; waiting on the agent
  status            text not null default 'pending'
                    check (status in ('pending', 'accepted', 'denied', 'suggested')),
  review_note       text,
  reviewed_by_email text,
  reviewed_at       timestamptz,
  -- The revision this one answers, when the agent replies to a suggestion.
  parent_id         uuid references public.patch_note_revisions(id),
  created_at        timestamptz not null default now()
);

create index if not exists patch_note_revisions_status_idx
  on public.patch_note_revisions (status, created_at desc);

create index if not exists patch_note_revisions_note_idx
  on public.patch_note_revisions (note_id, created_at desc);

alter table public.patch_note_revisions enable row level security;
-- No policies. Only the service role reads or writes.

-- ── After applying ────────────────────────────────────────────────────────
--
-- Confirm it landed (AGENTS.md's probe recipe):
--
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/patch_notes?select=id&limit=1" \
--     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
--
-- 200 means it exists. Before this migration the same probe returns 404.
--
-- Then open /admin?tab=patch-notes, press "Adopt all", and confirm /whats-new
-- stops saying it is reading the committed file.
--
-- Rollback:
--   drop table if exists public.patch_note_revisions;
--   drop table if exists public.patch_notes;

-- Blocking a reader in Community conversations.
--
-- App Review guideline 1.2 asks four things of any app carrying
-- user-generated content: filter objectionable material, let readers report
-- it, let them BLOCK abusive users, and publish a contact. Conversations had
-- three of the four. Reporting went in on 20260801_community_safety.sql;
-- this is the one that was missing, and its absence is a common and specific
-- rejection for apps with a social surface.
--
-- Shape follows community_reports: the reader owns their own rows and can
-- read them back, every write goes through the API under the service role
-- (zod, rate limit, identity resolved server-side), and nothing here hands a
-- client another reader's auth uuid.

create table if not exists public.community_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the blocked reader's display name at block time, so the
  -- "people you've blocked" list renders without the client ever seeing
  -- blocked_id. Same reasoning as community_posts.author_name, and the same
  -- reasoning that keeps user_id out of the public feed columns.
  blocked_name text not null default 'Reader',
  created_at timestamptz not null default now(),
  -- Blocking yourself would silently empty your own feed.
  constraint community_blocks_not_self check (blocker_id <> blocked_id)
);

-- Makes a second tap a no-op rather than a duplicate row, exactly as the
-- reports table does.
create unique index if not exists community_blocks_pair_idx
  on public.community_blocks (blocker_id, blocked_id);

create index if not exists community_blocks_blocker_idx
  on public.community_blocks (blocker_id, created_at desc);

alter table public.community_blocks enable row level security;

-- Self-select only. A reader may see who they blocked; nobody may see who
-- blocked them, which is what keeps blocking from becoming a signal that
-- provokes retaliation.
create policy "community_blocks_self_read" on public.community_blocks
  for select using (auth.uid() = blocker_id);

-- No insert/update/delete policies on purpose: writes are service-role only,
-- through app/api/community/block. The table is otherwise closed.

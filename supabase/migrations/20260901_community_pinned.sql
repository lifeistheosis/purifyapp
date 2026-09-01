-- Pinned announcements on the community feed.
--
-- The owner writes a post like anyone else and then pins it, so an
-- announcement is an ordinary post with a flag rather than a second content
-- type with its own table, its own editor and its own moderation path. That
-- matters more here than it usually would: community_posts already carries
-- reports, blocks, reactions, replies and a soft-remove status, and every one
-- of those would have to be reimplemented for a parallel announcements table
-- or would silently not apply to announcements at all.
--
-- ── A TIMESTAMP, NOT A BOOLEAN ─────────────────────────────────────────
--
-- pinned_at rather than pinned. Two reasons, and the second is the one that
-- decides it:
--
--   1. It orders. Pin three things and the newest sits on top without a
--      separate position column that would need reshuffling on every change.
--   2. It records WHEN. "How long has that been at the top of the feed" is a
--      question somebody asks, and a boolean cannot answer it.
--
-- pinned_by is the deciding admin's email, for the same reason
-- user_verification.decided_by is: this is a write that puts one person's
-- words above everyone else's on a shared surface, so it needs an owner.
--
-- IT MUST NEVER REACH A READER. app/api/community/posts/route.ts projects an
-- explicit column list and resolves this to a plain boolean; the email stays
-- server-side. Adding it to POST_COLS would publish an internal address to
-- every anonymous reader of the feed.
--
-- ── Locking ────────────────────────────────────────────────────────────
--
-- Two nullable columns with no default, which is catalog-only on Postgres 11+:
-- no table rewrite, no scan. The index is partial and covers the handful of
-- pinned rows rather than the whole table. lock_timeout bounds the wait rather
-- than the work. Plain SET rather than SET LOCAL, for the reason
-- 20260822_shop_orders_paid_at.sql gives.

set lock_timeout = '3s';
set statement_timeout = '30s';

alter table public.community_posts
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by text;

-- Partial: only pinned rows are ever ordered by this, and there will be a
-- handful of them against a table of every post ever written.
create index if not exists community_posts_pinned_idx
  on public.community_posts (pinned_at desc)
  where pinned_at is not null;

comment on column public.community_posts.pinned_at is
  'When this post was pinned to the top of the feed. Null means not pinned. Ordering key: newest pin sits highest.';
comment on column public.community_posts.pinned_by is
  'Email of the admin who pinned it. SERVER-SIDE ONLY: never projected into the public feed.';

-- No RLS change. Pinning is written only by the service role behind
-- getAdminUser(), exactly like every other moderation action on this table,
-- and the existing read policies already expose visible posts. A reader
-- gaining the ability to set pinned_at would let anyone put their own post
-- above everyone else's, which is the one thing this must prevent.

-- Community: a reader edits and deletes their own posts and replies.
--
-- NOT SIGNED. It waits for the owner's word, relayed by the arbiter, on this
-- file's statements shown to him whole, and it does not merge without it.
-- Merging this to main runs it on production (AGENTS.md). Until it runs, the
-- website steps back: an edit answers "Editing isn't available yet", and a
-- delete deletes outright, as before 1.9 (lib/community/ownWords.ts). If he
-- would rather it waited, this file comes off the branch with the feature.
--
-- WHY A MIGRATION. A reader's ask, sent by him on 2026-11-13 (build 95, note
-- 10, docs/1.9-build/notes/build-95.md): "We should have the ability to
-- remove or edit our comments under replies and posts". An edited post or
-- reply says so, which needs the time it was edited. A deleted one that
-- others had answered stays as a placeholder so their answers still read,
-- which needs a state of its own.
--
-- WHAT IT CHANGES, AND NOTHING ELSE.
--
--   1. community_posts.edited_at and community_post_replies.edited_at: when
--      the writer last changed the words, or null. The app's quiet "edited"
--      reads it.
--   2. 'withdrawn' joins the states a post and a reply may be in: deleted by
--      its writer after others had answered. The website clears its words,
--      its writer's name and picture, and the reports, word-filter holds and
--      notices that carried its words; the row stays only so the answers can
--      be read, shown as "Removed by its author". Every other state is kept
--      as it is ('campaign' is 20261110135543_campaign_threads.sql's).
--   3. A withdrawn post has no words, so the two checks that ask a discussion
--      for words and a shared line for its quotation hold for every post
--      except a withdrawn one, and for every other post exactly as before.
--
-- NO POLICY CHANGES. Both tables' read policies show only 'visible' rows
-- (20260811000100_community_group_threads.sql), so a withdrawn row cannot be
-- read with the public key at all, and nothing a reader writes reaches
-- either table except through the website's routes with the service role.
-- No column is given to the public key: like every column added to these
-- tables since August, edited_at is read only by those routes.
--
-- WHAT IS KEPT. Nothing new. The Privacy Policy says posts and replies "are
-- kept until you delete them" and a report "is deleted with the post": a
-- delete takes the words at once, and the words an edit replaces are not
-- kept anywhere.
--
-- SAFE TO RUN TWICE. add column if not exists; each check is dropped if it
-- exists, then added again; a comment replaces itself.
--
-- TO CHECK AFTER (read only):
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public' and column_name = 'edited_at'
--      and table_name in ('community_posts', 'community_post_replies');
--   -- two rows
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conname in ('community_posts_status_check', 'community_post_replies_status_check',
--                      'community_posts_discussion_body', 'community_posts_share_quote');
--   -- four rows, each naming 'withdrawn'

alter table public.community_posts add column if not exists edited_at timestamptz;
alter table public.community_post_replies add column if not exists edited_at timestamptz;

comment on column public.community_posts.edited_at is
  'When its writer last changed the words, or null (build 95 note 10). The app shows "edited".';
comment on column public.community_post_replies.edited_at is
  'When its writer last changed the words, or null (build 95 note 10). The app shows "edited".';

-- The states. The checks were last written by name, posts by
-- 20261110135543_campaign_threads.sql and replies by
-- 20261005000000_community_three.sql.
alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts add constraint community_posts_status_check
  check (status in ('visible', 'removed', 'held', 'campaign', 'withdrawn'));
alter table public.community_post_replies drop constraint if exists community_post_replies_status_check;
alter table public.community_post_replies add constraint community_post_replies_status_check
  check (status in ('visible', 'removed', 'held', 'withdrawn'));

-- The words a post must have, for every post that is not withdrawn. Named in
-- the table's first file (20260722000000_community.sql) and unchanged since.
alter table public.community_posts drop constraint if exists community_posts_discussion_body;
alter table public.community_posts add constraint community_posts_discussion_body check (
  status = 'withdrawn' or kind <> 'discussion' or (body is not null and length(body) > 0)
);
alter table public.community_posts drop constraint if exists community_posts_share_quote;
alter table public.community_posts add constraint community_posts_share_quote check (
  status = 'withdrawn' or kind = 'discussion' or (quote_text is not null and quote_source is not null)
);

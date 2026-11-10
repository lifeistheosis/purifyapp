-- The notice that tells a reader why something they posted was removed.
--
-- NOT SIGNED, AND NOT IN supabase/migrations/. It stays here until his plain
-- yes (the arbiter's word, 2026-11-10); then it moves into the folder under a
-- new fourteen-digit name and the merge runs it. Second reader: the Updates
-- chat.
--
-- WHY. His yes of 2026-11-10 to the Terms for what readers post: "When we
-- remove something you posted, we tell you why, unless the law or someone's
-- safety stops us." Europe's Digital Services Act asks a service that removes
-- what someone posted to give them its reason. A moderator's removal (a post,
-- a reply, a prayer campaign, a comment, a picture, a shared journal page)
-- now writes a notice to the reader who posted it, with a reason from a list,
-- into the inbox they already have (community_notifications). The reasons
-- and the notice's words were approved with the Terms.
--
-- WHAT IT CHANGES, in plain words: the inbox table can hold one more kind of
-- notice, "removed", and two short fields for it: what was removed, and why,
-- each from a fixed list. Nothing is deleted or rewritten; no reader can write
-- a notice (the table still has no insert policy: only the website's server
-- writes, as for every notice); a reader reads only their own, as before.
--
-- WHAT A READER SEES: in their notices, "We removed your post: advertising or
-- spam. If you think we got it wrong, write to support@purifyapp.net."
-- Before this runs, the website tries to write the notice, is refused, and
-- carries on: the removal itself never waits on it.
--
-- WRITTEN TO RUN TWICE: each column is "if not exists", and each check is
-- dropped before it is made again. The kinds list is the full list the
-- folder holds today (20261005000000_community_three.sql) plus "removed"; a
-- later file that adds a kind must carry this list too. The kinds check is
-- made "not valid": it holds every notice written from now on, and does not
-- re-read the ones already there, so an old row can never make this file
-- fail and stop every file after it.
--
-- Check after running, read only (expected: 2 and true):
--   select count(*) from information_schema.columns
--    where table_schema = 'public' and table_name = 'community_notifications'
--      and column_name in ('target_kind', 'reason');
--   select pg_get_constraintdef(oid) like '%removed%'
--     from pg_constraint where conname = 'community_notifications_kind_check';

alter table public.community_notifications add column if not exists target_kind text;
alter table public.community_notifications add column if not exists reason text;

alter table public.community_notifications drop constraint if exists community_notifications_target_kind_check;
alter table public.community_notifications add constraint community_notifications_target_kind_check check (
  target_kind is null or target_kind in ('post', 'reply', 'campaign', 'picture', 'comment', 'shared_page')
);

alter table public.community_notifications drop constraint if exists community_notifications_reason_check;
alter table public.community_notifications add constraint community_notifications_reason_check check (
  reason is null or reason in ('unkind', 'consent', 'private', 'not_theirs', 'spam', 'unlawful', 'rules')
);

alter table public.community_notifications drop constraint if exists community_notifications_kind_check;
alter table public.community_notifications add constraint community_notifications_kind_check check (
  kind in ('reply', 'mention', 'follow', 'name_day', 'prayed', 'gift', 'question', 'answer', 'approved', 'removed')
) not valid;

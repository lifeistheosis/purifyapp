-- Prayer campaigns, reworked, file two: a campaign's updates and comments, as
-- its own thread in Community (1.9; docs/1.9-build/notes/campaigns-fable.md,
-- sections 5.3 and 11).
--
-- SIGNED, AND NOT APPLIED BY HAND. Signed off by the owner on 2026-11-10 at
-- about 13:50 UTC, his words: "All recommendations. Start." They answered
-- the arbiter's list of 10:41 UTC, whose item 7 was this file ("R0b yes 2"),
-- on its summary in plain words after a second chat had read the SQL (he
-- does not read SQL: docs/1.9-build/HANDOFF.md; his words are in
-- docs/1.9-build/BRAINSTORM.md).
-- The integration runs this file on the merge of 1.9 to main, after file one
-- (20261110084116_campaigns_rework.sql). Probed on production that day at
-- 13:55 UTC with the site's public key: not run (the column "campaign_id"
-- was not on community_posts). If he runs it by hand before the merge, the
-- merge's run changes nothing: see "Written to run twice" below. The copy to
-- paste into the editor is docs/1.9-build/sql/campaigns-2-threads.sql, and
-- lib/campaigns/__tests__/closed.test.ts holds the two together, word for
-- word.
--
-- Written to run twice: every statement is "if not exists", or drops what it
-- is about to make. Run twice on 2026-11-10 on a scratch PostgreSQL 16
-- standing on every migration in the folder and on file one: no error either
-- time, and the schema after the second run is the schema after the first.
--
-- It makes no new table. What it changes, in plain words:
--   community_posts          A post may be a campaign's thread: it carries the
--                            campaign's id and says so in its state
--                            ('campaign'), one thread a campaign. Deleting a
--                            campaign deletes its thread and every comment
--                            under it.
--   community_post_replies   A reply may be marked as an update: the
--                            campaign's creator writing to those who pray.
--
-- Why a state of its own, and not only the id. Every read of Community asks
-- for a post that is 'visible': the feed, a post's page, its replies, a
-- profile, the weekly letter, and the tables' own row policies, where a reply
-- can be read only when its post is visible. A thread that says 'campaign' is
-- therefore in none of them as they already stand. Checked on the scratch
-- database with the public key's role: it reads no thread and not one comment
-- under one, and still reads Talk together as before. Only the campaign's own
-- routes read a thread, behind the campaigns switch and the campaign's own
-- audience.
--
-- What a reader can reach once it has run: nothing new, while CAMPAIGNS_OPENING
-- in lib/campaigns/flags.ts says closed. Nothing in Community changes: no
-- post and no reply that exists today is touched, and the new column on
-- replies is false on every one of them.
--
-- The new columns are not readable with the public key, and that is wanted
-- (20260802000100_revoke_public_user_id.sql left these two tables on column
-- grants): both are read by routes, with the service role.
--
-- Check after running, in the SQL editor. Read only, one row. Expected: 1, 1,
-- true, 0.
--   select
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'community_posts'
--         and column_name = 'campaign_id') as thread_column,
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'community_post_replies'
--         and column_name = 'campaign_update') as update_column,
--     (select pg_get_constraintdef(oid) like '%campaign%' from pg_constraint
--       where conname = 'community_posts_status_check') as thread_state_allowed,
--     (select count(*) from public.community_posts where status = 'campaign') as threads_so_far;

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. A campaign's thread is a post with a state of its own ------------------
--
-- Every read of Community asks for status = 'visible': the feed, a post's
-- page, its replies, a profile, the weekly letter, and the row policies of
-- both tables (20260811000100_community_group_threads.sql), where a reply is
-- readable only when its post is visible. A thread that says 'campaign' is
-- therefore in none of them, by the reads as they already stand, and neither
-- it nor one comment under it can be read with the public key. Only the
-- campaign's own routes read it (app/api/campaigns), behind the campaigns
-- switch and the campaign's own audience.
--
-- The check was last written by 20261005000000_community_three.sql, by name.
alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts add constraint community_posts_status_check
  check (status in ('visible', 'removed', 'held', 'campaign'));

alter table public.community_posts
  add column if not exists campaign_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_posts_campaign_id_fkey') then
    alter table public.community_posts add constraint community_posts_campaign_id_fkey
      foreign key (campaign_id) references public.prayer_campaigns (id) on delete cascade;
  end if;
  -- A thread is a campaign's, and nothing else is: the two say the same thing.
  if not exists (select 1 from pg_constraint where conname = 'community_posts_campaign_thread') then
    alter table public.community_posts add constraint community_posts_campaign_thread
      check ((status = 'campaign') = (campaign_id is not null));
  end if;
end $$;

-- One thread a campaign.
create unique index if not exists community_posts_campaign_thread_idx
  on public.community_posts (campaign_id)
  where campaign_id is not null;

-- 2. An update is a reply of the creator's, marked as one --------------------
alter table public.community_post_replies
  add column if not exists campaign_update boolean not null default false;

-- The creator's updates, newest first.
create index if not exists community_post_replies_updates_idx
  on public.community_post_replies (post_id, created_at desc)
  where campaign_update;

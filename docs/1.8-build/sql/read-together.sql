-- Purify 1.8: Read together (the owner's yes of 2026-10-24). A circle of
-- readers (a parish, a household, friends) follows a reading path: each can
-- see who has read each day's part, and each day has its own conversation.
--
-- One group system, not two (his word the same night: Read together builds
-- circles that 1.9's prayer campaigns reuse). The parish groups built for
-- campaigns in August (20260811000000_campaign_groups_and_streaks.sql) become
-- the circles: their members, invite codes, membership check
-- (public.is_campaign_group_member) and private threads
-- (community_posts.group_id) are reused as they are. A circle follows a
-- campaign, a reading path, or both.
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). Not in supabase/migrations: a file there is applied
-- to production when it is merged to main. Safe to run more than once.
-- Nothing is deleted, and nothing changes for anyone until 1.8 ships the
-- screens that use it (the campaign routes are withdrawn and answer 404).
--
-- What it does:
--   1. A group no longer needs a campaign. It says what it follows (a
--      campaign, a path, or both) and what kind of circle it is.
--   2. group_path_days: who in a circle has read which day of its path.
--      Readable by the circle's own members only; written by the website.
--   3. community_posts.path_day: a post in a circle's thread can belong to
--      one day of its path, so each day has its own conversation.
--
-- NOT YET RUN.

alter table public.prayer_campaign_groups alter column campaign_id drop not null;
alter table public.prayer_campaign_groups add column if not exists kind text not null default 'parish';
alter table public.prayer_campaign_groups add column if not exists path_id text;
alter table public.prayer_campaign_groups add column if not exists path_started_on date;

do $$ begin
  alter table public.prayer_campaign_groups
    add constraint prayer_campaign_groups_kind_check check (kind in ('parish', 'household', 'friends'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.prayer_campaign_groups
    add constraint prayer_campaign_groups_path_check check (path_id is null or path_id ~ '^[a-z0-9-]{1,40}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.prayer_campaign_groups
    add constraint prayer_campaign_groups_follows_check check (campaign_id is not null or path_id is not null);
exception when duplicate_object then null; end $$;

create table if not exists public.group_path_days (
  group_id uuid not null references public.prayer_campaign_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day smallint not null check (day between 1 and 60),
  read_at timestamptz not null default now(),
  primary key (group_id, user_id, day)
);

create index if not exists group_path_days_group_day_idx on public.group_path_days (group_id, day);

alter table public.group_path_days enable row level security;

-- Members of the circle read its rows; nobody writes but the website (no
-- insert, update or delete policy: the service role writes).
drop policy if exists "group_path_days_members_read" on public.group_path_days;
create policy "group_path_days_members_read" on public.group_path_days
  for select using (public.is_campaign_group_member(group_id));

alter table public.community_posts add column if not exists path_day smallint;

do $$ begin
  alter table public.community_posts
    add constraint community_posts_path_day_check
    check (path_day is null or (group_id is not null and path_day between 1 and 60));
exception when duplicate_object then null; end $$;

create index if not exists community_posts_group_day_idx
  on public.community_posts (group_id, path_day, created_at)
  where path_day is not null;

-- Read back after running (each should answer):
--   select kind, path_id, path_started_on from public.prayer_campaign_groups limit 1;
--   select count(*) from public.group_path_days;
--   select path_day from public.community_posts limit 1;
--
-- Rollback (only before 1.8 ships):
--   alter table public.community_posts drop constraint if exists community_posts_path_day_check;
--   alter table public.community_posts drop column if exists path_day;
--   drop table if exists public.group_path_days;
--   alter table public.prayer_campaign_groups drop constraint if exists prayer_campaign_groups_follows_check;
--   alter table public.prayer_campaign_groups drop constraint if exists prayer_campaign_groups_path_check;
--   alter table public.prayer_campaign_groups drop constraint if exists prayer_campaign_groups_kind_check;
--   alter table public.prayer_campaign_groups drop column if exists path_started_on;
--   alter table public.prayer_campaign_groups drop column if exists path_id;
--   alter table public.prayer_campaign_groups drop column if exists kind;
--   (campaign_id stays nullable; set it back with `alter column campaign_id set not null`
--    only if no row has an empty one.)

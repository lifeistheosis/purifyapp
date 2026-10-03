-- Community safety: a moderation path, a report queue, and an atomic counter.
--
-- WHY NOW. Conversations is enabled in the Android build
-- (.github/workflows/android-apk.yml) and dark on the website, so it is live
-- to Play Store users today. The 2026-07-27 audit asked for a moderation
-- path BEFORE the flag flipped; the flag flipped on native first. As it
-- stands there is no report button, no soft-remove on replies, and community
-- posts appear nowhere in the admin console, so the only way to act on abuse
-- is to open the SQL editor and hard-delete, which destroys the record.
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

-- ---------------------------------------------------------------------
-- 1. Replies get a status, like posts already have.
--
-- Without this a reply can only be deleted. Deleting is the wrong tool for
-- moderation: it destroys the evidence of what was said, which is exactly
-- what you need if the same account does it again.
-- ---------------------------------------------------------------------
alter table public.community_post_replies
  add column if not exists status text not null default 'visible';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'community_post_replies_status_check'
  ) then
    alter table public.community_post_replies
      add constraint community_post_replies_status_check
      check (status in ('visible', 'removed'));
  end if;
end $$;

-- The old policy was `using (true)`: a removed reply would still be served.
drop policy if exists "community_replies_public_read" on public.community_post_replies;
create policy "community_replies_public_read" on public.community_post_replies
  for select using (status = 'visible');

create index if not exists community_replies_post_visible_idx
  on public.community_post_replies (post_id, created_at)
  where status = 'visible';

-- Who removed it and why. Null on a visible reply.
alter table public.community_post_replies
  add column if not exists removed_reason text
  check (removed_reason is null or char_length(removed_reason) <= 300);
alter table public.community_post_replies
  add column if not exists removed_by_email text;

-- Same audit trail on posts, which already had `status` but no record of the
-- decision behind it.
alter table public.community_posts
  add column if not exists removed_reason text
  check (removed_reason is null or char_length(removed_reason) <= 300);
alter table public.community_posts
  add column if not exists removed_by_email text;

-- ---------------------------------------------------------------------
-- 2. Reports. Modelled on prayer_campaign_reports, which is the pattern the
-- admin console already knows how to triage.
--
-- One table for both posts and replies rather than two: the triage queue is
-- one list, and a reply report needs its parent post to be actionable.
-- Exactly one of post_id / reply_id is set.
-- ---------------------------------------------------------------------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts on delete cascade,
  reply_id uuid references public.community_post_replies on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  -- 'open' until an admin acts. Dismissing is a decision worth recording:
  -- a post reported five times and dismissed five times reads very
  -- differently from one reported once.
  status text not null default 'open'
    check (status in ('open', 'actioned', 'dismissed')),
  handled_by_email text,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint community_reports_one_target check (
    (post_id is not null and reply_id is null)
    or (post_id is null and reply_id is not null)
  )
);

create index if not exists community_reports_open_idx
  on public.community_reports (created_at desc) where status = 'open';
create index if not exists community_reports_post_idx
  on public.community_reports (post_id);
create index if not exists community_reports_reply_idx
  on public.community_reports (reply_id);

-- One report per person per target. A second tap is not a second report,
-- and without this a single upset reader can flood the queue.
create unique index if not exists community_reports_unique_post_idx
  on public.community_reports (post_id, reporter_id)
  where post_id is not null and reporter_id is not null;
create unique index if not exists community_reports_unique_reply_idx
  on public.community_reports (reply_id, reporter_id)
  where reply_id is not null and reporter_id is not null;

alter table public.community_reports enable row level security;
-- No policies: service-role only. A reader must not be able to see who
-- reported what, and the admin console reads with the service role.

-- ---------------------------------------------------------------------
-- 3. Atomic reply counter.
--
-- The API did a read-modify-write (`reply_count: (post.reply_count ?? 0) + 1`)
-- so two replies landing together lost a count. Campaigns already solved
-- this with prayer_campaign_bump_counts; Community never got the same
-- treatment. Deltas may be negative, e.g. removing a reply.
-- ---------------------------------------------------------------------
create or replace function public.community_bump_reply_count(
  p_post_id uuid,
  p_delta integer
) returns void
language sql
security definer
set search_path = public
as $$
  update public.community_posts
     set reply_count = greatest(0, reply_count + p_delta)
   where id = p_post_id;
$$;

revoke execute on function public.community_bump_reply_count(uuid, integer) from public;
revoke execute on function public.community_bump_reply_count(uuid, integer) from anon;
revoke execute on function public.community_bump_reply_count(uuid, integer) from authenticated;
grant execute on function public.community_bump_reply_count(uuid, integer) to service_role;

-- Bring existing counts in line with reality, since the old non-atomic bump
-- will have drifted.
update public.community_posts p
   set reply_count = (
     select count(*) from public.community_post_replies r
      where r.post_id = p.id and r.status = 'visible'
   );

-- ---------------------------------------------------------------------
-- Verification.
-- ---------------------------------------------------------------------
select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'community_post_replies'
   and column_name in ('status', 'removed_reason', 'removed_by_email')
 order by column_name;
-- expect three rows

select policyname, qual
  from pg_policies
 where schemaname = 'public' and tablename = 'community_post_replies';
-- expect one row whose qual references status, NOT `true`

select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'community_reports';
-- expect one row

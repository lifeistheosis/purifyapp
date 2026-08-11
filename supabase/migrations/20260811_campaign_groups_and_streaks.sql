-- Prayer campaigns: day log, streaks, and parish groups.
--
-- Three things this adds, and one it fixes.
--
-- 1. A DAY LOG. Until now a campaign day was `now - last_prayed_at >= 20h`
--    (lib/campaigns/campaigns.ts PRAY_COOLDOWN_MS), whose own comment admits
--    it is a dodge around timezone maths. Twenty hours is not a day: a reader
--    who prays at 21:00 and again at 08:00 the next morning is refused, and a
--    reader who prays at 08:00 and again at 04:00 is credited twice. Worse,
--    `prayer_days` was a bare counter, so there was no way to know WHICH days
--    were kept and therefore no way to compute a streak at all.
--    prayer_campaign_days stores one row per reader per campaign per local
--    day, keyed by the same YYYY-MM-DD the rest of the app uses
--    (lib/rhythm/dayKey.ts). The day key is computed on the CLIENT'S calendar
--    and sent up, because the server has no idea what day it is where the
--    reader is standing.
--
-- 2. GROUPS. A parish, a household, a chat of friends. A group belongs to one
--    campaign; a reader joins the global campaign and optionally one group
--    inside it. Group counters are bumped through their own RPC in the same
--    shape as prayer_campaign_bump_counts, so concurrent prayers cannot lose
--    a count.
--
-- 3. REMINDER OPT-IN, per reader per campaign, default FALSE. Nothing is ever
--    on because a campaign was joined. See CONTRIBUTING, "Reminders and
--    streaks": the reader asks for it or it does not happen.
--
-- And the fix: prayer_campaign_bump_counts shipped with the default
-- EXECUTE TO PUBLIC and no search_path, unlike every other function in this
-- directory (compare 20260612_entitlements.sql and 20260711_shop_reviews.sql,
-- which both revoke from public/anon/authenticated and grant to service_role).
-- It is not exploitable today because it is SECURITY INVOKER and
-- prayer_campaigns has no UPDATE policy, so the update matches zero rows. It
-- becomes a counter-forgery hole the moment anyone adds one, and it is a free
-- DoS surface in the meantime.

-- ── 1. The day log ────────────────────────────────────────────────────────

create table if not exists public.prayer_campaign_days (
  campaign_id uuid not null
    references public.prayer_campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The reader's own calendar day, not the server's. A date and not a
  -- timestamptz on purpose: two readers in different zones who both prayed
  -- "on the 11th" each get one row for the 11th, which is what a streak
  -- means to them.
  day_key date not null,
  prayed_at timestamptz not null default now(),
  -- Which group the reader was praying with at the time, if any. Nullable
  -- and ON DELETE SET NULL: leaving a group must not erase the days.
  group_id uuid,
  primary key (campaign_id, user_id, day_key)
);

-- Walking a reader's streak reads their days for one campaign, newest first.
create index if not exists prayer_campaign_days_user_idx
  on public.prayer_campaign_days (campaign_id, user_id, day_key desc);

-- A group's own day total.
create index if not exists prayer_campaign_days_group_idx
  on public.prayer_campaign_days (group_id, day_key desc)
  where group_id is not null;

alter table public.prayer_campaign_days enable row level security;

-- A reader may read their own days and nobody else's. Writes are service-role
-- only, through the pray route, so a client cannot manufacture a streak.
drop policy if exists "prayer_campaign_days_self_select"
  on public.prayer_campaign_days;
create policy "prayer_campaign_days_self_select"
  on public.prayer_campaign_days
  for select using (auth.uid() = user_id);

-- ── 2. Groups ─────────────────────────────────────────────────────────────

create table if not exists public.prayer_campaign_groups (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null
    references public.prayer_campaigns (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  -- Short, human-typeable, and the only way in. Groups are unlisted: there
  -- is no directory and no browse, because a parish group is not a public
  -- space and a reader should not be able to enumerate them.
  invite_code text not null unique
    check (invite_code ~ '^[A-Z0-9]{6}$'),
  member_count integer not null default 0 check (member_count >= 0),
  prayer_count integer not null default 0 check (prayer_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prayer_campaign_groups_campaign_idx
  on public.prayer_campaign_groups (campaign_id, created_at desc);

create index if not exists prayer_campaign_groups_creator_idx
  on public.prayer_campaign_groups (creator_id);

alter table public.prayer_campaign_groups enable row level security;

-- Readable by anyone who can name it. The invite code is the secret, and it
-- is never returned by a listing endpoint to a non-member. There is no
-- INSERT/UPDATE/DELETE policy: the API writes with the service role.
drop policy if exists "prayer_campaign_groups_select"
  on public.prayer_campaign_groups;
create policy "prayer_campaign_groups_select"
  on public.prayer_campaign_groups
  for select using (true);

create table if not exists public.prayer_campaign_group_members (
  group_id uuid not null
    references public.prayer_campaign_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Denormalised so a member list does not have to touch auth.users, which
  -- the anon key cannot read. Same posture as community_posts.author_name.
  member_name text not null check (char_length(member_name) between 1 and 80),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists prayer_campaign_group_members_user_idx
  on public.prayer_campaign_group_members (user_id, joined_at desc);

alter table public.prayer_campaign_group_members enable row level security;

-- A member may read the roster of a group they belong to. The EXISTS
-- subquery is what stops the roster being world-readable: without it, the
-- member list of every parish in the app would be one PostgREST call away.
drop policy if exists "prayer_campaign_group_members_select"
  on public.prayer_campaign_group_members;
create policy "prayer_campaign_group_members_select"
  on public.prayer_campaign_group_members
  for select using (
    exists (
      select 1
        from public.prayer_campaign_group_members mine
       where mine.group_id = prayer_campaign_group_members.group_id
         and mine.user_id = auth.uid()
    )
  );

-- The day log's group reference, added after the groups table exists.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
     where constraint_name = 'prayer_campaign_days_group_id_fkey'
       and table_name = 'prayer_campaign_days'
  ) then
    alter table public.prayer_campaign_days
      add constraint prayer_campaign_days_group_id_fkey
      foreign key (group_id)
      references public.prayer_campaign_groups (id) on delete set null;
  end if;
end $$;

-- ── 3. Reminder opt-in ────────────────────────────────────────────────────

-- Default false, and it stays false unless the reader asks. Joining a
-- campaign must never switch a notification on.
alter table public.prayer_campaign_prayers
  add column if not exists remind_enabled boolean not null default false;

-- The reader's chosen local hour, "HH:MM", matched by the hourly cron the
-- same way push_subscriptions.morning_time is (lib/push/schedule.ts dueKind).
alter table public.prayer_campaign_prayers
  add column if not exists remind_time text
  check (remind_time is null or remind_time ~ '^[0-2][0-9]:[0-5][0-9]$');

-- Only rows that actually want a reminder, which is the set the cron scans.
create index if not exists prayer_campaign_prayers_remind_idx
  on public.prayer_campaign_prayers (remind_enabled)
  where remind_enabled = true;

-- ── 4. Group counter RPC ──────────────────────────────────────────────────

create or replace function public.prayer_campaign_group_bump_counts(
  p_group_id uuid,
  p_members integer,
  p_prayers integer
) returns void
language sql
security invoker
set search_path = public
as $$
  update public.prayer_campaign_groups
     set member_count = greatest(0, member_count + p_members),
         prayer_count = greatest(0, prayer_count + p_prayers),
         updated_at   = now()
   where id = p_group_id;
$$;

revoke execute on function public.prayer_campaign_group_bump_counts(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.prayer_campaign_group_bump_counts(uuid, integer, integer)
  to service_role;

-- ── 5. Harden the existing counter RPC ────────────────────────────────────

-- Same body as 20260713_prayer_campaigns.sql, now with the grants and the
-- search_path every other function in this directory already carries.
create or replace function public.prayer_campaign_bump_counts(
  p_id uuid,
  p_praying integer,
  p_prayer integer
) returns void
language sql
security invoker
set search_path = public
as $$
  update public.prayer_campaigns
     set praying_count = greatest(0, praying_count + p_praying),
         prayer_count  = greatest(0, prayer_count + p_prayer),
         updated_at    = now()
   where id = p_id;
$$;

revoke execute on function public.prayer_campaign_bump_counts(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.prayer_campaign_bump_counts(uuid, integer, integer)
  to service_role;

-- ── 6. Backfill ───────────────────────────────────────────────────────────

-- Existing joiners have a prayer_days count and a last_prayed_at but no day
-- rows, so their streak would read zero on the day this lands. Seed the one
-- day we can actually prove: the day they last prayed. Everything earlier is
-- unknowable, and inventing it would put a number on screen that no record
-- supports.
insert into public.prayer_campaign_days (campaign_id, user_id, day_key, prayed_at)
select p.campaign_id, p.user_id, (p.last_prayed_at at time zone 'utc')::date, p.last_prayed_at
  from public.prayer_campaign_prayers p
 where p.last_prayed_at is not null
on conflict (campaign_id, user_id, day_key) do nothing;

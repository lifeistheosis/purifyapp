-- Prayer Campaigns: a free, community "pray for ___" board (Beta 2.0).
--
-- A member creates a campaign (for a person living or departed, or a cause),
-- others join, it lands in their daily Today, and they pray and commemorate it.
-- Heavily inspired by Hallow's prayer campaigns, kept Orthodox: intercession and
-- commemoration, not a diet of achievements.
--
-- Design, mirroring the shop tables:
--   * Campaigns are PUBLIC to read (any non-removed campaign). All writes go
--     through service-role API routes (app/api/campaigns/*) behind zod + rate
--     limits, so a client can never set a workflow column or a counter.
--   * The join/activity table is self-select only (a user reads their own rows,
--     for "my campaigns" and the profile), written by the service role.
--   * Reports are service-role only (submitted through the API, read in admin).
--   * Counters (praying_count, prayer_count) are denormalised on the campaign so
--     the list stays a straight indexed scan; the API keeps them in step.
--
-- Apply AFTER the base schema. Idempotent where practical.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------
create table if not exists public.prayer_campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  -- What the prayer is for. Kept to a small, honest set of intentions.
  intention text not null check (intention in
    ('healing', 'comfort', 'guidance', 'persecuted', 'thanksgiving', 'departed')),
  -- For the living or for the departed: sets the prayer form the app shows.
  for_whom text not null default 'living' check (for_whom in ('living', 'departed')),
  -- A first name or a cause. Privacy: first names only, never surnames or
  -- identifying detail of a third party (enforced in the API + the UI copy).
  subject_name text check (subject_name is null or char_length(subject_name) <= 80),
  -- One line of context, in the creator's words.
  note text check (note is null or char_length(note) <= 280),
  -- Denormalised counters, kept by the API (never trusted from a client).
  praying_count integer not null default 0 check (praying_count >= 0),
  prayer_count integer not null default 0 check (prayer_count >= 0),
  -- active | answered (thanksgiving) | memory_eternal (departed, closed) |
  -- removed (moderation). Only non-removed campaigns are publicly visible.
  status text not null default 'active' check (status in
    ('active', 'answered', 'memory_eternal', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prayer_campaigns_status_created_idx
  on public.prayer_campaigns (status, created_at desc);
create index if not exists prayer_campaigns_intention_idx
  on public.prayer_campaigns (intention);
create index if not exists prayer_campaigns_creator_idx
  on public.prayer_campaigns (creator_id);

alter table public.prayer_campaigns enable row level security;

-- Anyone (signed in or not) may read a campaign that has not been removed.
create policy "prayer_campaigns_public_select" on public.prayer_campaigns
  for select using (status <> 'removed');

-- No client insert/update/delete policies: every write is service-role, so the
-- API owns validation, counters, and status transitions.

-- ---------------------------------------------------------------------
-- Join / activity: who is praying a campaign, and how often.
-- ---------------------------------------------------------------------
create table if not exists public.prayer_campaign_prayers (
  campaign_id uuid not null references public.prayer_campaigns on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  -- Last time this user marked the campaign prayed (once per day is enforced in
  -- the API off this column). Null until they first pray.
  last_prayed_at timestamptz,
  -- How many distinct days this user has prayed it (their quiet activity total).
  prayer_days integer not null default 0 check (prayer_days >= 0),
  primary key (campaign_id, user_id)
);

create index if not exists prayer_campaign_prayers_user_idx
  on public.prayer_campaign_prayers (user_id, joined_at desc);

alter table public.prayer_campaign_prayers enable row level security;

-- A user may read their own join/activity rows (for "my campaigns" + profile).
create policy "prayer_campaign_prayers_self_select" on public.prayer_campaign_prayers
  for select using (auth.uid() = user_id);

-- No client writes: join / leave / prayed-today all run service-role so the
-- campaign counters stay consistent with the rows.

-- ---------------------------------------------------------------------
-- Reports: community moderation. Service-role only (submit via API, read in
-- the admin console). No policies = no client read/write.
-- ---------------------------------------------------------------------
create table if not exists public.prayer_campaign_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.prayer_campaigns on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists prayer_campaign_reports_campaign_idx
  on public.prayer_campaign_reports (campaign_id, created_at desc);

alter table public.prayer_campaign_reports enable row level security;
-- No policies: service-role only.

-- ---------------------------------------------------------------------
-- Atomic counter bumps. The API calls this (service role) after it writes the
-- join/activity row, so the campaign totals never lose an update under
-- concurrency (many people praying the same campaign at once). Deltas may be
-- negative, e.g. leaving a campaign decrements praying_count. Never below zero.
-- ---------------------------------------------------------------------
create or replace function public.prayer_campaign_bump_counts(
  p_id uuid,
  p_praying integer,
  p_prayer integer
) returns void language sql as $$
  update public.prayer_campaigns
     set praying_count = greatest(0, praying_count + p_praying),
         prayer_count  = greatest(0, prayer_count + p_prayer),
         updated_at    = now()
   where id = p_id;
$$;

-- ---------------------------------------------------------------------
-- Community, part two, 2026-10-02: the owner asked for everything on the
-- list that followed the profiles release. This is the database half.
--
-- WHAT THIS ADDS
--   profiles.parish                a parish line, written by the reader.
--   profiles.prayer_request_at     "pray for me": when it was asked, or null.
--   profiles.now_reading(_at)      the chapter a reader has open, for the
--   profiles.show_now_reading      "now reading" line they opt into.
--   profiles.profile_private,      what a reader may hide from others.
--     hide_posts, hide_joined
--   community_follows              who follows whom. Service role only: no
--                                  reader can list anyone's follows.
--   name_day_greetings             "Many years!", once per reader per year.
--   profile_prayers                "I prayed", once per reader per request.
--   profiles.calendar_reckoning    'new' or 'old', so a name day falls on the
--                                  reader's own calendar. Synced from the
--                                  device the reader uses Community on.
--   community_notifications        more kinds than a reply (mention, follow,
--                                  name day, prayed, gift), a post no longer
--                                  required, and the actor's @handle so the
--                                  inbox can open their profile.
--   user_badges                    a Clergy badge the team grants.
--   gifts.from_name,               Plus bought by one reader for another
--   gifts.stripe_session_id        through Stripe (website only), with the
--                                  checkout session as its idempotency key.
--
-- The earned badges (Psalter, the Four Gospels, Lent, first shared line) need
-- nothing here: they are read from tables that already exist.
--
-- PRIVACY. Every new table has RLS on. Follows, greetings and prayers have no
-- policy: the service role reads and writes them behind the API routes, and
-- nobody else can. Follows in particular are never listed to anyone; a
-- profile shows only whether the viewer follows them, whether they follow the
-- viewer, and who both follow. Notifications keep 20260801's two policies: a
-- reader reads, and marks read, their own rows and nobody else's.
--
-- TWO OLDER FILES NEVER REACHED PRODUCTION. Probed 2026-10-02 against
-- project avbqyvjgcrucjwevwixt with the anon key:
--   community_notifications      PGRST205, the relation is absent: the table
--                                in 20260801_community_notifications.sql was
--                                never created, so no reply has ever told
--                                anyone. A table that exists but is closed to
--                                anon answers 401 42501 instead (as
--                                community_post_replies does), so this is not
--                                a privilege reading.
--   profiles.calendar_reckoning  42703, the column is absent: the one
--                                20260527_profiles_calendar_matrix.sql adds.
-- Both are made here with the same definitions, guarded so this file runs
-- the same whether or not either older file is ever applied by hand.
--
-- Additive and idempotent: if not exists, drop then create.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. Profile fields ------------------------------------------------------

alter table public.profiles
  add column if not exists parish text,
  add column if not exists prayer_request_at timestamptz,
  add column if not exists now_reading text,
  add column if not exists now_reading_at timestamptz,
  add column if not exists show_now_reading boolean not null default false,
  add column if not exists profile_private boolean not null default false,
  add column if not exists hide_posts boolean not null default false,
  add column if not exists hide_joined boolean not null default false;

alter table public.profiles drop constraint if exists profiles_parish_length;
alter table public.profiles add constraint profiles_parish_length check (parish is null or char_length(parish) <= 80);
alter table public.profiles drop constraint if exists profiles_now_reading_format;
alter table public.profiles add constraint profiles_now_reading_format check (
  now_reading is null or now_reading ~ '^[a-z0-9-]{1,40}/[0-9]{1,3}$'
);

-- The calendar a name day is counted on. Same column, default and check as
-- 20260527_profiles_calendar_matrix.sql (never applied, see above).
alter table public.profiles add column if not exists calendar_reckoning text not null default 'new';
alter table public.profiles drop constraint if exists profiles_calendar_reckoning_check;
alter table public.profiles add constraint profiles_calendar_reckoning_check check (calendar_reckoning in ('new', 'old'));

-- 2. Follows -------------------------------------------------------------

create table if not exists public.community_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint community_follows_not_self check (follower_id <> followee_id)
);

create index if not exists community_follows_followee_idx on public.community_follows (followee_id);

alter table public.community_follows enable row level security;
-- No policy on purpose: service role only.

-- 3. Name day greetings ----------------------------------------------------

create table if not exists public.name_day_greetings (
  recipient_id uuid not null references auth.users (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  year integer not null check (year between 2026 and 2200),
  created_at timestamptz not null default now(),
  primary key (recipient_id, sender_id, year),
  constraint name_day_greetings_not_self check (recipient_id <> sender_id)
);

alter table public.name_day_greetings enable row level security;
-- No policy on purpose: service role only.

-- 4. "I prayed" ------------------------------------------------------------
--
-- Keyed by the request it answers (profiles.prayer_request_at when the tap
-- was made), so asking again starts a fresh count and the old taps stay as
-- the record of the last one.

create table if not exists public.profile_prayers (
  owner_id uuid not null references auth.users (id) on delete cascade,
  prayer_id uuid not null references auth.users (id) on delete cascade,
  request_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, prayer_id, request_at),
  constraint profile_prayers_not_self check (owner_id <> prayer_id)
);

create index if not exists profile_prayers_request_idx on public.profile_prayers (owner_id, request_at);

alter table public.profile_prayers enable row level security;
-- No policy on purpose: service role only.

-- 5. Notifications for more than replies -------------------------------------
--
-- Created here in its new shape when it is missing, which it is in
-- production (see above), and widened when it is not. The policies, indexes
-- and mark-read function are the ones 20260801 defines.

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  post_id uuid references public.community_posts (id) on delete cascade,
  reply_id uuid references public.community_post_replies (id) on delete cascade,
  -- A display string, never an identifier: the actor's user_id is not kept.
  actor_name text not null default 'Reader',
  actor_handle text,
  excerpt text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.community_notifications enable row level security;

-- A reader sees and marks read their own rows only. No insert or delete
-- policy: rows are written by the service role, so nobody can manufacture a
-- notification for somebody else.
drop policy if exists "community_notifications_own_read" on public.community_notifications;
create policy "community_notifications_own_read"
  on public.community_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "community_notifications_own_update" on public.community_notifications;
create policy "community_notifications_own_update"
  on public.community_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists community_notifications_user_idx
  on public.community_notifications (user_id, created_at desc);
create index if not exists community_notifications_unread_idx
  on public.community_notifications (user_id)
  where read_at is null;

alter table public.community_notifications alter column post_id drop not null;
alter table public.community_notifications add column if not exists actor_handle text;
alter table public.community_notifications drop constraint if exists community_notifications_kind_check;
alter table public.community_notifications add constraint community_notifications_kind_check check (
  kind in ('reply', 'mention', 'follow', 'name_day', 'prayed', 'gift')
);

-- Opening the inbox marks every unread row read in one statement. Security
-- definer with a fixed search_path, and it only ever touches the caller's
-- own rows.
create or replace function public.community_mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null;
$$;

revoke all on function public.community_mark_notifications_read() from public;
grant execute on function public.community_mark_notifications_read() to authenticated;

-- 6. The Clergy badge --------------------------------------------------------

alter table public.user_badges drop constraint if exists user_badges_badge_check;
alter table public.user_badges add constraint user_badges_badge_check check (
  badge in ('team', 'moderator', 'clergy', 'beta_tester', 'bug_hunter', 'translator', 'contributor')
);

-- 7. Plus bought as a gift ------------------------------------------------------
--
-- The Stripe webhook writes one gifts row per paid checkout session; the
-- unique index makes a redelivered event a no-op instead of a second gift.

alter table public.gifts
  add column if not exists from_name text,
  add column if not exists stripe_session_id text;

alter table public.gifts drop constraint if exists gifts_from_name_length;
alter table public.gifts add constraint gifts_from_name_length check (from_name is null or char_length(from_name) <= 80);

create unique index if not exists gifts_stripe_session_key
  on public.gifts (stripe_session_id) where stripe_session_id is not null;

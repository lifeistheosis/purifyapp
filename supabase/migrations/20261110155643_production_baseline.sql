-- The baseline: what production was given by hand, made the same way on a
-- database built from this folder alone (the test web's, first).
--
-- NOT SIGNED. Read second by the Updates chat (2026-11-10: safe for
-- production as written, with three additions for a new database, all
-- made here); waiting for the owner's yes on its summary in plain words,
-- like every migration (AGENTS.md, docs/1.9-build/OWNER-STEPS.md R0b).
-- Nothing here has been run anywhere but a scratch database.
--
-- AMENDED IN PLACE ONCE, 2026-11-10, before it had run anywhere (the test
-- project did not exist, and production skips it): the 1.4 tables taken word
-- for word from their original file, two more tables and two columns, and a
-- plain $$. From the day the test project is linked, it is never edited
-- again: a change is a new file.
--
-- WHY. Ten tables that production has were made there by hand, in the SQL
-- editor, and never entered this folder:
--
--   journal_entries        docs/1.7-build/sql/annotation-color-and-journal.sql
--   admin_usage            docs/1.8-build/sql/admin-usage.sql
--   email_suppressions     docs/1.8-build/sql/email-fixes.sql
--   email_webhook_events   docs/1.8-build/sql/email-fixes.sql
--   group_path_days        docs/1.8-build/sql/read-together.sql
--   site_settings          docs/1.8-build/sql/site-settings.sql
--   collections            1.4's supabase/migrations/20260905_collections.sql,
--   collection_progress    which left the folder in the revert of 1.4's merge
--   user_theme             (git show 27953482:supabase/migrations/20260905_collections.sql;
--                          the revert is 32544e44)
--   shop_blessing_config   1.4's 20260905_shop_simple.sql, which left the same
--                          way (git show 32544e44^:supabase/migrations/20260905_shop_simple.sql)
--
-- and those same files added columns, constraints and indexes to tables this
-- folder does make (annotations, email_preferences, profiles,
-- community_text_holds, prayer_campaign_groups, community_posts,
-- shop_settings, shop_products, shop_product_media). So a database built from
-- the folder alone, as the test web's will be, lacks all of it, and the
-- journal, the circles' days, email suppression, the store ratings, the
-- catechism's progress and the palettes would fail there. This file makes
-- them there, and the folder describes production whole for the first time.
--
-- ON PRODUCTION IT DOES NOTHING AT ALL. Its one block first counts the ten
-- tables. Production has all ten (probed 2026-11-10 with the site's public
-- key, read only: each answers 200, and the Updates chat found every column
-- matching these statements type for type), so the count is ten and the
-- block returns before its first statement. No table, column, constraint,
-- index, policy, grant, function or row is touched there. The columns the
-- files added are there too, probed the same day.
--
-- On a database with none of the ten, it makes everything below: each file's
-- own statements in its order, less the editor's session settings, and less
-- what the folder already makes (shop_simple's deleted_at and its three
-- public read policies, restated by 20260918000000_shop_growth.sql). On a
-- database with some of the ten but not all, it does nothing and says so in a
-- notice: a mixed database is not one this file can reason about, and
-- stopping with an error would stop every file after it.
--
-- Storage buckets are left out on purpose: the upload routes make each one on
-- first use with its own settings (createBucket with the service role), in
-- either database, and three of the five do not exist on production yet.
--
-- Written to run twice: the second run finds the ten tables and returns.
-- Dry runs, 2026-11-10, on a scratch PostgreSQL 16 standing on stand-ins for
-- Supabase's own schemas: see docs/1.9-build/notes/test-web.md.

do $$
declare
  present integer;
begin
  select count(*) into present
  from unnest(array[
    'public.journal_entries', 'public.admin_usage', 'public.email_suppressions',
    'public.email_webhook_events', 'public.group_path_days', 'public.site_settings',
    'public.collections', 'public.collection_progress', 'public.user_theme',
    'public.shop_blessing_config'
  ]) as t(name)
  where to_regclass(t.name) is not null;

  if present = 10 then
    raise notice 'production baseline: all ten tables are here; nothing to do';
    return;
  end if;
  if present > 0 then
    raise notice 'production baseline: % of the ten tables are here, so this database is neither new nor production; nothing done', present;
    return;
  end if;

  -- 1.4: 20260905_collections.sql, word for word -----------------------------

  create table if not exists public.collections (
    slug        text primary key,
    name        text not null,
    description text not null,
    tag         text not null,
    theme_id    text not null,
    sort_order  int not null default 0,
    updated_at  timestamptz not null default now()
  );
  alter table public.collections enable row level security;
  drop policy if exists "collections_select_all" on public.collections;
  create policy "collections_select_all" on public.collections
    for select
    using (true);

  create table if not exists public.collection_progress (
    user_id              uuid not null references auth.users (id) on delete cascade,
    slug                 text not null,
    correct_question_ids uuid[] not null default '{}',
    completed_at         timestamptz,
    updated_at           timestamptz not null default now(),
    primary key (user_id, slug)
  );
  alter table public.collection_progress enable row level security;
  drop policy if exists "collection_progress_self_all" on public.collection_progress;
  create policy "collection_progress_self_all" on public.collection_progress
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  create table if not exists public.user_theme (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    theme_id   text not null,
    updated_at timestamptz not null default now()
  );
  alter table public.user_theme enable row level security;
  drop policy if exists "user_theme_self_select" on public.user_theme;
  create policy "user_theme_self_select" on public.user_theme
    for select
    using (auth.uid() = user_id);

  -- 1.4: 20260905_shop_simple.sql, less deleted_at and the three public read
  -- policies, which 20260918000000_shop_growth.sql already restates ---------

  alter table public.shop_products
    add column if not exists blessing_available boolean not null default false;
  alter table public.shop_product_media
    add column if not exists thumb_url text;

  create table if not exists public.shop_blessing_config (
    id             int primary key default 1 check (id = 1),
    enabled        boolean not null default false,
    parish_name    text not null default '',
    copy_md        text not null default '',
    handling_cents int not null default 0 check (handling_cents >= 0),
    updated_at     timestamptz not null default now()
  );
  alter table public.shop_blessing_config enable row level security;
  drop policy if exists "shop_blessing_config_public_select" on public.shop_blessing_config;
  create policy "shop_blessing_config_public_select" on public.shop_blessing_config
    for select using (enabled);

  -- 1.7: docs/1.7-build/sql/annotation-color-and-journal.sql -----------------

  alter table public.annotations add column if not exists color text;
  alter table public.annotations drop constraint if exists annotations_color_check;
  alter table public.annotations add constraint annotations_color_check
    check (color is null or color ~ '^[a-z]{1,16}$');

  create table if not exists public.journal_entries (
    id uuid primary key,
    user_id uuid not null references auth.users on delete cascade,
    kind text not null check (kind in ('reflection', 'prayer', 'question')),
    body text not null default '' check (char_length(body) <= 20000),
    prompt jsonb check (prompt is null or (jsonb_typeof(prompt) = 'object' and char_length(prompt::text) <= 1000)),
    source jsonb check (source is null or (jsonb_typeof(source) = 'object' and char_length(source::text) <= 1000)),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
  );
  create index if not exists journal_entries_user_updated_idx
    on public.journal_entries (user_id, updated_at desc);
  alter table public.journal_entries enable row level security;
  drop policy if exists "journal_entries_self_all" on public.journal_entries;
  create policy "journal_entries_self_all" on public.journal_entries
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  -- 1.8: docs/1.8-build/sql/admin-usage.sql -----------------------------------

  create table if not exists public.admin_usage (
    id bigint generated always as identity primary key,
    "at" timestamptz not null default now(),
    actor_email text,
    kind text not null,
    tab text not null,
    ms integer,
    from_tab text,
    label text
  );
  create index if not exists admin_usage_at_idx on public.admin_usage ("at" desc);
  alter table public.admin_usage enable row level security;
  comment on table public.admin_usage is
    'How the admin is used, by admin accounts only: views opened and for how long, buttons pressed, next view. Service role only (no policies).';

  -- 1.8: docs/1.8-build/sql/email-fixes.sql -----------------------------------

  create table if not exists public.email_suppressions (email text primary key, hard boolean not null default false, complained boolean not null default false, soft_bounces integer not null default 0, last_event text, last_detail text, last_event_at timestamptz, created_at timestamptz not null default now());
  alter table public.email_suppressions enable row level security;
  create table if not exists public.email_webhook_events (id text primary key, type text not null, received_at timestamptz not null default now());
  alter table public.email_webhook_events enable row level security;
  alter table public.email_preferences add column if not exists monthly_note boolean;
  update public.email_preferences set monthly_note = product_updates where monthly_note is null;
  alter table public.email_preferences alter column monthly_note set default false;
  alter table public.email_preferences alter column monthly_note set not null;

  -- 1.8: docs/1.8-build/sql/prayer-request-intention.sql ----------------------

  alter table public.profiles add column if not exists prayer_request_intention text;
  alter table public.profiles drop constraint if exists profiles_prayer_request_intention_length;
  alter table public.profiles add constraint profiles_prayer_request_intention_length
    check (prayer_request_intention is null or char_length(prayer_request_intention) <= 120);
  comment on column public.profiles.prayer_request_intention is
    'What a reader asking for prayers asks them for, in their own words (at most 120 characters), as the word filter left it. Written by the website''s server only.';
  alter table public.community_text_holds
    add column if not exists profile_id uuid references auth.users (id) on delete cascade;
  alter table public.community_text_holds drop constraint if exists community_text_holds_one_target;
  alter table public.community_text_holds add constraint community_text_holds_one_target
    check (num_nonnulls(post_id, reply_id, profile_id) = 1);
  create unique index if not exists community_text_holds_pending_profile_reason
    on public.community_text_holds (profile_id, reason)
    where status = 'pending' and profile_id is not null;

  -- 1.8: docs/1.8-build/sql/read-together.sql ---------------------------------

  alter table public.prayer_campaign_groups alter column campaign_id drop not null;
  alter table public.prayer_campaign_groups add column if not exists kind text not null default 'parish';
  alter table public.prayer_campaign_groups add column if not exists path_id text;
  alter table public.prayer_campaign_groups add column if not exists path_started_on date;
  begin
    alter table public.prayer_campaign_groups
      add constraint prayer_campaign_groups_kind_check check (kind in ('parish', 'household', 'friends'));
  exception when duplicate_object then null;
  end;
  begin
    alter table public.prayer_campaign_groups
      add constraint prayer_campaign_groups_path_check check (path_id is null or path_id ~ '^[a-z0-9-]{1,40}$');
  exception when duplicate_object then null;
  end;
  begin
    alter table public.prayer_campaign_groups
      add constraint prayer_campaign_groups_follows_check check (campaign_id is not null or path_id is not null);
  exception when duplicate_object then null;
  end;
  create table if not exists public.group_path_days (
    group_id uuid not null references public.prayer_campaign_groups (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    day smallint not null check (day between 1 and 60),
    read_at timestamptz not null default now(),
    primary key (group_id, user_id, day)
  );
  create index if not exists group_path_days_group_day_idx on public.group_path_days (group_id, day);
  alter table public.group_path_days enable row level security;
  drop policy if exists "group_path_days_members_read" on public.group_path_days;
  create policy "group_path_days_members_read" on public.group_path_days
    for select using (public.is_campaign_group_member(group_id));
  alter table public.community_posts add column if not exists path_day smallint;
  begin
    alter table public.community_posts
      add constraint community_posts_path_day_check
      check (path_day is null or (group_id is not null and path_day between 1 and 60));
  exception when duplicate_object then null;
  end;
  create index if not exists community_posts_group_day_idx
    on public.community_posts (group_id, path_day, created_at)
    where path_day is not null;

  -- 1.8: docs/1.8-build/sql/shop-multi-buy-steps.sql --------------------------

  alter table public.shop_settings add column if not exists multi_buy_steps jsonb not null default '[]'::jsonb;

  -- 1.8: docs/1.8-build/sql/site-settings.sql ---------------------------------

  create table if not exists public.site_settings (
    key              text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
    value            jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 65536),
    updated_at       timestamptz not null default now(),
    updated_by_email text
  );
  alter table public.site_settings enable row level security;
  comment on table public.site_settings is
    'Named website settings, written from the Admin with the service role. store_ratings: the Google Play rating and count. store_reviews: the reviews the front page shows, in order.';
end
$$;

-- ---------------------------------------------------------------------
-- Community, part three, 2026-10-02: the owner asked for everything on the
-- list that followed the word filter, a verified clergy badge, and social
-- links on a profile. This is the database half.
--
-- WHAT THIS ADDS
--   Safety
--     community_posts / community_post_replies .status 'held'
--                            hidden from everyone until a moderator looks:
--                            a post the spam filter stopped, a new account's
--                            link, or one hidden by readers' reports.
--     .mod_cleared_at        a moderator kept it up, so reports no longer
--                            hide it on their own.
--     community_text_holds .reason, .detail
--                            why something waits: 'words' (the word filter,
--                            as before), 'spam', 'links', 'new_account',
--                            'reports'. One pending hold per item and reason.
--     community_filter_terms .scope 'link'
--                            a web address the team blocks (bit.ly, a scam
--                            site): a post carrying one waits for review.
--     community_mutes        quieter than a block: their posts leave your
--                            feeds, they are never told. Service role only.
--     community_mod_log      who did what in moderation, the team's console
--                            and moderators in the app alike, plus what the
--                            filters did on their own. Service role only.
--   Community
--     community_responses    Amen, Praying, Glory to God, beside the like.
--                            One of each per reader per post or reply, with
--                            the totals kept on the row by trigger, as likes
--                            are (20260826).
--     .amen_count, .praying_count, .glory_count
--     community_posts.category       'question' (Ask a Priest) or 'feast'
--                                    (the day's feast thread).
--     community_posts.chapter_ref    the Bible chapter a post is about
--                                    ("john/3"), so each chapter can show
--                                    its conversation. Filled for shared
--                                    verses by the backfill below.
--     community_posts.feast_day, .feast_slug
--                                    one thread per day, unique.
--     community_posts.clergy_reply_count
--                                    replies from verified clergy, kept by
--                                    trigger, so a question shows "answered".
--     community_notifications kinds 'question' (for clergy), 'answer'
--                                    (clergy answered you), 'approved' (your
--                                    post is up after review).
--   Clergy
--     clergy_verifications   a request and its decision: rank (bishop,
--                            priest, deacon, monastic), jurisdiction, parish,
--                            how to verify. A reader may read their own row;
--                            only the service role writes. The Clergy badge the
--                            team granted by hand (20261002) moves here as
--                            verified, and leaves user_badges.
--     .author_clergy         on posts and replies, the verified rank, so the
--                            feed can show the seal without user_id
--                            (20260802000100_revoke_public_user_id.sql), the way
--                            author_verified does (20260901).
--   Profiles
--     profiles.social_links  up to six links: a network and a username, or a
--                            web address. Built into links on the server.
--     profiles.name_color    a Plus name colour, by id.
--     profiles.banner_motion a Plus animated banner, by id.
--     profiles.hidden_badges badges a Plus reader keeps off their profile.
--     profiles.push_community
--                            community notifications on the reader's devices.
--     .author_name_color     on posts and replies, by trigger, emitted by the
--                            routes only while the author's Plus is live.
--   Email
--     email_preferences.community_digest
--                            the weekly Community email, off until a reader
--                            turns it on, like every other list.
--
-- PRIVACY. Every new table has RLS on. Mutes, responses and the log have no
-- policy at all: the service role reads and writes them behind the API
-- routes. clergy_verifications lets a reader read their own row and nothing
-- else, and nobody but the service role may write it: a self-serve insert
-- would let anyone mark themselves a priest.
--
-- OLD APPS. Installed apps read the same feed. A question or a feast thread
-- stays kind 'discussion' and only gains a category, so an app that has never
-- heard of either shows it as a discussion. Held rows are filtered out by
-- every read, old or new, because every read already asks for 'visible'.
--
-- Additive and idempotent: if not exists, drop then create, or replace. Run
-- twice, it changes nothing the second time.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. Posts and replies ---------------------------------------------------

alter table public.community_posts
  add column if not exists category text,
  add column if not exists chapter_ref text,
  add column if not exists feast_day date,
  add column if not exists feast_slug text,
  add column if not exists author_clergy text,
  add column if not exists author_name_color text,
  add column if not exists amen_count integer not null default 0,
  add column if not exists praying_count integer not null default 0,
  add column if not exists glory_count integer not null default 0,
  add column if not exists clergy_reply_count integer not null default 0,
  add column if not exists mod_cleared_at timestamptz;

alter table public.community_post_replies
  add column if not exists author_clergy text,
  add column if not exists author_name_color text,
  add column if not exists amen_count integer not null default 0,
  add column if not exists praying_count integer not null default 0,
  add column if not exists glory_count integer not null default 0,
  add column if not exists mod_cleared_at timestamptz;

-- 'held' joins 'visible' and 'removed'. The old checks were written inline
-- (20260722) and by name (20260801), so they are found by what they say
-- rather than by a name that may differ between copies of the schema.
do $$
declare
  c record;
begin
  for c in
    select con.conname, con.conrelid::regclass::text as tbl
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid in ('public.community_posts'::regclass, 'public.community_post_replies'::regclass)
       and pg_get_constraintdef(con.oid) ~ 'status'
       and pg_get_constraintdef(con.oid) ~ 'removed'
       and pg_get_constraintdef(con.oid) !~ 'held'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end
$$;

alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts add constraint community_posts_status_check
  check (status in ('visible', 'removed', 'held'));
alter table public.community_post_replies drop constraint if exists community_post_replies_status_check;
alter table public.community_post_replies add constraint community_post_replies_status_check
  check (status in ('visible', 'removed', 'held'));

alter table public.community_posts drop constraint if exists community_posts_category_check;
alter table public.community_posts add constraint community_posts_category_check
  check (category is null or category in ('question', 'feast'));
alter table public.community_posts drop constraint if exists community_posts_chapter_ref_format;
alter table public.community_posts add constraint community_posts_chapter_ref_format
  check (chapter_ref is null or chapter_ref ~ '^[a-z0-9-]{1,40}/[0-9]{1,3}$');
alter table public.community_posts drop constraint if exists community_posts_feast_slug_format;
alter table public.community_posts add constraint community_posts_feast_slug_format
  check (feast_slug is null or feast_slug ~ '^[a-z0-9-]{1,100}$');
alter table public.community_posts drop constraint if exists community_posts_author_clergy_check;
alter table public.community_posts add constraint community_posts_author_clergy_check
  check (author_clergy is null or author_clergy in ('bishop', 'priest', 'deacon', 'monastic', 'clergy'));
alter table public.community_post_replies drop constraint if exists community_post_replies_author_clergy_check;
alter table public.community_post_replies add constraint community_post_replies_author_clergy_check
  check (author_clergy is null or author_clergy in ('bishop', 'priest', 'deacon', 'monastic', 'clergy'));
alter table public.community_posts drop constraint if exists community_posts_name_color_format;
alter table public.community_posts add constraint community_posts_name_color_format
  check (author_name_color is null or author_name_color ~ '^[a-z0-9-]{1,40}$');
alter table public.community_post_replies drop constraint if exists community_post_replies_name_color_format;
alter table public.community_post_replies add constraint community_post_replies_name_color_format
  check (author_name_color is null or author_name_color ~ '^[a-z0-9-]{1,40}$');

-- One feast thread a day, however many servers race to open it.
create unique index if not exists community_posts_feast_day_key
  on public.community_posts (feast_day) where feast_day is not null;
create index if not exists community_posts_chapter_idx
  on public.community_posts (chapter_ref, created_at desc)
  where chapter_ref is not null and status = 'visible';
create index if not exists community_posts_category_idx
  on public.community_posts (category, created_at desc)
  where category is not null and status = 'visible';
-- A reader's own recent writing: the duplicate check, the posting limits and
-- the trust level all ask for it, on every post.
create index if not exists community_posts_user_created_idx
  on public.community_posts (user_id, created_at desc);
create index if not exists community_replies_user_created_idx
  on public.community_post_replies (user_id, created_at desc);

-- Shared verses already say which chapter they are from (/bible/john/3).
update public.community_posts
   set chapter_ref = substring(quote_href from '^/bible/([a-z0-9-]{1,40}/[0-9]{1,3})')
 where chapter_ref is null
   and kind = 'scripture'
   and quote_href ~ '^/bible/[a-z0-9-]{1,40}/[0-9]{1,3}';

-- 2. Amen, Praying, Glory to God -------------------------------------------

create table if not exists public.community_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  reply_id uuid references public.community_post_replies (id) on delete cascade,
  kind text not null check (kind in ('amen', 'praying', 'glory')),
  created_at timestamptz not null default now(),
  constraint community_responses_one_target check (
    (post_id is not null and reply_id is null) or (post_id is null and reply_id is not null)
  )
);

create unique index if not exists community_responses_post_unique
  on public.community_responses (user_id, post_id, kind) where post_id is not null;
create unique index if not exists community_responses_reply_unique
  on public.community_responses (user_id, reply_id, kind) where reply_id is not null;
create index if not exists community_responses_post_idx
  on public.community_responses (post_id) where post_id is not null;
create index if not exists community_responses_reply_idx
  on public.community_responses (reply_id) where reply_id is not null;

alter table public.community_responses enable row level security;
-- No policy on purpose: service role only. The totals on the row are public;
-- who said Amen to what is not.

create or replace function public.community_apply_response_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post uuid := coalesce(new.post_id, old.post_id);
  target_reply uuid := coalesce(new.reply_id, old.reply_id);
begin
  -- Recounted from the rows, never incremented, so a total cannot drift.
  if target_post is not null then
    update public.community_posts p
       set amen_count = (select count(*) from public.community_responses r where r.post_id = target_post and r.kind = 'amen'),
           praying_count = (select count(*) from public.community_responses r where r.post_id = target_post and r.kind = 'praying'),
           glory_count = (select count(*) from public.community_responses r where r.post_id = target_post and r.kind = 'glory')
     where p.id = target_post;
  end if;
  if target_reply is not null then
    update public.community_post_replies p
       set amen_count = (select count(*) from public.community_responses r where r.reply_id = target_reply and r.kind = 'amen'),
           praying_count = (select count(*) from public.community_responses r where r.reply_id = target_reply and r.kind = 'praying'),
           glory_count = (select count(*) from public.community_responses r where r.reply_id = target_reply and r.kind = 'glory')
     where p.id = target_reply;
  end if;
  return null;
end;
$$;

drop trigger if exists community_responses_count on public.community_responses;
create trigger community_responses_count
  after insert or update or delete on public.community_responses
  for each row execute function public.community_apply_response_counts();

revoke execute on function public.community_apply_response_counts() from public, anon, authenticated;

-- 3. Mutes ------------------------------------------------------------------

create table if not exists public.community_mutes (
  id uuid primary key default gen_random_uuid(),
  muter_id uuid not null references auth.users (id) on delete cascade,
  muted_id uuid not null references auth.users (id) on delete cascade,
  -- The name at the time, for the reader's own list, so it never needs an id.
  muted_name text not null default 'Reader' check (char_length(muted_name) <= 80),
  created_at timestamptz not null default now(),
  constraint community_mutes_not_self check (muter_id <> muted_id)
);

create unique index if not exists community_mutes_pair_idx
  on public.community_mutes (muter_id, muted_id);

alter table public.community_mutes enable row level security;
-- No policy on purpose: service role only. Nobody can learn who muted them.

-- 4. The moderation log ------------------------------------------------------

create table if not exists public.community_mod_log (
  id uuid primary key default gen_random_uuid(),
  -- Null for the filters acting on their own, and once an account is gone.
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null default 'Moderator' check (char_length(actor_name) <= 80),
  -- The team's address when the console acted; never shown outside it.
  actor_email text,
  action text not null check (char_length(action) between 2 and 60),
  target_kind text check (target_kind is null or target_kind in ('post', 'reply', 'profile', 'report', 'hold', 'term', 'clergy')),
  target_id uuid,
  summary text check (summary is null or char_length(summary) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists community_mod_log_created_idx
  on public.community_mod_log (created_at desc);

alter table public.community_mod_log enable row level security;
-- No policy on purpose: service role only.

-- 5. Why something waits for review -----------------------------------------

alter table public.community_text_holds
  add column if not exists reason text not null default 'words',
  add column if not exists detail text;

alter table public.community_text_holds drop constraint if exists community_text_holds_reason_check;
alter table public.community_text_holds add constraint community_text_holds_reason_check
  check (reason in ('words', 'spam', 'links', 'new_account', 'reports'));
alter table public.community_text_holds drop constraint if exists community_text_holds_detail_length;
alter table public.community_text_holds add constraint community_text_holds_detail_length
  check (detail is null or char_length(detail) <= 300);

-- One waiting hold per item and reason: the fifth report on a post joins the
-- hold the third one opened instead of adding another.
create unique index if not exists community_text_holds_pending_post_reason
  on public.community_text_holds (post_id, reason)
  where status = 'pending' and post_id is not null;
create unique index if not exists community_text_holds_pending_reply_reason
  on public.community_text_holds (reply_id, reason)
  where status = 'pending' and reply_id is not null;

-- Web addresses the team blocks, beside its words and handles.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.community_filter_terms'::regclass
       and pg_get_constraintdef(con.oid) ~ 'scope'
       and pg_get_constraintdef(con.oid) !~ 'link'
  loop
    execute format('alter table public.community_filter_terms drop constraint %I', c.conname);
  end loop;
end
$$;
alter table public.community_filter_terms drop constraint if exists community_filter_terms_scope_check;
alter table public.community_filter_terms add constraint community_filter_terms_scope_check
  check (scope in ('text', 'handle', 'link'));

-- 6. Verified clergy -----------------------------------------------------------

create table if not exists public.clergy_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'verified', 'declined')),
  -- Null on a badge carried over from 20261002, until the team names it.
  rank text check (rank is null or rank in ('bishop', 'priest', 'deacon', 'monastic')),
  jurisdiction text check (jurisdiction is null or char_length(jurisdiction) <= 80),
  parish text check (parish is null or char_length(parish) <= 80),
  -- How the team can check: a parish page, a diocese listing, a phone number.
  evidence text check (evidence is null or char_length(evidence) <= 600),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text,
  note text check (note is null or char_length(note) <= 500),
  updated_at timestamptz not null default now()
);

create index if not exists clergy_verifications_status_idx
  on public.clergy_verifications (status, requested_at);

alter table public.clergy_verifications enable row level security;

drop policy if exists "clergy_verifications_self_read" on public.clergy_verifications;
create policy "clergy_verifications_self_read" on public.clergy_verifications
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.clergy_verifications from anon, authenticated;

-- The Clergy badge granted by hand becomes a verified row, and leaves
-- user_badges, so there is one place that says who is clergy.
do $$
begin
  insert into public.clergy_verifications (user_id, status, requested_at, decided_at, decided_by, note)
  select b.user_id, 'verified', coalesce(b.granted_at, now()), coalesce(b.granted_at, now()), b.granted_by,
         'Carried over from the Clergy badge'
    from public.user_badges b
   where b.badge = 'clergy'
  on conflict (user_id) do nothing;
  delete from public.user_badges where badge = 'clergy';
end
$$;

alter table public.user_badges drop constraint if exists user_badges_badge_check;
alter table public.user_badges add constraint user_badges_badge_check check (
  badge in ('team', 'moderator', 'beta_tester', 'bug_hunter', 'translator', 'contributor')
);

-- What a post shows for its author: the rank, or 'clergy' before it is named.
create or replace function public.community_clergy_mark(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(v.rank, 'clergy')
    from public.clergy_verifications v
   where v.user_id = target and v.status = 'verified'
$$;

create or replace function public.community_apply_author_clergy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.user_id, old.user_id);
  mark text := public.community_clergy_mark(target);
begin
  update public.community_posts
     set author_clergy = mark
   where user_id = target and author_clergy is distinct from mark;
  update public.community_post_replies
     set author_clergy = mark
   where user_id = target and author_clergy is distinct from mark;
  return null;
end;
$$;

drop trigger if exists community_author_clergy_sync on public.clergy_verifications;
create trigger community_author_clergy_sync
  after insert or update or delete on public.clergy_verifications
  for each row execute function public.community_apply_author_clergy();

-- 7. Profiles ------------------------------------------------------------------

alter table public.profiles
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists name_color text,
  add column if not exists banner_motion text,
  add column if not exists hidden_badges text[] not null default '{}',
  add column if not exists push_community boolean not null default true;

alter table public.profiles drop constraint if exists profiles_social_links_shape;
alter table public.profiles add constraint profiles_social_links_shape check (
  jsonb_typeof(social_links) = 'array'
  and jsonb_array_length(social_links) <= 6
  and octet_length(social_links::text) <= 2000
);
alter table public.profiles drop constraint if exists profiles_name_color_format;
alter table public.profiles add constraint profiles_name_color_format
  check (name_color is null or name_color ~ '^[a-z0-9-]{1,40}$');
alter table public.profiles drop constraint if exists profiles_banner_motion_format;
alter table public.profiles add constraint profiles_banner_motion_format
  check (banner_motion is null or banner_motion ~ '^[a-z0-9-]{1,40}$');
alter table public.profiles drop constraint if exists profiles_hidden_badges_size;
alter table public.profiles add constraint profiles_hidden_badges_size
  check (cardinality(hidden_badges) <= 20);

-- Posts and replies carry the name colour and the clergy seal, set on insert
-- with the handle, frame and picture (20261001, 20261003)...
create or replace function public.community_set_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  own_picture text;
begin
  select p.handle, p.avatar_decoration, p.avatar_url, p.name_color
    into new.author_handle, new.author_decoration, own_picture, new.author_name_color
    from public.profiles p
   where p.id = new.user_id;
  -- The reader's own upload wins over whatever the sign-in put in metadata.
  if own_picture is not null then
    new.author_avatar := own_picture;
  end if;
  new.author_clergy := public.community_clergy_mark(new.user_id);
  return new;
end;
$$;

-- ...and follow the profile when it changes.
create or replace function public.community_apply_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.handle is distinct from old.handle
     or new.avatar_decoration is distinct from old.avatar_decoration
     or new.name_color is distinct from old.name_color then
    update public.community_posts
       set author_handle = new.handle, author_decoration = new.avatar_decoration, author_name_color = new.name_color
     where user_id = new.id
       and (author_handle is distinct from new.handle
            or author_decoration is distinct from new.avatar_decoration
            or author_name_color is distinct from new.name_color);
    update public.community_post_replies
       set author_handle = new.handle, author_decoration = new.avatar_decoration, author_name_color = new.name_color
     where user_id = new.id
       and (author_handle is distinct from new.handle
            or author_decoration is distinct from new.avatar_decoration
            or author_name_color is distinct from new.name_color);
  end if;
  -- A new picture reaches every post and reply at once, old ones included.
  if new.avatar_url is not null and new.avatar_url is distinct from old.avatar_url then
    update public.community_posts
       set author_avatar = new.avatar_url
     where user_id = new.id
       and author_avatar is distinct from new.avatar_url;
    update public.community_post_replies
       set author_avatar = new.avatar_url
     where user_id = new.id
       and author_avatar is distinct from new.avatar_url;
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_author_profile_sync on public.profiles;
create trigger profiles_author_profile_sync
  after update of handle, avatar_decoration, avatar_url, name_color on public.profiles
  for each row execute function public.community_apply_author_profile();

-- 8. Questions answered by clergy ------------------------------------------------

create or replace function public.community_apply_clergy_replies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
begin
  update public.community_posts p
     set clergy_reply_count = (
           select count(*) from public.community_post_replies r
            where r.post_id = target and r.status = 'visible' and r.author_clergy is not null)
   where p.id = target;
  return null;
end;
$$;

drop trigger if exists community_replies_clergy_count on public.community_post_replies;
create trigger community_replies_clergy_count
  after insert or delete or update of status, author_clergy on public.community_post_replies
  for each row execute function public.community_apply_clergy_replies();

revoke execute on function public.community_clergy_mark(uuid) from public, anon, authenticated;
revoke execute on function public.community_apply_author_clergy() from public, anon, authenticated;
revoke execute on function public.community_set_author_profile() from public, anon, authenticated;
revoke execute on function public.community_apply_author_profile() from public, anon, authenticated;
revoke execute on function public.community_apply_clergy_replies() from public, anon, authenticated;

-- Existing rows: the seal for clergy carried over above, and their answers.
update public.community_posts c
   set author_clergy = public.community_clergy_mark(c.user_id)
 where c.author_clergy is distinct from public.community_clergy_mark(c.user_id);
update public.community_post_replies c
   set author_clergy = public.community_clergy_mark(c.user_id)
 where c.author_clergy is distinct from public.community_clergy_mark(c.user_id);
update public.community_posts p
   set clergy_reply_count = (
         select count(*) from public.community_post_replies r
          where r.post_id = p.id and r.status = 'visible' and r.author_clergy is not null)
 where p.clergy_reply_count is distinct from (
         select count(*) from public.community_post_replies r
          where r.post_id = p.id and r.status = 'visible' and r.author_clergy is not null);

-- 9. Notifications ---------------------------------------------------------------

alter table public.community_notifications drop constraint if exists community_notifications_kind_check;
alter table public.community_notifications add constraint community_notifications_kind_check check (
  kind in ('reply', 'mention', 'follow', 'name_day', 'prayed', 'gift', 'question', 'answer', 'approved')
);

-- 10. The weekly Community email ----------------------------------------------------

alter table public.email_preferences
  add column if not exists community_digest boolean not null default false;

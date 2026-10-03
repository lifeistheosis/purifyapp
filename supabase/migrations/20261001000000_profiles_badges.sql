-- ---------------------------------------------------------------------
-- Public profiles and badges, 2026-10-01: the owner asked for profiles that
-- open from Community, a Discord-style badge system, and Plus as the way to
-- customize a profile, the way Nitro is on Discord.
--
-- WHAT THIS ADDS
--   profiles.handle      every reader's public @name, the one thing a profile
--                        link carries. Lowercase a-z 0-9 _ . (3 to 24),
--                        unique. Assigned to every existing account by the
--                        backfill below (earliest accounts first, so the
--                        oldest readers get the cleanest names) and to every
--                        new one by trigger.
--   profiles.bio, status_text, favorite_verse, banner_color
--                        what any reader may set.
--   profiles.banner_url, theme_primary, theme_accent, avatar_decoration,
--   profile_effect       what a Plus or Pro subscriber may set. The API
--                        refuses to save them without an active subscription
--                        and the public profile hides them when it lapses;
--                        nothing is deleted, as with Nitro.
--   user_badges          the badges the team grants by hand (Purify Team,
--                        Moderator, Beta Tester, Bug Hunter, Translator,
--                        Contributor). The automatic ones (Plus, Pro,
--                        Verified, Early Reader, Ambassador) are derived from
--                        tables that already exist and are never stored.
--   community_posts / community_post_replies .author_handle, author_decoration
--                        so the feed can open an author's profile and draw
--                        their avatar frame WITHOUT carrying user_id, which
--                        20260802000100_revoke_public_user_id.sql keeps out of
--                        every public read. Same denormalisation as
--                        author_verified (20260901) and the supporter mark
--                        (20260905).
--
-- PRIVACY
--   profiles stays self-select under RLS; the public profile is served by
--   GET /api/community/profile with the service role and a fixed field list
--   that never includes the auth uuid or the email. user_badges has RLS on
--   and no policy: the service role reads and writes it, nobody else.
--   The helper functions are revoked from anon and authenticated so the
--   handle generator cannot be called as an RPC to probe names.
--   A display name that is only the email's local part (what every Google
--   sign-in starts with) never seeds a handle unless the reader chose it:
--   those readers start as "reader" plus a number, so no public link carries
--   half an email address.
--
-- A NEW ACCOUNT CAN NEVER FAIL ON THIS. The handle is set AFTER the profile
-- row exists, inside an exception block that retries a few names and gives
-- up quietly; the API assigns one lazily if a row is ever left without. A
-- unique-violation inside the sign-up trigger would otherwise roll back the
-- auth.users insert itself.
--
-- Additive and idempotent: if not exists, or replace, drop then create.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. Columns ------------------------------------------------------------

alter table public.profiles
  add column if not exists handle text,
  add column if not exists handle_changed_at timestamptz,
  add column if not exists bio text,
  add column if not exists status_text text,
  add column if not exists favorite_verse text,
  add column if not exists banner_color text,
  add column if not exists banner_url text,
  add column if not exists theme_primary text,
  add column if not exists theme_accent text,
  add column if not exists avatar_decoration text,
  add column if not exists profile_effect text;

alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format check (
  handle is null
  or (handle ~ '^[a-z0-9_.]{3,24}$' and handle !~ '^[.]' and handle !~ '[.]$' and handle !~ '[.][.]')
);
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 190);
alter table public.profiles drop constraint if exists profiles_status_length;
alter table public.profiles add constraint profiles_status_length check (status_text is null or char_length(status_text) <= 60);
alter table public.profiles drop constraint if exists profiles_favorite_verse_format;
alter table public.profiles add constraint profiles_favorite_verse_format check (
  favorite_verse is null or favorite_verse ~ '^[a-z0-9-]{1,40}/[0-9]{1,3}/[0-9]{1,3}$'
);
alter table public.profiles drop constraint if exists profiles_colors_format;
alter table public.profiles add constraint profiles_colors_format check (
  (banner_color is null or banner_color ~ '^#[0-9a-f]{6}$')
  and (theme_primary is null or theme_primary ~ '^#[0-9a-f]{6}$')
  and (theme_accent is null or theme_accent ~ '^#[0-9a-f]{6}$')
);
alter table public.profiles drop constraint if exists profiles_banner_url_format;
alter table public.profiles add constraint profiles_banner_url_format check (
  banner_url is null or (char_length(banner_url) <= 500 and banner_url ~ '^https://')
);
alter table public.profiles drop constraint if exists profiles_cosmetics_format;
alter table public.profiles add constraint profiles_cosmetics_format check (
  (avatar_decoration is null or avatar_decoration ~ '^[a-z0-9-]{1,40}$')
  and (profile_effect is null or profile_effect ~ '^[a-z0-9-]{1,40}$')
);

-- Unique, and NULL-tolerant: a row briefly without a handle is allowed.
create unique index if not exists profiles_handle_key on public.profiles (handle);

-- 2. Handles -------------------------------------------------------------

-- A display name reduced to what a handle may hold. Non-Latin names (Greek,
-- Cyrillic, Georgian, Arabic) reduce to nothing and fall back to "reader";
-- every reader can choose their own afterwards.
create or replace function public.profile_handle_base(name text)
returns text
language sql
immutable
set search_path = public
as $$
  -- Cut to 18 BEFORE the final trim, so the cut can never leave a trailing dot.
  -- Names that would read as official fall back to "reader" too (the same
  -- list as lib/profile/handle.ts RESERVED_HANDLES, minus "purify", which the
  -- backfill should hand to the account actually called Purify).
  select case
           when char_length(s.b) < 3 then 'reader'
           when s.b in ('admin', 'administrator', 'api', 'community', 'eikon', 'everyone',
                        'help', 'here', 'me', 'mod', 'moderator', 'null', 'official', 'owner',
                        'plus', 'premium', 'pro', 'profile', 'purifyapp', 'purifyteam', 'reader',
                        'root', 'settings', 'staff', 'support', 'system', 'team', 'undefined',
                        'verified')
             then 'reader'
           else s.b
         end
    from (
      select trim(both '.' from left(regexp_replace(
               regexp_replace(lower(coalesce(name, '')), '[^a-z0-9_.]+', '', 'g'),
               '[.]{2,}', '.', 'g'), 18)) as b
    ) s
$$;

-- The first free handle from a base: the base itself, then base2, base3 ...,
-- then the base and a random number, so a crowd of "reader"s never loops long.
-- "reader" itself is never handed out bare: it always carries a number.
create or replace function public.profile_free_handle(base text, owner uuid)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  candidate text := case
    when base = 'reader' then 'reader' || (100000 + floor(random() * 900000))::integer::text
    else base
  end;
  n integer := 1;
begin
  while exists (
    select 1 from public.profiles where handle = candidate and id is distinct from owner
  ) loop
    n := n + 1;
    if n <= 30 and base <> 'reader' then
      candidate := left(base, 18) || n::text;
    else
      candidate := left(base, 16) || (100000 + floor(random() * 900000))::integer::text;
    end if;
  end loop;
  return candidate;
end;
$$;

-- The name a first handle is made from. A name the reader chose (the
-- display_name in their account metadata, set at sign-up or in Account)
-- always seeds it. Without one, a profile takes the email's local part as its
-- display name (handle_new_user, 20260518), which is how every Google sign-in
-- starts; a handle made from that would put half the reader's email address
-- in a public link, so it seeds nothing and the reader starts as "reader"
-- plus a number.
create or replace function public.profile_handle_seed(display_name text, chosen text, email text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
           when nullif(btrim(coalesce(chosen, '')), '') is not null then chosen
           when nullif(btrim(coalesce(display_name, '')), '') is null then null
           when nullif(lower(btrim(split_part(coalesce(email, ''), '@', 1))), '') = lower(btrim(display_name)) then null
           else display_name
         end
$$;

create or replace function public.profiles_assign_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt integer;
  seed text;
begin
  if new.handle is not null then
    return null;
  end if;
  select public.profile_handle_seed(new.display_name, u.raw_user_meta_data->>'display_name', u.email)
    into seed
    from auth.users u
   where u.id = new.id;
  for attempt in 1..4 loop
    begin
      update public.profiles
         set handle = public.profile_free_handle(public.profile_handle_base(seed), new.id)
       where id = new.id and handle is null;
      return null;
    exception when unique_violation then
      -- Another account took the same name in the same instant. Try again.
      null;
    end;
  end loop;
  -- Give up quietly: the API assigns a handle the first time it is needed.
  return null;
end;
$$;

drop trigger if exists profiles_assign_handle on public.profiles;
create trigger profiles_assign_handle
  after insert on public.profiles
  for each row execute function public.profiles_assign_handle();

-- Backfill, oldest account first.
do $$
declare
  r record;
begin
  for r in
    select p.id, public.profile_handle_seed(p.display_name, u.raw_user_meta_data->>'display_name', u.email) as seed
      from public.profiles p
      left join auth.users u on u.id = p.id
     where p.handle is null
     order by p.joined_at, p.id
  loop
    update public.profiles
       set handle = public.profile_free_handle(public.profile_handle_base(r.seed), r.id)
     where id = r.id;
  end loop;
end $$;

revoke execute on function public.profile_handle_seed(text, text, text) from public, anon, authenticated;
revoke execute on function public.profile_handle_base(text) from public, anon, authenticated;
revoke execute on function public.profile_free_handle(text, uuid) from public, anon, authenticated;
revoke execute on function public.profiles_assign_handle() from public, anon, authenticated;

-- 3. Badges the team grants ---------------------------------------------

create table if not exists public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge text not null check (
    badge in ('team', 'moderator', 'beta_tester', 'bug_hunter', 'translator', 'contributor')
  ),
  granted_at timestamptz not null default now(),
  granted_by text,
  note text check (note is null or char_length(note) <= 200),
  primary key (user_id, badge)
);

alter table public.user_badges enable row level security;
-- No policy on purpose: service role only.

-- 4. The author's handle and frame on every post and reply ----------------

alter table public.community_posts
  add column if not exists author_handle text,
  add column if not exists author_decoration text;
alter table public.community_post_replies
  add column if not exists author_handle text,
  add column if not exists author_decoration text;

comment on column public.community_posts.author_handle is
  'Denormalised from profiles.handle so the public feed can link a profile without user_id (20260802000100_revoke_public_user_id.sql).';
comment on column public.community_posts.author_decoration is
  'Denormalised from profiles.avatar_decoration. The read route emits it only while author_mark is plus or pro.';

create or replace function public.community_set_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.handle, p.avatar_decoration
    into new.author_handle, new.author_decoration
    from public.profiles p
   where p.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists community_posts_author_profile on public.community_posts;
create trigger community_posts_author_profile
  before insert on public.community_posts
  for each row execute function public.community_set_author_profile();

drop trigger if exists community_replies_author_profile on public.community_post_replies;
create trigger community_replies_author_profile
  before insert on public.community_post_replies
  for each row execute function public.community_set_author_profile();

create or replace function public.community_apply_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.handle is distinct from old.handle
     or new.avatar_decoration is distinct from old.avatar_decoration then
    update public.community_posts
       set author_handle = new.handle, author_decoration = new.avatar_decoration
     where user_id = new.id
       and (author_handle is distinct from new.handle
            or author_decoration is distinct from new.avatar_decoration);
    update public.community_post_replies
       set author_handle = new.handle, author_decoration = new.avatar_decoration
     where user_id = new.id
       and (author_handle is distinct from new.handle
            or author_decoration is distinct from new.avatar_decoration);
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_author_profile_sync on public.profiles;
create trigger profiles_author_profile_sync
  after update of handle, avatar_decoration on public.profiles
  for each row execute function public.community_apply_author_profile();

revoke execute on function public.community_set_author_profile() from public, anon, authenticated;
revoke execute on function public.community_apply_author_profile() from public, anon, authenticated;

update public.community_posts c
   set author_handle = p.handle, author_decoration = p.avatar_decoration
  from public.profiles p
 where p.id = c.user_id
   and (c.author_handle is distinct from p.handle or c.author_decoration is distinct from p.avatar_decoration);

update public.community_post_replies c
   set author_handle = p.handle, author_decoration = p.avatar_decoration
  from public.profiles p
 where p.id = c.user_id
   and (c.author_handle is distinct from p.handle or c.author_decoration is distinct from p.avatar_decoration);

-- 5. Reporting a profile ----------------------------------------------------
--
-- A profile carries words and a picture of the reader's own choosing, so it
-- can be reported like a post. One more target on community_reports, and the
-- one-target rule widened to three. The admin moderation queue lists them and
-- can clear what was reported (bio, status, banner).

alter table public.community_reports
  add column if not exists profile_id uuid references auth.users (id) on delete cascade;

alter table public.community_reports drop constraint if exists community_reports_one_target;
alter table public.community_reports add constraint community_reports_one_target check (
  (case when post_id is not null then 1 else 0 end)
  + (case when reply_id is not null then 1 else 0 end)
  + (case when profile_id is not null then 1 else 0 end) = 1
);

create index if not exists community_reports_profile_idx
  on public.community_reports (profile_id) where profile_id is not null;

-- One open report per person per profile. Unlike a post, a profile changes,
-- so once a report is handled the same reader may report it again.
create unique index if not exists community_reports_unique_profile_idx
  on public.community_reports (profile_id, reporter_id)
  where profile_id is not null and reporter_id is not null and status = 'open';

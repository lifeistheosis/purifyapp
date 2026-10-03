-- ---------------------------------------------------------------------
-- Profile pictures, 2026-10-02: a reader's own picture, the same everywhere.
--
-- THE FAULT. A reader's uploaded picture lived only in auth user metadata
-- (user_metadata.avatar_url), and Supabase rewrites that key from the
-- provider on every Google sign-in. So a reader who uploaded a picture got
-- their Google photo back the next time they signed in, while each post kept
-- whichever picture its author had when it was written. Checked live on
-- 2026-10-02: 4 of the 17 authors in the feed showed one picture on their
-- posts and another on their profile, and @purify's uploads of Aug 21 and
-- Sep 27 had each been replaced by the Google photo within days.
--
-- WHAT THIS DOES
--   profiles.avatar_url   the reader's own uploaded picture, written only by
--                         the upload route (app/api/community/avatar). Null
--                         means "the picture the sign-in provides". The check
--                         holds it to this project's avatars bucket and to
--                         the reader's own folder in it.
--   backfill              each reader's newest upload in the avatars bucket.
--   posts and replies     author_avatar follows profiles.avatar_url, on insert
--                         and whenever it changes, the way author_handle
--                         follows profiles.handle (20261001000000_profiles_badges.sql).
--   direct writes         a reader could update ANY column of their own
--                         profiles row from the browser: profiles_self_update
--                         (20260518) has no column list. That reached a handle
--                         the API reserves (@support), a banner pointing at
--                         any address, and would have reached the picture shown
--                         on every post. UPDATE and INSERT are now granted per
--                         column, for the columns the app writes from the
--                         browser (lib/profile/__tests__/profileWrites.test.ts
--                         keeps the list honest); the rest go through the API,
--                         which writes with the service role.
--
-- Additive and idempotent: if not exists, drop then create, or replace.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. The reader's own picture ------------------------------------------

alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_own_upload;
alter table public.profiles add constraint profiles_avatar_url_own_upload check (
  avatar_url is null
  or (
    char_length(avatar_url) <= 600
    and avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/u/[0-9a-f-]{36}/[0-9]{10,16}\.(jpg|png|webp)$'
    and position('/avatars/u/' || id::text || '/' in avatar_url) > 0
  )
);

-- 2. Backfill: each reader's newest upload -------------------------------
--
-- Uploads are named u/<user id>/<milliseconds>.<ext> (the upload route), so
-- the newest is the last name in the folder. Banners live under b/ and are
-- left alone. The host is this project's: the same address the upload route
-- gets from getPublicUrl. Skipped, not failed, where storage is not readable.

do $$
begin
  update public.profiles p
     set avatar_url = 'https://avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/avatars/' || o.name
    from (
      select distinct on (split_part(name, '/', 2)) split_part(name, '/', 2) as owner, name
        from storage.objects
       where bucket_id = 'avatars'
         and name ~ '^u/[0-9a-f-]{36}/[0-9]{10,16}\.(jpg|png|webp)$'
       order by split_part(name, '/', 2), name desc
    ) o
   where p.id::text = o.owner
     and p.avatar_url is null;
exception
  when undefined_table or invalid_schema_name or insufficient_privilege then
    raise notice 'profile picture backfill skipped: %', sqlerrm;
end
$$;

-- 3. Posts and replies follow the picture ---------------------------------

create or replace function public.community_set_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  own_picture text;
begin
  select p.handle, p.avatar_decoration, p.avatar_url
    into new.author_handle, new.author_decoration, own_picture
    from public.profiles p
   where p.id = new.user_id;
  -- The reader's own upload wins over whatever the sign-in put in metadata.
  if own_picture is not null then
    new.author_avatar := own_picture;
  end if;
  return new;
end;
$$;

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
  after update of handle, avatar_decoration, avatar_url on public.profiles
  for each row execute function public.community_apply_author_profile();

revoke execute on function public.community_set_author_profile() from public, anon, authenticated;
revoke execute on function public.community_apply_author_profile() from public, anon, authenticated;

update public.community_posts c
   set author_avatar = p.avatar_url
  from public.profiles p
 where p.id = c.user_id
   and p.avatar_url is not null
   and c.author_avatar is distinct from p.avatar_url;

update public.community_post_replies c
   set author_avatar = p.avatar_url
  from public.profiles p
 where p.id = c.user_id
   and p.avatar_url is not null
   and c.author_avatar is distinct from p.avatar_url;

-- 4. What a reader may write to their own row from the browser ------------
--
-- display_name (the account page), preferred_language (the language
-- switcher), focus and depth (lib/profile/preferences.ts), has_password and
-- updated_at (mark_password_set, which runs as the caller). Each is granted
-- only where the column exists, so this runs on any copy of the schema.

revoke insert, update on public.profiles from anon, authenticated;

do $$
declare
  col text;
begin
  foreach col in array array['display_name', 'preferred_language', 'focus', 'depth', 'has_password', 'updated_at'] loop
    if exists (
      select 1
        from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles' and column_name = col
    ) then
      execute format('grant update (%I) on public.profiles to authenticated', col);
      execute format('grant insert (%I) on public.profiles to authenticated', col);
    end if;
  end loop;
  grant insert (id) on public.profiles to authenticated;
end
$$;

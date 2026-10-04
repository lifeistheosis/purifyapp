-- ---------------------------------------------------------------------
-- Profile pictures on a random path, 2026-10-03.
--
-- THE FAULT. A profile picture was stored at avatars/u/<user id>/<time>.<ext>
-- in a public bucket, so its address carried the reader's auth uuid: the id
-- 20260802000100_revoke_public_user_id.sql keeps out of every public read,
-- and also the RevenueCat appUserID. 20261003000000_profile_pictures.sql then
-- made that address the picture of record and checked that it sat in the
-- reader's own folder, so the id rides out with every post, reply and
-- profile that shows an uploaded picture. Counted on the public feed on
-- 2026-10-03: 20 of 30 posts, 8 readers. 20261007000000_upload_owners.sql
-- closed the same fault for Kitchen photos and campaign pictures; this is
-- the one upload it left.
--
-- WHAT THIS DOES. One thing: it lets profiles.avatar_url hold the new shape,
-- avatars/a/<random uuid>.<ext>, which the upload route writes from now on
-- (app/api/community/avatar/route.ts). The old shape stays allowed, still
-- only in the reader's own folder, until scripts/migrate-avatar-paths.mjs
-- has moved the pictures already stored. A later migration can then drop it.
--
-- WHAT IT NO LONGER PROVES. The old check tied an address to its reader by
-- the id in the path. A random path cannot, by design. Whose file it is now
-- rests on two things outside this check: the column is written only by the
-- service role (section 4 of 20261003000000 took the reader's grant away),
-- and the upload route writes each file's owner in upload_owners before the
-- file goes up, which is what a later upload or an account deletion deletes
-- by (lib/community/avatarPath.ts).
--
-- ORDER. Before the code. Until this has run the column refuses the new
-- path, and the new route then stores nothing and answers "not open yet"
-- (503) rather than write a path the row cannot hold. A merge runs it, and
-- running it by hand first does no harm: drop if exists, then add, so it
-- runs twice. The constraint is renamed because "own_upload" is no longer
-- what it says.
--
-- RUN BY HAND ON 2026-10-03, BEFORE THIS FILE REACHED main, on the owner's
-- word: the owner ran it in the SQL editor and said so. Not seen by the
-- session that wrote this file, and not probed, because the anon key cannot
-- show a constraint (TO CHECK, below). The merge runs the file again, which
-- changes nothing, and the Supabase Preview check on that commit is then the
-- proof that it is in place.
--
-- TO CHECK. It cannot be seen with the anon key. In the SQL editor:
--   select conname from pg_constraint
--    where conrelid = 'public.profiles'::regclass and conname like 'profiles_avatar_url%';
--   profiles_avatar_url_shape       applied
--   profiles_avatar_url_own_upload  not applied
--
-- ROLLBACK. While every row still holds an old-shape address, the check in
-- 20261003000000 can simply be put back. Once a row holds a new-shape address
-- it cannot, without first moving that picture back.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

alter table public.profiles drop constraint if exists profiles_avatar_url_own_upload;
alter table public.profiles drop constraint if exists profiles_avatar_url_shape;
alter table public.profiles add constraint profiles_avatar_url_shape check (
  avatar_url is null
  or (
    char_length(avatar_url) <= 600
    and (
      avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/a/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
      or (
        avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/u/[0-9a-f-]{36}/[0-9]{10,16}\.(jpg|png|webp)$'
        and position('/avatars/u/' || id::text || '/' in avatar_url) > 0
      )
    )
  )
);

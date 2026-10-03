-- ---------------------------------------------------------------------
-- Upload owners, 2026-10-03: who uploaded which file, kept on the server,
-- so a file's public address no longer has to say it.
--
-- APPLIED BY HAND ON 2026-10-03, BEFORE THIS FILE REACHED main. The owner
-- ran it in the SQL editor. Probed the same day with the anon key: a read,
-- a write and a delete on upload_owners each answer 401 with 42501 (there,
-- and closed to browsers), where a table that does not exist answers 404
-- with PGRST205. Every statement is guarded, so the merge running it again
-- changes nothing. It had to be in place before the routes that use it went
-- live: without it a photo upload answers "not open yet" (503).
--
-- WHY. Kitchen photos sat at r/<user id>/ and s/<user id>/ in the public
-- kitchen bucket, and campaign images at c/<user id>/ in campaign-media. A
-- public bucket serves every file at a URL that is its path, so each review
-- photo handed the Supabase auth uuid (also the RevenueCat appUserID) to
-- every reader, although 20260928000000_kitchen.sql says no uuid ever
-- reaches a browser. The id was in the path because the path was the only
-- proof of whose photo it was. This table is that proof now, so the path is
-- random.
--
-- WHAT THIS ADDS
--   upload_owners
--       One row per file a reader uploaded: the bucket, the path, whose it
--       is, and when. /api/trapeza/upload and /api/campaigns/image write
--       the row before the file goes up. It is read when a photo is
--       attached to a review, a recipe or a campaign, and before a
--       campaign's picture is deleted for its creator, and it is removed
--       when the file is (lib/security/uploadOwners.ts). Deleting an
--       account takes its rows with it.
--
--       Service role only. It maps files to people, which is exactly what
--       is being kept away from browsers, so there is no policy and no
--       grant: with the anon key it answers 42501, not a row.
--
-- SAFE TO RUN TWICE. Every statement is guarded and nothing is dropped.
--
-- TO CHECK, with the public anon key:
--   GET $URL/rest/v1/upload_owners?select=path&limit=0
--   401 with code 42501  there, and closed to browsers (what is wanted)
--   404 with PGRST205    not applied
--   200                  open to browsers: stop, the revoke did not run
--
-- TO UNDO. Only after the routes are back on the old paths, since the new
-- ones cannot store a photo without it:
--   drop table public.upload_owners;
-- ---------------------------------------------------------------------

create table if not exists public.upload_owners (
  bucket text not null check (char_length(bucket) between 1 and 60),
  path text not null check (char_length(path) between 1 and 200),
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bucket, path)
);

create index if not exists upload_owners_owner_idx
  on public.upload_owners (owner_id);

alter table public.upload_owners enable row level security;
-- No policy on purpose: service role only.
revoke all on public.upload_owners from anon, authenticated;
grant all on public.upload_owners to service_role;

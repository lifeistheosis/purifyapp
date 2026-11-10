-- Prayer campaigns, reworked, file three: a campaign's pictures, up to 3, or
-- 20 with Purify Plus (1.9; docs/1.9-build/notes/campaigns-fable.md, sections
-- 5.4 and 13).
--
-- NOT APPLIED YET, AND NOT SIGNED YET. It waits for the owner's yes, on its
-- summary in plain words, after a second chat has read the SQL
-- (docs/1.9-build/HANDOFF.md; docs/1.9-build/OWNER-STEPS.md, R0b). On his
-- yes it is copied, word for word from "set lock_timeout" down, into
-- supabase/migrations/<14 digits>_campaign_pictures.sql, named from the
-- clock that day so that it sorts after files one and two.
--
-- Written to run twice: every statement is "if not exists" or changes
-- nothing the second time. Run twice on 2026-11-10 on a scratch PostgreSQL
-- 16 standing on every migration in the folder and on files one and two: no
-- error either time, and the schema after the second run is the schema after
-- the first.
--
-- What it makes, in plain words:
--   prayer_campaign_pictures   One new table: a row for each picture on a
--                              campaign. Where its file is, its place in the
--                              row of pictures, its size, what it shows in
--                              its creator's words, whether it waits, is
--                              shown or was removed, what the automatic
--                              check answered, who cleared it and when, and
--                              when its creator affirmed the two lines a
--                              picture needs. Deleting a campaign deletes
--                              its rows here.
--
-- Nobody reads it straight from the table: row level security with no policy,
-- and no right at all for the public key. Checked on the scratch database
-- with that key's role and with a signed-in reader's: both are refused.
-- Every read and write is a route's, with the service role.
--
-- What a reader can reach once it has run: nothing. Pictures are switched off
-- on the server (lib/campaigns/parts.ts) until the image checking service is
-- chosen and a lawyer has answered, and campaigns themselves are closed. The
-- table stands empty until then.
--
-- The files themselves are not in the database: a picture that waits is kept
-- in a private bucket, is copied to the public one only when a moderator has
-- cleared it, and goes back to the private one if readers' reports hide it.
-- The buckets are made by the server on first use, as every bucket in the
-- app is (lib/campaigns/pictures.ts).
--
-- Check after running, in the SQL editor. Read only, one row. Expected: 15,
-- true, 0, false, 0.
--   select
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'prayer_campaign_pictures') as picture_columns,
--     (select relrowsecurity from pg_class
--       where oid = 'public.prayer_campaign_pictures'::regclass) as row_security_on,
--     (select count(*) from pg_policies
--       where schemaname = 'public' and tablename = 'prayer_campaign_pictures') as policies,
--     has_table_privilege('anon', 'public.prayer_campaign_pictures', 'select') as public_key_reads,
--     (select count(*) from public.prayer_campaign_pictures) as pictures_so_far;

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. A campaign's pictures ---------------------------------------------------
create table if not exists public.prayer_campaign_pictures (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.prayer_campaigns (id) on delete cascade,
  -- Where the file is: the private bucket while it waits, the public one
  -- once a moderator has cleared it. Its name is random in both
  -- (c/<uuid>.<ext>) and says nothing of whose it is; who uploaded it is in
  -- upload_owners, as for every stored file.
  bucket text not null check (char_length(bucket) between 1 and 60),
  path text not null check (char_length(path) between 3 and 200),
  -- Its place in the row of pictures; the first is the page's head.
  position smallint not null check (position between 0 and 19),
  width integer check (width is null or width between 1 and 4096),
  height integer check (height is null or height between 1 and 4096),
  -- What it shows, in the creator's words, for a reader who cannot see it.
  alt text check (alt is null or char_length(alt) <= 140),
  -- held: waiting for a moderator, seen by its creator and the moderators
  -- alone; it is new, or readers' reports have hidden it again. shown:
  -- cleared. removed: taken off by a moderator, or with its campaign; the
  -- file is deleted and the row is kept as the record.
  status text not null default 'held' check (status in ('held', 'shown', 'removed')),
  -- What the automatic check answered, in a word.
  check_result text check (check_result is null or char_length(check_result) <= 120),
  reviewed_by_email text,
  reviewed_at timestamptz,
  removed_reason text check (removed_reason is null or char_length(removed_reason) <= 300),
  -- When the creator affirmed the two lines a picture needs: "I am 18 or
  -- older", and "This picture is mine to share, and anyone in it has given
  -- me their blessing to post it".
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- A place in the row is held by one picture at a time; a removed picture
-- gives its place up.
create unique index if not exists prayer_campaign_pictures_place_idx
  on public.prayer_campaign_pictures (campaign_id, position)
  where status <> 'removed';

-- The moderators' queue: what waits, oldest first.
create index if not exists prayer_campaign_pictures_held_idx
  on public.prayer_campaign_pictures (created_at)
  where status = 'held';

-- 2. Nobody reads it straight from the table --------------------------------
--
-- Row level security with no policy at all, and no right for the public key:
-- every read and every write is a route's (app/api/campaigns), with the
-- service role, behind the campaigns switch and the pictures' own switch.
alter table public.prayer_campaign_pictures enable row level security;
revoke all on public.prayer_campaign_pictures from anon, authenticated;
grant all on public.prayer_campaign_pictures to service_role;

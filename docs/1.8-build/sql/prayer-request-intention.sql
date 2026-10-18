-- Purify 1.7.1 (built on release/1.8): what a prayer request asks prayers for.
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). It is deliberately NOT in supabase/migrations: a file
-- there is applied to production when it is merged to main, and this one
-- waits for your word. Safe to run more than once (every statement is "if not
-- exists" or drops what it replaces first). Nothing is deleted.
--
-- What it does:
--   profiles.prayer_request_intention   what a reader asking for prayers asks
--                                       them for, in their own words, at most
--                                       120 characters, or null. Shown under
--                                       their name on the prayer wall and on
--                                       their profile while the request is up.
--                                       Written only by the website's server
--                                       (the browser has no grant on it), after
--                                       the community's word filter.
--   community_text_holds.profile_id     the word filter keeps a request's
--                                       words as written for a moderator, as
--                                       it keeps a post's: approve as written,
--                                       keep masked, or remove. A hold is now
--                                       about exactly one of a post, a reply
--                                       or a profile's prayer request.
--
-- Until it runs, the prayer wall is as it is today: asking is one tap, with
-- nothing to write, and the moderation queue holds posts and replies only.
-- The code reads both ways (lib/profile/server.ts, app/api/community/
-- prayer-wall, lib/community/moderation.ts), so the field appears the first
-- time the wall is read after this runs.
--
-- Read back after running (two rows, both with a value):
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public'
--      and ((table_name = 'profiles' and column_name = 'prayer_request_intention')
--        or (table_name = 'community_text_holds' and column_name = 'profile_id'));
--
-- Or from outside, with the anon key (401 or 200 means the column is there;
-- 400 with 42703 means it is not there yet):
--   curl -s -w "\n%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=prayer_request_intention&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. The words of a request ---------------------------------------------------

alter table public.profiles add column if not exists prayer_request_intention text;

alter table public.profiles drop constraint if exists profiles_prayer_request_intention_length;
alter table public.profiles add constraint profiles_prayer_request_intention_length
  check (prayer_request_intention is null or char_length(prayer_request_intention) <= 120);

comment on column public.profiles.prayer_request_intention is
  'What a reader asking for prayers asks them for, in their own words (at most 120 characters), as the word filter left it. Written by the website''s server only.';

-- 2. The word filter's hold, for a request as for a post ----------------------
--
-- Keyed to the reader's account, like community_reports.profile_id. Their
-- request's words as written live here and nowhere a reader can read them
-- (row level security on, no policy, as before).

alter table public.community_text_holds
  add column if not exists profile_id uuid references auth.users (id) on delete cascade;

alter table public.community_text_holds drop constraint if exists community_text_holds_one_target;
alter table public.community_text_holds add constraint community_text_holds_one_target
  check (num_nonnulls(post_id, reply_id, profile_id) = 1);

-- One waiting hold per request and reason, as for posts and replies.
create unique index if not exists community_text_holds_pending_profile_reason
  on public.community_text_holds (profile_id, reason)
  where status = 'pending' and profile_id is not null;

-- Rollback, if it comes to that (the wall goes back to a request with no
-- words, and the queue to posts and replies; run the first line only once no
-- hold has a profile_id, or the old constraint will refuse those rows):
--   delete from public.community_text_holds where profile_id is not null;
--   alter table public.community_text_holds drop constraint if exists community_text_holds_one_target;
--   alter table public.community_text_holds add constraint community_text_holds_one_target
--     check ((post_id is not null and reply_id is null) or (post_id is null and reply_id is not null));
--   drop index if exists public.community_text_holds_pending_profile_reason;
--   alter table public.community_text_holds drop column if exists profile_id;
--   alter table public.profiles drop column if exists prayer_request_intention;

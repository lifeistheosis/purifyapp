-- The prayer requests written before 1.9 are cleared at the merge. Nothing
-- shows them from 1.9 (the wall went to the Vault, 88931feae), so keeping a
-- reader's words, which can name an illness or a family's grief, serves no
-- one. The campaigns chat's end job (lib/community/prayerRequestsEnd.ts,
-- signed "wall B") was to clear them fourteen days on; these are its same six
-- steps, run at the merge, so the job then finds nothing and leaves its mark.
--
-- SIGNED 2026-11-11 about 13:24 UTC, his words "yes privacy and phone voice
-- in v1.9", answering call 32, which showed this SQL (sent to the arbiter at
-- 04:56 UTC and shown to him at 05:03). Not run by hand: the integration runs
-- it on the merge of 1.9 to main. Until then the main web (1.8) still serves
-- the wall, so nothing is hidden early.
--
-- WHAT IT DOES, in wall B's order: the request's time and its words leave the
-- profile; a moderator's waiting hold on a request's words goes, and a decided
-- one keeps no words; the moderators' log keeps its decisions on requests but
-- not the words they quoted; and who prayed for a request is forgotten. A hold
-- with profile_id is only ever on a request's words: the table allows one of
-- post, reply or profile per hold, the only code that wrote one was 1.8's
-- request route, and moderation decides every profile_id hold as a request.
-- A post's hold, a post's log line and clear_profile's line are left alone.
--
-- Safe to run twice: each step touches only rows that still hold something.
-- Run twice clean on a scratch PostgreSQL 16 on 2026-11-11: the first run
-- UPDATE 1, 2, DELETE 1, UPDATE 1, 2, DELETE 1 on its test rows, a post's
-- hold, a post's log line and clear_profile's line left as they were; the
-- second run 0 everywhere.

update public.profiles set prayer_request_at = null where prayer_request_at is not null;
update public.profiles set prayer_request_intention = null where prayer_request_intention is not null;
delete from public.community_text_holds where profile_id is not null and status = 'pending';
update public.community_text_holds set original_body = null where profile_id is not null and original_body is not null;
update public.community_mod_log set summary = null
  where target_kind = 'profile' and action in ('approve_words', 'keep_masked', 'remove_request_words') and summary is not null;
delete from public.profile_prayers where owner_id is not null;

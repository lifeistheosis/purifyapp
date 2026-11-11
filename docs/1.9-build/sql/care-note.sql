-- The care note: a notice a moderator may send, by hand, to a writer whose
-- words may mean they are in danger (the safety line, lib/campaigns/safety.ts;
-- his yes to call 26, 2026-11-11 about 00:56 UTC, "rec for all and finalize
-- this build"). It stands in that writer's own inbox under "From Purify":
-- never a push, never public, never automatic (lib/community/careNote.ts).
--
-- WAITING FOR HIS SIGN-OFF ON THIS SQL, in the Admin chat. On his yes it
-- moves to supabase/migrations/ under a 14-digit name that sorts last, and
-- the 1.9 merge runs it. Until it has run on the live database nothing may
-- write a "care" notice: the database would refuse the row. The campaigns
-- chat's send button stays off until then.
--
-- WHAT IT DOES: one more kind in community_notifications_kind_check,
-- "care". The ten before it are exactly the removal notice's list
-- (supabase/migrations/20261110204814_removal_notices.sql, signed
-- 2026-11-10), which runs before this file with the same merge; a test
-- holds the two lists together (lib/community/__tests__/careNote.test.ts).
--
-- SAFE TO RUN TWICE: the check is dropped if it exists and added again.
-- NOT VALID, as the removal notice's is: the rows already in the table are
-- not read again (his read-only look of 2026-11-10 found no kind outside
-- the list), and every row written from now on is checked.
--
-- It changes no row, reads no row and sends nothing.
--
-- Run on a scratch PostgreSQL 16 standing on every file in
-- supabase/migrations/ (the removal notice's among them), twice: both runs
-- clean; afterwards a "care" row is taken and an unknown kind refused.
--
-- Check after running, read only (expected: true):
--   select pg_get_constraintdef(oid) like '%''care''%'
--     from pg_constraint where conname = 'community_notifications_kind_check';

alter table public.community_notifications drop constraint if exists community_notifications_kind_check;
alter table public.community_notifications add constraint community_notifications_kind_check check (
  kind in ('reply', 'mention', 'follow', 'name_day', 'prayed', 'gift', 'question', 'answer', 'approved', 'removed', 'care')
) not valid;

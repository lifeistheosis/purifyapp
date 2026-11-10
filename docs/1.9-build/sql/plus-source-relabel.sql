-- Item 56: put right the Plus members filed as Google Play who did not buy on
-- Google Play. A ONE-TIME change to live rows, NOT a migration: it changes
-- data, not the schema, and it needs the owner's eyes on RevenueCat to fill
-- in. Fable reviews it first; the owner runs it only on the arbiter's OK
-- (docs/1.9-build/OWNER-STEPS.md, item 56).
--
-- WHY. Until 2026-11-09 (08619c9d, lib/billing/plusSource.ts) the RevenueCat
-- webhook filed every store it did not name as "google": RevenueCat Web
-- Billing (how the website sells Plus), promotional grants and test-money
-- purchases all became Google Play members. So the plan screen named Google
-- Play, the support console said only Google could refund them, a failed
-- renewal emailed them to Google Play, and the admin counted grants and test
-- money as paying. The webhook is fixed, and each row comes right at that
-- member's next renewal; this puts them right now.
--
-- HOW. The database cannot tell a Play member from a website one. Only
-- RevenueCat knows each member's store, so:
--   Step 1 (read only) lists the members filed as Google Play.
--   For each, RevenueCat says the store (Customers, search the user id).
--   Step 2 takes only the members RevenueCat does NOT list under the Play
--   Store, each with its word:
--     Web Billing or Stripe     -> 'stripe'  (the website)
--     Promotional               -> 'comp'    (a grant, nobody paid)
--     Sandbox or the Test Store -> 'test'    (test money)
--   A member RevenueCat lists under the Play Store is left out of the list,
--   and so left as it is.
--
-- SAFE TO RUN TWICE. Step 2 changes a row only while it still says 'google',
-- and only to one of those three words, so a second run changes nothing. It
-- runs in one transaction and returns each row it changed. updated_at is
-- left as it was, so nothing that orders by it moves.

-- Step 1: who is filed as Google Play. Read only.
select user_id, plus_until, updated_at
from public.entitlements
where plus_source = 'google'
order by plus_until desc nulls last;

-- Step 2: fill in the list (one line per member, a comma between lines),
-- then select from "begin" to "commit" and run that part alone.
begin;
with fix (user_id, plus_source) as (
  values
    ('00000000-0000-0000-0000-000000000000'::uuid, 'stripe')
)
update public.entitlements e
   set plus_source = f.plus_source
  from fix f
 where e.user_id = f.user_id
   and e.plus_source = 'google'
   and f.plus_source in ('stripe', 'comp', 'test')
returning e.user_id, e.plus_source;
commit;

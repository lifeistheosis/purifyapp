-- The three retention emails' choices: one column each in email_preferences.
--
-- NOT SIGNED OFF. Merging this to main runs it on production (AGENTS.md).
-- The owner signs the SQL off before the merge, through the arbiter. Until
-- then nothing reads these columns as anything but absent: the code steps
-- back to "nobody is on these lists" while they are missing
-- (lib/email/retention/preferences.ts), and every retention email is behind a
-- switch that stays off until his yes to its design
-- (lib/email/retention/switches.ts). If he would rather it waited for a later
-- release, this file comes off the branch and nothing else changes.
--
-- WHY A MIGRATION. His word of 2026-11-13 ("perfect let's build"), on the
-- arbiter's three: the first-week guide, "pick up where you left off" and the
-- fasting companion, each with "an unsubscribe per type". A reader's choice
-- for each has to be kept somewhere, and email_preferences holds one column
-- per list (shop_offers, product_updates, community_digest, release_news,
-- monthly_note). Three lists, three columns. No other table changes.
--
-- WHAT THE THREE MEAN.
--
--   first_week         the first-week guide: at most three emails, on days
--                      1, 3 and 7 after an account is made, each only if its
--                      step is not already done as far as the account shows
--   pick_up            one personal line after 14, then 30, days with
--                      nothing kept: the reader's own place, or their patron
--                      saint's feast that week
--   fasting_companion  an opening note as a fast begins and one each week of
--                      it, in the calendar's own words
--
-- NULLABLE, WITH NO DEFAULT, ON PURPOSE. Null is "this reader has not
-- chosen", true and false are their choice. The code reads null as off for
-- all three, which is what the privacy page promises today ("No marketing
-- email unless you ask for it"). If the owner later decides one of them
-- starts on for readers who have not chosen, as release_news does, that is a
-- line in the code and a line on the privacy page in his words, not another
-- migration; and a reader who said stop stays stopped, because their false
-- is kept apart from the nulls. Today the code reads only an explicit true
-- (lib/email/retention/preferences.ts), and its test holds that.
--
-- RLS is unchanged: email_preferences already lets a reader read their own
-- row and nothing else, and every write goes through the service role.
--
-- Safe to run twice: each column is added only if it is missing, and a
-- comment is simply set again.
--
-- Check after running (200 means the columns are there; 400 means not yet):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/email_preferences?select=first_week,pick_up,fasting_companion&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

alter table public.email_preferences
  add column if not exists first_week boolean,
  add column if not exists pick_up boolean,
  add column if not exists fasting_companion boolean;

comment on column public.email_preferences.first_week is
  'The first-week guide (days 1, 3 and 7). Null: not chosen, read as off.';
comment on column public.email_preferences.pick_up is
  'Where you left off (after 14, then 30, days with nothing kept). Null: not chosen, read as off.';
comment on column public.email_preferences.fasting_companion is
  'The fasting companion (as a fast begins, then weekly). Null: not chosen, read as off.';

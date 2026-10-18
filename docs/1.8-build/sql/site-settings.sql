-- Purify 1.8: the front page's store ratings and reviews, kept from the Admin.
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). It is deliberately NOT in supabase/migrations: a file
-- there is applied to production when it is merged to main, and this one
-- waits for your word. Safe to run more than once (every statement is "if not
-- exists" or replaces itself). Nothing is deleted.
--
-- What it does: one small table of named website settings, read and written
-- only by the website's server (the service role). Two rows are used now,
-- both written from Admin > Ratings:
--   store_ratings   the Google Play rating and count, typed in the Admin
--                   (Google has no public rating feed; the App Store's number
--                   is read live from Apple and needs no row).
--   store_reviews   the reviews the phone front page lets a reader swipe
--                   through: which ones show, and in what order.
--
-- Until it runs, the front page shows the committed defaults in
-- lib/marketing/storeRatings.ts (read off both listings on 2026-10-18), and
-- the Admin tab says the table is missing and does not offer to save.
--
-- Nobody else reads it: row level security is on with no policies, like
-- shop_settings, so a visitor's key sees no rows at all.
--
-- Read back after running:
--   select key, updated_at, updated_by_email from public.site_settings;
-- (no rows until the first save in Admin > Ratings).
--
-- Or from outside, with the anon key (200 with [] means the table is there and
-- closed to visitors; 404 or PGRST205 means it is not there yet):
--   curl -s -w "\n%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/site_settings?select=key&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.site_settings (
  key              text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value            jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 65536),
  updated_at       timestamptz not null default now(),
  updated_by_email text
);

alter table public.site_settings enable row level security;

comment on table public.site_settings is
  'Named website settings, written from the Admin with the service role. store_ratings: the Google Play rating and count. store_reviews: the reviews the front page shows, in order.';

-- Rollback, if it comes to that (the front page falls back to its defaults):
--   drop table if exists public.site_settings;

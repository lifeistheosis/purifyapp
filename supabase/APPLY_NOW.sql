-- ============================================================
--  Purify: outstanding production migrations
--  Generated 2026-07-26 against project avbqyvjgcrucjwevwixt
--  Paste the whole file into the Supabase SQL editor and Run.
-- ============================================================
--
-- Safe to run more than once. Every statement is idempotent, so a second
-- run is a no-op rather than an error.
--
-- What is actually missing was probed against production rather than
-- assumed, by querying each migration's real table and column through
-- PostgREST. The result: ONE migration is unapplied. Everything else that
-- looked outstanding in the notes had already landed, and is listed at the
-- bottom so nobody re-applies it hunting for a problem that is not there.

begin;

-- ------------------------------------------------------------
-- 20260725_prayer_campaign_image
-- Lets a campaign creator attach one picture.
--
-- Only the public URL is stored. The image itself lives in the
-- `campaign-media` storage bucket, which the upload route creates on first
-- use, so there is no bucket SQL to run here.
--
-- Privacy note carried over from 20260713_prayer_campaigns.sql: subject_name
-- is deliberately capped at a first name so a third party is not
-- identifiable, and campaigns are public-read. A photograph can undo that,
-- which is why the create API requires a separate photo-consent literal on
-- top of the existing blessing clickwrap.
-- ------------------------------------------------------------
alter table public.prayer_campaigns
  add column if not exists image_url text
    check (image_url is null or char_length(image_url) <= 1000);

comment on column public.prayer_campaigns.image_url is
  'Public URL of the creator-supplied campaign image in the campaign-media bucket. Null when no image was attached.';

commit;

-- ------------------------------------------------------------
-- Verification. Expect exactly one row reading: image_url | text | t
-- ------------------------------------------------------------
select
  column_name,
  data_type,
  is_nullable = 'YES' as nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'prayer_campaigns'
  and column_name  = 'image_url';

-- ============================================================
--  Already applied in production, verified 2026-07-26. Do NOT
--  re-run these looking for a missing feature; the gap is elsewhere.
-- ============================================================
--   20260531_push_subscriptions              push_subscriptions
--   20260613_device_push_tokens              device_push_tokens
--   20260713_prayer_campaigns                prayer_campaigns
--   20260713_prayer_campaigns_prayer_duration prayer_campaigns.prayer_key
--   20260714_shop_review_identity            shop_reviews.display_name
--   20260717_shop_carts                      shop_carts
--   20260717_push_broadcasts                 push_broadcasts
--   20260718_shop_reviews_v2                 shop_store_reviews, shop_stores.store_review_count
--   20260718_product_views                   shop_products.view_count
--   20260718_message_reactions               shop_messages.reaction, support_ticket_messages.reaction
--   20260718_gifts                           gifts
--   20260719_preferred_language              profiles.preferred_language
--   20260722_community                       community_posts
--   20260722_shop_review_seeds_photos        shop_reviews.photo_urls
--   20260713_trapeza_recipes                 trapeza_recipes
--   20260713_fast_checkins                   fast_checkins
--   20260710_terms_acceptances               terms_acceptances
--   20260707_support_tickets                 support_tickets
--
-- RPCs confirmed live: shop_increment_product_view,
-- shop_store_reviews_resync, prayer_campaign_bump_counts.
--
-- ============================================================
--  NOT a database change, still outstanding
-- ============================================================
-- Campaigns stay dark in the Android build until
-- NEXT_PUBLIC_CAMPAIGNS_ENABLED is added as a GitHub Actions secret with
-- the value 1 (repo Settings, Secrets and variables, Actions). It is read
-- from a secret rather than hardcoded precisely because it depends on the
-- migration above. Applying this SQL without setting the secret lights the
-- feature on the website only.

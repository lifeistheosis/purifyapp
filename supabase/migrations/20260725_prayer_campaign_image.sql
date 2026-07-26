-- Prayer Campaigns: let the creator attach one image to their campaign.
--
-- The photo lands in the public `campaign-media` storage bucket (created on
-- first upload by app/api/campaigns/image/route.ts, same as `avatars`), and
-- only its public URL is stored here. One image per campaign, set at create
-- time by the creator.
--
-- Privacy note, carried over from 20260713_prayer_campaigns.sql: subject_name
-- is deliberately restricted to first names so a third party is not
-- identifiable. A photograph can defeat that, so the create API requires a
-- separate photo-consent literal on top of the existing blessing clickwrap.
-- The owner accepted this posture on 2026-07-25.
--
-- Apply AFTER 20260713_prayer_campaigns.sql. Idempotent.

alter table public.prayer_campaigns
  add column if not exists image_url text
    check (image_url is null or char_length(image_url) <= 1000);

comment on column public.prayer_campaigns.image_url is
  'Public URL of the creator-supplied campaign image in the campaign-media bucket. Null when no image was attached.';

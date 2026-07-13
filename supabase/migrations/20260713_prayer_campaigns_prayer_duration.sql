-- Prayer Campaigns: chosen preset prayer + a campaign duration (Beta 2.0).
--
-- Follows 20260713_prayer_campaigns.sql (already applied). A creator now picks
-- a preset prayer (like Hallow's campaigns) instead of it being derived only
-- from the intention, and sets how long the campaign runs. Both are optional:
--   * prayer_key: the catalog key of the chosen prayer (validated in the API,
--     lib/campaigns PRESET_PRAYERS). Null falls back to the intention default.
--   * ends_at: when the campaign finishes. Null = ongoing. The API computes it
--     from the chosen day-count (a week / a novena / forty days); the read layer
--     treats a past ends_at as finished.
--
-- Apply in the Supabase SQL editor. Safe to re-run.

alter table public.prayer_campaigns
  add column if not exists prayer_key text,
  add column if not exists ends_at timestamptz;

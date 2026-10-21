-- Purify 1.8: the multi-buy in steps ("20%, 25%, maybe 30% if they add a
-- bunch more products to their cart", the owner, 2026-10-19).
--
-- FOR THE OWNER TO RUN BY HAND in the Supabase SQL editor (project
-- avbqyvjgcrucjwevwixt). Not in supabase/migrations: a file there is applied
-- to production when it is merged to main. Safe to run more than once.
-- Nothing is deleted and no price changes by running it: the steps are empty
-- until they are set in Admin > Catalogue > Products > Growth > Multi-buy.
--
-- What it does: one column on the shop's single settings row, the higher
-- steps of the multi-buy as a list, e.g. [{"minItems":5,"percent":25},
-- {"minItems":8,"percent":30}]. The website checks each step before saving
-- (more pieces and a bigger discount than the step before it, at most two).
--
-- RUN by the owner 2026-10-21 (his "ran the SQL").
--
-- Run it as one line in a fresh query tab:

alter table public.shop_settings add column if not exists multi_buy_steps jsonb not null default '[]'::jsonb;

-- Read back after running (one row, steps empty until set in the Admin):
--   select multi_buy_enabled, multi_buy_min_items, multi_buy_percent, multi_buy_steps from public.shop_settings;
--
-- Rollback (the multi-buy goes back to one step):
--   alter table public.shop_settings drop column if exists multi_buy_steps;

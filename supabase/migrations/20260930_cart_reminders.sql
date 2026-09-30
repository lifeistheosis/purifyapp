-- ---------------------------------------------------------------------
-- Cart notes, 2026-09-30: two switches on the shop's one settings row.
--
--   cart_reminders_enabled   a plain note a day after a signed-in reader
--                            leaves a cart: it is still there. No discount.
--   cart_deal_email_enabled  a note when the cart deal the shop already runs
--                            opens on a line in that cart, with its real
--                            percentage and end (lib/shop/cartDeals.ts).
--
-- Both OFF by default: adding the columns sends nothing. The owner turns
-- each on in the admin (Revenue tab, Deals and cart notes). Only readers who
-- turned on "New in the shop" are ever written to (lib/email/marketing.ts),
-- each note once (email_sends), from lib/shop/cartReminderSweep.ts.
--
-- Additive and idempotent: safe to run by hand and safe for the Supabase
-- integration to run again on merge.
--
-- APPLIED BY HAND: the owner ran this in the Supabase SQL editor on
-- 2026-09-30 and reported it done.
-- ---------------------------------------------------------------------

alter table public.shop_settings
  add column if not exists cart_reminders_enabled boolean not null default false,
  add column if not exists cart_deal_email_enabled boolean not null default false;

-- Rollback, if it comes to that:
--   alter table public.shop_settings
--     drop column if exists cart_reminders_enabled,
--     drop column if exists cart_deal_email_enabled;

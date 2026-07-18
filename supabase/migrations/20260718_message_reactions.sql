-- Beta 2.x — message reactions (double-tap to heart).
--
-- A single optional reaction emoji per message, on both messaging
-- surfaces: the shop buyer<->store live chat (shop_messages) and the
-- email support thread (support_ticket_messages). Null = no reaction.
-- Toggled through the existing service-role message routes; no new RLS
-- needed (reads ride the existing self/participant policies).
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

alter table public.shop_messages
  add column if not exists reaction text;

alter table public.support_ticket_messages
  add column if not exists reaction text;

-- Plus over time (1.9, admin item A2, docs/1.9-build/notes/admin-decisions.md).
--
-- NOT APPLIED. NOT A MIGRATION YET. This file waits for the owner's sign-off
-- (AGENTS.md: a production schema change is his to approve before it runs).
-- It lives in docs/, not supabase/migrations/, so that no merge to main can
-- run it by itself. On his word it is either run by hand in the SQL editor,
-- or copied into supabase/migrations/<YYYYMMDDHHMMSS>_plus_events.sql (a
-- version later than every file there) so the integration runs it.
--
-- Written to run twice: every statement is "if not exists" or is preceded by
-- its own "drop ... if exists".
--
-- WHY. The RevenueCat webhook (app/api/billing/revenuecat/route.ts) keeps one
-- fact per member, the date Plus runs to, and drops the rest of each event.
-- So the admin cannot say who joined or left this week, which trials became
-- paying members, what Plus brought in on a given day, or tell a member in a
-- free trial from one who pays (both read as paying, priced at the monthly
-- list price). RevenueCat sends all of it with every event; this keeps it.
--
-- What one row is: one RevenueCat event (a purchase, a renewal, a cancel, an
-- expiry, a failed charge, a plan change), as RevenueCat described it. Kept
-- once however many times RevenueCat retries it (event_id is unique).
--
-- PRIVACY. A row names its member only by user id, and the id is cleared,
-- not the row deleted, when the account is deleted: the money moved either
-- way, and the books should still add up, but the record stops pointing at
-- anyone. No card, no email, no country, and not the store's order number
-- (the store could trace that back to the buyer after the account is gone).
-- The privacy page carries the line Edgar approved on 2026-11-09 ("When you
-- buy or renew a membership, we keep a record of it: which store, the price
-- and the dates. Once you delete your account, it is no longer linked to
-- you."), and the 1.9 letter lists it.
--
-- WHAT READS IT (lib/billing/plusEvents.ts writes; lib/admin/plusHistory.ts
-- reads): Money > Subscriptions > Over time (joined, left, trials that paid,
-- what came in each day), Home's "came in today" (Plus bought through Google
-- Play and the App Store, which Stripe never sees), Money's Plus when
-- RevenueCat's key is not set, and the paying count, which stops counting a
-- member in a free trial.
--
-- Who can do what: nobody through the API keys. RLS is on with no policy, so
-- only the service role reads or writes: the webhook writes, the admin reads.
--
-- Check after running (200 with an empty list means it is there; a client key
-- sees no rows, by design):
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/plus_events?select=id&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

create table if not exists public.plus_events (
  id uuid primary key default gen_random_uuid(),
  -- RevenueCat's own id for the event, so a retried delivery is kept once.
  event_id text not null unique check (char_length(event_id) <= 200),
  user_id uuid references auth.users on delete set null,
  -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, UNCANCELLATION, EXPIRATION,
  -- BILLING_ISSUE, PRODUCT_CHANGE, and whatever RevenueCat adds.
  type text not null check (char_length(type) <= 64),
  -- PLAY_STORE, APP_STORE, RC_BILLING (the website), PROMOTIONAL, ...
  store text check (char_length(store) <= 64),
  -- PRODUCTION, or SANDBOX for test money.
  environment text check (char_length(environment) <= 32),
  -- NORMAL, TRIAL, INTRO, PROMOTIONAL, PREPAID.
  period_type text check (char_length(period_type) <= 32),
  product_id text check (char_length(product_id) <= 200),
  -- What the member paid, in dollars as RevenueCat converts it, and in the
  -- currency they paid in. Null for an event that moves no money.
  price_usd numeric(12, 2),
  currency text check (char_length(currency) <= 8),
  price_in_currency numeric(14, 2),
  -- RevenueCat's estimate of the part that reaches Purify after the store's
  -- commission and tax, 0 to 1.
  takehome numeric(6, 5) check (takehome is null or (takehome >= 0 and takehome <= 1)),
  renewal_number integer,
  -- RENEWAL only: true on the first charge after a free trial (a trial that paid).
  trial_conversion boolean,
  -- CANCELLATION and EXPIRATION only, RevenueCat's word for why: UNSUBSCRIBE
  -- (turned off by the member), BILLING_ERROR (a card failed),
  -- CUSTOMER_SUPPORT (a refund), and so on.
  reason text check (reason is null or char_length(reason) <= 64),
  event_at timestamptz not null,
  purchased_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- The first draft of this file (commit 08619c9d) had neither column. If that
-- draft was run, these add them; on a table made by the statement above they
-- do nothing.
alter table public.plus_events add column if not exists trial_conversion boolean;
alter table public.plus_events add column if not exists reason text check (reason is null or char_length(reason) <= 64);

create index if not exists plus_events_event_at_idx
  on public.plus_events (event_at desc);

create index if not exists plus_events_user_event_at_idx
  on public.plus_events (user_id, event_at desc);

alter table public.plus_events enable row level security;

-- No policy of any kind, on purpose: writes are the webhook's and reads the
-- admin's, both with the service role.

comment on table public.plus_events is
  'One row per RevenueCat event (purchase, renewal, cancel, expiry, failed charge), kept by the webhook so the admin can show Plus over time. Service role only.';

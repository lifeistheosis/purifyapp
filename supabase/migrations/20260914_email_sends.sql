-- 20260914_email_sends.sql
--
-- NOT SIGNED OFF. Merging this to main runs it on production (AGENTS.md,
-- "Merging a migration to main runs DDL against prod"). The owner signs the SQL
-- off before the merge, not after.
--
-- Two things the email funnel needs before it can send anything safely.
--
-- 1. email_sends: one row per email Purify decided to send.
--
--    Push has push_broadcasts. Email had nothing, so no send could be audited
--    after the fact and nothing stopped the same email going twice. This is
--    both the log and the lock:
--
--    - dedupe_key is UNIQUE, and a sender inserts the row BEFORE it sends. A
--      Stripe or RevenueCat webhook retried three times, a double-clicked Run
--      now, or two daily jobs overlapping all collide on the key, and only the
--      first one sends. Keys look like "payment_failed:<user>:<period>",
--      "welcome:<user>", "terms:2026-08-14:<user>".
--    - status starts 'pending'. A send that succeeds becomes 'sent' and can
--      never be claimed again. One that failed, or was skipped because email
--      was not configured, can be claimed again by a later run, so turning
--      RESEND_API_KEY on does not leave every earlier email permanently lost.
--    - A row stuck at 'pending' means a process died mid-send. It is never
--      retried automatically, on purpose: a second copy of a payment email is
--      worse than a missing one, and the admin can see and clear it.
--
--    RLS on with NO policies: service role only, like push_broadcasts. The
--    address is personal data and nothing client-side ever needs this table.
--
-- 2. entitlements.billing_issue_at and entitlements.auto_renew.
--
--    Today a failed renewal leaves no trace: the RevenueCat webhook writes
--    plus_until and nothing else, so nobody is told and the subscription just
--    lapses. billing_issue_at records that a charge failed. auto_renew records
--    whether the subscriber turned renewal off, which is what makes "Plus ends
--    in three days" honest: plus_until is always about a period ahead on a
--    renewing subscription, so without this the email would warn every
--    renewing subscriber every month. Both nullable: null means "not known
--    yet", which is every existing row until its next webhook event.

create table if not exists public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  email       text not null,
  kind        text not null,
  dedupe_key  text not null unique,
  subject     text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'sent', 'skipped', 'failed')),
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

create index if not exists email_sends_user_idx on public.email_sends (user_id, created_at desc);
create index if not exists email_sends_kind_idx on public.email_sends (kind, created_at desc);

alter table public.email_sends enable row level security;

comment on table public.email_sends is
  'One row per email Purify decided to send. dedupe_key is the lock that stops a second copy. Service role only.';

alter table public.entitlements add column if not exists billing_issue_at timestamptz;
alter table public.entitlements add column if not exists auto_renew boolean;

comment on column public.entitlements.billing_issue_at is
  'When the store last reported a failed renewal charge. Cleared on a successful renewal.';
comment on column public.entitlements.auto_renew is
  'Whether the subscriber has renewal on. Null until the first CANCELLATION, UNCANCELLATION or RENEWAL event.';

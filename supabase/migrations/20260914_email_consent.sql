-- 20260914_email_consent.sql
--
-- NOT SIGNED OFF. Merging this to main runs it on production (AGENTS.md). The
-- owner signs the SQL off before the merge. Applies after
-- 20260914_email_sends.sql.
--
-- Everything the marketing half of the email funnel needs, in one file so it is
-- one decision rather than four.
--
-- 1. email_preferences: consent, one row per reader.
--
--    There was no consent record anywhere. Two lists, both OFF by default,
--    because they are two different consents: new pieces in the shop, and what
--    is new in the library. Transactional email (orders, membership, support,
--    terms) is not a column, because it is not optional.
--
--    unsubscribe_token is what every marketing email's unsubscribe link and
--    List-Unsubscribe header carry, so a reader can stop a list with one click
--    and no sign-in. It is a random uuid, not the user id, so a forwarded email
--    does not hand anyone the reader's account id.
--
--    RLS: a reader can read their own row. Writes go through a service-role
--    route, the same posture as member_addresses.
--
-- 2. email_campaigns: the log of one-to-many sends.
--
--    Per-recipient sends are in email_sends. This is the send itself: the
--    Sunday calendar for week 2026-W38, the monthly note for 2026-10, the 1.4
--    release email, a shop announcement. (kind, period_key) is unique, so the
--    same week's calendar cannot go out twice, and "what did last month's note
--    count" is one row. Service role only.
--
-- 3. stock_alerts: "tell me when it is back", per reader, per product.
--
--    A requested alert, not marketing: the reader asked about that one item,
--    so it sends without list consent and carries its own stop link. notified_at
--    is stamped when the alert fires, so it fires once.
--
-- 4. profiles.patron_saint: a saint slug from lib/saints/saints.ts.
--
--    Unlocks the name-day email on the morning of that saint's feast. Nullable
--    and unset for everyone, and only used under the library list's consent.

create table if not exists public.email_preferences (
  user_id            uuid primary key references auth.users on delete cascade,
  shop_offers        boolean not null default false,
  product_updates    boolean not null default false,
  unsubscribe_token  uuid not null unique default gen_random_uuid(),
  updated_at         timestamptz not null default now()
);

alter table public.email_preferences enable row level security;

drop policy if exists email_preferences_self_select on public.email_preferences;
create policy email_preferences_self_select on public.email_preferences
  for select using (auth.uid() = user_id);

create table if not exists public.email_campaigns (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null,
  period_key        text not null,
  subject           text not null,
  body_text         text not null,
  details           jsonb not null default '{}'::jsonb,
  recipients        integer not null default 0,
  sent              integer not null default 0,
  created_by_email  text,
  created_at        timestamptz not null default now(),
  unique (kind, period_key)
);

alter table public.email_campaigns enable row level security;

create table if not exists public.stock_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  product_id   uuid not null references public.shop_products on delete cascade,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  unique (user_id, product_id)
);

create index if not exists stock_alerts_product_idx on public.stock_alerts (product_id) where notified_at is null;

alter table public.stock_alerts enable row level security;

drop policy if exists stock_alerts_self_select on public.stock_alerts;
create policy stock_alerts_self_select on public.stock_alerts
  for select using (auth.uid() = user_id);

alter table public.profiles add column if not exists patron_saint text
  check (patron_saint is null or patron_saint ~ '^[a-z0-9-]{1,100}$');

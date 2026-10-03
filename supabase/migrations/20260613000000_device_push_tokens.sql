-- v10 — Native push tokens for the iOS/Android app-store builds.
--
-- The Capacitor shells can't use Web Push reliably (WKWebView on iOS has no
-- working Push API), so the store builds register for native push instead:
--   - iOS  → APNs device token (sent via APNs HTTP/2, token-based .p8)
--   - Android → FCM registration token (sent via FCM v1, firebase-admin)
--
-- Kept SEPARATE from push_subscriptions because native tokens have no
-- endpoint/p256dh/auth (those are Web Push concepts). Schedule + timezone
-- columns mirror push_subscriptions so the same hourly cron logic matches
-- "is it the user's morning/evening right now" for both tables.

create table if not exists public.device_push_tokens (
  token        text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  platform     text not null check (platform in ('ios', 'android')),
  -- "HH:MM" local-clock strings; null = no nudge. Same contract as
  -- push_subscriptions: the client registers its own IANA timezone so the
  -- cron computes the local hour without storing wall time.
  morning_time text,
  evening_time text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_self_all" on public.device_push_tokens;
create policy "device_push_tokens_self_all" on public.device_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

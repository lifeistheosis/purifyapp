-- v7.0 — Web Push subscriptions for opt-in prayer reminders.
--
-- One row per browser per user. Endpoint is unique (the user-agent
-- generates a fresh endpoint per subscription so it's safe as a key).
-- Schedule columns are the times the user picked; null = no nudge.
-- Server cron walks the table once an hour and delivers to whichever
-- rows match the current UTC hour.

create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  p256dh       text not null,
  auth         text not null,
  -- "HH:MM" local-clock strings. The client subscribes with its own
  -- IANA timezone so the cron can compute "is it 7am for this user
  -- right now" without storing the wall time at all.
  morning_time text,
  evening_time text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_self_all" on public.push_subscriptions;
create policy "push_subscriptions_self_all" on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

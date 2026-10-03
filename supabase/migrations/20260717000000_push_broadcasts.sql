-- Beta 2.x — push broadcast send-log.
--
-- One row per admin broadcast: content, audience, resolved recipient
-- count, who sent it, and delivery status. This IS the audit trail for
-- outbound notifications. Service-role only (the admin push routes read
-- and write it; nobody else).
--
-- Apply in the Supabase SQL editor (project avbqyvjgcrucjwevwixt). Safe to re-run.

create table if not exists public.push_broadcasts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body             text not null,
  url              text not null default '/',
  audience         text not null check (audience in ('all','plus','pro','web','native')),
  recipients_count int not null default 0,
  created_by_email text,
  status           text not null default 'enqueued'
                     check (status in ('enqueued','sent','failed')),
  created_at       timestamptz not null default now()
);

create index if not exists push_broadcasts_created_idx
  on public.push_broadcasts (created_at desc);

alter table public.push_broadcasts enable row level security;
-- No policies: only the service role (admin push routes) reads or writes.

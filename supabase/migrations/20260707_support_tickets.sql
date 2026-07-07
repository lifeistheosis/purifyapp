-- Support ticket system. A customer opens a ticket (anonymous allowed), gets a
-- ticket number + confirmation email; the operator answers from the admin
-- console and each reply emails the customer. Human-friendly ticket numbers
-- are derived from the id in code (lib/support/tickets.ts), so no extra column.
--
-- Run in the Supabase SQL editor. Idempotent.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  order_id uuid references public.shop_orders on delete set null,
  email text not null,
  name text,
  subject text not null,
  status text not null default 'open'
    check (status in ('open', 'pending', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_status_idx
  on public.support_tickets (status, updated_at desc);
create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets on delete cascade,
  author text not null check (author in ('customer', 'staff')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Signed-in users may read their own tickets and messages. Creating tickets,
-- staff replies, status changes, and every anonymous ticket go through
-- service-role API routes (app/api/support/*, app/api/admin/support/*), the
-- same discipline as the shop tables.
drop policy if exists support_tickets_owner_select on public.support_tickets;
create policy support_tickets_owner_select on public.support_tickets
  for select using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists support_ticket_messages_owner_select on public.support_ticket_messages;
create policy support_ticket_messages_owner_select on public.support_ticket_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

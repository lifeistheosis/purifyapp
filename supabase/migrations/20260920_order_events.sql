-- 20260920_order_events.sql
--
-- NOT SIGNED OFF UNTIL THE OWNER RUNS IT. Merging this to main runs it on
-- production (AGENTS.md, "Merging a migration to main runs DDL against prod").
--
-- One row per move an order makes through fulfillment.
--
-- shop_orders carries where an order IS (fulfillment_status) and when it last
-- moved (updated_at), and nothing at all about how it got there. So the panel
-- can say "three orders are waiting to be sourced" and can never say whether
-- sourcing usually takes a day or a fortnight, or when this one actually
-- arrived at the stage it is stuck in. Without that, "late" is a guess.
--
-- Written by the admin order route on every status change, best effort: a
-- failed insert is logged and never fails the move itself, because losing the
-- history of a step is a smaller harm than refusing to take it.
--
-- Service role only, like every other operations table here: RLS on, no
-- policies. A buyer's own view of their order is served from shop_orders.

create table if not exists public.shop_order_events (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.shop_orders on delete cascade,
  -- Null on the first recorded move: the row may predate this table.
  from_status  text,
  to_status    text not null,
  -- Free text the owner leaves with a move ("supplier says 3 weeks").
  note         text,
  actor_email  text,
  at           timestamptz not null default now()
);

create index if not exists shop_order_events_order_idx
  on public.shop_order_events (order_id, at);

create index if not exists shop_order_events_at_idx
  on public.shop_order_events (at desc);

alter table public.shop_order_events enable row level security;

comment on table public.shop_order_events is
  'One row per fulfillment move. Feeds the admin funnel: how long each stage takes, and what is late.';

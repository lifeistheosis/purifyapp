-- Recorded clickwrap acceptance. Every affirmative agreement to the Terms
-- (signup checkbox, shop checkout checkbox) writes a row here so acceptance
-- of the arbitration clause and shop policies is provable, not just gated
-- client-side.
--
-- Writes go through the service role only (the accept API / checkout path);
-- owners may read their own rows. No client inserts: an acceptance record
-- forged by a client would be worthless anyway, and this keeps the table
-- append-only from the app's point of view.

create table if not exists public.terms_acceptances (
  id bigint generated always as identity primary key,
  -- Null when the acceptance precedes the account (email signup with
  -- confirm-email on); the email column still identifies the acceptor.
  user_id uuid references auth.users (id) on delete set null,
  email text,
  context text not null check (context in ('signup', 'checkout')),
  -- The effective date of the Terms shown when the box was ticked
  -- (lib/legal/version.ts).
  terms_version text not null,
  -- Set for checkout acceptances; ties the agreement to the order.
  order_id uuid references public.shop_orders (id) on delete set null,
  accepted_at timestamptz not null default now()
);

create index if not exists terms_acceptances_user_idx
  on public.terms_acceptances (user_id, accepted_at desc);

alter table public.terms_acceptances enable row level security;

-- Owners can read their own acceptance history; nobody writes from the
-- client (service role bypasses RLS).
create policy "terms_acceptances_owner_select"
  on public.terms_acceptances for select
  using (auth.uid() = user_id);

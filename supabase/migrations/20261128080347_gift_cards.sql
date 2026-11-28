-- A year of Plus given by email (2.0, the Christmas gift). His word,
-- 2026-11-28: "yes build the gift page at 59.99".
--
-- NOT SIGNED OFF. Merging this file to main runs it against production
-- (AGENTS.md): the owner reads this SQL and says yes before the merge.
--
-- The gift a reader already gives another reader (public.gifts) needs an
-- account to land in. This one is bought on the website for anyone with an
-- email address: the card waits here, paid, until its day comes and the email
-- goes out (lib/gifts/card.ts, the hourly run), and until the one it is given
-- to opens the link and signs in. Redeeming moves it into public.gifts as an
-- ordinary unclaimed gift for that reader, so the app's own gift box opens it
-- and the claim that already exists grants the year (claim_gift).
--
-- Written to run twice: every statement is guarded or replaces itself.

create table if not exists public.gift_cards (
  id                uuid primary key default gen_random_uuid(),
  -- The secret in the link the email carries. Random, long, never shown in a list.
  code              text not null,
  from_name         text not null check (char_length(from_name) between 1 and 60),
  to_name           text not null check (char_length(to_name) between 1 and 60),
  -- Kept only to send the gift (the privacy page says so).
  to_email          text not null check (char_length(to_email) between 3 and 254),
  message           text check (message is null or char_length(message) <= 280),
  days              integer not null default 365 check (days > 0 and days <= 3650),
  -- The day it goes out; null as soon as it is paid.
  deliver_on        date,
  amount_cents      integer not null check (amount_cents > 0),
  currency          text not null,
  buyer_email       text,
  stripe_session_id text not null,
  paid_at           timestamptz not null default now(),
  sent_at           timestamptz,
  redeemed_by       uuid references auth.users on delete set null,
  redeemed_at       timestamptz,
  gift_id           uuid references public.gifts on delete set null,
  created_at        timestamptz not null default now()
);

create unique index if not exists gift_cards_code_key on public.gift_cards (code);
-- The webhook's idempotency key: a redelivered event finds its card written.
create unique index if not exists gift_cards_stripe_session_key on public.gift_cards (stripe_session_id);
-- The hourly run's list: paid and not yet sent.
create index if not exists gift_cards_unsent_idx on public.gift_cards (deliver_on) where sent_at is null;

-- No policy at all: only the service role (the routes and the hourly run)
-- reads or writes a card. A reader never lists them.
alter table public.gift_cards enable row level security;

-- Redeem a card for the signed-in reader: once only, whoever races. Marks the
-- card redeemed and writes the ordinary unclaimed gift in the same statement
-- block; no row back means the code is unknown or already redeemed.
create or replace function public.redeem_gift_card(
  p_code text,
  p_user_id uuid
) returns table (id uuid, tier text, days integer, message text, from_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.gift_cards%rowtype;
  g uuid;
begin
  update public.gift_cards gc
     set redeemed_by = p_user_id,
         redeemed_at = now()
   where gc.code = p_code
     and gc.redeemed_at is null
  returning gc.* into c;
  if not found then
    return;
  end if;
  insert into public.gifts as ng (user_id, tier, days, message, from_name, created_by_email)
  values (p_user_id, 'plus', c.days, c.message, c.from_name, 'gift:card')
  returning ng.id into g;
  update public.gift_cards gc2 set gift_id = g where gc2.id = c.id;
  return query select g, 'plus'::text, c.days, c.message, c.from_name;
end;
$$;

revoke execute on function public.redeem_gift_card(text, uuid) from public;
revoke execute on function public.redeem_gift_card(text, uuid) from anon;
revoke execute on function public.redeem_gift_card(text, uuid) from authenticated;
grant execute on function public.redeem_gift_card(text, uuid) to service_role;

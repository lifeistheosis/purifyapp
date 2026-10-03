-- v6.2 — track whether a user has set a password
-- Up to v6.1, sign-in was magic-link only. v6.2 introduces real
-- email+password auth (and OAuth), and forces existing magic-link
-- users to set a password the first time they sign in afterward.
--
-- Supabase doesn't expose `auth.users.encrypted_password` to the
-- public schema or to the anon-key SDK, so we mirror "has the user
-- set a password" onto `profiles.has_password` and keep it in sync
-- ourselves: set TRUE on signup with a password, on the forced
-- set-password interstitial, and on any password change.

alter table public.profiles
  add column if not exists has_password boolean not null default false;

-- Backfill: anyone whose auth.users row already has an encrypted
-- password (rare under the old flow but possible if they used the
-- recovery / reset endpoints) is treated as already having one.
-- The auth schema is privileged but readable from this migration
-- because migrations run as the postgres superuser.
update public.profiles p
   set has_password = true
  from auth.users u
 where u.id = p.id
   and u.encrypted_password is not null
   and u.encrypted_password <> '';

-- Helper: small RPC the client can call after a successful
-- `updateUser({ password })` to flip the flag. Keeps the write
-- inside an RLS-checked surface (the policy below) so a stolen
-- session can't lie to us — the row id must match auth.uid().
create or replace function public.mark_password_set()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.profiles
     set has_password = true,
         updated_at = now()
   where id = auth.uid();
$$;

-- No new RLS policy needed: the existing profiles_self_update
-- policy already permits the owner to update their own row, and
-- `mark_password_set()` runs as the caller (security invoker).

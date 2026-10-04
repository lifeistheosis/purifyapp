-- ---------------------------------------------------------------------
-- Only the server registers a push endpoint (audit F-42), 2026-10-04.
--
-- THE FAULT. The one policy on push_subscriptions was "for all" to the row's
-- own reader (20260531000000_push_subscriptions.sql). So a signed-in reader
-- could write rows with the public key and their own token, past the route
-- and whatever the route checks. The endpoint is plain text, and the hourly
-- reminder run and every Community alert make an https request to each one.
-- One account could have the server send requests to any host it named, as
-- many rows as it cared to write. What that gives is small (an encrypted
-- POST whose answer the reader never sees), and nobody is known to have
-- used it: no browser could subscribe before 2026-10-04 and the table held
-- nothing. It is closed before it is found.
--
-- WHAT THIS DOES. A reader may still read and delete their own rows: the
-- route's "turn reminders off" deletes with the reader's own session
-- (app/api/push/subscribe/route.ts, DELETE). Nobody but the service role
-- inserts or updates. The route has written with the service role since
-- F-40, and it is the only thing in app, lib or components that writes
-- this table (read on 2026-10-04: the hourly run, the Community alerts, the
-- broadcast audience, the owner alert and the Push tab all use the service
-- role, which this does not touch). The signed-out key loses the table
-- altogether; it had no rows to see and no reason to ask.
--
-- The apps do not use this table. A phone's token goes to
-- device_push_tokens (20260613000000_device_push_tokens.sql), so no
-- installed build is affected.
--
-- ORDER. After the code that writes with the service role, which went out
-- with 1.5.1 (efb1dd87). Run before it, a browser could no longer save its
-- subscription. A merge runs this file, and running it by hand first does
-- no harm: every statement can run twice.
--
-- TO CHECK, with the public key and no sign-in. Before this ran, on
-- 2026-10-04:
--
--   GET  /rest/v1/push_subscriptions?select=endpoint&limit=1   200  []
--   POST /rest/v1/push_subscriptions  {}                        401  42501
--        "new row violates row-level security policy"
--
-- After it, both answer 401 with 42501 and "permission denied for table
-- push_subscriptions". The words are the proof: the code is 42501 both
-- times.
--
-- RUN BY HAND ON 2026-10-04, BEFORE THIS FILE REACHED main, on the owner's
-- word: shown the statements below, the owner ran them in the SQL editor and
-- said "done". Probed with the public key at 23:41Z the same day: GET 401 and
-- POST 401, both "permission denied for table push_subscriptions". The merge
-- runs the file again, which changes nothing.
-- ---------------------------------------------------------------------

-- 1. The reader's own rows: read and delete, and nothing else.
drop policy if exists "push_subscriptions_self_all" on public.push_subscriptions;

drop policy if exists "push_subscriptions_self_select" on public.push_subscriptions;
create policy "push_subscriptions_self_select" on public.push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_self_delete" on public.push_subscriptions;
create policy "push_subscriptions_self_delete" on public.push_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

-- 2. The grants under the policies, so a policy added by mistake later
--    cannot reopen writing on its own.
revoke all on public.push_subscriptions from anon;
revoke insert, update, truncate, references, trigger on public.push_subscriptions from authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- The depth answer stays on the device: the server keeps none. Depth is the
-- welcome answer to "How familiar are you with Orthodox Christianity?"
-- ("inquirer" or "faithful"), a statement of the reader's faith, which the
-- law treats as sensitive; it went to the profiles row of every signed-in
-- account, and the Privacy page named it nowhere (the arbiter's find,
-- 2026-11-11). From 1.9 the app sends no depth and asks the account for none
-- (lib/profile/preferences.ts, held by lib/profile/__tests__/noDepthSync.test.ts).
--
-- SIGNED 2026-11-11 about 13:24 UTC, his words "yes privacy and phone voice
-- in v1.9", answering call 32, which showed this SQL (sent to the arbiter at
-- 04:56 UTC and shown to him at 05:03). Not run by hand: the integration runs
-- it on the merge of 1.9 to main.
--
-- WHAT IT DOES: a trigger empties depth on every insert and update, so an
-- older app that still sends it writes the rest of its row as before and
-- leaves no depth (a constraint would refuse that app's whole write); then
-- the depth already kept is cleared.
--
-- Safe to run twice: the function is replaced, the trigger dropped if it
-- exists and made again, and the update finds nothing the second time.
-- Run twice clean on a scratch PostgreSQL 16 on 2026-11-11, with an old
-- build's write of focus and depth succeeding with depth left empty.

create or replace function public.profiles_keep_no_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.depth := null;
  return new;
end;
$$;

drop trigger if exists profiles_keep_no_depth on public.profiles;
create trigger profiles_keep_no_depth
  before insert or update on public.profiles
  for each row execute function public.profiles_keep_no_depth();

update public.profiles set depth = null where depth is not null;

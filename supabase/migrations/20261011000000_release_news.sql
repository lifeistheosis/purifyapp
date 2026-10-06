-- Release news: a new version of Purify, told to every account.
--
-- The owner, 2026-10-06, on finding that two readers had ever switched the
-- library list on: "that's just updates to the application". So a few times a
-- year, when a version is released, every account is emailed what changed,
-- unless it has said stop. The privacy page says so from the same commit.
--
-- 1. email_preferences.release_news: on until a reader turns it off. The
--    other lists (shop_offers, product_updates, community_digest) are
--    untouched and stay off until turned on.
--
-- 2. A row for every account. A row is where a reader's unsubscribe token
--    lives, and from this commit every email ends on an unsubscribe button,
--    so every account needs one before anything is sent to it. A new row is
--    the default in every column: it changes nothing about what a reader
--    gets. Accounts made after this run get theirs the first time they are
--    sent anything (lib/email/preferences.ts).
--
-- Safe to run twice: the column is added only if it is missing, and a row
-- that exists is left alone.

alter table public.email_preferences
  add column if not exists release_news boolean not null default true;

comment on column public.email_preferences.release_news is
  'A new version of Purify, a few times a year. On until the reader turns it off.';

insert into public.email_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

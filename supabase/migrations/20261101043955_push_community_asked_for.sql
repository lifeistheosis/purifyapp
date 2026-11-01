-- Community notifications are asked for, never on by default (1.8, the
-- owner's "fix all of them" on the notifications findings; CONTRIBUTING's
-- reminders bar, clause 1: "The reader asked for it. Default off, always.").
--
-- push_community was added on 20261005 as not null default true, so every
-- new profile started with Community notifications on, and turning prayer
-- reminders on was all it took to receive them. From here a new profile
-- starts off, and the reader turns them on beside the reminders (the welcome
-- questions) or in Settings, Notifications.
--
-- APPLIED BY HAND on production by the owner, 2026-11-01 (his word in chat:
-- "I sent this SQL"), before this file reached main. Running it again on
-- the merge sets the same default and the same comment: harmless.
--
-- Only the default changes. No row is written: a reader who has them on
-- keeps them on, and a reader who switched them off keeps them off.

alter table public.profiles
  alter column push_community set default false;

comment on column public.profiles.push_community is
  'Community notifications on the reader''s devices. Off until the reader turns them on (default false from 20261101).';

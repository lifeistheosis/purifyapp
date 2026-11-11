-- The faith answers stay on the device: what an account carried of them is
-- taken off. The welcome answers "how familiar are you with Orthodox
-- Christianity" (level), "after time away" (returning), the reader's
-- background, and the fast the reader keeps (fasting: strict, modified or
-- hidden) were written into every signed-in account's sign-in data
-- (auth.users, user_metadata.purify_space, lib/onboarding/accountSync.ts).
-- They are statements of the reader's faith and how it is kept, which the
-- law treats as sensitive. From 1.9 the app writes none of them (Fable
-- onboarding's accountSync.ts), and this takes off the copies already there.
-- Every other key in the sign-in data is left as it is.
--
-- SIGNED 2026-11-11 about 13:24 UTC, his words "yes privacy and phone voice
-- in v1.9", answering call 32, which showed this SQL for the first three
-- (sent to the arbiter at 04:56 UTC and shown to him at 05:03).
-- Fasting SIGNED 2026-11-11 about 14:24 UTC, his words "yes fasting" (in
-- "rec voices and yes fasting"), to this SQL with fasting added, as the
-- arbiter showed it to him: '{purify_space,fasting}' in the chain and
-- 'fasting' in the list.
-- The guard SIGNED 2026-11-11 about 14:54 UTC, his words "Yes to both.",
-- answering "yes guard": only a purify_space that is an object is touched
-- (jsonb_typeof(...) = 'object'), exactly as the Admin chat sent it to the
-- arbiter at 14:50 and the arbiter showed it to him.
--
-- NOT A MIGRATION, ON PURPOSE: it touches the auth schema, which the
-- integration's role may refuse, and the first migration that fails stops
-- every one after it (AGENTS.md). He pastes it in Supabase's SQL editor
-- after the push (OWNER-STEPS.md, R2c), and once more three weeks later for
-- an older app that wrote the answers meanwhile (a task on the admin
-- Calendar).
--
-- Safe to run twice: it touches only rows whose purify_space is an object
-- that still holds one of the four, so the second run says UPDATE 0 unless
-- an older app wrote them again. Run twice on a scratch PostgreSQL 16 on
-- 2026-11-11 with ten kinds of row (all four, background alone, level
-- alone, returning alone, fasting alone, other answers but none of these,
-- no purify_space, no sign-in data, purify_space the bare word "fasting",
-- purify_space a list holding "level" and "fasting"): the first run UPDATE
-- 5, the five rows holding one of the four, with every other key in them
-- kept (a name, focus, intent, intents, savedAt, a picture's address); the
-- second run UPDATE 0; the word and the list left as they were. Without the
-- guard, the list stopped the statement with an error and the word was
-- counted on every run: the app only ever writes an object there, but a
-- reader's own client can write any shape.

update auth.users
set raw_user_meta_data = raw_user_meta_data #- '{purify_space,level}' #- '{purify_space,returning}' #- '{purify_space,background}' #- '{purify_space,fasting}'
where jsonb_typeof(raw_user_meta_data -> 'purify_space') = 'object'
  and raw_user_meta_data -> 'purify_space' ?| array['level', 'returning', 'background', 'fasting'];

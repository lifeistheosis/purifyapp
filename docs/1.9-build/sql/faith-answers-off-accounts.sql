-- The faith answers stay on the device: what an account carried of them is
-- taken off. The welcome answers "how familiar are you with Orthodox
-- Christianity" (level), "after time away" (returning) and the reader's
-- background were written into every signed-in account's sign-in data
-- (auth.users, user_metadata.purify_space, lib/onboarding/accountSync.ts).
-- They are statements of the reader's faith, which the law treats as
-- sensitive. From 1.9 the app writes none of them (Fable onboarding's
-- accountSync.ts), and this takes off the copies already there. Every other
-- key in the sign-in data is left as it is.
--
-- SIGNED 2026-11-11 about 13:24 UTC, his words "yes privacy and phone voice
-- in v1.9", answering call 32, which showed this SQL (sent to the arbiter at
-- 04:56 UTC and shown to him at 05:03).
--
-- NOT A MIGRATION, ON PURPOSE: it touches the auth schema, which the
-- integration's role may refuse, and the first migration that fails stops
-- every one after it (AGENTS.md). He pastes it in Supabase's SQL editor
-- after the push (OWNER-STEPS.md, R2c), and once more three weeks later for
-- an older app that wrote the answers meanwhile (a task on the admin
-- Calendar).
--
-- Safe to run twice: it touches only rows that still hold one of the three,
-- so the second run says UPDATE 0 unless an older app wrote them again.
-- Run twice on a scratch PostgreSQL 16 on 2026-11-11 with eight kinds of row
-- (all three, background alone, level alone, returning alone, other answers
-- but none of these, no purify_space, no sign-in data, purify_space as a
-- plain string): the first run UPDATE 4, the four rows holding one of the
-- three, with every other key in them kept (a name, focus, intent, fasting,
-- a picture's address); the second run UPDATE 0.

update auth.users
set raw_user_meta_data = raw_user_meta_data #- '{purify_space,level}' #- '{purify_space,returning}' #- '{purify_space,background}'
where raw_user_meta_data -> 'purify_space' ?| array['level', 'returning', 'background'];

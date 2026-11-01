-- Chant words as sung, shown once their rights holder has said yes.
--
-- Build 86 note 78. The owner wants every chant's words one to one with the
-- singing. Where a choir sings a translation still under copyright (Psalm
-- 135 in English, sung by Eikona from a modern psalter), the app shows the
-- nearest public-domain wording instead, and a letter asks the holder's
-- permission (Homebase/boards/purify-master/r18/letters/). His word, the same
-- night: "then make the system and add a button to the back end so I can
-- switch it on when I receive clearance", and "let's do that".
--
-- One row a chant version (data/chants/<slug>.json, a variant's id): the
-- words as sung, their word timing (a version 2 timing file,
-- lib/chants/types.ts ChantTiming, made by scripts/chants/time-words.mjs),
-- where they come from, the clearance kept beside them (who said yes, when,
-- their reply), and the switch. Off until he switches it on in the admin
-- (Content, Chant words); on, every app shows these words within minutes,
-- read at run time through /api/chants/cleared with no new build; off again
-- puts the public-domain wording back. The words arrive with the clearance,
-- never before: the repository is public, and nothing protected is in it.
--
-- Who can do what:
--   * anyone (anon, authenticated) reads a row only while it is switched on,
--     and only the columns a reader's app needs: never the clearance record,
--     which may hold a person's name and their reply;
--   * nobody writes through the API keys at all: every write is the admin's,
--     through app/api/admin/chant-words (admin gate, zod, a rate limit),
--     with the service role, which RLS does not hold back.
--
-- Safe to run twice.

create table if not exists public.chant_cleared_words (
  id uuid primary key default gen_random_uuid(),
  chant_slug text not null check (chant_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  variant_id text not null check (variant_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- The words as sung: [{ "text": ..., "translit"?: ..., "en"?: ... }, ...], a line a sung line.
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  -- Their timing: a version 2 timing file, line for line and word for word these lines.
  timing jsonb check (timing is null or jsonb_typeof(timing) = 'object'),
  -- Where the words come from, said plainly, shown under them as a version's wordsSource is.
  words_source text check (words_source is null or length(words_source) <= 2000),
  -- The clearance: who said yes, when, and their reply as it came.
  cleared_by text check (cleared_by is null or length(cleared_by) <= 300),
  cleared_on date,
  clearance_reply text check (clearance_reply is null or length(clearance_reply) <= 20000),
  -- The switch.
  enabled boolean not null default false,
  enabled_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by_email text,
  unique (chant_slug, variant_id),
  -- Switched on only with the clearance kept and the words and their timing entered.
  constraint chant_cleared_words_on_needs_clearance check (
    not enabled
    or (
      cleared_by is not null and length(trim(cleared_by)) > 0
      and cleared_on is not null
      and clearance_reply is not null and length(trim(clearance_reply)) > 0
      and words_source is not null and length(trim(words_source)) > 0
      and jsonb_array_length(lines) > 0
      and timing is not null
    )
  )
);

comment on table public.chant_cleared_words is
  'Chant words as sung, cleared by their rights holder (build 86 note 78). Off until the owner switches a row on in the admin; readers see only rows switched on.';

alter table public.chant_cleared_words enable row level security;

drop policy if exists "chant cleared words: read while on" on public.chant_cleared_words;
create policy "chant cleared words: read while on"
  on public.chant_cleared_words
  for select
  to anon, authenticated
  using (enabled);

-- Supabase grants every new table in public to anon and authenticated whole.
-- A column grant does not subtract from a table grant (see
-- 20260802000100_revoke_public_user_id.sql), so the table grant goes first
-- and the reader's columns are granted back by name. `enabled` is among them
-- because a filter on a column needs it too.
revoke all on table public.chant_cleared_words from anon, authenticated;
grant select (chant_slug, variant_id, lines, timing, words_source, enabled, enabled_at)
  on table public.chant_cleared_words to anon, authenticated;

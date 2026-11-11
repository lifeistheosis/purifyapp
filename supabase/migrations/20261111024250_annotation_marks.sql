-- Highlights on any words, and on the texts beside the Fathers' works.
--
-- SIGNED 2026-11-11, AND RUNS WITH THE MERGE. His words, about 02:21 UTC,
-- to the arbiter's message that showed this file and asked "yes marks SQL":
-- "yes these are all fine". Every statement is unchanged from the draft he
-- read, which was kept in docs/1.9-build/sql/annotation-marks.sql until then
-- and moved here below this header. Not applied by hand: the integration runs
-- this file on the merge of 1.9 to main.
--
-- HIS READ-ONLY LOOK, DONE: run by him on production on 2026-11-11 about
-- 14:58 to 15:03 UTC (screenshots in the arbiter's chat): "kinds_outside"
-- said none; "locator_index" was the unique index
-- annotations_user_locator_idx; and, since the "checks" cell was cut off on
-- his screen, a count of the kind checks gave 1, annotations_kind_check. So
-- this file stands as signed.
--
-- WHY. His words of 2026-11-11 (build 93 note 13): "allow you to quote
-- sentences and highlight whichever section or whichever word you want in the
-- actual work itself, so it doesn't just highlight the whole paragraph." And
-- of 2026-11-10: "the same features that the Bible section has, ensure that
-- the other works also has, including the lives of the saints."
--
-- WHAT IT CHANGES, on public.annotations only:
--   1. A new column, marks (jsonb, null by default): a paragraph's highlights
--      on some of its words, each with its place, its words, its colour and
--      its note (lib/marks/anchor.ts). One paragraph stays one row.
--   2. A new kind, 'text-paragraph': a paragraph of a saint's short life, a
--      council's document, a theology essay or a history page
--      (lib/marks/textAnnotations.ts). Its locator is
--      { text, slug, doc, sectionN, paragraphIdx }.
--   3. The unique index gains the three new locator keys (text, slug, doc),
--      so two such paragraphs are two rows. Every row there today has none of
--      the three, so no two rows that differ now can collide after.
--
-- WHAT IT DOES NOT CHANGE. No row is rewritten or deleted. Row level security
-- is as it was (annotations_self_all: a reader's own rows only). Nothing
-- outside public.annotations is touched.
--
-- UNTIL IT RUNS, nothing is broken: the app asks whether the marks column is
-- there before it sends one, as it does for colour, and highlights on words
-- stay on the phone that made them.
--
-- SAFE TO RUN TWICE: every statement is "if not exists" or drops what it is
-- about to make. Run twice on a scratch PostgreSQL 16 standing on the
-- folder's 105 files, 2026-11-11: the second run changed nothing.
--
-- THE READ-ONLY LOOK to run before the merge (it changes nothing and returns
-- no reader's data): the kind check as production has it, and any kind in
-- use that this file's list would refuse.
--
--   select
--     (select string_agg(conname || ': ' || pg_get_constraintdef(oid), ' | ' order by conname)
--        from pg_constraint
--       where conrelid = 'public.annotations'::regclass and contype = 'c') as checks,
--     (select coalesce(string_agg(distinct kind, ', '), 'none')
--        from public.annotations
--       where kind not in ('bible-verse', 'saint-paragraph', 'prayer', 'text-paragraph')) as kinds_outside,
--     (select indexdef from pg_indexes
--       where schemaname = 'public' and indexname = 'annotations_user_locator_idx') as locator_index;
--
-- Expected: "checks" names annotations_kind_check with the three kinds
-- (bible-verse, saint-paragraph, prayer) and annotations_color_check;
-- "kinds_outside" says none; "locator_index" is the unique index over
-- user_id, kind and nine locator keys. If kinds_outside names anything, stop:
-- the new check would refuse that kind, and this file must name it first.

alter table public.annotations add column if not exists marks jsonb;

-- A list, and not an endless one: 200 marks on one paragraph, 256 KB at most.
alter table public.annotations drop constraint if exists annotations_marks_check;
alter table public.annotations add constraint annotations_marks_check
  check (
    marks is null
    or (jsonb_typeof(marks) = 'array' and jsonb_array_length(marks) <= 200 and pg_column_size(marks) <= 262144)
  );

alter table public.annotations drop constraint if exists annotations_kind_check;
alter table public.annotations add constraint annotations_kind_check
  check (kind in ('bible-verse', 'saint-paragraph', 'prayer', 'text-paragraph'));

drop index if exists public.annotations_user_locator_idx;
create unique index annotations_user_locator_idx on public.annotations (
  user_id,
  kind,
  coalesce(locator->>'book', ''),
  coalesce(locator->>'chapter', ''),
  coalesce(locator->>'verse', ''),
  coalesce(locator->>'saintSlug', ''),
  coalesce(locator->>'workSlug', ''),
  coalesce(locator->>'sectionN', ''),
  coalesce(locator->>'paragraphIdx', ''),
  coalesce(locator->>'ruleId', ''),
  coalesce(locator->>'prayerId', ''),
  coalesce(locator->>'text', ''),
  coalesce(locator->>'slug', ''),
  coalesce(locator->>'doc', '')
);

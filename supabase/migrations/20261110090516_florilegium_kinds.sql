-- Gather from everywhere: the kinds of line a florilegium may keep (1.9, s5-04
-- of docs/1.9-build/ideas.json).
--
-- SIGNED 2026-11-10, AND RUNS WITH THE MERGE. Signed off by the owner that
-- day ("yes florilegium"), on the plain words below: he does not read SQL, and
-- the SQL was run twice on a scratch PostgreSQL 16 by a second chat (the Admin
-- chat), standing on every migration in this folder, before he was asked.
-- Not applied by hand: the integration runs this file on the merge of 1.9 to
-- main. Should it ever be run by hand first, the merge's run changes nothing
-- (it is written to run twice). The copy for reading is
-- docs/1.9-build/sql/florilegium-kinds.sql, and
-- lib/florilegium/__tests__/kindsMigration.test.ts holds the two together,
-- word for word.
--
-- What it changes, and only this: the kinds of line a florilegium may keep.
-- Today the server takes two, a verse ('scripture') and a Father's words
-- ('father'), checked on florilegium_items.kind
-- (20260612000100_florilegia.sql). Gathering from a council's own words, and
-- later from a prayer, needs two more:
--   'council'  a council's words, with its name and the document they are from
--   'prayer'   a line of a prayer, with the prayer's name
-- Nothing else moves: no new table, no new column, the same row rules (each
-- reader reads and writes only their own lines), the same payload column.
--
-- What a reader sees: nothing, until 1.9 offers a council's line to gather.
-- An app older than 1.9 writes only 'scripture' and 'father', which stay
-- allowed; one that pulls a council's line shows it as a Father's.
--
-- What could go wrong, and why it does not: the old rule is found by what it
-- says and replaced by a wider one in the same transaction, so every line
-- kept today still passes, and there is no moment without a rule.
--
-- Check after running (expect the four kinds):
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.florilegium_items'::regclass and contype = 'c';

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.florilegium_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.florilegium_items drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.florilegium_items
  add constraint florilegium_items_kind_check
  check (kind in ('scripture', 'father', 'council', 'prayer'));

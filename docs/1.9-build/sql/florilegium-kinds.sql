-- Gather from everywhere (1.9, s5-04 of docs/1.9-build/ideas.json; his yes of
-- 2026-11-09 to the sheet's 17, "councils first", with this SQL sent to him
-- before it goes in).
--
-- NOT APPLIED. NOT A MIGRATION YET. This file waits for the owner's sign-off
-- (AGENTS.md: a production schema change is his to approve before it runs).
-- It lives in docs/, not supabase/migrations/, so that no merge to main can
-- run it by itself. On his word it is either run by hand in the SQL editor,
-- or copied into supabase/migrations/<YYYYMMDDHHMMSS>_florilegium_kinds.sql
-- (a version later than every file there) so the integration runs it.
--
-- What it changes, and only this: the kinds of line a florilegium may keep.
-- Today the server takes two, a verse ('scripture') and a Father's words
-- ('father'), checked on florilegium_items.kind
-- (supabase/migrations/20260612000100_florilegia.sql). Gathering from a
-- council's own words, and later from a prayer, needs two more:
--   'council'  a council's words, with its name and the document they are from
--   'prayer'   a line of a prayer, with the prayer's name
-- Nothing else moves: no new table, no new column, the same RLS (each reader
-- reads and writes only their own lines), the same payload column.
--
-- An app older than 1.9 that pulls a council's line keeps it and shows it as
-- a Father's (its name and source in the places a Father's take), because the
-- app writes it in that shape; nothing breaks on a reader's older phone.
--
-- Written to run twice: the old check is found and dropped by what it checks,
-- whatever name it was given, and the new one is added under a fixed name.
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

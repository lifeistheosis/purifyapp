-- Readers' things on Psalms 113 to 115, moved with the renumbering (1.9).
-- His yes, 2026-11-09: "And yes to all your 3 questions", the third being to
-- move readers' notes to the new Psalm numbers on release day.
-- SIGNED: the owner's word to the arbiter, 2026-11-13 about 04:49 UTC,
-- "yes to the 19", given on the table of all nineteen 1.9 migrations in
-- docs/1.9-build/MERGE-DAY.md (step 3).
--
-- Psalms 113 to 115 are divided as the Septuagint divides them since 1.9
-- (84a7bb9). No word changed, only where each verse stands:
--
--   113:1-8   stays     113:1-8
--   114:1-18  becomes   113:9-26
--   115:1-9   becomes   114:1-9
--   115:10-19 becomes   115:1-10
--
-- This moves readers' rows on those verses with them, once: notes and
-- highlights (annotations), saved verses and chapters (bookmarks), gathered
-- verses (florilegium_items), and the verse cards in journal pages and in
-- shared pages. The devices move their own copies (lib/bible/psalmMove.ts)
-- once they read this file's row in public.data_moves, before they sync
-- (lib/bible/psalmMoveBoot.ts), so a test build synced with production before
-- release day keeps the old numbering, as the server does.
--
-- RELEASE DAY: the owner runs this file by hand in the SQL editor just before
-- the push to main. The merge's own run then finds its row in
-- public.data_moves and does nothing, so the move is safe even if the
-- integration's run fails or the deploy goes first. Never after a 1.9 app or
-- the 1.9 website has run: until then every row is in the old numbering, so
-- nothing here can move a row twice; after it, a row at 115:10 could be either
-- numbering, and no query can tell which
-- (docs/1.9-build/drafts/psalms-113-115-move.md).
--
-- Runs twice safely: the second time it does nothing (its data_moves row).
-- Each table is moved only where it exists, so a table whose own migration
-- has not run yet stops nothing after it. Times are left as they were.
-- Checked on a scratch PostgreSQL 16 with the real unique place indexes,
-- twice with every table and twice with only annotations and bookmarks.

create table if not exists public.data_moves (
  name text primary key,
  done_at timestamptz not null default now()
);
alter table public.data_moves enable row level security;
-- Anyone may read it (the names of the moves made, and when): the apps ask it
-- whether the server has moved before they move their own copies
-- (lib/bible/psalmMoveBoot.ts). Nobody writes it from an app: no write policy.
grant select on public.data_moves to anon, authenticated;
drop policy if exists "data moves are public" on public.data_moves;
create policy "data moves are public" on public.data_moves for select to anon, authenticated using (true);

-- One verse card line in the new numbering: two cards where it crosses the
-- new line between 114 and 115. Every other line as it was.
create or replace function pg_temp.psalm_card(line text) returns text
language plpgsql immutable as $$
declare
  m text[];
  c int; f int; t int;
  fc int; fv int; tc int; tv int;
begin
  m := regexp_match(line, '^\[\[verse psalms (114|115):(\d{1,3})(?:-(\d{1,3}))?\]\]$');
  if m is null then
    return line;
  end if;
  c := m[1]::int;
  f := m[2]::int;
  t := coalesce(m[3]::int, f);
  fc := case when c = 114 then 113 when f <= 9 then 114 else 115 end;
  fv := case when c = 114 then f + 8 when f <= 9 then f else f - 9 end;
  tc := case when c = 114 then 113 when t <= 9 then 114 else 115 end;
  tv := case when c = 114 then t + 8 when t <= 9 then t else t - 9 end;
  if fc = tc then
    return '[[verse psalms ' || fc || ':' || fv || case when tv > fv then '-' || tv else '' end || ']]';
  end if;
  return '[[verse psalms ' || fc || ':' || fv || case when fv < 9 then '-9' else '' end || ']]'
      || E'\n\n'
      || '[[verse psalms ' || tc || ':1' || case when tv > 1 then '-' || tv else '' end || ']]';
end $$;

-- A page's text, line by line, so no moved card is moved again.
create or replace function pg_temp.psalm_body(body text) returns text
language sql immutable as $$
  select string_agg(pg_temp.psalm_card(line), E'\n' order by n)
  from unnest(string_to_array(body, E'\n')) with ordinality as t(line, n)
$$;

do $$
begin
  if exists (select 1 from public.data_moves where name = 'psalms-113-115') then
    raise notice 'Psalms 113 to 115: readers'' rows were moved already; nothing to do.';
    return;
  end if;

  -- Each table only where it exists: a table this file reaches before its
  -- own migration has run holds nothing in the old numbering, and a file
  -- that failed on it would stop every migration after it.
  if to_regclass('public.annotations') is not null then
    -- Notes and highlights, then saved verses: the same three steps. Each step
    -- first drops an old row whose new place the same reader already holds
    -- (none should, before 1.9; the unique place-index would stop the run).
    --
    -- 1. 114:v -> 113:v+8
    delete from public.annotations a
     where a.kind = 'bible-verse' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '114'
       and exists (select 1 from public.annotations b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms'
                      and b.locator->>'chapter' = '113' and b.locator->>'verse' = ((a.locator->>'verse')::int + 8)::text);
    update public.annotations
       set locator = locator || jsonb_build_object('chapter', 113, 'verse', (locator->>'verse')::int + 8)
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '114';
    -- 2. 115:1-9 -> 114:1-9 (114 is clear now)
    delete from public.annotations a
     where a.kind = 'bible-verse' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '115'
       and (a.locator->>'verse')::int <= 9
       and exists (select 1 from public.annotations b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms'
                      and b.locator->>'chapter' = '114' and b.locator->>'verse' = a.locator->>'verse');
    update public.annotations
       set locator = locator || jsonb_build_object('chapter', 114)
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int <= 9;
    -- 3. 115:10-19 -> 115:1-10, by way of 1001-1010 so no row lands on one not yet moved
    update public.annotations
       set locator = locator || jsonb_build_object('verse', (locator->>'verse')::int - 9 + 1000)
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int between 10 and 999;
    update public.annotations
       set locator = locator || jsonb_build_object('verse', (locator->>'verse')::int - 1000)
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int > 1000;
  end if;

  if to_regclass('public.bookmarks') is not null then
    -- Saved verses, the same way, with their labels ("Psalms 114:4").
    delete from public.bookmarks a
     where a.kind = 'bible-verse' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '114'
       and exists (select 1 from public.bookmarks b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms'
                      and b.locator->>'chapter' = '113' and b.locator->>'verse' = ((a.locator->>'verse')::int + 8)::text);
    update public.bookmarks
       set locator = locator || jsonb_build_object('chapter', 113, 'verse', (locator->>'verse')::int + 8),
           label = regexp_replace(label, '\d+:\d+$', '113:' || ((locator->>'verse')::int + 8))
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '114';
    delete from public.bookmarks a
     where a.kind = 'bible-verse' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '115'
       and (a.locator->>'verse')::int <= 9
       and exists (select 1 from public.bookmarks b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms'
                      and b.locator->>'chapter' = '114' and b.locator->>'verse' = a.locator->>'verse');
    update public.bookmarks
       set locator = locator || jsonb_build_object('chapter', 114),
           label = regexp_replace(label, '\d+:(\d+)$', '114:\1')
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int <= 9;
    update public.bookmarks
       set locator = locator || jsonb_build_object('verse', (locator->>'verse')::int - 9 + 1000)
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int between 10 and 999;
    update public.bookmarks
       set locator = locator || jsonb_build_object('verse', (locator->>'verse')::int - 1000),
           label = regexp_replace(label, '\d+:\d+$', '115:' || ((locator->>'verse')::int - 1000))
     where kind = 'bible-verse' and locator->>'book' = 'psalms' and locator->>'chapter' = '115'
       and (locator->>'verse')::int > 1000;

    -- Saved chapters: each to the chapter it now begins in (114 -> 113, 115 -> 114).
    delete from public.bookmarks a
     where a.kind = 'bible-chapter' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '114'
       and exists (select 1 from public.bookmarks b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms' and b.locator->>'chapter' = '113');
    update public.bookmarks
       set locator = locator || jsonb_build_object('chapter', 113), label = regexp_replace(label, '\d+$', '113')
     where kind = 'bible-chapter' and locator->>'book' = 'psalms' and locator->>'chapter' = '114';
    delete from public.bookmarks a
     where a.kind = 'bible-chapter' and a.locator->>'book' = 'psalms' and a.locator->>'chapter' = '115'
       and exists (select 1 from public.bookmarks b
                    where b.user_id = a.user_id and b.kind = a.kind and b.locator->>'book' = 'psalms' and b.locator->>'chapter' = '114');
    update public.bookmarks
       set locator = locator || jsonb_build_object('chapter', 114), label = regexp_replace(label, '\d+$', '114')
     where kind = 'bible-chapter' and locator->>'book' = 'psalms' and locator->>'chapter' = '115';
  end if;

  if to_regclass('public.florilegium_items') is not null then
    -- Gathered verses: their place and its label. The words were gathered
    -- verbatim, and no word changed.
    update public.florilegium_items
       set payload = payload || jsonb_build_object(
             'chapter', case when payload->>'chapter' = '114' then 113 when (payload->>'verse')::int <= 9 then 114 else 115 end,
             'verse', case when payload->>'chapter' = '114' then (payload->>'verse')::int + 8
                           when (payload->>'verse')::int <= 9 then (payload->>'verse')::int
                           else (payload->>'verse')::int - 9 end,
             'reference', regexp_replace(coalesce(payload->>'reference', ''), '\d+:\d+$',
               case when payload->>'chapter' = '114' then '113:' || ((payload->>'verse')::int + 8)
                    when (payload->>'verse')::int <= 9 then '114:' || (payload->>'verse')
                    else '115:' || ((payload->>'verse')::int - 9) end))
     where kind = 'scripture' and payload->>'book' = 'psalms' and payload->>'chapter' in ('114', '115');
  end if;

  if to_regclass('public.journal_entries') is not null then
    -- Verse cards in journal pages and in shared pages.
    update public.journal_entries
       set body = pg_temp.psalm_body(body)
     where body is not null and (body like '%[[verse psalms 114:%' or body like '%[[verse psalms 115:%');
  end if;
  if to_regclass('public.shared_pages') is not null then
    update public.shared_pages
       set body = pg_temp.psalm_body(body)
     where body is not null and (body like '%[[verse psalms 114:%' or body like '%[[verse psalms 115:%');
  end if;

  insert into public.data_moves (name) values ('psalms-113-115');
end $$;

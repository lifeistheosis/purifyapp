-- DRAFT for the owner's sign-off (Fable's release check 1, M1). Not a
-- migration until he says yes; then it goes into supabase/migrations under a
-- fresh 14-digit name, to run in the 1.9 merge.
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
-- shared pages. The devices move their own copies (lib/bible/psalmMove.ts).
--
-- WHEN: in the 1.9 merge, or by hand just before it. Never after a 1.9 app
-- or the 1.9 website has run: until then every row is in the old numbering,
-- so nothing here can move a row twice. After it, a row at 115:10 could be
-- either numbering, and no query can tell which. The draft note says why:
-- docs/1.9-build/drafts/psalms-113-115-move.md.
--
-- Run twice, it does nothing the second time (the row it leaves in
-- public.data_moves). Times are left as they were.

create table if not exists public.data_moves (
  name text primary key,
  done_at timestamptz not null default now()
);
-- The service role's alone: no policy, so no reader reads or writes it.
alter table public.data_moves enable row level security;

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

  -- Verse cards in journal pages and in shared pages.
  update public.journal_entries
     set body = pg_temp.psalm_body(body)
   where body is not null and (body like '%[[verse psalms 114:%' or body like '%[[verse psalms 115:%');
  update public.shared_pages
     set body = pg_temp.psalm_body(body)
   where body is not null and (body like '%[[verse psalms 114:%' or body like '%[[verse psalms 115:%');

  insert into public.data_moves (name) values ('psalms-113-115');
end $$;

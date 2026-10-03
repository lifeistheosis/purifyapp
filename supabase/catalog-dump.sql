-- ============================================================
--  Purify: what production holds, by name
--  Read-only. One SELECT, no writes, no DDL, no row data.
--  Paste the whole file into the Supabase SQL editor and Run.
-- ============================================================
--
-- It answers two questions that a file sitting in supabase/migrations cannot:
--
--   1. What does supabase_migrations.schema_migrations hold? That table is
--      what the Supabase GitHub integration reads to decide which files are
--      still to run. (H lines.)
--   2. Which objects of the public schema exist? Compared against a replay
--      of supabase/migrations on an empty database, that says which files
--      have really been applied and which have not. (Every other line.)
--
-- The result is ONE row with ONE cell, on purpose: the SQL editor cuts a
-- long result off at its row limit without saying so, and one cell cannot be
-- cut. Copy that cell whole.
--
-- What each line is:
--
--   V  server version
--   H  version | name | statements          a row of the migration history
--   T  table | kind | rls | anon | auth | columns
--        anon / auth are the TABLE-WIDE privileges of those roles:
--        s select, i insert, u update, d delete
--   X  table | role | privilege | columns   column grants, listed only where
--        the role has no table-wide grant for that privilege
--   F  function(args) | security definer | anon may execute |
--        authenticated may execute | fingerprint of the body
--   G  table | trigger | function | enabled
--   I  table | index | unique              indexes that back a key are left out
--   P  table | policy | command | roles | permissive
--   C  table | constraint | type | fingerprint of the quoted values in it
--        check, unique and exclusion constraints; keys are left out
--   E  extension | version
--
-- Names and fingerprints only. No row of any table is read, apart from the
-- migration history itself.

with tbl as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p', 'v', 'm')
     and not exists (
           select 1 from pg_depend d
            where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
),
lines as (
  select 'V' as k, current_setting('server_version') as a, '' as b

  union all
  select 'H', version,
         coalesce(name, '') || '|' || coalesce(array_length(statements, 1), 0)
    from supabase_migrations.schema_migrations

  union all
  select 'T', t.relname::text,
         t.relkind::text
         || '|rls=' || t.relrowsecurity::int
         || '|anon=' || concat(
              case when has_table_privilege('anon', t.oid, 'SELECT') then 's' end,
              case when has_table_privilege('anon', t.oid, 'INSERT') then 'i' end,
              case when has_table_privilege('anon', t.oid, 'UPDATE') then 'u' end,
              case when has_table_privilege('anon', t.oid, 'DELETE') then 'd' end)
         || '|auth=' || concat(
              case when has_table_privilege('authenticated', t.oid, 'SELECT') then 's' end,
              case when has_table_privilege('authenticated', t.oid, 'INSERT') then 'i' end,
              case when has_table_privilege('authenticated', t.oid, 'UPDATE') then 'u' end,
              case when has_table_privilege('authenticated', t.oid, 'DELETE') then 'd' end)
         || '|' || coalesce((
              select string_agg(a.attname::text, ',' order by a.attnum)
                from pg_attribute a
               where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped), '')
    from tbl t

  union all
  select 'X', t.relname::text,
         r.rolname || '|' || p.priv || '|' || string_agg(a.attname::text, ',' order by a.attnum)
    from tbl t
   cross join (values ('anon'), ('authenticated')) as r(rolname)
   cross join (values ('SELECT'), ('INSERT'), ('UPDATE')) as p(priv)
    join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
   where not has_table_privilege(r.rolname, t.oid, p.priv)
     and has_column_privilege(r.rolname, t.oid, a.attnum, p.priv)
   group by t.relname, r.rolname, p.priv

  union all
  select 'F', p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'definer=' || p.prosecdef::int
         || '|anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::int
         || '|auth=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::int
         || '|' || left(md5(translate(p.prosrc, E' \t\n\r\f\x0b', '')), 12)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and not exists (
           select 1 from pg_depend d
            where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')

  union all
  select 'G', case when n.nspname = 'public' then c.relname::text else n.nspname::text || '.' || c.relname::text end,
         g.tgname::text || '|' || fp.proname::text || '|' || g.tgenabled::text
    from pg_trigger g
    join pg_class c on c.oid = g.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc fp on fp.oid = g.tgfoid
    join pg_namespace fn on fn.oid = fp.pronamespace
   where not g.tgisinternal
     and (n.nspname = 'public' or (n.nspname = 'auth' and fn.nspname = 'public'))

  union all
  select 'I', c.relname::text, i.relname::text || '|unique=' || x.indisunique::int
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class c on c.oid = x.indrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and not exists (select 1 from pg_constraint k where k.conindid = x.indexrelid)

  union all
  select 'P', tablename::text,
         policyname::text || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || permissive
    from pg_policies
   where schemaname = 'public'

  union all
  select 'C', c.relname::text,
         o.conname::text || '|' || o.contype::text || '|' || left(md5(coalesce((
           select string_agg(m[1], ',' order by m[1])
             from regexp_matches(pg_get_constraintdef(o.oid), '''([^'']*)''', 'g') as m), '')), 12)
    from pg_constraint o
    join pg_class c on c.oid = o.conrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and o.contype in ('c', 'u', 'x')

  union all
  select 'E', extname::text, extversion from pg_extension
)
select string_agg(k || '|' || a || '|' || b, E'\n' order by k, a, b) as catalog_dump
  from lines;

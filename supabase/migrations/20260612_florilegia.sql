-- v10 — florilegia (Purify Plus sync target)
--
-- The Florilegium feature: personal named collections into which a reader
-- gathers verses and patristic lines, each with an optional note. The app
-- stores them local-first (lib/florilegium/florilegium.ts); these tables
-- are the cross-device sync target, available to Plus subscribers when
-- ENTITLEMENTS_ENFORCED flips at v10.
--
-- Two tables, parent + child, both RLS-scoped to the owner. The child
-- cascades on collection delete. IDs are the client-generated UUIDs so a
-- local item and its server row share identity, making the two-way merge
-- idempotent (same discipline as bookmarks).

create table if not exists public.florilegia (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists florilegia_user_updated_idx
  on public.florilegia (user_id, updated_at desc);

alter table public.florilegia enable row level security;

drop policy if exists "florilegia_self_all" on public.florilegia;
create policy "florilegia_self_all" on public.florilegia
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.florilegium_items (
  id uuid primary key,
  florilegium_id uuid not null references public.florilegia on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('scripture', 'father')),
  -- The gathered payload (text, reference/author, deep-link fields). Kept
  -- as jsonb so the two item shapes share one column, exactly like the
  -- bookmarks/annotations locator pattern.
  payload jsonb not null,
  note text,
  added_at timestamptz not null default now()
);

create index if not exists florilegium_items_collection_idx
  on public.florilegium_items (florilegium_id, added_at desc);
create index if not exists florilegium_items_user_idx
  on public.florilegium_items (user_id);

alter table public.florilegium_items enable row level security;

drop policy if exists "florilegium_items_self_all" on public.florilegium_items;
create policy "florilegium_items_self_all" on public.florilegium_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

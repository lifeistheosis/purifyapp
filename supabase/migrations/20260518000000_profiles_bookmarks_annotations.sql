-- v3.3 — profiles, bookmarks, annotations
-- Magic-link Supabase Auth backs the account system; this migration
-- adds the three tables the app reads/writes for signed-in users.
-- Local-only readers continue to work without ever touching these.

-- =============================================================
-- profiles: one row per auth.users, created via trigger on sign-up
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_self_insert" on public.profiles;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row on every new auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- bookmarks: server mirror of localStorage purify:bookmarks
-- =============================================================
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('bible-verse', 'bible-chapter', 'writing-section')),
  locator jsonb not null,
  label text not null,
  added_at timestamptz not null default now()
);

create index if not exists bookmarks_user_added_idx on public.bookmarks (user_id, added_at desc);

-- Unique-per-user+locator. Different kinds use different locator fields;
-- coalescing each field to '' lets the unique index treat absent keys
-- consistently so a verse bookmark and a chapter bookmark on the same book
-- don't collide.
create unique index if not exists bookmarks_user_locator_idx on public.bookmarks (
  user_id,
  kind,
  coalesce(locator->>'book', ''),
  coalesce(locator->>'chapter', ''),
  coalesce(locator->>'verse', ''),
  coalesce(locator->>'saintSlug', ''),
  coalesce(locator->>'workSlug', ''),
  coalesce(locator->>'sectionN', '')
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_self_all" on public.bookmarks;
create policy "bookmarks_self_all" on public.bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================
-- annotations: verse highlights/notes + saint paragraph highlights/notes
-- =============================================================
create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('bible-verse', 'saint-paragraph')),
  locator jsonb not null,
  highlighted boolean not null default false,
  highlighted_words int[] default null,
  note text default null,
  updated_at timestamptz not null default now()
);

create index if not exists annotations_user_updated_idx on public.annotations (user_id, updated_at desc);

create unique index if not exists annotations_user_locator_idx on public.annotations (
  user_id,
  kind,
  coalesce(locator->>'book', ''),
  coalesce(locator->>'chapter', ''),
  coalesce(locator->>'verse', ''),
  coalesce(locator->>'saintSlug', ''),
  coalesce(locator->>'workSlug', ''),
  coalesce(locator->>'sectionN', ''),
  coalesce(locator->>'paragraphIdx', '')
);

alter table public.annotations enable row level security;

drop policy if exists "annotations_self_all" on public.annotations;
create policy "annotations_self_all" on public.annotations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

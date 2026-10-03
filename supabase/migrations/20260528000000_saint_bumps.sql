-- v5.5 — saint bumps
-- Signed-in users upvote ("bump") a saint to signal "I want more of his/her works."
-- One bump per (user, saint). Toggling = insert if missing, delete if present.
-- Editorial team reads `saint_bump_counts` to prioritize new translations.

create table if not exists public.saint_bumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  saint_slug text not null,
  bumped_at timestamptz not null default now(),
  unique (user_id, saint_slug)
);

create index if not exists saint_bumps_slug_idx on public.saint_bumps (saint_slug);
create index if not exists saint_bumps_bumped_at_idx on public.saint_bumps (bumped_at);

alter table public.saint_bumps enable row level security;

drop policy if exists "saint_bumps_self_select" on public.saint_bumps;
drop policy if exists "saint_bumps_self_insert" on public.saint_bumps;
drop policy if exists "saint_bumps_self_delete" on public.saint_bumps;

create policy "saint_bumps_self_select" on public.saint_bumps
  for select using (auth.uid() = user_id);
create policy "saint_bumps_self_insert" on public.saint_bumps
  for insert with check (auth.uid() = user_id);
create policy "saint_bumps_self_delete" on public.saint_bumps
  for delete using (auth.uid() = user_id);

-- Public aggregate: count + last-bumped per slug. Readable by anon so the
-- saint profile can show a total even when no one is signed in. Individual
-- bumper identities stay private behind the per-row RLS above.
-- View runs with definer (owner) rights so the aggregate is visible to anon
-- without exposing individual saint_bumps rows (RLS still hides those).
create or replace view public.saint_bump_counts as
  select saint_slug, count(*)::int as bumps, max(bumped_at) as last_bumped_at
  from public.saint_bumps
  group by saint_slug;

grant select on public.saint_bump_counts to anon, authenticated;

-- The Kitchen (was the Trapeza): photos on recipes, and community reviews
-- with photos attached.
--
-- Additive only. Nothing is dropped or renamed: the tables keep their
-- trapeza_ names, because the installed apps read them through /api/trapeza
-- and a rename would break every phone that has not updated. Only the name a
-- reader sees changes.
--
-- Safe to re-run.
--
-- Applied by hand in the Supabase SQL editor by the owner on 2026-09-28,
-- before this file was committed; it is here so the folder records it. Every
-- statement is idempotent, so the merge running it again changes nothing.

-- 1. A photo of the dish on each recipe, with a credit line for when the
--    photo is not our own.
alter table public.trapeza_recipes
  add column if not exists photo_url text
    check (photo_url is null or char_length(photo_url) <= 600),
  add column if not exists photo_credit text
    check (photo_credit is null or char_length(photo_credit) <= 200);

-- 2. Reviews. One per member per recipe, which they can edit or delete.
--    Post-moderated like the community feed: a review shows at once and a
--    report sends it to the admin Community tab. Up to four photos, stored in
--    the public "kitchen" bucket. The name and picture are copied from the
--    member's profile when they post, as community posts do.
--
--    No read policy on purpose. Every read goes through /api/trapeza on the
--    service role, which sends a "this one is yours" flag instead of the
--    member's user id, so no uuid ever reaches a browser.
create table if not exists public.trapeza_recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.trapeza_recipes on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  author_avatar text check (author_avatar is null or char_length(author_avatar) <= 600),
  stars int not null check (stars between 1 and 5),
  body text check (body is null or char_length(body) <= 2000),
  photo_urls text[] not null default '{}'
    check (coalesce(array_length(photo_urls, 1), 0) <= 4),
  status text not null default 'published'
    check (status in ('published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, author_id)
);

create index if not exists trapeza_recipe_reviews_recipe_idx
  on public.trapeza_recipe_reviews (recipe_id, status, created_at desc);
create index if not exists trapeza_recipe_reviews_author_idx
  on public.trapeza_recipe_reviews (author_id);

alter table public.trapeza_recipe_reviews enable row level security;
-- No policies: service role only.

-- 3. A report can name a review as well as a recipe. recipe_id stays set on
--    a review report (the review's own recipe), so the existing admin list
--    keeps working.
alter table public.trapeza_recipe_reports
  add column if not exists review_id uuid
    references public.trapeza_recipe_reviews on delete cascade;
create index if not exists trapeza_recipe_reports_review_idx
  on public.trapeza_recipe_reports (review_id)
  where review_id is not null;

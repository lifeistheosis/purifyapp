-- The Trapeza: fasting-friendly recipes for the community (Beta 2.0).
--
-- "Trapeza" is the monastic word for the shared meal. A browsable board of
-- recipes filtered by fast level, season, and tradition. Curated recipes come
-- from the Purify kitchen (author_id null); members may submit their own, which
-- land PENDING and are published only after review. Recipes are content, so
-- submissions are pre-moderated (unlike prayer campaigns, which are post-moderated)
-- to keep rights and quality in hand.
--
-- Reads are public (published only). Every write is service-role behind the
-- API. Apply after the base schema.

create extension if not exists pgcrypto;

create table if not exists public.trapeza_recipes (
  id uuid primary key default gen_random_uuid(),
  -- Null = curated by the Purify kitchen; otherwise the submitting member.
  author_id uuid references auth.users on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  -- What fast the dish suits. xerophagy (no oil), oil_wine, fish, or any (a
  -- non-fasting or dairy day). Mirrors the calendar's FastKind in spirit.
  fast_level text not null check (fast_level in
    ('xerophagy', 'oil_wine', 'fish', 'any')),
  season text not null default 'any' check (season in
    ('any', 'nativity', 'lent', 'apostles', 'dormition')),
  tradition text not null default 'any' check (tradition in
    ('any', 'greek', 'russian', 'levantine', 'balkan')),
  summary text check (summary is null or char_length(summary) <= 280),
  ingredients text not null check (char_length(ingredients) <= 2000),
  steps text not null check (char_length(steps) <= 4000),
  servings text check (servings is null or char_length(servings) <= 40),
  time_minutes integer check (time_minutes is null or time_minutes >= 0),
  status text not null default 'pending' check (status in
    ('pending', 'published', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trapeza_recipes_status_created_idx
  on public.trapeza_recipes (status, created_at desc);
create index if not exists trapeza_recipes_level_idx
  on public.trapeza_recipes (fast_level);
create index if not exists trapeza_recipes_author_idx
  on public.trapeza_recipes (author_id);

alter table public.trapeza_recipes enable row level security;

-- Anyone may read a published recipe.
create policy "trapeza_recipes_public_select" on public.trapeza_recipes
  for select using (status = 'published');
-- An author may read their own submissions, including pending ones.
create policy "trapeza_recipes_author_select" on public.trapeza_recipes
  for select using (auth.uid() = author_id);
-- No client writes: submit / publish / remove are all service-role.

create table if not exists public.trapeza_recipe_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.trapeza_recipes on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists trapeza_recipe_reports_recipe_idx
  on public.trapeza_recipe_reports (recipe_id, created_at desc);
alter table public.trapeza_recipe_reports enable row level security;
-- No policies: service-role only.

-- ---------------------------------------------------------------------
-- A few original, generic starter recipes (from the Purify kitchen) so the
-- board is not empty on first light. These are plain traditional dishes in
-- original wording; no third party's text, no rights to clear.
-- ---------------------------------------------------------------------
insert into public.trapeza_recipes
  (author_id, title, fast_level, season, tradition, summary, ingredients, steps, servings, time_minutes, status)
values
  (null,
   'Lenten Lentil Soup',
   'oil_wine', 'lent', 'any',
   'A plain, warming soup for the days of the fast, gentle and filling.',
   'Brown lentils, one onion, two carrots, two cloves of garlic, a bay leaf, olive oil, salt, a little vinegar or lemon at the end.',
   'Rinse the lentils. Soften the chopped onion, carrot, and garlic in a little olive oil. Add the lentils, the bay leaf, and enough water to cover well. Simmer until the lentils are soft, about forty minutes, adding water as needed. Salt near the end, and finish with a spoon of vinegar or a squeeze of lemon.',
   'Four', 50, 'published'),
  (null,
   'Xerophagy Chickpea and Herb Salad',
   'xerophagy', 'any', 'levantine',
   'For the strict days, when oil is set aside: bright, simple, and satisfying.',
   'Cooked or tinned chickpeas, one cucumber, a handful of parsley, a little red onion, lemon juice, salt.',
   'Drain and rinse the chickpeas. Dice the cucumber and onion small, and chop the parsley. Toss everything with plenty of lemon juice and a little salt. Let it sit ten minutes before serving so the flavours settle.',
   'Two to three', 15, 'published'),
  (null,
   'Baked Fish with Lemon and Herbs',
   'fish', 'any', 'greek',
   'For the feasts within the fast when fish is blessed, such as the Annunciation and Palm Sunday.',
   'A whole white fish or fillets, olive oil, one lemon, garlic, oregano, salt and pepper.',
   'Heat the oven to a moderate temperature. Lay the fish in a dish, rub with olive oil, and season with salt, pepper, and oregano. Scatter thin lemon slices and sliced garlic over and around it. Bake until the flesh is opaque and flakes easily, about twenty-five minutes for fillets, longer for a whole fish.',
   'Two', 35, 'published');

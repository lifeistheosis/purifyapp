-- ---------------------------------------------------------------------
-- Community word filter, 2026-10-02.
--
-- A post or reply that carries a word on the filter (slurs and the most
-- explicit terms, lib/moderation) is asked about first ("Is this
-- appropriate?"), then published with those words masked, and held here
-- with its original words for a moderator: approve as written, keep hidden,
-- or remove. Handles that carry a listed word are refused outright.
--
-- WHAT THIS ADDS
--   community_text_holds    one row per masked post or reply: the original
--                           title and body, what a moderator decided, when
--                           and who. The originals live only here, never in
--                           the public post row, so no reader can read them.
--   community_filter_terms  words the team adds from the admin panel, on top
--                           of the list built into the app: masked in writing
--                           ('text', and refused in handles too) or refused in
--                           handles only ('handle').
--
-- PRIVACY. Both tables have RLS on and no policy: the service role reads and
-- writes them behind the API routes and the admin panel, nobody else.
--
-- Additive and idempotent: if not exists, drop then create.
-- ---------------------------------------------------------------------

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. Held words -------------------------------------------------------------

create table if not exists public.community_text_holds (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts (id) on delete cascade,
  reply_id uuid references public.community_post_replies (id) on delete cascade,
  original_title text check (original_title is null or char_length(original_title) <= 200),
  original_body text check (original_body is null or char_length(original_body) <= 5000),
  hits integer not null default 1 check (hits between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'kept', 'removed')),
  resolved_by_email text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint community_text_holds_one_target check (
    (post_id is not null and reply_id is null) or (post_id is null and reply_id is not null)
  )
);

create index if not exists community_text_holds_pending_idx
  on public.community_text_holds (created_at desc)
  where status = 'pending';

alter table public.community_text_holds enable row level security;
-- No policy on purpose: service role only.

-- 2. The team's own words ---------------------------------------------------

create table if not exists public.community_filter_terms (
  term text primary key check (term = lower(term) and char_length(term) between 2 and 60),
  scope text not null default 'text' check (scope in ('text', 'handle')),
  whole_word boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now()
);

alter table public.community_filter_terms enable row level security;
-- No policy on purpose: service role only.

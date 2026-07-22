-- Community conversations: the social half of the Community tab.
-- Posts come in three kinds: a discussion in the reader's own words, or a
-- share of a line the reader gathered in their Florilegium (scripture or a
-- Father, always verbatim + cited, i.e. Purify's own vetted content — no
-- fresh doctrinal text enters the app through this surface).
--
-- Reads are public (anon select of visible rows). ALL writes flow through
-- the API with the service role: zod validation, rate limits, and the
-- author identity denormalized server-side. Author name/avatar are
-- snapshots at post time from auth user metadata.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('discussion', 'scripture', 'father')),
  title text,
  body text,
  quote_text text,
  quote_source text,
  quote_href text,
  author_name text not null default 'Reader',
  author_avatar text,
  reply_count integer not null default 0,
  status text not null default 'visible' check (status in ('visible', 'removed')),
  created_at timestamptz not null default now(),
  constraint community_posts_discussion_body check (
    kind <> 'discussion' or (body is not null and length(body) > 0)
  ),
  constraint community_posts_share_quote check (
    kind = 'discussion' or (quote_text is not null and quote_source is not null)
  )
);

alter table public.community_posts enable row level security;

create policy "community_posts_public_read" on public.community_posts
  for select using (status = 'visible');

create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc);

create table if not exists public.community_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  author_name text not null default 'Reader',
  author_avatar text,
  created_at timestamptz not null default now()
);

alter table public.community_post_replies enable row level security;

create policy "community_replies_public_read" on public.community_post_replies
  for select using (true);

create index if not exists community_replies_post_idx
  on public.community_post_replies (post_id, created_at);

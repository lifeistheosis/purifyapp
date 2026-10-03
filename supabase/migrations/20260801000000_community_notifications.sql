-- Community notifications.
--
-- Until now nothing came back to you. If someone replied to your post you
-- found out by reopening the tab and scrolling to your own post: no table,
-- no inbox, no badge, no mail. The audit called this the single
-- highest-leverage addition to Community and it is the first half of
-- Release E.
--
-- Deliberately narrow. One row per event, addressed to one user, carrying
-- only what an inbox row needs to render and link. No fan-out, no digest,
-- no preferences table: a reader who wants none of it can mute the whole
-- feature from Settings, which is a client-side flag, not a column here.
--
-- Apply in the Supabase SQL editor for project avbqyvjgcrucjwevwixt. The
-- feature reads as empty until this lands; nothing 500s without it.

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who is being told.
  user_id uuid not null references auth.users(id) on delete cascade,
  -- What happened. Only replies today; the check widens with the feature
  -- rather than accepting free text now and regretting it later.
  kind text not null check (kind in ('reply')),
  -- What it happened to, and what caused it. Both cascade: a deleted post
  -- must not leave an inbox row pointing at nothing.
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reply_id uuid references public.community_post_replies(id) on delete cascade,
  -- Denormalised for the inbox row so rendering it is one query, not three.
  -- A name is a display string here, never an identifier: the actor's
  -- user_id is deliberately NOT stored, for the same reason the public feed
  -- stopped serving user_id (it is also the RevenueCat appUserID and the
  -- avatar storage path segment).
  actor_name text not null default 'Reader',
  excerpt text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.community_notifications enable row level security;

-- A reader sees their own notifications and nobody else's. There is no
-- insert or delete policy on purpose: rows are written by the service role
-- from the reply route, never by a client, so nobody can manufacture a
-- notification for someone else.
create policy "community_notifications_own_read"
  on public.community_notifications
  for select using (auth.uid() = user_id);

-- A reader may mark their own rows read. The `with check` keeps an update
-- from reassigning a row to somebody else.
create policy "community_notifications_own_update"
  on public.community_notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The inbox query: newest first for one reader.
create index if not exists community_notifications_user_idx
  on public.community_notifications (user_id, created_at desc);

-- The badge query: unread count for one reader. Partial, because the badge
-- only ever asks about unread rows and this keeps the index small as the
-- table grows.
create index if not exists community_notifications_unread_idx
  on public.community_notifications (user_id)
  where read_at is null;

-- Mark every unread row read in one statement, so opening the inbox is a
-- single round trip rather than one update per row. Security definer with a
-- fixed search_path, and it can only ever touch the caller's own rows.
create or replace function public.community_mark_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null;
$$;

revoke all on function public.community_mark_notifications_read() from public;
grant execute on function public.community_mark_notifications_read() to authenticated;

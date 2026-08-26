-- Likes, dislikes, and a verified badge for the Community.
--
-- Two features in one file because they land on the same surface and would
-- otherwise be two migrations nobody applies in the right order.
--
-- ── 1. Reactions ────────────────────────────────────────────────────────
--
-- THE "CANNOT LIKE AND DISLIKE AT ONCE" RULE IS A CONSTRAINT, NOT A HANDLER.
-- The obvious build is two counter columns and an API that checks before it
-- writes. That is a check-then-act with a gap in the middle: a double-tap, or
-- the same account on a phone and a laptop, races through it and leaves a user
-- holding both. Here one row IS the reaction, `value` is which way it points,
-- and the partial unique indexes make a second row for the same target
-- impossible. Flipping like to dislike is an UPDATE of one column. The
-- database, not the route, is what guarantees the rule.
--
-- Two nullable target columns rather than a polymorphic (target_type,
-- target_id) pair, because a real foreign key means a deleted post takes its
-- reactions with it. A text discriminator cannot cascade, and orphaned
-- reaction rows are how counts drift.
--
-- COUNTS ARE A TRIGGER, and this is the one place in this codebase where that
-- is right. AGENTS.md notes there is no pgTAP and no `supabase start`, so a
-- trigger cannot be unit-tested here, and the inventory work deliberately used
-- an app-called function instead. Reactions are different in the way that
-- matters: they are the highest-frequency write in the app, the count is read
-- by an anonymous cached feed that must not query a second table, and a count
-- maintained in application code drifts the first time a request dies between
-- its two writes. Atomicity is worth more than testability here. The recount
-- statement at the bottom of this file is the repair if it ever does drift.
--
-- ── 2. Verification ─────────────────────────────────────────────────────
--
-- public.profiles is SELF-SELECT ONLY (20260518:profiles_self_select), so no
-- client can read whether somebody else is verified, and the community feed
-- deliberately carries no author id at all (components/community/CommunityClient
-- .tsx:275) because serving the auth uuid to anonymous readers was closed as a
-- security hole in 20260802_revoke_public_user_id.sql.
--
-- So the badge cannot be a client-side join, and this table is service-role
-- only. The feed route already runs with the admin client and resolves the
-- badge into a plain boolean per row, which is the only shape that can reach a
-- public reader without handing out an identifier.
--
-- A REQUEST AND A DECISION ARE THE SAME ROW. status starts at 'requested' and
-- an admin moves it. decided_by records who, because a badge that confers
-- standing in a religious community is exactly the write somebody will ask
-- about later, and the row is the only place that answer can live.
--
-- LOCKING. Two new tables, two new columns on existing tables, and a trigger.
-- The columns are nullable-with-default on Postgres 11+, so catalog-only, no
-- rewrite. lock_timeout bounds the wait rather than the work. Plain SET rather
-- than SET LOCAL, for the reason 20260822_shop_orders_paid_at.sql gives.

set lock_timeout = '3s';
set statement_timeout = '30s';

-- ── Reactions ───────────────────────────────────────────────────────────
create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Exactly one of these is set; the CHECK below enforces it.
  post_id uuid references public.community_posts (id) on delete cascade,
  reply_id uuid references public.community_post_replies (id) on delete cascade,
  -- 1 is a like, -1 is a dislike. A smallint rather than a boolean so the
  -- count query is a sum and a third value stays possible without a rewrite.
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_reactions_one_target check (
    (post_id is not null and reply_id is null)
    or (post_id is null and reply_id is not null)
  )
);

-- THE RULE. One reaction per person per thing, enforced by the database.
create unique index if not exists community_reactions_post_unique
  on public.community_reactions (user_id, post_id)
  where post_id is not null;
create unique index if not exists community_reactions_reply_unique
  on public.community_reactions (user_id, reply_id)
  where reply_id is not null;

create index if not exists community_reactions_post_idx
  on public.community_reactions (post_id) where post_id is not null;
create index if not exists community_reactions_reply_idx
  on public.community_reactions (reply_id) where reply_id is not null;

alter table public.community_reactions enable row level security;

-- A reader may see and change their OWN reaction and nobody else's. The
-- public totals come from the denormalised counters below, never from this
-- table, so who liked what is not readable by anyone but its author.
drop policy if exists "community_reactions_self" on public.community_reactions;
create policy "community_reactions_self" on public.community_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Denormalised counters, the only thing the public feed reads ─────────
alter table public.community_posts
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

alter table public.community_post_replies
  add column if not exists like_count integer not null default 0,
  add column if not exists dislike_count integer not null default 0;

create or replace function public.community_apply_reaction_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_post uuid := coalesce(new.post_id, old.post_id);
  target_reply uuid := coalesce(new.reply_id, old.reply_id);
begin
  -- Recomputed from the rows rather than incremented, so a count can never
  -- drift away from its source: whatever happened, this is the truth after it.
  if target_post is not null then
    update public.community_posts p
       set like_count = (
             select count(*) from public.community_reactions r
              where r.post_id = target_post and r.value = 1),
           dislike_count = (
             select count(*) from public.community_reactions r
              where r.post_id = target_post and r.value = -1)
     where p.id = target_post;
  end if;

  if target_reply is not null then
    update public.community_post_replies p
       set like_count = (
             select count(*) from public.community_reactions r
              where r.reply_id = target_reply and r.value = 1),
           dislike_count = (
             select count(*) from public.community_reactions r
              where r.reply_id = target_reply and r.value = -1)
     where p.id = target_reply;
  end if;

  return null;
end;
$$;

drop trigger if exists community_reactions_count on public.community_reactions;
create trigger community_reactions_count
  after insert or update or delete on public.community_reactions
  for each row execute function public.community_apply_reaction_counts();

-- ── Verification ────────────────────────────────────────────────────────
create table if not exists public.user_verification (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'verified', 'declined')),
  -- What the person said about themselves when they asked.
  claim text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  -- The admin's email. A badge confers standing; the decision needs an owner.
  decided_by text,
  note text,
  updated_at timestamptz not null default now()
);

create index if not exists user_verification_status_idx
  on public.user_verification (status, requested_at desc);

alter table public.user_verification enable row level security;

-- A person may read their own standing, and nothing else. Every write is the
-- service role: a self-serve INSERT would let anyone mark themselves verified.
drop policy if exists "user_verification_self_read" on public.user_verification;
create policy "user_verification_self_read" on public.user_verification
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.user_verification from anon, authenticated;

comment on table public.user_verification is
  'Verification requests and their decisions, one row per user. Service role writes only; a user may read their own row. The community feed never joins this table directly: it resolves a plain boolean per post in the API route, because the feed is public and carries no author id by design (20260802_revoke_public_user_id.sql).';

-- ── Verification ────────────────────────────────────────────────────────
--
-- A. The rule that matters. Try to hold both at once:
--
--      insert into public.community_reactions (user_id, post_id, value)
--      values ('<user>', '<post>', 1);
--      insert into public.community_reactions (user_id, post_id, value)
--      values ('<user>', '<post>', -1);
--
--    The second must fail with 23505. Flipping is an UPDATE, not a second row.
--
-- B. Counts follow. After any insert, update or delete above:
--
--      select like_count, dislike_count from public.community_posts
--       where id = '<post>';
--
-- C. Nobody can see who reacted. With the ANON key:
--
--      curl -s -o /dev/null -w "%{http_code}\n" \
--        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/community_reactions?select=user_id" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--
--    200 with [] is the pass (RLS filters to the caller's own rows, and anon
--    has no rows). Any row returned is a failure.
--
-- D. Nobody can verify themselves:
--
--      curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/user_verification" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--        -H "Content-Type: application/json" \
--        -d '{"user_id":"<any uuid>","status":"verified"}'
--
--    Must be refused. A 201 here is the worst outcome this file can have.
--
-- REPAIR, if a count ever drifts:
--
--   update public.community_posts p set
--     like_count = (select count(*) from public.community_reactions r
--                    where r.post_id = p.id and r.value = 1),
--     dislike_count = (select count(*) from public.community_reactions r
--                       where r.post_id = p.id and r.value = -1);
--
-- Rollback:
--   drop trigger if exists community_reactions_count on public.community_reactions;
--   drop function if exists public.community_apply_reaction_counts();
--   drop table if exists public.community_reactions;
--   drop table if exists public.user_verification;
--   alter table public.community_posts
--     drop column if exists like_count, drop column if exists dislike_count;
--   alter table public.community_post_replies
--     drop column if exists like_count, drop column if exists dislike_count;
--
-- Dropping the tables destroys every reaction and every verification decision.
-- The counters can be rebuilt from the reactions; the reactions cannot be
-- rebuilt from anything.

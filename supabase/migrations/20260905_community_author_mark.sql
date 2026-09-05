-- The supporter mark, as two timestamps the public feed can actually read.
--
-- NOT SIGNED OFF. This file has not been applied anywhere. Merging it to
-- main runs it against production (AGENTS.md, "Merging a migration to main
-- runs DDL against prod"), so the owner reads the SQL before the merge, not
-- after. Nothing in the app depends on it being applied: both read routes
-- fall back to the old select when the columns are absent and serve
-- author_mark null, and the toggle write fails silent.
--
-- WHAT IT IS
--
-- A small mark beside a community author's name while their Plus or Pro
-- subscription is active. Derived from public.entitlements, no badge table,
-- and it goes away at the period end with nothing written and no notice.
-- Cosmetic only: no posting priority, no pinning, no moderation weight.
--
-- Pre-launch supporters (entitlements.is_supporter without Plus) do NOT get
-- the mark. That column is the lifetime-sync promise, not a subscription,
-- and docs/DECISIONS.md records the default as no until the owner says
-- otherwise. It is deliberately not read below.
--
-- WHY TIMESTAMPS AND NOT A BOOLEAN
--
-- 20260901_community_author_verified.sql is the template: a denormalised
-- column on the posts, maintained by a trigger on the source, because the
-- feed cannot join user_verification or profiles and must never select
-- user_id (publicColumnExposure.test.ts). One thing does not transfer.
-- Verification changes only when a row is written, so a boolean copied by
-- trigger stays right. A subscription lapses with no write at all:
-- plus_until passes and nobody touches the row. A boolean would keep
-- badging a lapsed subscriber until something else fired, and the nightly
-- job that would close that gap is a scheduled Action, which the owner has
-- on hold.
--
-- So the columns are the expiry timestamps themselves. The read path
-- compares them to now() and projects 'plus' | 'pro' | null; the lapse is
-- exact to the second and there is no job to miss. The raw values never
-- leave the projection: app/api/community/posts/route.ts and the replies
-- route emit author_mark and nothing else from these two columns.
--
-- WHAT FIRES WHEN
--
--   entitlements insert/update/delete  -> recompute every post and reply by
--                                         that author
--   profiles.show_supporter_mark flips -> the same, so the opt-out clears
--                                         the columns and opting back in
--                                         restores them
--   a new post or reply                -> BEFORE INSERT copies the author's
--                                         current pair onto the row
--
-- Recomputed from the source rather than toggled, like the verified column
-- and the reaction counters: whatever happened, the columns are correct
-- afterwards.
--
-- The helper functions are security definer so the triggers can read
-- entitlements and profiles, both of which are self-select only. EXECUTE is
-- revoked from every role but service_role: the pair function answers
-- "what does this uuid pay for", and that must not be callable over the
-- anon key by anyone who has a uuid.
--
-- upsert_entitlement and its grants (20260612, 20260713) are untouched.
--
-- LOCKING
--
-- One boolean with a constant default on profiles and two nullable
-- timestamps on each community table: catalog-only on Postgres 11+, no
-- rewrite. The backfill touches only rows whose pair differs from the
-- source, which at first run is the posts and replies of active
-- subscribers, of which there are very few.

set lock_timeout = '3s';
set statement_timeout = '30s';

-- The opt-out. Default on: the mark is shown unless the reader turns it off
-- on /account ("Show my supporter mark"). profiles_self_update from
-- 20260518 already lets the owner write it; no new policy.
alter table public.profiles
  add column if not exists show_supporter_mark boolean not null default true;

comment on column public.profiles.show_supporter_mark is
  'Opt-out for the community supporter mark. When false the author_*_until pair on that reader''s posts and replies is nulled by trigger.';

alter table public.community_posts
  add column if not exists author_plus_until timestamptz,
  add column if not exists author_pro_until timestamptz;

alter table public.community_post_replies
  add column if not exists author_plus_until timestamptz,
  add column if not exists author_pro_until timestamptz;

comment on column public.community_posts.author_plus_until is
  'Denormalised from entitlements.plus_until, null when the author hides the mark. Read routes compare to now() and emit author_mark only; this value never leaves the server.';
comment on column public.community_posts.author_pro_until is
  'Denormalised from entitlements.pro_until, null when the author hides the mark. Read routes compare to now() and emit author_mark only; this value never leaves the server.';
comment on column public.community_post_replies.author_plus_until is
  'Denormalised from entitlements.plus_until, null when the author hides the mark. Read routes compare to now() and emit author_mark only; this value never leaves the server.';
comment on column public.community_post_replies.author_pro_until is
  'Denormalised from entitlements.pro_until, null when the author hides the mark. Read routes compare to now() and emit author_mark only; this value never leaves the server.';

-- The pair for one author, as the table says it right now. Null, null when
-- there is no entitlements row, when the reader has hidden the mark, or
-- when the profile row is missing. is_supporter is deliberately not read.
create or replace function public.community_author_mark_of(
  target uuid,
  out mark_plus_until timestamptz,
  out mark_pro_until timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select e.plus_until, e.pro_until
    from public.entitlements e
    join public.profiles p on p.id = e.user_id
   where e.user_id = target
     and p.show_supporter_mark;
$$;

-- Applies one account's pair to every post and reply it has written.
create or replace function public.community_apply_author_mark_to(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plus timestamptz;
  v_pro timestamptz;
begin
  select mark_plus_until, mark_pro_until
    into v_plus, v_pro
    from public.community_author_mark_of(target);

  update public.community_posts p
     set author_plus_until = v_plus,
         author_pro_until = v_pro
   where p.user_id = target
     and (p.author_plus_until is distinct from v_plus
       or p.author_pro_until is distinct from v_pro);

  update public.community_post_replies r
     set author_plus_until = v_plus,
         author_pro_until = v_pro
   where r.user_id = target
     and (r.author_plus_until is distinct from v_plus
       or r.author_pro_until is distinct from v_pro);
end;
$$;

revoke execute on function public.community_author_mark_of(uuid) from public;
revoke execute on function public.community_author_mark_of(uuid) from anon;
revoke execute on function public.community_author_mark_of(uuid) from authenticated;
grant execute on function public.community_author_mark_of(uuid) to service_role;

revoke execute on function public.community_apply_author_mark_to(uuid) from public;
revoke execute on function public.community_apply_author_mark_to(uuid) from anon;
revoke execute on function public.community_apply_author_mark_to(uuid) from authenticated;
grant execute on function public.community_apply_author_mark_to(uuid) to service_role;

-- Source 1: the subscription. Read back from the table rather than trusting
-- NEW: a delete has no NEW, and this way the answer is whatever the table
-- says afterwards.
create or replace function public.community_apply_author_mark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.community_apply_author_mark_to(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

drop trigger if exists community_author_mark_sync on public.entitlements;
create trigger community_author_mark_sync
  after insert or update or delete on public.entitlements
  for each row execute function public.community_apply_author_mark();

-- Source 2: the opt-out. Only when the column actually changes, so the
-- profile writes that happen on every preference sync (focus, depth) do not
-- rescan the feed.
create or replace function public.community_apply_author_mark_pref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.community_apply_author_mark_to(new.id);
  return null;
end;
$$;

drop trigger if exists community_author_mark_pref on public.profiles;
create trigger community_author_mark_pref
  after update of show_supporter_mark on public.profiles
  for each row
  when (old.show_supporter_mark is distinct from new.show_supporter_mark)
  execute function public.community_apply_author_mark_pref();

-- A NEW POST OR REPLY BY A CURRENT SUBSCRIBER needs the pair too, and the
-- triggers above fire only on entitlements and profiles. Without this,
-- subscribing would mark the existing posts and every post written
-- afterwards would appear unmarked. One function serves both tables: the
-- column names match.
create or replace function public.community_set_author_mark_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select mark_plus_until, mark_pro_until
    into new.author_plus_until, new.author_pro_until
    from public.community_author_mark_of(new.user_id);
  return new;
end;
$$;

drop trigger if exists community_posts_author_mark on public.community_posts;
create trigger community_posts_author_mark
  before insert on public.community_posts
  for each row execute function public.community_set_author_mark_on_insert();

drop trigger if exists community_replies_author_mark on public.community_post_replies;
create trigger community_replies_author_mark
  before insert on public.community_post_replies
  for each row execute function public.community_set_author_mark_on_insert();

-- Backfill what is already true. Idempotent, and the repair if it ever
-- drifts. Guarded with `is distinct from` so a re-run rewrites nothing.
-- The pair is resolved in a CTE because an UPDATE's FROM list cannot call
-- a function with the target table's own column.
with src as (
  select p.id, m.mark_plus_until, m.mark_pro_until
    from public.community_posts p
    left join lateral public.community_author_mark_of(p.user_id) m on true
)
update public.community_posts p
   set author_plus_until = src.mark_plus_until,
       author_pro_until = src.mark_pro_until
  from src
 where src.id = p.id
   and (p.author_plus_until is distinct from src.mark_plus_until
     or p.author_pro_until is distinct from src.mark_pro_until);

with src as (
  select r.id, m.mark_plus_until, m.mark_pro_until
    from public.community_post_replies r
    left join lateral public.community_author_mark_of(r.user_id) m on true
)
update public.community_post_replies r
   set author_plus_until = src.mark_plus_until,
       author_pro_until = src.mark_pro_until
  from src
 where src.id = r.id
   and (r.author_plus_until is distinct from src.mark_plus_until
     or r.author_pro_until is distinct from src.mark_pro_until);

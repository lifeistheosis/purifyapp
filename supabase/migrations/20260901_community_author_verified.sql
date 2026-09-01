-- The verified badge, as a column the public feed can actually read.
--
-- ── APPLIED BY HAND ON 2026-09-01, BEFORE THIS FILE REACHED main ───────
--
-- The owner ran this SQL directly, so the column, both triggers and the
-- backfill are already on production and the merge is a no-op. The DDL is
-- guarded with `if not exists` / `or replace` and the backfill is idempotent,
-- so re-running changes nothing.
--
-- Recorded because AGENTS.md says the headers are the record and that state
-- must never be inferred from a file existing. Same convention as
-- 20260802_revoke_public_user_id.sql, 20260901_community_pinned.sql and
-- 20260901_shop_cost_checks.sql.
--
-- VERIFIED, with a control so the probe itself is proven:
--
--   select=id,zzz_nope        -> 42703 column does not exist
--   select=id,author_verified -> returns rows, so the column exists
--
-- and the backfill is observably correct: the owner's posts came back
-- author_verified true and another author's came back false.
--
-- NOT observed: the BEFORE INSERT trigger. Confirming it would mean writing a
-- post to the live community and deleting it again, which is not worth doing
-- to a real feed. It will be proven by the owner's next post carrying the
-- badge; if one ever appears without it, this trigger is where to look.
--
-- ── Why denormalised, when user_verification already holds the answer ───
--
-- Because the feed cannot ask it. public.user_verification is service-role
-- only and public.profiles is self-select only, so a reader cannot join to
-- either. The obvious workaround is for the feed route to select
-- community_posts.user_id, map it to a boolean, and drop the uuid before
-- responding.
--
-- lib/security/__tests__/publicColumnExposure.test.ts refuses that, and the
-- refusal is correct: the guard cannot tell "selected then stripped" from
-- "selected then leaked", and the step after tolerating the select is somebody
-- re-granting the column to make it work. That ratchet was written after a
-- real exposure, closed in 20260802_revoke_public_user_id.sql, and it does not
-- get loosened to save one query.
--
-- app/api/community/posts/route.ts recorded that design intention and the
-- shortcut was then attempted twice anyway, refused both times. This is the
-- column that ends the argument: the feed reads a boolean that was never a
-- uuid, and the guard stays absolute.
--
-- ── Maintained by trigger, like the reaction counters ──────────────────
--
-- Same reasoning as community_apply_reaction_counts in
-- 20260826_community_reactions_and_verification.sql. A badge maintained in
-- application code drifts the first time a request dies between its two
-- writes, and unlike a like count, a wrong verified badge is a claim about a
-- person's standing in a religious community.
--
-- Recomputed from the source rather than toggled, so whatever happened, the
-- column is correct afterwards.
--
-- ── Locking ────────────────────────────────────────────────────────────
--
-- One boolean with a constant default, catalog-only on Postgres 11+: no
-- rewrite. The backfill at the end touches only the rows of verified authors,
-- of which there is currently one.

set lock_timeout = '3s';
set statement_timeout = '30s';

alter table public.community_posts
  add column if not exists author_verified boolean not null default false;

comment on column public.community_posts.author_verified is
  'Denormalised from user_verification. The public feed reads THIS, never user_id: see 20260802_revoke_public_user_id.sql and publicColumnExposure.test.ts.';

-- Applies one account's verified state to every post it has written.
create or replace function public.community_apply_author_verified()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.user_id, old.user_id);
  is_verified boolean;
begin
  -- Read back from the table rather than trusting NEW.status: a delete has no
  -- NEW, and this way the answer is whatever the table says afterwards.
  select exists (
    select 1 from public.user_verification v
     where v.user_id = target and v.status = 'verified'
  ) into is_verified;

  update public.community_posts p
     set author_verified = is_verified
   where p.user_id = target
     and p.author_verified is distinct from is_verified;

  return null;
end;
$$;

drop trigger if exists community_author_verified_sync on public.user_verification;
create trigger community_author_verified_sync
  after insert or update or delete on public.user_verification
  for each row execute function public.community_apply_author_verified();

-- A NEW POST BY AN ALREADY-VERIFIED AUTHOR needs the badge too, and the
-- trigger above only fires on user_verification. Without this, verifying
-- somebody would badge their existing posts and every post they wrote
-- afterwards would appear unverified.
create or replace function public.community_set_author_verified_on_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_verified := exists (
    select 1 from public.user_verification v
     where v.user_id = new.user_id and v.status = 'verified'
  );
  return new;
end;
$$;

drop trigger if exists community_posts_author_verified on public.community_posts;
create trigger community_posts_author_verified
  before insert on public.community_posts
  for each row execute function public.community_set_author_verified_on_insert();

-- Backfill what is already true. Idempotent, and the repair if it ever drifts.
update public.community_posts p
   set author_verified = exists (
     select 1 from public.user_verification v
      where v.user_id = p.user_id and v.status = 'verified'
   )
 where p.author_verified is distinct from exists (
     select 1 from public.user_verification v
      where v.user_id = p.user_id and v.status = 'verified'
   );

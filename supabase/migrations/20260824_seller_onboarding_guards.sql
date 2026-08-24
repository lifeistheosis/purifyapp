-- The database learns the three things the seller code already assumes.
--
-- WHY THIS EXISTS. People are asking to sell on Purify, which means strangers
-- are about to hold console accounts. Three assumptions the application layer
-- has always made are, today, enforced by nothing.
--
-- ── 1 and 2. "One seller per account, one store per seller" ───────────────
--
-- lib/shop/seller.ts's getSellerContext() resolves a console session with two
-- .maybeSingle() reads: shop_sellers by user_id, then shop_stores by
-- seller_id. .maybeSingle() is not a LIMIT 1. PostgREST answers a second
-- matching row with PGRST116 and the supabase-js client surfaces it as an
-- error, so a duplicate does not degrade to "pick one", it THROWS, and it
-- throws inside the function every page and every route of the seller console
-- calls first. One duplicate row takes that seller's entire console down, with
-- no partial mode and no message that says why.
--
-- Nothing prevents the duplicate. lib/shop/storeProvision.ts guards against it
-- by reading first and reusing what it finds, which is a check-then-act with a
-- gap in the middle: two admins pressing Provision on the same application at
-- the same time, or one admin double-clicking, both read "no seller" and both
-- insert. shop_stores.seller_id has a plain index
-- (20260704_shop_phase1.sql:84), not a unique one, and shop_sellers.user_id has
-- no index at all.
--
-- MEASURED, not assumed. Probed against production 2026-08-24 with the service
-- role, read only: shop_sellers holds ONE row (EIKON, attached to a real
-- user_id), shop_stores holds ONE row (slug 'eikon', live, seller_id pointing
-- at that seller), shop_merchant_applications is EMPTY. Zero duplicates on
-- either column, so both indexes build without a conflict to resolve first.
--
-- Doing this before the first real applicant is the entire point: the same two
-- statements against a table with duplicates in it would fail and would have
-- to be preceded by a merge nobody wants to do by hand.
--
-- ── 3. A seller agreement cannot currently be recorded ────────────────────
--
-- terms_acceptances.context is a CHECK, not a foreign key, and it currently
-- allows exactly ('signup', 'checkout', 'eikon_claim')
-- (20260710_terms_acceptances.sql:17, widened by 20260731_eikon_box.sql:226).
-- Any attempt to record a seller agreeing to seller terms is rejected by the
-- database with 23514 before it reaches a policy. Contexts actually in use
-- today, same probe: signup 82, checkout 36, eikon_claim 0.
--
-- Widening the vocabulary is separable from writing the agreement, and is done
-- here so the document and its acceptance gate can land without a schema
-- change riding along behind unreviewed legal text. NOTHING WRITES THIS
-- CONTEXT YET. That is deliberate: the wording of the seller agreement is the
-- owner's and has not been settled. This file only makes the row insertable.
--
-- ── Deliberately left out ────────────────────────────────────────────────
--
-- NO unique constraint on shop_stores.slug: it already has one, inline at
-- 20260704_shop_phase1.sql:66.
--
-- NO NOT NULL on shop_sellers.user_id. A seller row with no account is
-- legitimate and in use: lib/shop/storeProvision.ts accepts userId null so the
-- owner dashboard can create a store before the merchant has signed up. The
-- partial predicate below is what makes that compatible with uniqueness.
--
-- NO commission, payout, or Stripe Connect columns. Those are Phase 1 and get
-- their own file with their own evidence. This one holds only what has to be
-- true before a stranger is given a login.
--
-- LOCKING. Both indexes are built WITHOUT the concurrent option, so each takes
-- SHARE on its table and blocks writes for the duration. On one row that is
-- microseconds. `create index concurrently` is deliberately NOT used: it
-- cannot run inside a transaction block, and whether the Supabase migration
-- runner wraps each file in one is not verifiable from this repo, so it would
-- be a coin-flip between working and erroring out. lock_timeout bounds the
-- wait to a fail-fast retry. Plain SET rather than SET LOCAL for the same
-- reason 20260822_shop_orders_paid_at.sql gives: SET LOCAL outside a
-- transaction is a warning and a no-op, plain SET is correct under both.

set lock_timeout = '3s';
set statement_timeout = '30s';

-- ── 1. One seller per account ────────────────────────────────────────────
-- Partial, because user_id is nullable and a seller with no account attached
-- is a supported state. Postgres already treats nulls as distinct in a unique
-- index; the predicate says the intent out loud, the same way
-- 20260802_terms_acceptance_idempotent.sql:37 does.
create unique index if not exists shop_sellers_user_unique
  on public.shop_sellers (user_id)
  where user_id is not null;

-- ── 2. One store per seller ──────────────────────────────────────────────
-- This is a real product decision, not only a data-integrity one: it says a
-- seller runs one storefront. getSellerContext() has always assumed it, every
-- seller route reads ctx.store as a single object, and the console has no
-- concept of switching between stores. Reversible in one line if a seller ever
-- needs a second brand, and the reversal is cheap precisely because it is
-- enforced here rather than assumed in fifteen call sites.
--
-- seller_id is already `not null` (20260704_shop_phase1.sql:65), so no
-- predicate is needed.
create unique index if not exists shop_stores_seller_unique
  on public.shop_stores (seller_id);

-- ── 3. A seller agreement becomes recordable ─────────────────────────────
-- Rebuilt rather than extended: a CHECK cannot be added to, and dropping then
-- adding is the same two statements 20260731_eikon_box.sql:223-226 used. The
-- full list is restated so this file is readable without chasing the previous
-- two migrations.
alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_context_check;
alter table public.terms_acceptances
  add constraint terms_acceptances_context_check
  check (context in ('signup', 'checkout', 'eikon_claim', 'seller_agreement'));

comment on constraint terms_acceptances_context_check on public.terms_acceptances is
  'Which clickwrap produced the row. seller_agreement was added 2026-08-24 ahead of the document itself; if nothing has ever written it, the seller agreement has not shipped yet and no seller has agreed to anything beyond the two unversioned checkboxes on the application form.';

-- ── Verification ─────────────────────────────────────────────────────────
--
-- A. Did the indexes apply.
--
--      select indexname, indexdef
--        from pg_indexes
--       where indexname in ('shop_sellers_user_unique', 'shop_stores_seller_unique');
--
--    Two rows means yes. Zero means this file has not been applied, and
--    provisioning is still racy.
--
-- B. Did the CHECK widen. From a shell, with the service role:
--
--      curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/terms_acceptances" \
--        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--        -H "Content-Type: application/json" \
--        -d '{"context":"seller_agreement","terms_version":"probe"}'
--
--    A 201 means the vocabulary widened; DELETE the probe row afterwards. A
--    400 carrying 23514 means it did not. Before this migration that probe
--    returned 23514, which is how the absence was confirmed.
--
-- C. The census, to re-check the header's numbers:
--
--      select (select count(*) from public.shop_sellers)              as sellers,
--             (select count(*) from public.shop_stores)               as stores,
--             (select count(*) from public.shop_merchant_applications) as applications;
--
-- Rollback:
--   drop index if exists public.shop_sellers_user_unique;
--   drop index if exists public.shop_stores_seller_unique;
--   alter table public.terms_acceptances
--     drop constraint if exists terms_acceptances_context_check;
--   alter table public.terms_acceptances
--     add constraint terms_acceptances_context_check
--     check (context in ('signup', 'checkout', 'eikon_claim'));
--
-- The index drops are free. The CHECK rollback FAILS if any seller_agreement
-- row has been written by then, which is the correct behaviour: it refuses to
-- silently orphan a recorded agreement. Delete or re-context those rows first,
-- deliberately.

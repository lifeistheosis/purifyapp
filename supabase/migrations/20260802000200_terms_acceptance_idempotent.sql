-- Make a signup acceptance idempotent per (user, terms version)
--
-- Context: no OAuth sign-up has ever recorded an acceptance. Only the two
-- email/password forms called /api/legal/accept, so every Google account was
-- created without a row, and in the in-app onboarding flow without the reader
-- being shown the Terms at all. 572 of 613 post-feature accounts had no row.
--
-- The fix records acceptance in the auth callback. The callback fires on
-- every sign-IN, not just the first one, so the write has to be safe to
-- repeat. This index is what makes that true: the first Google sign-in after
-- a Terms version records it, and every subsequent sign-in on the same
-- version is a no-op.
--
-- It also gives re-acceptance for free. When TERMS_VERSION is bumped, the
-- next sign-in records a fresh row against the new version, because the
-- sign-in screen carries the notice that continuing constitutes agreement.
--
-- ── Why this is PARTIAL, and why that matters ──────────────────────────────
--
-- `where context = 'signup'`: checkout acceptances legitimately repeat. A
-- member who buys twice under one Terms version must produce two rows, each
-- tied to its own order. A plain unique index on (user_id, terms_version)
-- would silently reject the second purchase's acceptance, which is a worse
-- bug than the one being fixed here.
--
-- `and user_id is not null`: email sign-ups record the acceptance BEFORE the
-- account exists (see lib/legal/recordAcceptance.ts), so those rows carry an
-- email and a null user_id. Postgres treats nulls as distinct in a unique
-- index anyway, but the predicate says the intent out loud.
--
-- Safe to run on a live table: `if not exists`, and no existing row set can
-- violate it, because nothing has ever written a signup row with a non-null
-- user_id twice for one version.

create unique index if not exists terms_acceptances_signup_unique
  on public.terms_acceptances (user_id, terms_version)
  where context = 'signup' and user_id is not null;

-- Rollback:
--   drop index if exists public.terms_acceptances_signup_unique;

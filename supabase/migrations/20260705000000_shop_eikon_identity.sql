-- EIKON identity pass (operator decision, 2026-07-05):
--
-- 1. The storefront no longer names Purify as EIKON's owner. The
--    Phase 1 seed text is updated in place for fresh databases; this
--    UPDATE covers any environment where the seed already ran. The
--    ownership_disclosure column stays NOT NULL — the store still says
--    who runs it operationally, it just doesn't name the parent.
--
-- 2. EIKON's seller row is attached to the operator's own account so
--    the seller console works for the founding store. The email lookup
--    makes this idempotent and safe to run before or after that user
--    exists — rerun it once the account has signed in if it no-ops.

update public.shop_stores
set
  ownership_disclosure = 'EIKON selects, inspects, and ships every icon it sells.',
  updated_at = now()
where
  id = '6e1b0000-0000-4000-8000-000000000002'
  and ownership_disclosure = 'EIKON is owned and operated by Purify.';

update public.shop_sellers s
set
  user_id = u.id,
  updated_at = now()
from auth.users u
where
  s.id = '6e1b0000-0000-4000-8000-000000000001'
  and s.user_id is null
  and u.email = 'lifeistheosis@gmail.com';

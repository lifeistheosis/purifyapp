-- EIKON support address moves to lifeistheosis@gmail.com.
--
-- 20260704_shop_phase1.sql seeds public.shop_stores with
-- support_email = 'support@purifyapp.net'. That migration is already applied,
-- so editing it in place would change nothing in production and would only
-- desync the file from the database. This migration carries the change
-- instead, which keeps a fresh bootstrap and production on the same value.
--
-- Scoped to the seeded EIKON store by id rather than by a blanket update, so
-- a future third-party seller keeps its own support address.

update public.shop_stores
   set support_email = 'lifeistheosis@gmail.com'
 where id = '6e1b0000-0000-4000-8000-000000000002'
   and support_email = 'support@purifyapp.net';

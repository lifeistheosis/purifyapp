-- Stop serving the auth uuid to anonymous readers
--
-- APPLIED to production 2026-08-12, by hand in the SQL editor, after the
-- statements below were rewritten. The original four REVOKE lines were run
-- first and did nothing at all, silently, which is why the rewrite exists.
--
-- ── The hole ───────────────────────────────────────────────────────────────
--
-- app/api/community/posts/route.ts says exactly why user_id must not be
-- served: it is the Supabase auth uuid, it is also the RevenueCat appUserID,
-- and it is the path segment in the public avatar bucket. Serving it to
-- unauthenticated readers hands out a cross-system identifier for free.
--
-- But that redaction lives only in that route's SELECT column list. RLS is
-- ROW-scoped, not column-scoped, and NEXT_PUBLIC_SUPABASE_ANON_KEY ships in
-- the client bundle, so PostgREST is directly reachable by anyone. A single
-- request against the base table returns the column the route omits.
--
-- The sharpest case is shop reviews. A review submitted with anonymous=true
-- stores no display name, and the route's own comment says "nothing private
-- is exposed here". True of the route. Not true of the table: the author's
-- uuid is right there, and community_posts maps uuids to display names.
--
-- Column privileges are the fix because they are enforced by Postgres for
-- every client, not by whichever query happens to be written.
--
-- ── Why only four tables ───────────────────────────────────────────────────
--
-- prayer_campaigns.creator_id and trapeza_recipes.author_id are DELIBERATELY
-- not revoked here. Both are read with the anon key today, and Postgres
-- requires SELECT privilege on a column to reference it in a WHERE clause as
-- well as in a select list, so revoking either would break working features:
--
--   lib/campaigns/catalog.ts:22      selects creator_id (anon key)
--   lib/campaigns/client.ts:167,197  selects it and filters .eq("creator_id")
--   components/campaigns/CampaignDetailClient.tsx:231  compares it for isCreator
--   lib/trapeza/catalog.ts:25        selects author_id (anon key)
--   lib/trapeza/client.ts:102,104    selects it and filters .eq("author_id")
--
-- Those two need a code change first: return a boolean ("is this yours") from
-- a server route rather than shipping the uuid to the browser and comparing
-- it there. Tracked separately so this migration stays revertible on its own.
--
-- The four below have no such caller. Every read of them goes through a
-- server route using either the service role (which bypasses column grants)
-- or a select list that does not mention user_id:
--
--   app/api/community/posts/route.ts        service role, user_id not selected
--   app/api/community/mine/route.ts         service role
--   app/api/community/posts/[id]/replies    service role
--   app/api/shop/catalog/reviews/route.ts   anon, selects no user_id
--   app/api/shop/catalog/store-reviews      anon, selects no user_id
--   app/api/admin/*                         service role
--
-- ── What this does not do ──────────────────────────────────────────────────
--
-- It does not un-leak anything already scraped. Treat the historic exposure
-- as a disclosure and decide separately whether it warrants notification.

-- ── Why this is not four REVOKE lines ──────────────────────────────────────
--
-- It was, and they were a no-op. In Postgres a column privilege is ADDITIVE
-- with a table privilege, it does not subtract from one. Supabase grants
-- SELECT on the whole table to anon and authenticated by default, and that
-- table-wide grant keeps covering every column, so
--
--   revoke select (user_id) on public.shop_reviews from anon, authenticated;
--
-- parses, runs, reports success, and leaves the uuid readable. Verified on
-- production 2026-08-12: after running all four, an anon PostgREST call for
-- shop_reviews?select=user_id still answered 200 with a real uuid.
--
-- The table-level grant has to go first, and the columns to keep are then
-- granted back explicitly. The keep-list is read out of information_schema
-- at apply time rather than typed here, because a hand-written list is one
-- forgotten column away from breaking a surface, and this file already
-- carries four tables whose shape changes.

do $$
declare
  t text;
  cols text;
begin
  foreach t in array array[
    'community_posts','community_post_replies','shop_reviews','shop_store_reviews'
  ] loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
      into cols
      from information_schema.columns
     where table_schema = 'public'
       and table_name = t
       and column_name <> 'user_id';

    execute format('revoke select on public.%I from anon, authenticated', t);
    execute format('grant select (%s) on public.%I to anon, authenticated', cols, t);
  end loop;
end $$;

-- ── The standing cost, which the first version of this file did not carry ──
--
-- These four tables now hold COLUMN grants, not a table grant. A column added
-- to any of them later is NOT readable by anon or authenticated until it is
-- granted. A migration that adds one must add, in the same file:
--
--   grant select (new_column) on public.<table> to anon, authenticated;
--
-- The failure mode if that is forgotten is quiet. app/api/shop/catalog/
-- reviews/route.ts selects a fixed column list and, on any error other than a
-- missing photo_urls, returns { reviews: [], reviewCount: 0, avgStars: null }
-- with a 200. A shopper sees a product with no reviews rather than an error.

-- Rollback, if a surface turns out to depend on it after all:
--
--   grant select on public.community_posts to anon, authenticated;
--   grant select on public.community_post_replies to anon, authenticated;
--   grant select on public.shop_reviews to anon, authenticated;
--   grant select on public.shop_store_reviews to anon, authenticated;
--
-- Note the shape: restoring the TABLE grant is what undoes this, and it
-- supersedes the column grants above rather than sitting alongside them.
--
-- ── Verification checklist, staging first, then production ─────────────────
--
-- A. Direct PostgREST, with the PUBLIC anon key. Each must now fail:
--      GET $URL/rest/v1/shop_reviews?select=user_id
--      GET $URL/rest/v1/shop_store_reviews?select=user_id
--      GET $URL/rest/v1/community_posts?select=user_id&status=eq.visible
--      GET $URL/rest/v1/community_post_replies?select=user_id&status=eq.visible
--    And each must still succeed without that column:
--      GET $URL/rest/v1/shop_reviews?select=id,stars,body
--      GET $URL/rest/v1/community_posts?select=id,author_name&status=eq.visible
--
-- B. In-app, signed OUT: a product page's reviews render; a store page's
--    reviews render; /community Conversations lists posts and replies.
--
-- C. In-app, signed IN: the same three, plus "my posts" ownership marks still
--    resolve on /community (that path is service-role, so it should be
--    unaffected; confirm rather than assume), and posting a reply still works.
--
-- D. Admin: the moderation queues under /admin still list reported posts and
--    replies (service role, expected unaffected).
--
-- Anything in B, C or D failing means a caller was missed. Roll back with the
-- grants above rather than leaving a surface broken.

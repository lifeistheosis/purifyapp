# Shop audit: adding one product today

Written 2026-09-05 for the "Shop: Simple Product Management" spec, section 1.
Everything below was read from the tree, not remembered.

## How products are stored

- One table, `shop_products` (`supabase/migrations/20260704_shop_phase1.sql:99-141`),
  plus `shop_product_media` for images (`:150-159`, alt text required at the
  database) and `shop_product_subjects`. Status is draft / published / paused
  / archived. Price is integer cents, currency column exists but nothing
  writes it (always usd). Stock is `quantity_available` (null = not tracked)
  plus an `inventory_status`.
- EIKON, the owner's own catalogue, is a store row (`slug = eikon`) under a
  `purify_owned` seller attached to the operator account. Twenty-three
  columns per product, seven categories and ten classifications enforced by
  CHECK constraints.
- Images live in the public Supabase Storage bucket `shop-media`, uploaded
  through a Next route with the service role. No resize, no thumbnail, no
  HEIC, one file per click, 8 MB cap. `sharp` is installed but only for
  scripts.
- Stripe: hosted Checkout with prices inlined per session
  (`lib/shop/checkout.ts:238-291`). No Stripe product or price objects
  exist and none are needed. The owner never opens the Stripe dashboard for
  catalogue work. No Stripe Tax. US shipping only, one flat rate, Pro ships
  free.
- Order email: plain, via Resend, no pixel (`lib/shop/orderEmails.ts`).
- There is no blessing option anywhere, no soft delete, no delete endpoint,
  no import surface (only `scripts/seed-shop.mjs`, a developer command).

## The owner's steps today, from a photo and a price to a live product

1. Convert the photo if it came off an iPhone as HEIC. The upload route
   accepts only JPEG, PNG, WebP, AVIF.
2. Shrink it under 8 MB outside the app. Nothing in the product path
   resizes.
3. Sign in as an admin email.
4. Open /admin, Catalog group, Shop tab, EIKON catalog sub-tab, Products
   sub-tab. Four clicks.
5. New product. The sheet opens in edit mode.
6. Title.
7. Slug, typed by hand, lowercase and hyphens, must not collide and must
   not be `detail` (that one breaks the build).
8. Subtitle.
9. Price in dollars.
10. Category (7).
11. Classification: the dropdown offers 5 of the 10 the database accepts.
    A prayer rope, cross, incense, beads or textile cannot be expressed here,
    and re-saving one of the seven seeded products of those kinds silently
    rewrites its classification.
12. Availability.
13. Quantity on hand.
14. Dispatch min days (defaults 14).
15. Dispatch max days (defaults 28).
16. Dimensions. 17. Materials. 18. Production method. 19. Maker.
20. Country of origin.
21. Listing status.
22. Description as markdown in a plain textarea, no preview.
23. "Photo is representative" tick.
24. Upload image, one file, wait for the round trip.
25. Fix the alt text the app guessed from the filename.
26. Repeat 24 and 25 per photo. "Make cover" is the only reorder.
27. Subjects as `type | slug` lines, exact registry slugs, no picker.
28. Expand Sourcing and fill supplier, SKU, cost, URL, lead time, stock,
    rights ticks, notes, or the integrity check flags the product.
29. Save. A rejected field shows as the API's raw first zod message.
30. Set published.
31. If the cover is still on a supplier CDN the product is published and
    invisible (the rights gate in `lib/shop/catalog.ts:187`).
32. Confirm the EIKON store row is `live`, or the whole catalogue hides.
33. "View on site" opens `/shop/<slug>`, which is the store route, and
    shows "Store not found". The product lives at `/shop/icons/<slug>`.
34. Wait up to 30 seconds for the catalogue cache.

No deploy. No migration unless a new category or classification is
wanted. No Stripe visit. Thirty-four steps and twenty-three fields.

## The three biggest frictions, and the smallest change for each

1. **Photos.** HEIC rejected, 8 MB cap, no resize, one file per click, alt
   text retyped every time. Fix: move `sharp` to dependencies, normalise
   every upload in the media route (rotate, 1600px max, JPEG q82, plus a
   400px thumbnail), accept HEIC, raise the cap to 25 MB, `multiple` on the
   file input. About twenty lines, no new dependency.
2. **Published is not visible, and the preview button is broken.** Three
   silent gates (supplier image, store not live, cache) and "View on site"
   points at the wrong route. Fix: use `productHref()` for the button,
   refuse to publish with a supplier image, and show one line on the row
   saying why a published product is hidden.
3. **Twenty-three fields, a hand-typed slug, a lying dropdown.** Fix: the
   nine-field form the spec asks for, slug generated from the name with the
   seller console's existing `slugify` and uniqueness loop, classification
   mapped from `SHOP_CLASSIFICATIONS` (one line), sourcing and subjects
   moved behind "More" so the two-minute path never sees them.

## What the spec asks for that already exists

Single product table, cents pricing re-priced server-side, stock, multiple
images with a cover, categories, admin guard, hosted Checkout with shipping
collection, plain confirmation email, published-only public read in RLS,
"almost sold out" derived and never faked, slug generation (seller side).

## What the spec asks for that is missing

Blessing option (column, global config, copy), soft delete, HEIC and
resizing, signed client upload, thumbnails, drag reorder, client-side
validation, working preview, `/admin/shop/new` and `/admin/shop/[id]` as
pages rather than a sheet inside a sheet, an inline Visible toggle in a
plain list, Stripe Tax, one-time import from the seed JSON with images.

## Two places the spec and the tree disagree

- The spec's `products` shape (`stripe_product_id`, `stripe_price_id`) assumes
  Stripe catalogue objects. The tree inlines prices per Checkout session,
  which already satisfies "the owner never opens the Stripe dashboard" with
  no sync to fail. The plan keeps inline pricing and drops the two columns.
- The spec's product URL is `/shop/[slug]`; the tree uses `/shop/[store]`
  for stores and `/shop/icons/[slug]` for products, and the native app
  depends on the latter. The plan keeps the existing routes.

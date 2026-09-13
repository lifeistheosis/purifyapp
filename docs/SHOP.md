# Shop: adding and editing products

Written 2026-09-05 with the v1.4 shop work (`docs/plans/v1.4/shop-simple.md`).

## The path

1. `/admin/shop`. New product.
2. Name, price, up to four photos (HEIC from a phone is fine; each is
   rotated, resized to 1600px and given a thumbnail on the way in), short
   description, details, category, stock or Unlimited, blessing on or off
   (only when the Blessing card is enabled), Visible on. Save.
3. The address is made from the name and never changes. The product is on
   `/shop` within about half a minute.

The list shows thumb, name, price, stock and a Visible switch that flips
published and draft in place. Search by name, slug or maker. Everything else
the table holds (classification, availability, dispatch, maker, origin,
subjects, sourcing, listing status) is under "More" on the edit page, and
Delete is at the bottom of it behind a confirm.

The Catalog tab of the panel keeps the sourcing, margin and engagement
table; its rows link to the same edit page.

## Blessing

One config, the card above the list: on or off, the parish, the copy, and a
handling charge in cents. Per product there is only the switch. The product
page always adds that the blessing is offered freely by the cooperating
parish and any charge is for handling. At checkout a request is metadata on
the order and, when handling is above zero, one "Handling for blessing" line
priced from the config on the server.

## Before the migration

`supabase/migrations/20260905_shop_simple.sql` adds `blessing_available`,
`deleted_at`, `thumb_url` and the config table. It is not signed off. Until
it is applied everything works except delete and blessings, and both pages
say so. Every read tolerates the columns being absent; writes retry without
them.

## Import

`node scripts/shop-import.mjs` plans, `--apply` writes: the seed JSON and
`public/shop/media` through the same image path into the bucket, upsert by
slug, new rows as drafts, and any row edited after the seed file's date is
left alone.

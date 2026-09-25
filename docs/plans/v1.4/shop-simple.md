# Shop: simple product management

> **The blessing parts of this plan are cancelled** (owner, 2026-09-25):
> a price on a blessing, even as handling, is simony. Every blessing line
> below is history, not work. See `docs/DECISIONS.md`.

Owner spec "Shop: Simple Product Management" (2026-09-05), priority before
all other shop work. The audit is `docs/SHOP-AUDIT.md`. The goal sentence:
a new product from a phone in under two minutes, no code, no migration, no
deploy.

## Shape of the build

**Reuse the table, add three columns, hide the rest.** `shop_products`
already holds everything the nine-field form needs. The form writes the
nine fields; the twenty other columns keep their defaults and stay editable
behind a "More" disclosure for the products that need them (sourcing,
subjects, dispatch, maker). Nothing is dropped, so the marketplace, the
sourcing queue and the integrity checks keep working.

**No Stripe catalogue sync.** Checkout already inlines the price per
session, so there is nothing to create in Stripe and nothing to fail. The
`stripe_*` columns in the spec's shape are not added. `stripe_sync_error` has
no meaning here and is not added either.

**Images are normalised on the way in.** The media route gains `sharp`:
rotate by EXIF, 1600px max, JPEG q82, and a 400px thumbnail written beside
it. HEIC accepted. Cap raised to 25 MB. Multi-select and drag reorder in the
manager, arrows on a phone. Upload stays through the route (the file is
re-encoded there anyway), so the spec's signed client upload is not needed
and would skip the resize.

**Visible is one toggle.** The plain list at `/admin/shop` has an inline
Visible switch that maps to `status = published | draft`. Paused and
archived stay reachable from the edit page for the products that use them.

## Files

```
app/admin/shop/page.tsx              plain list: thumb, name, price, stock, Visible, edit; search
app/admin/shop/new/page.tsx          the nine-field form
app/admin/shop/[id]/page.tsx         same form, edit
components/admin/shop/ProductForm.tsx      nine fields in the spec's order, "More" disclosure below
components/admin/shop/PhotoField.tsx       1-4 photos, multi-select, camera roll, drag or arrows
components/admin/shop/VisibleToggle.tsx    inline, optimistic, reverts on error
app/api/admin/shop/products/route.ts       + PATCH visible, + soft delete (deleted_at), slug from name
app/api/admin/shop/media/route.ts          sharp normalise, thumbnail, HEIC, 25 MB
lib/shop/slug.ts                           slugify + uniqueness loop lifted from the seller route, shared
lib/shop/blessing.ts                       the one global blessing config and copy
lib/shop/catalog.ts                        exclude deleted_at, expose blessing_available
components/shop/BlessingNote.tsx           storefront copy from the global config
app/(app)/shop/icons/[slug]/page.tsx       blessing note when available
lib/shop/checkout.ts                       blessing as a metadata flag on the order (no charge unless the config says so)
components/admin/tabs/ShopTab.tsx          Products sub-tab links to /admin/shop; old sheet editor retired
components/admin/AdminShell.tsx            Shop tab points at the new pages
scripts/shop-import.mjs                    one-time: seed JSON + public/shop/media into the table and bucket, thumbnails made
docs/SHOP.md                               half a page
app/(app)/privacy/page.tsx                 no new data about readers; blessing flag on orders disclosed in one line
```

## Data

```sql
alter table public.shop_products
  add column if not exists blessing_available boolean not null default false,
  add column if not exists deleted_at timestamptz;
alter table public.shop_product_media
  add column if not exists thumb_url text;
create table if not exists public.shop_blessing_config (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  parish_name text not null default '',
  copy_md text not null default '',
  handling_cents int not null default 0,
  updated_at timestamptz not null default now()
);
-- public select policies add `and deleted_at is null` on products and media
```
Migration `2026MMDD_shop_simple.sql`, NOT SIGNED OFF until read. The form
works before it lands (blessing hidden, delete disabled) because every read
tolerates the columns being absent.

Stock: the form's "Unlimited" toggle writes `quantity_available = null` and
`inventory_status = 'ready_to_ship'`; a number writes both. The existing
decrement-on-sale and "almost sold out" logic keep working, and the low
stock notice stays derived, never a phrase like "only 3 left" typed by hand.

## The two-minute path, after

1. /admin/shop, New.
2. Name. Price. Tap Photos, pick up to four from the camera roll.
3. Short description. Category. Stock or Unlimited.
4. Blessing on or off. Visible on.
5. Save. The slug is made from the name; the photos are resized on the way
   in; the product is on /shop within the cache window.

Nine fields, one button, phone-first at 390px.

## Blessing

One global config row edited from the same admin page (a small card above
the list): enabled, parish name, the copy, handling cents. Storefront copy
reads from it: the blessing is offered freely by the cooperating parish;
any charge is for handling. Per product there is only the on/off. At
checkout a blessing request is a metadata flag on the order and, if
`handling_cents > 0`, one extra line item from the config. Nothing per
product is duplicated.

## Storefront

Unchanged routes. `/shop` and `/shop/icons/[slug]` already read published
only; they gain `deleted_at is null` and the blessing note. Stripe Tax is
ASK in DECISIONS: turning it on needs the Stripe account's tax settings,
which is the owner's dashboard, not code. Dark theme stays: user-facing.

## Import

`scripts/shop-import.mjs` runs once: reads `data/shop/seed-products.json`
and `public/shop/media`, upserts by slug, uploads each image through the
same sharp path so thumbnails exist, and never overwrites a product the
owner has edited since (compares `updated_at`). The 28 seeded rows carry
placeholder prices, which the owner sets from the new form.

## Tests

- slug: name to slug, collision gets `-2`, reserved `detail` refused.
- media route: HEIC in, JPEG out under 1600px, thumbnail present.
- PATCH visible flips status and nothing else.
- catalogue never returns a deleted product.
- Playwright: the form at 390px, Save with the nine fields only.

## Integrity note (draft)

No third-party anything. No new data about readers; the blessing flag is a
fact about an order. Steward voice on the storefront; the stock notice is
derived. Nothing in this plan needs a deploy or a migration to add a
product once the one migration is in.

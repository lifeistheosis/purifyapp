-- Shop: simple product management. Three columns, one config table, and the
-- public read policies learn about soft delete.
--
-- NOT SIGNED OFF. Merging this to main runs the DDL against production through
-- the Supabase integration, and AGENTS.md lists migrations as a stop condition.
-- It sits here so the SQL is reviewable in the same change as the call sites,
-- not because it is proposed for merge.
--
-- WHY. docs/plans/v1.4/shop-simple.md and docs/SHOP-AUDIT.md. The owner's spec
-- asks for a product from a phone in under two minutes: a blessing option per
-- product, a way to delete one, and thumbnails so the admin list and the shop
-- grid stop pulling full-size photographs. Everything else the nine-field form
-- needs, shop_products already had.
--
-- SHIPS DARK. Every read tolerates these columns being absent (the catalogue
-- filters deleted_at in code after `select *`, lib/shop/blessing.ts reads the
-- config table through lib/admin/tableAbsent.ts and answers "disabled" when it
-- is not there), and every write that names one of the new columns retries
-- without it on PostgREST's PGRST204. So the new admin pages work before this
-- lands; what they cannot do until then is delete a product or offer a
-- blessing, and they say so.
--
-- SOFT DELETE, NOT DELETE. shop_order_items references shop_products with
-- on delete set null, so a hard delete would strip the product from every
-- order that ever bought it. deleted_at keeps the row, keeps the slug taken
-- (docs/DECISIONS.md: slugs of deleted products are not reused), and hides it
-- from every list and every public read through the policies below.
--
-- Safe to re-run.

alter table public.shop_products
  add column if not exists blessing_available boolean not null default false,
  add column if not exists deleted_at timestamptz;

alter table public.shop_product_media
  add column if not exists thumb_url text;

-- ---------------------------------------------------------------------
-- The one blessing config. A single row (id = 1 by check), edited from
-- /admin/shop. Per product there is only the on/off above; the parish,
-- the copy and any handling charge live here and nowhere else, so nothing
-- is duplicated per product and a changed sentence changes everywhere.
--
-- The handling charge is exactly that. The blessing itself is offered
-- freely by the cooperating parish; the storefront copy says so in a fixed
-- sentence (components/shop/BlessingNote.tsx) that the config cannot edit.
-- ---------------------------------------------------------------------
create table if not exists public.shop_blessing_config (
  id             int primary key default 1 check (id = 1),
  enabled        boolean not null default false,
  parish_name    text not null default '',
  copy_md        text not null default '',
  handling_cents int not null default 0 check (handling_cents >= 0),
  updated_at     timestamptz not null default now()
);

alter table public.shop_blessing_config enable row level security;

-- Public read while enabled: the product page and checkout read it through
-- the anon client, and a disabled config is not information anyone needs.
-- Writes are service role only (no insert/update/delete policies): the admin
-- route uses createAdminClient().
drop policy if exists "shop_blessing_config_public_select" on public.shop_blessing_config;
create policy "shop_blessing_config_public_select" on public.shop_blessing_config
  for select using (enabled);

-- ---------------------------------------------------------------------
-- Public read policies gain `and deleted_at is null`. Recreated in full
-- rather than altered, so the file states the whole predicate.
-- ---------------------------------------------------------------------
drop policy if exists "shop_products_public_select" on public.shop_products;
create policy "shop_products_public_select" on public.shop_products
  for select using (status = 'published' and deleted_at is null);

drop policy if exists "shop_product_media_public_select" on public.shop_product_media;
create policy "shop_product_media_public_select" on public.shop_product_media
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published' and p.deleted_at is null
  ));

drop policy if exists "shop_product_subjects_public_select" on public.shop_product_subjects;
create policy "shop_product_subjects_public_select" on public.shop_product_subjects
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published' and p.deleted_at is null
  ));

-- Rollback, if it comes to that:
--   drop policy "shop_products_public_select" on public.shop_products;
--   create policy "shop_products_public_select" on public.shop_products
--     for select using (status = 'published');
--   (and the media and subjects policies likewise, without the deleted_at clause)
--   drop table public.shop_blessing_config;
--   alter table public.shop_product_media drop column thumb_url;
--   alter table public.shop_products drop column blessing_available, drop column deleted_at;

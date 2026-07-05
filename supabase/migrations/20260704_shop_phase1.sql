-- Shop Phase 1 — EIKON, store-first marketplace foundation
--
-- One active store at launch (EIKON, Purify-owned and disclosed as such),
-- built on a multi-seller-capable model so future independent merchants
-- (iconographers, monasteries, workshops, retailers) slot in without a
-- schema rewrite.
--
-- Privacy discipline, same as entitlements: anything commercially
-- sensitive (supplier identity, costs, sourcing URLs, reviewer notes,
-- internal operations) lives in tables with NO select policies at all.
-- Only the service role reads or writes them, exclusively through the
-- admin API routes. Public tables expose only published/live rows.
--
-- Writes in general go through API routes with the service role; the
-- only client-writable surface in Phase 1 is nothing at all — icon
-- requests and merchant applications are inserted by their API routes
-- after zod validation + rate limiting, so anonymous submissions work
-- and clients can never set status columns. Owners can SELECT their own
-- requests, applications, and orders.
--
-- EIKON's fulfillment is two-stage resale: supplier ships to the Purify
-- operator, EIKON inspects, repackages, and dispatches. The
-- fulfillment_type and status enums leave room for seller_fulfilled /
-- supplier_direct / purify_fulfilled / made_to_order / custom_commission
-- in later phases without new migrations.

-- ---------------------------------------------------------------------
-- Sellers: the accountable party behind a store. EIKON's seller row is
-- purify_owned with no user_id; future merchants attach a user_id after
-- an application is approved. Never client-writable: seller creation is
-- an admin act (application approval), which is what keeps "no ordinary
-- user can self-assign a seller role" true at the database layer.
-- ---------------------------------------------------------------------
create table if not exists public.shop_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  seller_type text not null check (seller_type in
    ('purify_owned', 'independent_iconographer', 'monastery', 'workshop', 'retailer')),
  public_name text not null,
  legal_name text,
  status text not null default 'active' check (status in
    ('active', 'suspended', 'closed')),
  verification_status text not null default 'unverified' check (verification_status in
    ('unverified', 'verified', 'purify_operated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_sellers enable row level security;

-- Public may see active sellers' public identity (needed to render a
-- storefront's "sold by" line). Legal name is not sensitive enough to
-- split tables over; EIKON's is Purify and merchants' legal names appear
-- in their own disclosures later.
drop policy if exists "shop_sellers_public_select" on public.shop_sellers;
create policy "shop_sellers_public_select" on public.shop_sellers
  for select using (status = 'active');

-- ---------------------------------------------------------------------
-- Stores: the public storefront. ownership_disclosure is NOT NULL on
-- purpose — every store must say who operates it, EIKON included.
-- ---------------------------------------------------------------------
create table if not exists public.shop_stores (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.shop_sellers on delete cascade,
  slug text not null unique,
  public_name text not null,
  tagline text,
  description text,
  ownership_disclosure text not null,
  operational_disclosure text,
  logo_url text,
  banner_url text,
  support_email text,
  shipping_origin text,
  shipping_policy_md text,
  return_policy_md text,
  status text not null default 'draft' check (status in
    ('draft', 'live', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_stores_seller_idx on public.shop_stores (seller_id);

alter table public.shop_stores enable row level security;

drop policy if exists "shop_stores_public_select" on public.shop_stores;
create policy "shop_stores_public_select" on public.shop_stores
  for select using (status = 'live');

-- ---------------------------------------------------------------------
-- Products. Price and inventory live here and ONLY here — checkout
-- reads this table server-side; nothing price-shaped is ever accepted
-- from a client. No supplier columns in this table: sourcing is a
-- separate, unreadable table below. maker_name / country_of_origin are
-- the public attribution fields for when a supplier requires credit.
-- ---------------------------------------------------------------------
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.shop_stores on delete cascade,
  seller_id uuid not null references public.shop_sellers on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  description_md text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  category text not null check (category in
    ('christ', 'theotokos', 'saints', 'feasts', 'prayer_corner', 'crosses', 'sets')),
  classification text not null check (classification in
    ('printed_mounted', 'standard_reproduction', 'laminated', 'wooden', 'hand_finished_reproduction')),
  fulfillment_type text not null default 'eikon_two_stage' check (fulfillment_type in
    ('eikon_two_stage', 'seller_fulfilled', 'supplier_direct', 'purify_fulfilled',
     'made_to_order', 'custom_commission')),
  inventory_status text not null default 'special_order' check (inventory_status in
    ('ready_to_ship', 'special_order', 'coming_soon', 'out_of_stock')),
  quantity_available integer check (quantity_available >= 0),
  dispatch_min_days integer not null default 1 check (dispatch_min_days >= 0),
  dispatch_max_days integer not null default 2 check (dispatch_max_days >= dispatch_min_days),
  materials text,
  dimensions text,
  production_method text,
  maker_name text,
  country_of_origin text,
  -- True when the listing photo shows a representative example rather
  -- than the exact physical item the buyer will receive. Surfaced on the
  -- product page so no one mistakes a catalog photo for their icon.
  image_is_representative boolean not null default true,
  status text not null default 'draft' check (status in
    ('draft', 'published', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_products_store_idx
  on public.shop_products (store_id, status);
create index if not exists shop_products_category_idx
  on public.shop_products (category, status);
create index if not exists shop_products_created_idx
  on public.shop_products (created_at desc);

alter table public.shop_products enable row level security;

drop policy if exists "shop_products_public_select" on public.shop_products;
create policy "shop_products_public_select" on public.shop_products
  for select using (status = 'published');

-- ---------------------------------------------------------------------
-- Product media. Alt text is required — accessibility is not optional.
-- ---------------------------------------------------------------------
create table if not exists public.shop_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products on delete cascade,
  media_url text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false
);

create index if not exists shop_product_media_product_idx
  on public.shop_product_media (product_id, sort_order);

alter table public.shop_product_media enable row level security;

drop policy if exists "shop_product_media_public_select" on public.shop_product_media;
create policy "shop_product_media_public_select" on public.shop_product_media
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published'
  ));

-- ---------------------------------------------------------------------
-- Religious subject links. Subjects are slugs into the app's TS
-- registries (saints, feasts, history events), not foreign keys — the
-- registries live in code, and app-level integrity tests keep the slugs
-- honest, the same discipline history's rel.saints uses.
-- ---------------------------------------------------------------------
create table if not exists public.shop_product_subjects (
  product_id uuid not null references public.shop_products on delete cascade,
  subject_type text not null check (subject_type in
    ('saint', 'christ', 'theotokos', 'feast', 'event', 'council')),
  subject_slug text not null,
  primary key (product_id, subject_type, subject_slug)
);

create index if not exists shop_product_subjects_slug_idx
  on public.shop_product_subjects (subject_type, subject_slug);

alter table public.shop_product_subjects enable row level security;

drop policy if exists "shop_product_subjects_public_select" on public.shop_product_subjects;
create policy "shop_product_subjects_public_select" on public.shop_product_subjects
  for select using (exists (
    select 1 from public.shop_products p
    where p.id = product_id and p.status = 'published'
  ));

-- ---------------------------------------------------------------------
-- Suppliers + sourcing: ADMIN-ONLY. RLS is enabled and no policies are
-- created, so the anon/authenticated roles can read and write NOTHING.
-- Only the service role (admin API routes) touches these. Supplier
-- costs, URLs, lead times, and internal notes never reach a browser.
-- ---------------------------------------------------------------------
create table if not exists public.shop_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  contact text,
  default_lead_days integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_suppliers enable row level security;
-- no policies: service-role only.

create table if not exists public.shop_product_sourcing (
  product_id uuid primary key references public.shop_products on delete cascade,
  supplier_id uuid references public.shop_suppliers on delete set null,
  supplier_sku text,
  supplier_cost_cents integer check (supplier_cost_cents >= 0),
  supplier_url text,
  lead_time_days integer,
  stock_status text,
  attribution_required boolean not null default false,
  resale_rights_confirmed boolean not null default false,
  packaging_notes text,
  internal_notes text,
  updated_at timestamptz not null default now()
);

alter table public.shop_product_sourcing enable row level security;
-- no policies: service-role only.

-- ---------------------------------------------------------------------
-- Icon requests: demand collection for manual follow-up now, the seed
-- of the seller-only Demand Board later. Anonymous submissions are
-- allowed (email instead of user_id), so inserts happen through the
-- rate-limited API route with the service role. Owners may read their
-- own; nobody updates or deletes from the client.
-- ---------------------------------------------------------------------
create table if not exists public.shop_icon_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  email text,
  subject text not null,
  saint_slug text,
  request_type text not null default 'either' check (request_type in
    ('ready_made', 'custom', 'either')),
  preferred_size text,
  product_preference text,
  budget_band text check (budget_band in
    ('under_50', '50_100', '100_250', '250_500', '500_plus', 'unsure')),
  desired_date date,
  notes text,
  notify_when_available boolean not null default false,
  status text not null default 'new' check (status in
    ('new', 'reviewing', 'sourced', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists shop_icon_requests_user_idx
  on public.shop_icon_requests (user_id, created_at desc);
create index if not exists shop_icon_requests_status_idx
  on public.shop_icon_requests (status, created_at desc);

alter table public.shop_icon_requests enable row level security;

drop policy if exists "shop_icon_requests_self_select" on public.shop_icon_requests;
create policy "shop_icon_requests_self_select" on public.shop_icon_requests
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Merchant applications. Signed-in users only. The applicant reads
-- their own application; all writes flow through API routes (service
-- role) so status can never be set from a browser and drafts can only
-- be edited while status permits. Reviewer notes live in a separate
-- admin-only table so RLS never has to hide a column.
-- ---------------------------------------------------------------------
create table if not exists public.shop_merchant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  proposed_store_name text not null,
  seller_type text not null check (seller_type in
    ('independent_iconographer', 'monastery', 'workshop', 'retailer')),
  legal_name text not null,
  email text not null,
  phone text,
  country text not null,
  shipping_origin text,
  portfolio_url text,
  product_methods text[] not null default '{}',
  fulfillment_offerings text[] not null default '{}',
  processing_time text,
  countries_served text,
  return_policy text,
  rights_declaration boolean not null default false,
  seller_description text,
  agreed_standards boolean not null default false,
  status text not null default 'submitted' check (status in
    ('draft', 'submitted', 'under_review', 'more_info_required', 'approved',
     'store_setup', 'live', 'declined', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_merchant_applications_user_idx
  on public.shop_merchant_applications (user_id, created_at desc);
create index if not exists shop_merchant_applications_status_idx
  on public.shop_merchant_applications (status, created_at desc);

alter table public.shop_merchant_applications enable row level security;

drop policy if exists "shop_merchant_applications_self_select" on public.shop_merchant_applications;
create policy "shop_merchant_applications_self_select" on public.shop_merchant_applications
  for select using (auth.uid() = user_id);

create table if not exists public.shop_application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.shop_merchant_applications on delete cascade,
  note text not null,
  admin_email text not null,
  created_at timestamptz not null default now()
);

create index if not exists shop_application_notes_app_idx
  on public.shop_application_notes (application_id, created_at desc);

alter table public.shop_application_notes enable row level security;
-- no policies: service-role only. Applicants never see reviewer notes.

-- ---------------------------------------------------------------------
-- Orders. Buyer reads their own order; every write is service-role
-- (checkout route, Stripe webhook, admin fulfillment updates). The
-- internal fulfillment_status carries EIKON's two-stage pipeline; the
-- app maps it to the small buyer-facing vocabulary before display and
-- never ships supplier stages to a browser.
-- ---------------------------------------------------------------------
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  store_id uuid not null references public.shop_stores,
  seller_id uuid not null references public.shop_sellers,
  email text,
  items_total_cents integer not null default 0,
  shipping_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'pending' check (payment_status in
    ('pending', 'paid', 'refunded', 'cancelled')),
  fulfillment_status text not null default 'pending' check (fulfillment_status in
    ('pending', 'supplier_order_needed', 'supplier_order_placed', 'inbound_to_eikon',
     'received_for_inspection', 'packaged', 'shipped', 'delivered',
     'cancelled', 'refunded')),
  supplier_order_status text,
  inbound_tracking text,
  outbound_tracking text,
  refund_status text,
  shipping_address jsonb,
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_user_idx
  on public.shop_orders (user_id, created_at desc);
create index if not exists shop_orders_fulfillment_idx
  on public.shop_orders (fulfillment_status, created_at desc);

alter table public.shop_orders enable row level security;

drop policy if exists "shop_orders_self_select" on public.shop_orders;
create policy "shop_orders_self_select" on public.shop_orders
  for select using (auth.uid() = user_id);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders on delete cascade,
  product_id uuid references public.shop_products on delete set null,
  -- Snapshots: the order remembers what was bought at what price even if
  -- the product is later edited or archived.
  title text not null,
  unit_price_cents integer not null,
  quantity integer not null default 1 check (quantity > 0)
);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id);

alter table public.shop_order_items enable row level security;

drop policy if exists "shop_order_items_self_select" on public.shop_order_items;
create policy "shop_order_items_self_select" on public.shop_order_items
  for select using (exists (
    select 1 from public.shop_orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- Seed: EIKON, the founding store. Fixed UUIDs keep the seed idempotent
-- across re-runs. The store ships as 'live' — visibility on the site is
-- governed by the SHOP_ENABLED env flag, not by hiding the row.
-- ---------------------------------------------------------------------
insert into public.shop_sellers
  (id, user_id, seller_type, public_name, legal_name, status, verification_status)
values
  ('6e1b0000-0000-4000-8000-000000000001', null, 'purify_owned',
   'EIKON', 'Purify', 'active', 'purify_operated')
on conflict (id) do nothing;

insert into public.shop_stores
  (id, seller_id, slug, public_name, tagline, description,
   ownership_disclosure, operational_disclosure, support_email,
   shipping_origin, shipping_policy_md, return_policy_md, status)
values
  ('6e1b0000-0000-4000-8000-000000000002',
   '6e1b0000-0000-4000-8000-000000000001',
   'eikon',
   'EIKON',
   'Icons for the life of prayer.',
   'EIKON curates Orthodox icons for the life of prayer. Each piece is selected for faithfulness to the tradition, inspected by hand, and packaged with care.',
   'EIKON selects, inspects, and ships every icon it sells.',
   'Products are sourced from selected suppliers, inspected, packaged, and fulfilled by EIKON.',
   'support@purifyapp.net',
   'United States',
   E'**Ready to ship** items normally dispatch within 1–2 business days.\n\n**Special order** items are first obtained from our suppliers, inspected, and repackaged before dispatch; each listing shows its own estimated dispatch window. Estimates cover the full journey to dispatch, not just the supplier''s shipping time.',
   E'Standard stocked products may be returned within 30 days if unused and undamaged; the buyer pays return shipping for change-of-mind returns. EIKON covers the cost when an item arrives incorrect, damaged, or materially misdescribed.\n\nSpecial-order purchases may not be cancellable once the supplier order has been placed. Nothing in these terms removes your rights regarding non-delivery or damaged goods.',
   'live')
on conflict (id) do nothing;

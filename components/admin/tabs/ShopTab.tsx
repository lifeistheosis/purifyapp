"use client";

// ShopTab — EIKON product management, icon-request triage, and merchant
// application review. All reads/writes go through /api/admin/shop/*
// (admin-gated, service role). This is the only UI where sourcing and
// supplier data appear.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { invalidateShopCatalog } from "@/lib/shop/catalogClient";
import { hasSupplierImage, orderedMedia } from "@/lib/shop/imageRights";
import { ProductMediaManager } from "../ProductMediaManager";

import {
  Card,
  DataTable,
  FilterBar,
  FilterChips,
  FilterSelect,
  Modal,
  Pill,
  SearchInput,
  SubTabs,
  ToolbarButton,
} from "../primitives";

/* ── Types (admin payload shapes, deliberately local to this tab) ─────── */

type MediaRow = {
  id?: string;
  media_url: string;
  alt_text: string;
  // Carried by the admin select; the rights gate needs them to find the
  // primary image the storefront would show.
  sort_order?: number | null;
  is_primary?: boolean | null;
};
type SubjectRow = { subject_type: string; subject_slug: string };

type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description_md: string | null;
  price_cents: number;
  category: string;
  classification: string;
  inventory_status: string;
  quantity_available: number | null;
  dispatch_min_days: number;
  dispatch_max_days: number;
  materials: string | null;
  dimensions: string | null;
  production_method: string | null;
  maker_name: string | null;
  country_of_origin: string | null;
  image_is_representative: boolean;
  status: string;
  // Denormalized counters (carried by the catalog select *). Optional so
  // rows still type before the view_count migration is applied.
  view_count?: number | null;
  units_sold?: number | null;
  media: MediaRow[];
  subjects: SubjectRow[];
};

type Sourcing = {
  product_id: string;
  supplier_id: string | null;
  supplier_sku: string | null;
  supplier_cost_cents: number | null;
  supplier_url: string | null;
  lead_time_days: number | null;
  stock_status: string | null;
  attribution_required: boolean;
  resale_rights_confirmed: boolean;
  packaging_notes: string | null;
  internal_notes: string | null;
};

type IconRequest = {
  id: string;
  subject: string;
  saint_slug: string | null;
  request_type: string;
  preferred_size: string | null;
  product_preference: string | null;
  budget_band: string | null;
  desired_date: string | null;
  notes: string | null;
  email: string | null;
  notify_when_available: boolean;
  status: string;
  created_at: string;
};

type Application = {
  id: string;
  proposed_store_name: string;
  seller_type: string;
  legal_name: string;
  email: string;
  phone: string | null;
  country: string;
  portfolio_url: string | null;
  product_methods: string[];
  fulfillment_offerings: string[];
  seller_description: string | null;
  status: string;
  created_at: string;
};

type AppNote = {
  id: string;
  application_id: string;
  note: string;
  admin_email: string;
  created_at: string;
};

const field =
  "w-full rounded-md border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
const labelCls = "font-sans text-caption text-paper/55";

const REQUEST_STATUSES = ["new", "reviewing", "sourced", "contacted", "closed"];
const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "more_info_required",
  "approved",
  "store_setup",
  "live",
  "declined",
  "suspended",
];
const INVENTORY_STATUSES = [
  "ready_to_ship",
  "special_order",
  "coming_soon",
  "out_of_stock",
];
const PRODUCT_STATUSES = ["published", "draft", "paused", "archived"];
const PRODUCT_CATEGORIES = [
  "christ",
  "theotokos",
  "saints",
  "feasts",
  "prayer_corner",
  "crosses",
  "sets",
];

/** "out_of_stock" -> "out of stock" for labels. */
const pretty = (s: string) => s.replace(/_/g, " ");

function money(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

/** Short label for a supplier listing URL ("temu.com", "aliexpress.com").
 * Supplier URLs are long and full of tracking params, so the product table
 * shows the host and hangs the full URL off the link's title. Falls back to
 * the raw string when it will not parse as a URL, since the field is free
 * text and an admin may have pasted a bare domain. */
function supplierHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 32 ? `${url.slice(0, 32)}…` : url;
  }
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "products" | "requests" | "applications" | "reviews";

export function ShopTab() {
  const [panel, setPanel] = useState<Panel>("products");
  return (
    <div className="space-y-5">
      <SubTabs
        tabs={
          [
            ["products", "Products"],
            ["requests", "Icon requests"],
            ["applications", "Merchant applications"],
            ["reviews", "Reviews"],
          ] as const
        }
        active={panel}
        onChange={setPanel}
      />
      {panel === "products" && <ProductsPanel />}
      {panel === "requests" && <RequestsPanel />}
      {panel === "applications" && <ApplicationsPanel />}
      {panel === "reviews" && <ReviewsPanel />}
    </div>
  );
}

/* ── Products ──────────────────────────────────────────────────────────── */

function ProductsPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [sourcing, setSourcing] = useState<Sourcing[]>([]);
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  // Table filters. Catalog-scale data, so filtering and sorting run inline on
  // every render instead of hiding behind memo hooks.
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    let alive = true;
    async function run() {
      const r = await fetch("/api/admin/shop/products", { cache: "no-store" });
      if (!alive) return;
      if (!r.ok) {
        setStatus("Couldn't load products (is the shop migration applied?).");
        return;
      }
      const data = (await r.json()) as { products: AdminProduct[]; sourcing: Sourcing[] };
      if (!alive) return;
      setProducts(data.products);
      setSourcing(data.sourcing);
      setStatus(null);
    }
    run();
    return () => {
      alive = false;
    };
  }, [version]);

  async function quickUpdate(p: AdminProduct, patch: Partial<AdminProduct>) {
    // Quick actions reuse the full upsert with the row's current values.
    const merged = { ...p, ...patch };
    const s = sourcing.find((x) => x.product_id === p.id);
    const res = await fetch("/api/admin/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(merged, s)),
    });
    if (res.ok) {
      invalidateShopCatalog();
      load();
    } else setStatus("Update failed.");
  }

  const sourcingOf = (id: string) => sourcing.find((x) => x.product_id === id);

  // Published in the DB but filtered out of the storefront by the
  // supplier-image rights gate: "published" must never overcount what a
  // shopper can actually see.
  const gatedHidden = (p: AdminProduct) =>
    p.status === "published" && hasSupplierImage(p.media);

  const q = query.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (statusFilter === "hidden") {
      if (!gatedHidden(p)) return false;
    } else if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (category !== "all" && p.category !== category) return false;
    if (availability !== "all" && p.inventory_status !== availability) return false;
    if (!q) return true;
    const s = sourcingOf(p.id);
    return [p.title, p.slug, p.maker_name, p.category, s?.supplier_sku, s?.supplier_url]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const roiOf = (p: AdminProduct) => {
    const cost = sourcingOf(p.id)?.supplier_cost_cents;
    return cost != null && cost > 0
      ? (p.price_cents - cost) / cost
      : Number.NEGATIVE_INFINITY;
  };
  if (sort === "title") visible.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "price_desc") visible.sort((a, b) => b.price_cents - a.price_cents);
  else if (sort === "price_asc") visible.sort((a, b) => a.price_cents - b.price_cents);
  else if (sort === "views") visible.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
  else if (sort === "sold") visible.sort((a, b) => (b.units_sold ?? 0) - (a.units_sold ?? 0));
  else if (sort === "roi") visible.sort((a, b) => roiOf(b) - roiOf(a));
  // "newest" keeps the API order (created_at desc).

  const filtersActive =
    q !== "" || statusFilter !== "all" || category !== "all" || availability !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setCategory("all");
    setAvailability("all");
  };

  // Catalog totals stay pinned to the WHOLE catalog, not the filtered view,
  // so the strip reads as "state of the shop" while filters narrow the table.
  let views = 0;
  let sold = 0;
  let revenue = 0;
  let profit = 0;
  for (const p of products) {
    views += p.view_count ?? 0;
    sold += p.units_sold ?? 0;
    revenue += (p.units_sold ?? 0) * p.price_cents;
    const cost = sourcingOf(p.id)?.supplier_cost_cents;
    if (cost != null) profit += (p.units_sold ?? 0) * (p.price_cents - cost);
  }
  // "Published" counts what the STOREFRONT shows (status published AND past
  // the image-rights gate); the gap is surfaced as its own number.
  const hiddenByGate = products.filter(gatedHidden).length;
  const published =
    products.filter((p) => p.status === "published").length - hiddenByGate;
  const drafts = products.filter((p) => p.status === "draft").length;
  const outOfStock = products.filter(
    (p) => p.inventory_status === "out_of_stock",
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric
          label="Products"
          value={String(products.length)}
          hint={drafts > 0 ? `${drafts} draft` : undefined}
        />
        <Metric
          label="Live in shop"
          value={String(published)}
          tone={published > 0 ? "text-emerald-300" : undefined}
          hint={hiddenByGate > 0 ? `${hiddenByGate} hidden by image rights` : undefined}
        />
        <Metric
          label="Out of stock"
          value={String(outOfStock)}
          tone={outOfStock > 0 ? "text-amber-300" : "text-paper/40"}
        />
        <Metric label="Views" value={views.toLocaleString()} />
        <Metric
          label="Units sold"
          value={sold.toLocaleString()}
          tone={sold > 0 ? "text-emerald-300" : undefined}
        />
        <Metric
          label="Revenue"
          value={money(revenue)}
          hint={profit > 0 ? `${money(profit)} profit` : undefined}
        />
      </div>

      <Card
        title="EIKON products"
        subtitle="Publish, pause, and keep availability honest"
        action={
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-pill border border-gold/40 bg-gold/[0.08] px-3 py-1 font-sans text-caption font-semibold text-gold"
          >
            New product
          </button>
        }
      >
        {status ? (
          <p className="mb-3 font-sans text-detail text-rose-300">{status}</p>
        ) : null}
        <FilterBar
          matched={visible.length}
          total={products.length}
          noun="products"
          onClear={filtersActive ? clearFilters : null}
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search title, slug, maker, supplier…"
            className="w-full sm:w-72"
          />
          <FilterChips
            options={[
              { id: "all", label: "All", count: products.length },
              ...PRODUCT_STATUSES.map((s) => ({
                id: s,
                label: s,
                count: products.filter((p) => p.status === s).length,
              })),
              ...(hiddenByGate > 0 || statusFilter === "hidden"
                ? [{ id: "hidden", label: "hidden", count: hiddenByGate }]
                : []),
            ]}
            active={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              ["all", "All"],
              ...PRODUCT_CATEGORIES.map((c) => [c, pretty(c)] as const),
            ]}
          />
          <FilterSelect
            label="Availability"
            value={availability}
            onChange={setAvailability}
            options={[
              ["all", "All"],
              ...INVENTORY_STATUSES.map((s) => [s, pretty(s)] as const),
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              ["newest", "Newest"],
              ["title", "Title A-Z"],
              ["price_desc", "Price: high to low"],
              ["price_asc", "Price: low to high"],
              ["views", "Most viewed"],
              ["sold", "Best selling"],
              ["roi", "Best ROI"],
            ]}
          />
        </FilterBar>
        <DataTable<AdminProduct>
          rows={visible}
          rowKey={(p) => p.id}
          csvFilename="eikon-products.csv"
          empty={
            products.length
              ? "No products match these filters."
              : "No products yet. Apply the migration, then seed or create one."
          }
          columns={[
            {
              key: "title",
              label: "Product",
              render: (p) => (
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="group flex items-center gap-3 text-left"
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/8 bg-night-soft/60">
                    {orderedMedia(p.media)[0] ? (
                      <Image
                        src={orderedMedia(p.media)[0].media_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-sans text-eyebrow text-paper/25">
                        ·
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-[280px] truncate font-medium text-paper group-hover:text-gold">
                      {p.title}
                    </span>
                    <span className="block max-w-[280px] truncate font-sans text-eyebrow text-paper/40">
                      {p.slug} · {pretty(p.category)}
                    </span>
                  </span>
                </button>
              ),
              csv: (p) => p.title,
            },
            {
              key: "source",
              label: "Source",
              render: (p) => {
                const s = sourcing.find((x) => x.product_id === p.id);
                if (!s?.supplier_url) {
                  return <span className="text-paper/30">—</span>;
                }
                return (
                  <a
                    href={s.supplier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.supplier_url}
                    className="inline-flex items-center gap-1 whitespace-nowrap font-sans text-detail text-gold hover:text-gold-pale"
                  >
                    {supplierHost(s.supplier_url)}
                    {s.supplier_sku ? (
                      <span className="text-paper/40">· {s.supplier_sku}</span>
                    ) : null}
                  </a>
                );
              },
              csv: (p) =>
                sourcing.find((x) => x.product_id === p.id)?.supplier_url ?? "",
            },
            {
              key: "price",
              label: "Price",
              align: "right",
              render: (p) => money(p.price_cents),
              csv: (p) => p.price_cents / 100,
            },
            {
              key: "roi",
              label: "Cost · ROI",
              align: "right",
              render: (p) => {
                const cost = sourcing.find((x) => x.product_id === p.id)?.supplier_cost_cents;
                if (cost == null) return <span className="text-paper/30">—</span>;
                const profit = p.price_cents - cost;
                const roi = cost > 0 ? (profit / cost) * 100 : null;
                const tone =
                  roi == null
                    ? "text-paper/60"
                    : roi < 0
                      ? "text-rose-300"
                      : roi < 100
                        ? "text-amber-300"
                        : "text-emerald-300";
                return (
                  <span className="whitespace-nowrap font-sans text-detail">
                    <span className="text-paper/50">{money(cost)}</span>
                    {roi != null ? (
                      <span className={"ml-2 font-semibold " + tone}>{roi.toFixed(0)}%</span>
                    ) : null}
                  </span>
                );
              },
              csv: (p) => {
                const cost = sourcing.find((x) => x.product_id === p.id)?.supplier_cost_cents;
                if (cost == null || cost <= 0) return "";
                return (((p.price_cents - cost) / cost) * 100).toFixed(0);
              },
            },
            {
              key: "inventory",
              label: "Availability",
              render: (p) => (
                <select
                  value={p.inventory_status}
                  onChange={(e) => void quickUpdate(p, { inventory_status: e.target.value })}
                  className={field + " !w-auto"}
                  aria-label={`Availability for ${p.title}`}
                >
                  {INVENTORY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              ),
              csv: (p) => p.inventory_status,
            },
            {
              key: "dispatch",
              label: "Dispatch",
              render: (p) => `${p.dispatch_min_days}–${p.dispatch_max_days}d`,
              csv: (p) => `${p.dispatch_min_days}-${p.dispatch_max_days}`,
            },
            {
              key: "engagement",
              label: "Views · Buys",
              align: "right",
              render: (p) => {
                const v = p.view_count ?? 0;
                const b = p.units_sold ?? 0;
                const conv = v > 0 ? Math.round((b / v) * 100) : null;
                return (
                  <span className="whitespace-nowrap font-sans text-detail tabular-nums">
                    <span className="text-paper/55">{v}</span>
                    <span className="mx-1 text-paper/25">·</span>
                    <span className="font-semibold text-emerald-300">{b}</span>
                    {conv != null ? (
                      <span className="ml-1.5 text-eyebrow text-paper/40">
                        {conv}%
                      </span>
                    ) : null}
                  </span>
                );
              },
              csv: (p) => `${p.view_count ?? 0}/${p.units_sold ?? 0}`,
            },
            {
              key: "status",
              label: "Status",
              render: (p) =>
                gatedHidden(p) ? (
                  <span
                    title="Published, but the storefront hides it: the primary image is on a supplier CDN. Replace it with an owned photo to make it live."
                    className="inline-flex"
                  >
                    <Pill tone="gold">hidden</Pill>
                  </span>
                ) : (
                  <Pill tone={p.status === "published" ? "emerald" : p.status === "paused" ? "rose" : "neutral"}>
                    {p.status}
                  </Pill>
                ),
              csv: (p) => (gatedHidden(p) ? "published (hidden)" : p.status),
            },
            {
              key: "actions",
              label: "",
              render: (p) => (
                <button
                  type="button"
                  onClick={() =>
                    void quickUpdate(p, {
                      status: p.status === "published" ? "paused" : "published",
                    })
                  }
                  className="rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption text-paper/70 hover:text-paper"
                >
                  {p.status === "published" ? "Pause" : "Publish"}
                </button>
              ),
            },
          ]}
        />
      </Card>

      {editing ? (
        <ProductSheet
          product={editing === "new" ? null : editing}
          sourcing={
            editing === "new"
              ? null
              : (sourcing.find((s) => s.product_id === editing.id) ?? null)
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onToggleStatus={(p) =>
            void quickUpdate(p, {
              status: p.status === "published" ? "paused" : "published",
            })
          }
        />
      ) : null}
    </div>
  );
}

function toPayload(p: AdminProduct, s: Sourcing | null | undefined) {
  return {
    id: p.id || undefined,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    descriptionMd: p.description_md,
    priceCents: p.price_cents,
    category: p.category,
    classification: p.classification,
    inventoryStatus: p.inventory_status,
    quantityAvailable: p.quantity_available,
    dispatchMinDays: p.dispatch_min_days,
    dispatchMaxDays: p.dispatch_max_days,
    materials: p.materials,
    dimensions: p.dimensions,
    productionMethod: p.production_method,
    makerName: p.maker_name,
    countryOfOrigin: p.country_of_origin,
    imageIsRepresentative: p.image_is_representative,
    status: p.status,
    media: p.media.map((m) => ({ mediaUrl: m.media_url, altText: m.alt_text })),
    subjects: p.subjects.map((x) => ({
      subjectType: x.subject_type,
      subjectSlug: x.subject_slug,
    })),
    sourcing: s
      ? {
          supplierName: null, // supplier link preserved server-side by id when unchanged
          supplierSku: s.supplier_sku,
          supplierCostCents: s.supplier_cost_cents,
          supplierUrl: s.supplier_url,
          leadTimeDays: s.lead_time_days,
          stockStatus: s.stock_status,
          attributionRequired: s.attribution_required,
          resaleRightsConfirmed: s.resale_rights_confirmed,
          packagingNotes: s.packaging_notes,
          internalNotes: s.internal_notes,
        }
      : undefined,
  };
}

const EMPTY_PRODUCT: AdminProduct = {
  id: "",
  slug: "",
  title: "",
  subtitle: null,
  description_md: null,
  price_cents: 0,
  category: "saints",
  classification: "printed_mounted",
  inventory_status: "special_order",
  quantity_available: null,
  dispatch_min_days: 14,
  dispatch_max_days: 28,
  materials: null,
  dimensions: null,
  production_method: null,
  maker_name: null,
  country_of_origin: null,
  image_is_representative: true,
  status: "draft",
  media: [],
  subjects: [],
};

/* ── Product sheet: overview + edit in one dialog ──────────────────────── */

/**
 * Clicking a product opens this dialog instead of pushing a form under the
 * table (which left the row you clicked scrolled off screen). It lands in
 * read-only Overview — margin, engagement, sourcing at a glance — and only
 * becomes an editable form when you ask for it, so a quick look can't
 * accidentally rewrite a listing. A brand new product skips straight to Edit
 * since there is nothing to view yet.
 */
function ProductSheet({
  product,
  sourcing,
  onClose,
  onSaved,
  onToggleStatus,
}: {
  product: AdminProduct | null;
  sourcing: Sourcing | null;
  onClose: () => void;
  onSaved: () => void;
  onToggleStatus: (p: AdminProduct) => void;
}) {
  const [mode, setMode] = useState<"overview" | "edit">(
    product ? "overview" : "edit",
  );

  return (
    <Modal
      wide
      title={product ? product.title : "New product"}
      subtitle={product ? product.slug : "Create an EIKON listing"}
      onClose={onClose}
      header={
        product ? (
          <SubTabs
            tabs={
              [
                ["overview", "Overview"],
                ["edit", "Edit"],
              ] as const
            }
            active={mode}
            onChange={setMode}
          />
        ) : null
      }
    >
      {product && mode === "overview" ? (
        <ProductOverview
          product={product}
          sourcing={sourcing}
          onEdit={() => setMode("edit")}
          onToggleStatus={onToggleStatus}
        />
      ) : (
        <ProductEditor product={product} sourcing={sourcing} onSaved={onSaved} />
      )}
    </Modal>
  );
}

/** One label + value pair in the overview's detail lists.
 *
 * Two columns rather than `justify-between`: at the dialog's full width the
 * latter flung the label and its value to opposite edges of a ~490px column
 * with a canyon of dead space between them, which is what made the panel look
 * unfinished. A fixed label column keeps the pair readable at any width. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-white/5 py-1.5 last:border-0">
      <span className="w-[42%] shrink-0 font-sans text-caption text-paper/45">
        {label}
      </span>
      <span className="min-w-0 flex-1 font-sans text-detail text-paper/85">
        {value == null || value === "" ? (
          <span className="text-paper/25">—</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

/** One big number in the overview's metric strip. */
function Metric({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-night-soft/40 px-3 py-2.5">
      <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/40">
        {label}
      </p>
      <p
        className={
          "mt-0.5 font-sans text-title-sm font-semibold tabular-nums " +
          (tone ?? "text-paper")
        }
      >
        {value}
      </p>
      {hint ? (
        <p className="font-sans text-eyebrow text-paper/35">{hint}</p>
      ) : null}
    </div>
  );
}

function ProductOverview({
  product: p,
  sourcing: s,
  onEdit,
  onToggleStatus,
}: {
  product: AdminProduct;
  sourcing: Sourcing | null;
  onEdit: () => void;
  onToggleStatus: (p: AdminProduct) => void;
}) {
  const cost = s?.supplier_cost_cents ?? null;
  const profit = cost != null ? p.price_cents - cost : null;
  const roi = cost != null && cost > 0 ? ((p.price_cents - cost) / cost) * 100 : null;
  const views = p.view_count ?? 0;
  const sold = p.units_sold ?? 0;
  const conv = views > 0 ? (sold / views) * 100 : null;
  const hero = orderedMedia(p.media)[0] ?? null;
  const roiTone =
    roi == null
      ? undefined
      : roi < 0
        ? "text-rose-300"
        : roi < 100
          ? "text-amber-300"
          : "text-emerald-300";

  return (
    <div className="space-y-5">
      {hasSupplierImage(p.media) ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3">
          <p className="font-sans text-detail font-semibold text-amber-200">
            Not shown in the public shop
          </p>
          <p className="mt-0.5 font-sans text-caption text-amber-200/80">
            The primary photo is hosted on a supplier CDN, so the rights gate
            hides this listing from shoppers even while it is published.
            Upload an owned or licensed photo to make it live.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-white/8 bg-night-soft/60">
          {hero ? (
            <Image
              src={hero.media_url}
              alt={hero.alt_text}
              fill
              sizes="128px"
              className="object-contain p-2"
            />
          ) : (
            <span className="flex h-full items-center justify-center font-sans text-eyebrow text-paper/25">
              No image
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              tone={
                p.status === "published"
                  ? "emerald"
                  : p.status === "paused"
                    ? "rose"
                    : "neutral"
              }
            >
              {p.status}
            </Pill>
            <Pill>{p.inventory_status.replace(/_/g, " ")}</Pill>
            {p.image_is_representative ? <Pill tone="gold">Stock image</Pill> : null}
          </div>
          {p.subtitle ? (
            <p className="mt-2 font-sans text-detail text-paper/70">{p.subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-pill bg-paper px-4 py-1.5 font-sans text-detail font-semibold text-night"
            >
              Edit product
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(p)}
              className="rounded-pill border border-paper/20 px-4 py-1.5 font-sans text-detail text-paper/75 hover:text-paper"
            >
              {p.status === "published" ? "Pause" : "Publish"}
            </button>
            <a
              href={`/shop/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill border border-paper/20 px-4 py-1.5 font-sans text-detail text-paper/75 hover:text-paper"
            >
              View on site ↗
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Price" value={money(p.price_cents)} />
        <Metric
          label="Cost"
          value={cost == null ? "—" : money(cost)}
          tone={cost == null ? "text-paper/30" : undefined}
        />
        <Metric
          label="Profit / unit"
          value={profit == null ? "—" : money(profit)}
          tone={profit == null ? "text-paper/30" : roiTone}
        />
        <Metric
          label="ROI"
          value={roi == null ? "—" : `${roi.toFixed(0)}%`}
          tone={roi == null ? "text-paper/30" : roiTone}
        />
        <Metric label="Views" value={String(views)} />
        <Metric
          label="Units sold"
          value={String(sold)}
          tone={sold > 0 ? "text-emerald-300" : undefined}
        />
        <Metric
          label="Conversion"
          value={conv == null ? "—" : `${conv.toFixed(1)}%`}
          tone={conv == null ? "text-paper/30" : undefined}
          hint={views > 0 ? `${sold} of ${views}` : "no views yet"}
        />
        <Metric
          label="Revenue"
          value={money(sold * p.price_cents)}
          hint={profit != null ? `profit ${money(sold * profit)}` : undefined}
        />
      </div>

      {/* Capped and centred: at the dialog's full 1040px these two lists
          stretched to ~490px each and the shorter Sourcing column left a large
          void bottom-right. A reading-width block sits deliberately instead. */}
      <div className="mx-auto grid max-w-[840px] gap-x-10 gap-y-5 md:grid-cols-2">
        <div>
          <p className="mb-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45">
            Listing
          </p>
          <Row label="Category" value={p.category.replace(/_/g, " ")} />
          <Row label="Classification" value={p.classification.replace(/_/g, " ")} />
          <Row
            label="Availability"
            value={p.inventory_status.replace(/_/g, " ")}
          />
          <Row label="Quantity on hand" value={p.quantity_available} />
          <Row
            label="Dispatch"
            value={`${p.dispatch_min_days}–${p.dispatch_max_days} days`}
          />
          <Row label="Materials" value={p.materials} />
          <Row label="Dimensions" value={p.dimensions} />
          <Row label="Production" value={p.production_method} />
          <Row label="Maker" value={p.maker_name} />
          <Row label="Origin" value={p.country_of_origin} />
          <Row
            label="Subjects"
            value={
              p.subjects.length
                ? p.subjects.map((x) => x.subject_slug).join(", ")
                : null
            }
          />
          <Row label="Images" value={p.media.length || null} />
        </div>

        <div>
          <p className="mb-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45">
            Sourcing
          </p>
          <Row
            label="Supplier link"
            value={
              s?.supplier_url ? (
                <a
                  href={s.supplier_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.supplier_url}
                  className="text-gold hover:text-gold-pale"
                >
                  {supplierHost(s.supplier_url)} ↗
                </a>
              ) : null
            }
          />
          <Row label="Supplier SKU" value={s?.supplier_sku} />
          <Row label="Supplier cost" value={cost == null ? null : money(cost)} />
          <Row
            label="Lead time"
            value={s?.lead_time_days == null ? null : `${s.lead_time_days} days`}
          />
          <Row label="Stock status" value={s?.stock_status} />
          <Row
            label="Resale rights"
            value={
              s?.resale_rights_confirmed ? (
                <span className="text-emerald-300">Confirmed</span>
              ) : (
                <span className="text-amber-300">Not confirmed</span>
              )
            }
          />
          <Row
            label="Attribution"
            value={s?.attribution_required ? "Required" : "Not required"}
          />
          {s?.packaging_notes ? (
            <div className="mt-3">
              <p className="font-sans text-caption text-paper/45">Packaging notes</p>
              <p className="mt-1 whitespace-pre-wrap font-sans text-detail text-paper/75">
                {s.packaging_notes}
              </p>
            </div>
          ) : null}
          {s?.internal_notes ? (
            <div className="mt-3">
              <p className="font-sans text-caption text-paper/45">Internal notes</p>
              <p className="mt-1 whitespace-pre-wrap font-sans text-detail text-paper/75">
                {s.internal_notes}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  sourcing,
  onSaved,
}: {
  product: AdminProduct | null;
  sourcing: Sourcing | null;
  onSaved: () => void;
}) {
  const [p, setP] = useState<AdminProduct>(() =>
    product
      ? {
          ...product,
          // Cover-first for the media manager, flags stripped: the draft's
          // ORDER is the single source of truth, and the server rewrites
          // sort_order/is_primary from it on save.
          media: orderedMedia(product.media).map((m) => ({
            media_url: m.media_url,
            alt_text: m.alt_text,
          })),
        }
      : EMPTY_PRODUCT,
  );
  const [supplierName, setSupplierName] = useState("");
  const [src, setSrc] = useState<Partial<Sourcing>>(sourcing ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const payload = {
      ...toPayload(p, null),
      sourcing: {
        supplierName: supplierName || null,
        supplierSku: src.supplier_sku ?? null,
        supplierCostCents: src.supplier_cost_cents ?? null,
        supplierUrl: src.supplier_url ?? null,
        leadTimeDays: src.lead_time_days ?? null,
        stockStatus: src.stock_status ?? null,
        attributionRequired: Boolean(src.attribution_required),
        resaleRightsConfirmed: Boolean(src.resale_rights_confirmed),
        packagingNotes: src.packaging_notes ?? null,
        internalNotes: src.internal_notes ?? null,
      },
    };
    const res = await fetch("/api/admin/shop/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (res.ok && data.ok) {
      invalidateShopCatalog();
      onSaved();
    } else setError(data.error ?? "Save failed.");
  }

  // No Card wrapper: the title, close control, and Overview/Edit toggle all
  // live in the hosting Modal (ProductSheet).
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className={labelCls}>Slug</span>
          <input value={p.slug} onChange={(e) => set("slug", e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Title</span>
          <input value={p.title} onChange={(e) => set("title", e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Subtitle</span>
          <input
            value={p.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Price (cents)</span>
          <input
            type="number"
            value={p.price_cents}
            onChange={(e) => set("price_cents", Number(e.target.value) || 0)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Category</span>
          <select value={p.category} onChange={(e) => set("category", e.target.value)} className={field}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Classification (honest labels only)</span>
          <select
            value={p.classification}
            onChange={(e) => set("classification", e.target.value)}
            className={field}
          >
            {[
              "printed_mounted",
              "standard_reproduction",
              "laminated",
              "wooden",
              "hand_finished_reproduction",
            ].map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Availability</span>
          <select
            value={p.inventory_status}
            onChange={(e) => set("inventory_status", e.target.value)}
            className={field}
          >
            {INVENTORY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Quantity on hand (ready-to-ship)</span>
          <input
            type="number"
            value={p.quantity_available ?? ""}
            onChange={(e) =>
              set("quantity_available", e.target.value === "" ? null : Number(e.target.value))
            }
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Dispatch min (days)</span>
          <input
            type="number"
            value={p.dispatch_min_days}
            onChange={(e) => set("dispatch_min_days", Number(e.target.value) || 0)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Dispatch max (days)</span>
          <input
            type="number"
            value={p.dispatch_max_days}
            onChange={(e) => set("dispatch_max_days", Number(e.target.value) || 0)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Dimensions</span>
          <input
            value={p.dimensions ?? ""}
            onChange={(e) => set("dimensions", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Materials</span>
          <input
            value={p.materials ?? ""}
            onChange={(e) => set("materials", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Production method</span>
          <input
            value={p.production_method ?? ""}
            onChange={(e) => set("production_method", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Maker (public attribution)</span>
          <input
            value={p.maker_name ?? ""}
            onChange={(e) => set("maker_name", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Country of origin</span>
          <input
            value={p.country_of_origin ?? ""}
            onChange={(e) => set("country_of_origin", e.target.value || null)}
            className={field}
          />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Listing status</span>
          <select value={p.status} onChange={(e) => set("status", e.target.value)} className={field}>
            {["draft", "published", "paused", "archived"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-1">
        <span className={labelCls}>Description</span>
        <textarea
          rows={4}
          value={p.description_md ?? ""}
          onChange={(e) => set("description_md", e.target.value || null)}
          className={field}
        />
      </label>

      <label className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={p.image_is_representative}
          onChange={(e) => set("image_is_representative", e.target.checked)}
        />
        <span className="font-sans text-detail text-paper/70">
          Photo is representative (not the exact physical item)
        </span>
      </label>

      <div className="mt-4 space-y-1">
        <span className={labelCls}>
          Images (the first is the cover shoppers see; saving updates the
          storefront within seconds)
        </span>
        <ProductMediaManager
          rows={p.media}
          onChange={(rows) => set("media", rows)}
        />
      </div>

      <label className="mt-4 block space-y-1">
        <span className={labelCls}>
          Subjects (one per line: type | slug, e.g. saint | st-nicholas)
        </span>
        <textarea
          rows={4}
          value={p.subjects.map((s) => `${s.subject_type} | ${s.subject_slug}`).join("\n")}
          onChange={(e) =>
            set(
              "subjects",
              e.target.value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => {
                  const [type, slug] = l.split("|");
                  return {
                    subject_type: (type ?? "").trim(),
                    subject_slug: (slug ?? "").trim(),
                  };
                }),
            )
          }
          className={field}
        />
      </label>

      <div className="mt-6 rounded-lg border border-rose-400/20 bg-rose-400/[0.03] p-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-rose-300/80">
          Sourcing (admin-only, never public)
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>Supplier name</span>
            <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={field} />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Supplier SKU</span>
            <input
              value={src.supplier_sku ?? ""}
              onChange={(e) => setSrc((s) => ({ ...s, supplier_sku: e.target.value || null }))}
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Supplier cost (cents)</span>
            <input
              type="number"
              value={src.supplier_cost_cents ?? ""}
              onChange={(e) =>
                setSrc((s) => ({
                  ...s,
                  supplier_cost_cents: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className={field}
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className={labelCls}>
              Supplier product URL (Temu / AliExpress / etc.)
              {src.supplier_url ? (
                <a
                  href={src.supplier_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="ml-2 font-semibold text-gold hover:text-gold-pale"
                >
                  open ↗
                </a>
              ) : null}
            </span>
            <input
              value={src.supplier_url ?? ""}
              onChange={(e) => setSrc((s) => ({ ...s, supplier_url: e.target.value || null }))}
              placeholder="https://www.temu.com/..."
              className={field}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Lead time (days)</span>
            <input
              type="number"
              value={src.lead_time_days ?? ""}
              onChange={(e) =>
                setSrc((s) => ({
                  ...s,
                  lead_time_days: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className={field}
            />
          </label>
        </div>
        {/* Live dropshipping unit economics: what the buyer pays vs. what we
            pay the supplier, with per-unit profit, ROI (profit / cost), and
            gross margin (profit / price). Updates as either field changes. */}
        {(() => {
          const cost = src.supplier_cost_cents;
          const retail = p.price_cents;
          const hasCost = typeof cost === "number" && cost > 0;
          const profit = hasCost ? retail - (cost as number) : null;
          const roi = hasCost && profit != null ? (profit / (cost as number)) * 100 : null;
          const margin = retail > 0 && profit != null ? (profit / retail) * 100 : null;
          const tone =
            roi == null
              ? "text-paper"
              : roi < 0
                ? "text-rose-300"
                : roi < 100
                  ? "text-amber-300"
                  : "text-emerald-300";
          return (
            <div className="mt-4 rounded-md border border-paper/12 bg-night/50 p-3">
              <p className={labelCls}>Unit economics (live)</p>
              {hasCost ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-sans text-detail text-paper/70">
                  <span>
                    Buyer pays <b className="text-paper">{money(retail)}</b>
                  </span>
                  <span>
                    You pay <b className="text-paper">{money(cost)}</b>
                  </span>
                  <span>
                    Profit{" "}
                    <b className={tone}>{money(profit)}</b>/unit
                  </span>
                  <span>
                    ROI <b className={tone}>{roi!.toFixed(0)}%</b>
                  </span>
                  <span className="text-paper/50">Margin {margin!.toFixed(0)}%</span>
                </div>
              ) : (
                <p className="mt-1 font-sans text-caption text-paper/50">
                  Enter a supplier cost to see profit, ROI, and margin.
                </p>
              )}
            </div>
          );
        })()}

        <div className="mt-3 flex flex-wrap gap-5">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(src.resale_rights_confirmed)}
              onChange={(e) => setSrc((s) => ({ ...s, resale_rights_confirmed: e.target.checked }))}
            />
            <span className="font-sans text-detail text-paper/70">Resale rights confirmed</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(src.attribution_required)}
              onChange={(e) => setSrc((s) => ({ ...s, attribution_required: e.target.checked }))}
            />
            <span className="font-sans text-detail text-paper/70">Supplier requires attribution</span>
          </label>
        </div>
        <label className="mt-3 block space-y-1">
          <span className={labelCls}>Internal notes</span>
          <textarea
            rows={2}
            value={src.internal_notes ?? ""}
            onChange={(e) => setSrc((s) => ({ ...s, internal_notes: e.target.value || null }))}
            className={field}
          />
        </label>
      </div>

      {error ? <p className="mt-3 font-sans text-detail text-rose-300">{error}</p> : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="mt-5 rounded-pill bg-paper px-6 py-2.5 font-sans text-ui font-semibold text-night disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save product"}
      </button>
    </div>
  );
}

/* ── Requests ──────────────────────────────────────────────────────────── */

function RequestsPanel() {
  const [requests, setRequests] = useState<IconRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    async function run() {
      const r = await fetch("/api/admin/shop/requests", { cache: "no-store" });
      if (!alive) return;
      if (!r.ok) {
        setError("Couldn't load requests.");
        return;
      }
      const data = (await r.json()) as { requests: IconRequest[] };
      if (alive) setRequests(data.requests);
    }
    run();
    return () => {
      alive = false;
    };
  }, [version]);

  async function setStatus(id: string, status: string) {
    const r = await fetch("/api/admin/shop/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) load();
  }

  const q = query.trim().toLowerCase();
  const visible = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q) return true;
    return [r.subject, r.email, r.saint_slug, r.request_type, r.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <Card title="Icon requests" subtitle="Demand collection; answer by email">
      {error ? <p className="mb-3 font-sans text-detail text-rose-300">{error}</p> : null}
      <FilterBar
        matched={visible.length}
        total={requests.length}
        noun="requests"
        onClear={
          q || statusFilter !== "all"
            ? () => {
                setQuery("");
                setStatusFilter("all");
              }
            : null
        }
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search subject, email, notes…"
          className="w-full sm:w-72"
        />
        <FilterChips
          options={[
            { id: "all", label: "All", count: requests.length },
            ...REQUEST_STATUSES.map((s) => ({
              id: s,
              label: s,
              count: requests.filter((r) => r.status === s).length,
            })),
          ]}
          active={statusFilter}
          onChange={setStatusFilter}
        />
      </FilterBar>
      <DataTable<IconRequest>
        rows={visible}
        rowKey={(r) => r.id}
        empty={
          requests.length ? "No requests match these filters." : "No requests yet."
        }
        csvFilename="icon-requests.csv"
        columns={[
          {
            key: "subject",
            label: "Subject",
            render: (r) => (
              <div>
                <p className="font-medium text-paper">{r.subject}</p>
                <p className="font-sans text-eyebrow text-paper/40">
                  {r.request_type}
                  {r.preferred_size ? ` · ${r.preferred_size}` : ""}
                  {r.budget_band ? ` · ${r.budget_band}` : ""}
                  {r.notify_when_available ? " · notify" : ""}
                </p>
                {r.notes ? (
                  <p className="mt-1 max-w-[360px] font-sans text-eyebrow text-paper/55">
                    {r.notes}
                  </p>
                ) : null}
              </div>
            ),
            csv: (r) => r.subject,
          },
          {
            key: "email",
            label: "Contact",
            render: (r) => r.email ?? "(account)",
            csv: (r) => r.email ?? "",
          },
          {
            key: "created",
            label: "Received",
            render: (r) => new Date(r.created_at).toLocaleDateString(),
            csv: (r) => r.created_at,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <select
                value={r.status}
                onChange={(e) => void setStatus(r.id, e.target.value)}
                className={field + " !w-auto"}
                aria-label={`Status for request ${r.subject}`}
              >
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ),
            csv: (r) => r.status,
          },
        ]}
      />
    </Card>
  );
}

/* ── Applications ──────────────────────────────────────────────────────── */

function ApplicationsPanel() {
  const [apps, setApps] = useState<Application[]>([]);
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    async function run() {
      const r = await fetch("/api/admin/shop/applications", { cache: "no-store" });
      if (!alive) return;
      if (!r.ok) {
        setError("Couldn't load applications.");
        return;
      }
      const data = (await r.json()) as { applications: Application[]; notes: AppNote[] };
      if (!alive) return;
      setApps(data.applications);
      setNotes(data.notes);
    }
    run();
    return () => {
      alive = false;
    };
  }, [version]);

  async function patch(id: string, payload: { status?: string; note?: string }) {
    const r = await fetch("/api/admin/shop/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    if (r.ok) {
      setNoteDraft((d) => ({ ...d, [id]: "" }));
      load();
    }
  }

  const q = query.trim().toLowerCase();
  const visible = apps.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (!q) return true;
    return [
      a.proposed_store_name,
      a.legal_name,
      a.email,
      a.country,
      a.seller_type,
      a.seller_description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const appTone = (s: string) =>
    s === "approved" || s === "live"
      ? ("emerald" as const)
      : s === "declined" || s === "suspended"
        ? ("rose" as const)
        : s === "more_info_required"
          ? ("gold" as const)
          : ("neutral" as const);

  return (
    <Card
      title="Merchant applications"
      subtitle="Manual review only; approval never auto-creates a store"
    >
      {error ? <p className="mb-3 font-sans text-detail text-rose-300">{error}</p> : null}
      <FilterBar
        matched={visible.length}
        total={apps.length}
        noun="applications"
        onClear={
          q || statusFilter !== "all"
            ? () => {
                setQuery("");
                setStatusFilter("all");
              }
            : null
        }
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search store, name, email, country…"
          className="w-full sm:w-72"
        />
        <FilterChips
          options={[
            { id: "all", label: "All", count: apps.length },
            ...APPLICATION_STATUSES.map((s) => ({
              id: s,
              label: pretty(s),
              count: apps.filter((a) => a.status === s).length,
            })),
          ]}
          active={statusFilter}
          onChange={setStatusFilter}
        />
      </FilterBar>
      {apps.length === 0 ? (
        <p className="font-sans text-detail text-paper/50">No applications yet.</p>
      ) : visible.length === 0 ? (
        <p className="font-sans text-detail text-paper/50">
          No applications match these filters.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((a) => {
            const appNotes = notes.filter((n) => n.application_id === a.id);
            return (
              <li key={a.id} className="rounded-lg border border-paper/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-paper">
                      {a.proposed_store_name}
                      <Pill tone={appTone(a.status)}>{pretty(a.status)}</Pill>
                      <span className="font-sans text-eyebrow text-paper/45">
                        {pretty(a.seller_type)} · {a.country}
                      </span>
                    </p>
                    <p className="font-sans text-eyebrow text-paper/50">
                      {a.legal_name} · {a.email}
                      {a.phone ? ` · ${a.phone}` : ""}
                    </p>
                    {a.portfolio_url ? (
                      <a
                        href={a.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-eyebrow text-gold underline underline-offset-2"
                      >
                        {a.portfolio_url}
                      </a>
                    ) : null}
                  </div>
                  <select
                    value={a.status}
                    onChange={(e) => void patch(a.id, { status: e.target.value })}
                    className={field + " !w-auto"}
                    aria-label={`Status for ${a.proposed_store_name}`}
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                {a.seller_description ? (
                  <p className="mt-2 font-sans text-detail text-paper/65">
                    {a.seller_description}
                  </p>
                ) : null}
                <p className="mt-1 font-sans text-eyebrow text-paper/45">
                  Methods: {a.product_methods.join(", ") || "n/a"} · Offers:{" "}
                  {a.fulfillment_offerings.join(", ") || "n/a"} · Applied{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </p>

                {appNotes.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-white/6 pt-3">
                    {appNotes.map((n) => (
                      <li key={n.id} className="font-sans text-eyebrow text-paper/55">
                        <span className="text-paper/35">
                          {new Date(n.created_at).toLocaleDateString()} · {n.admin_email}:
                        </span>{" "}
                        {n.note}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <input
                    value={noteDraft[a.id] ?? ""}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [a.id]: e.target.value }))}
                    placeholder="Reviewer note (never shown to the applicant)"
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const note = (noteDraft[a.id] ?? "").trim();
                      if (note) void patch(a.id, { note });
                    }}
                    className="shrink-0 rounded-pill border border-paper/20 px-4 font-sans text-caption text-paper/70 hover:text-paper"
                  >
                    Add note
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── Reviews ───────────────────────────────────────────────────────────── */
// Seed and remove REAL reviews on any product or store, skipping the buyer +
// delivered gates the public RPCs enforce. For testing how ratings render live.

type AdminReviewProduct = { slug: string; title: string } | null;
type AdminReviewStore = { slug: string; public_name: string } | null;

type AdminProductReview = {
  id: string;
  stars: number;
  body: string | null;
  created_at: string;
  display_name: string | null;
  location: string | null;
  anonymous: boolean;
  order_id: string | null;
  photo_urls?: string[] | null;
  product: AdminReviewProduct;
  store: AdminReviewStore;
};

type AdminStoreReview = {
  id: string;
  stars: number;
  body: string | null;
  created_at: string;
  display_name: string | null;
  location: string | null;
  anonymous: boolean;
  order_id: string | null;
  photo_urls?: string[] | null;
  store: AdminReviewStore;
};

type ReviewsData = {
  productReviews: AdminProductReview[];
  storeReviews: AdminStoreReview[];
  products: { id: string; slug: string; title: string }[];
  stores: { id: string; slug: string; public_name: string }[];
};

function starLabel(n: number): string {
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
}

function ReviewsPanel() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  const [seeding, setSeeding] = useState(false);

  // Filters shared by both tables.
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [starsFilter, setStarsFilter] = useState("all");
  const [source, setSource] = useState("all");

  useEffect(() => {
    let alive = true;
    async function run() {
      const r = await fetch("/api/admin/shop/reviews", { cache: "no-store" });
      if (!alive) return;
      if (!r.ok) {
        setStatus("Couldn't load reviews (is the reviews v2 migration applied?).");
        return;
      }
      const d = (await r.json()) as ReviewsData;
      if (!alive) return;
      setData(d);
      setStatus(null);
    }
    run();
    return () => {
      alive = false;
    };
  }, [version]);

  async function remove(t: "product" | "store", id: string) {
    const res = await fetch("/api/admin/shop/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: t, id }),
    });
    if (res.ok) {
      invalidateShopCatalog();
      load();
    } else setStatus("Delete failed.");
  }

  const productReviews = data?.productReviews ?? [];
  const storeReviews = data?.storeReviews ?? [];

  const q = query.trim().toLowerCase();
  function passes(
    r: {
      stars: number;
      body: string | null;
      display_name: string | null;
      location: string | null;
      order_id: string | null;
    },
    name: string,
  ) {
    if (starsFilter !== "all" && r.stars !== Number(starsFilter)) return false;
    if (source === "verified" && !r.order_id) return false;
    if (source === "seeded" && r.order_id) return false;
    if (!q) return true;
    return [name, r.display_name, r.location, r.body]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  }
  const visibleProduct = productReviews.filter((r) =>
    passes(r, r.product?.title ?? ""),
  );
  const visibleStore = storeReviews.filter((r) =>
    passes(r, r.store?.public_name ?? ""),
  );
  const matched =
    (scope === "stores" ? 0 : visibleProduct.length) +
    (scope === "products" ? 0 : visibleStore.length);
  const total = productReviews.length + storeReviews.length;
  const filtersActive =
    q !== "" || scope !== "all" || starsFilter !== "all" || source !== "all";

  const avgOf = (rows: { stars: number }[]) =>
    rows.length ? rows.reduce((sum, r) => sum + r.stars, 0) / rows.length : null;
  const avgProduct = avgOf(productReviews);
  const avgStore = avgOf(storeReviews);
  const verified =
    productReviews.filter((r) => r.order_id).length +
    storeReviews.filter((r) => r.order_id).length;
  const seeded = total - verified;

  const sourcePill = (orderId: string | null) =>
    orderId ? <Pill tone="emerald">verified</Pill> : <Pill tone="gold">seeded</Pill>;

  const sectionHeading =
    "mb-1 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/45";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric
          label="Product reviews"
          value={String(productReviews.length)}
          hint={avgProduct != null ? `${avgProduct.toFixed(1)} ★ average` : undefined}
        />
        <Metric
          label="Store reviews"
          value={String(storeReviews.length)}
          hint={avgStore != null ? `${avgStore.toFixed(1)} ★ average` : undefined}
        />
        <Metric
          label="Verified"
          value={String(verified)}
          tone={verified > 0 ? "text-emerald-300" : undefined}
          hint="tied to a real order"
        />
        <Metric
          label="Seeded"
          value={String(seeded)}
          tone={seeded > 0 ? "text-gold" : undefined}
          hint="admin-created"
        />
      </div>

      <Card
        title="Reviews"
        subtitle="Everything currently live on products and stores"
        action={
          <ToolbarButton variant="primary" onClick={() => setSeeding(true)}>
            Seed test review
          </ToolbarButton>
        }
      >
        {status ? (
          <p className="mb-3 font-sans text-detail text-rose-300">{status}</p>
        ) : null}
        <FilterBar
          matched={matched}
          total={total}
          noun="reviews"
          onClear={
            filtersActive
              ? () => {
                  setQuery("");
                  setScope("all");
                  setStarsFilter("all");
                  setSource("all");
                }
              : null
          }
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search product, store, reviewer, text…"
            className="w-full sm:w-72"
          />
          <FilterChips
            options={[
              { id: "all", label: "All", count: total },
              { id: "products", label: "Products", count: productReviews.length },
              { id: "stores", label: "Stores", count: storeReviews.length },
            ]}
            active={scope}
            onChange={setScope}
          />
          <FilterSelect
            label="Rating"
            value={starsFilter}
            onChange={setStarsFilter}
            options={[
              ["all", "All"],
              ["5", "5 stars"],
              ["4", "4 stars"],
              ["3", "3 stars"],
              ["2", "2 stars"],
              ["1", "1 star"],
            ]}
          />
          <FilterSelect
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              ["all", "All"],
              ["verified", "Verified purchase"],
              ["seeded", "Seeded"],
            ]}
          />
        </FilterBar>

        {scope !== "stores" ? (
          <div className="mt-4">
            <p className={sectionHeading}>Product reviews</p>
            <DataTable<AdminProductReview>
              rows={visibleProduct}
              rowKey={(r) => r.id}
              csvFilename="product-reviews.csv"
              empty={
                productReviews.length
                  ? "No product reviews match these filters."
                  : "No product reviews yet."
              }
              columns={[
                {
                  key: "product",
                  label: "Product",
                  render: (r) => (
                    <span className="text-paper/85">{r.product?.title ?? "—"}</span>
                  ),
                  csv: (r) => r.product?.title ?? "",
                },
                {
                  key: "stars",
                  label: "Rating",
                  render: (r) => (
                    <span className="text-gold">{starLabel(r.stars)}</span>
                  ),
                  csv: (r) => r.stars,
                },
                {
                  key: "who",
                  label: "Reviewer",
                  render: (r) => (
                    <span>
                      <span className="block text-paper/85">
                        {r.anonymous ? "Anonymous" : r.display_name || "—"}
                      </span>
                      {r.location && !r.anonymous ? (
                        <span className="block font-sans text-eyebrow text-paper/40">
                          {r.location}
                        </span>
                      ) : null}
                    </span>
                  ),
                  csv: (r) => (r.anonymous ? "Anonymous" : r.display_name || ""),
                },
                {
                  key: "body",
                  label: "Review",
                  render: (r) => (
                    <span>
                      <span className="line-clamp-2 text-paper/70">{r.body || "—"}</span>
                      {r.photo_urls && r.photo_urls.length > 0 ? (
                        <span className="mt-0.5 block font-sans text-eyebrow text-paper/40">
                          {r.photo_urls.length === 1
                            ? "1 photo"
                            : `${r.photo_urls.length} photos`}
                        </span>
                      ) : null}
                    </span>
                  ),
                  csv: (r) => r.body ?? "",
                },
                {
                  key: "source",
                  label: "Source",
                  render: (r) => sourcePill(r.order_id),
                  csv: (r) => (r.order_id ? "verified" : "seeded"),
                },
                {
                  key: "posted",
                  label: "Posted",
                  render: (r) => new Date(r.created_at).toLocaleDateString(),
                  csv: (r) => r.created_at,
                },
                {
                  key: "actions",
                  label: "",
                  align: "right",
                  render: (r) => (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => void remove("product", r.id)}
                    >
                      Delete
                    </ToolbarButton>
                  ),
                },
              ]}
            />
          </div>
        ) : null}

        {scope !== "products" ? (
          <div className="mt-6">
            <p className={sectionHeading}>Store reviews</p>
            <DataTable<AdminStoreReview>
              rows={visibleStore}
              rowKey={(r) => r.id}
              csvFilename="store-reviews.csv"
              empty={
                storeReviews.length
                  ? "No store reviews match these filters."
                  : "No store reviews yet."
              }
              columns={[
                {
                  key: "store",
                  label: "Store",
                  render: (r) => (
                    <span className="text-paper/85">
                      {r.store?.public_name ?? "—"}
                    </span>
                  ),
                  csv: (r) => r.store?.public_name ?? "",
                },
                {
                  key: "stars",
                  label: "Rating",
                  render: (r) => (
                    <span className="text-gold">{starLabel(r.stars)}</span>
                  ),
                  csv: (r) => r.stars,
                },
                {
                  key: "who",
                  label: "Reviewer",
                  render: (r) => (
                    <span>
                      <span className="block text-paper/85">
                        {r.anonymous ? "Anonymous" : r.display_name || "—"}
                      </span>
                      {r.location && !r.anonymous ? (
                        <span className="block font-sans text-eyebrow text-paper/40">
                          {r.location}
                        </span>
                      ) : null}
                    </span>
                  ),
                  csv: (r) => (r.anonymous ? "Anonymous" : r.display_name || ""),
                },
                {
                  key: "body",
                  label: "Review",
                  render: (r) => (
                    <span>
                      <span className="line-clamp-2 text-paper/70">{r.body || "—"}</span>
                      {r.photo_urls && r.photo_urls.length > 0 ? (
                        <span className="mt-0.5 block font-sans text-eyebrow text-paper/40">
                          {r.photo_urls.length === 1
                            ? "1 photo"
                            : `${r.photo_urls.length} photos`}
                        </span>
                      ) : null}
                    </span>
                  ),
                  csv: (r) => r.body ?? "",
                },
                {
                  key: "source",
                  label: "Source",
                  render: (r) => sourcePill(r.order_id),
                  csv: (r) => (r.order_id ? "verified" : "seeded"),
                },
                {
                  key: "posted",
                  label: "Posted",
                  render: (r) => new Date(r.created_at).toLocaleDateString(),
                  csv: (r) => r.created_at,
                },
                {
                  key: "actions",
                  label: "",
                  align: "right",
                  render: (r) => (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => void remove("store", r.id)}
                    >
                      Delete
                    </ToolbarButton>
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Card>

      {seeding ? (
        <SeedReviewSheet
          data={data}
          onClose={() => setSeeding(false)}
          onSaved={() => {
            setSeeding(false);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Seed review sheet ─────────────────────────────────────────────────────
 * The seed form used to sit permanently at the top of the panel, pushing the
 * actual reviews below the fold. It is an occasional testing tool, so it now
 * lives behind a button in a dialog. */
function SeedReviewSheet({
  data,
  onClose,
  onSaved,
}: {
  data: ReviewsData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [target, setTarget] = useState<"product" | "store">("product");
  const [productId, setProductId] = useState(data?.products[0]?.id ?? "");
  const [storeId, setStoreId] = useState(data?.stores[0]?.id ?? "");
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [date, setDate] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/shop/media", { method: "POST", body: form });
    const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setUploading(false);
    if (res.ok && d.url) setPhotos((p) => [...p, d.url as string]);
    else setError(d.error ?? "Upload failed.");
  }

  async function seed() {
    setBusy(true);
    setError(null);
    const common = {
      stars,
      body: body.trim() || null,
      displayName: name.trim() || null,
      location: location.trim() || null,
      anonymous,
      createdAt: date || null,
      photoUrls: photos,
    };
    const payload =
      target === "product"
        ? { target, productId, ...common }
        : { target, storeId, ...common };
    const res = await fetch("/api/admin/shop/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (res.ok) {
      invalidateShopCatalog();
      onSaved();
    } else {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error ?? "Couldn't save the review.");
    }
  }

  return (
    <Modal
      title="Seed a test review"
      subtitle="A real review, skipping the buyer + delivered gate. It shows live immediately."
      onClose={onClose}
    >
      {error ? (
        <p className="mb-3 font-sans text-detail text-rose-300">{error}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Target</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as "product" | "store")}
            className={field}
          >
            <option value="product">A product</option>
            <option value="store">A store</option>
          </select>
        </label>
        {target === "product" ? (
          <label className="block">
            <span className={labelCls}>Product</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={field}
            >
              {(data?.products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className={labelCls}>Store</span>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className={field}
            >
              {(data?.stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.public_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className={labelCls}>Stars</span>
          <select
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
            className={field}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Review date (blank = today)</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={field}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={anonymous}
            maxLength={80}
            placeholder="e.g. Markos V."
            className={field + (anonymous ? " opacity-50" : "")}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={anonymous}
            maxLength={80}
            placeholder="e.g. Chicago, IL"
            className={field + (anonymous ? " opacity-50" : "")}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>Review body (optional)</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="What the reviewer wrote"
            className={field}
          />
        </label>
        <div className="sm:col-span-2">
          <span className={labelCls}>Photos (optional)</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {photos.map((u, i) => (
              <span
                key={`${u}-${i}`}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-night"
              >
                <Image src={u} alt="" fill sizes="64px" unoptimized className="object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-night/80 px-1 font-sans text-eyebrow text-paper/80 hover:text-rose-300"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={uploading || photos.length >= 12}
              className="rounded-pill border border-gold/40 bg-gold/[0.08] px-3 py-1.5 font-sans text-caption font-semibold text-gold disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Add photo"}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void addPhoto(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          <span className="font-sans text-detail text-paper/75">
            Post anonymously
          </span>
        </label>
        <button
          type="button"
          onClick={() => void seed()}
          disabled={busy}
          className="rounded-pill border border-gold/40 bg-gold/[0.08] px-4 py-1.5 font-sans text-caption font-semibold text-gold disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add review"}
        </button>
      </div>
    </Modal>
  );
}

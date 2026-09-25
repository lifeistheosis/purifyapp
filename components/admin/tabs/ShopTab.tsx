"use client";

// ShopTab — EIKON product management, icon-request triage, and merchant
// application review. All reads/writes go through /api/admin/shop/*
// (admin-gated, service role). This is the only UI where sourcing and
// supplier data appear.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  deleteDraft,
  draftAge,
  getDraft,
  newDraftId,
  saveDraft,
  type ProductDraft,
  type ProductDraftKind,
} from "@/lib/admin/productDrafts";
import { draftStorage, notifyDraftsChanged, useProductDrafts } from "@/lib/admin/useProductDrafts";
import { invalidateShopCatalog } from "@/lib/shop/catalogClient";
import { CATEGORY_LABELS, CLASSIFICATION_LABELS, INVENTORY_LABELS } from "@/lib/shop/format";
import type { ShopCategory, ShopClassification, ShopInventoryStatus } from "@/lib/shop/types";
import { hasSupplierImage, orderedMedia } from "@/lib/shop/imageRights";
import { slugify, uniqueSlug } from "@/lib/shop/importListing";
import { ProductMediaManager } from "../ProductMediaManager";
import { ImportListingPanel, type ImportDraftRequest } from "../ImportListingPanel";
import { GrowthPanel } from "../shop/GrowthPanel";

import {
  Card,
  DataTable,
  FilterBar,
  FilterChips,
  FilterSelect,
  Modal,
  Pill,
  SearchInput,
  Select,
  SubTabs,
  ToolbarButton,
  Email,
  type SelectOption,
} from "../primitives";
import {
  findShopIssues,
  type IntegrityProduct,
  type IntegritySourcing,
} from "@/lib/shop/integrity";
import { gradePrice, unitEconomics } from "@/lib/shop/pricing";
import { productHref } from "@/lib/shop/productHref";

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

/** A soft-deleted product, as the admin GET returns it (lib/shop/catalog.ts
 *  and the public policies hide it everywhere else). */
type DeletedProduct = AdminProduct & { deleted_at: string };

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
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
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
// ── The listing vocabulary, read off the label tables ─────────────────────
// These three lists were typed out here by hand, and the classification one
// had five of the ten values the server accepted: a prayer rope opened in the
// editor showed "printed mounted" and could not be set back. Every list below
// now comes from lib/shop/format.ts, the table the storefront renders from,
// so a value added there reaches this picker with nothing to remember.
const INVENTORY_STATUSES = Object.keys(INVENTORY_LABELS) as ShopInventoryStatus[];
const PRODUCT_STATUSES = ["published", "draft", "paused", "archived"];
const PRODUCT_CATEGORIES = Object.keys(CATEGORY_LABELS) as ShopCategory[];

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

/** The picker's grouping, mark and one-line meaning for each category. */
const CATEGORY_META: Record<ShopCategory, { group: string; icon: string; hint: string }> = {
  christ: { group: "Icons", icon: "🖼️", hint: "Icons of Christ" },
  theotokos: { group: "Icons", icon: "🖼️", hint: "Icons of the Mother of God" },
  saints: { group: "Icons", icon: "🖼️", hint: "Icons of saints and angels" },
  feasts: { group: "Icons", icon: "🖼️", hint: "Feast day icons" },
  crosses: { group: "Devotional", icon: "☦️", hint: "Wall, hand and standing crosses" },
  prayer_ropes: { group: "Devotional", icon: "📿", hint: "Komboskini, chotki, prayer beads" },
  prayer_corner: { group: "Devotional", icon: "🕯️", hint: "Lampadas, shelves, stands" },
  incense: { group: "Devotional", icon: "🔥", hint: "Resin, charcoal, censers" },
  jewelry: { group: "Wear and home", icon: "💍", hint: "Rings, pendants, bracelets" },
  apparel: { group: "Wear and home", icon: "🧢", hint: "Hats, shirts, patches" },
  flags: { group: "Wear and home", icon: "🚩", hint: "Flags and church banners" },
  home_decor: { group: "Wear and home", icon: "🏠", hint: "Statues, plaques, ornaments" },
  books: { group: "More", icon: "📖", hint: "Prayer books and reading" },
  sets: { group: "More", icon: "🎁", hint: "Bundles and gift sets" },
};

/** Picker order for classifications, grouped. Anything the label table gains
 *  that is not placed here still appears, at the end, rather than vanishing. */
const CLASSIFICATION_ORDER: ShopClassification[] = [
  "printed_mounted",
  "standard_reproduction",
  "laminated",
  "wooden",
  "hand_finished_reproduction",
  "prayer_rope",
  "beaded",
  "cross",
  "incense",
  "candle",
  "book",
  "apparel",
  "jewelry",
  "textile",
  "flag",
  "home_decor",
];

const CLASSIFICATION_META: Partial<Record<ShopClassification, { group: string; hint: string }>> = {
  printed_mounted: { group: "Icons", hint: "A print mounted on board" },
  standard_reproduction: { group: "Icons", hint: "A printed reproduction, unmounted" },
  laminated: { group: "Icons", hint: "A print sealed in laminate" },
  wooden: { group: "Icons", hint: "An icon printed on or mounted to wood" },
  hand_finished_reproduction: { group: "Icons", hint: "A print with finishing applied by hand" },
  prayer_rope: { group: "Devotional goods", hint: "Knotted rope or cord" },
  beaded: { group: "Devotional goods", hint: "Beads on a string or chain" },
  cross: { group: "Devotional goods", hint: "A cross worn on a chain or cord" },
  incense: { group: "Devotional goods", hint: "Resin, powder or cones" },
  candle: { group: "Devotional goods", hint: "Beeswax or vigil candles" },
  book: { group: "Devotional goods", hint: "A printed book" },
  apparel: { group: "Wear and home", hint: "Clothing, hats, knitwear" },
  jewelry: { group: "Wear and home", hint: "Rings, pendants, bracelets" },
  textile: { group: "Wear and home", hint: "Woven cloth: a mat, a patch" },
  flag: { group: "Wear and home", hint: "Flags and banners" },
  home_decor: { group: "Wear and home", hint: "Wall crosses, statues, ornaments" },
};

const INVENTORY_META: Record<ShopInventoryStatus, { color: string; hint: string }> = {
  ready_to_ship: { color: "var(--adm-good)", hint: "In hand, dispatches in days" },
  special_order: { color: "var(--adm-warn)", hint: "Bought in after the order" },
  coming_soon: { color: "var(--adm-s2)", hint: "Shown, not yet buyable" },
  out_of_stock: { color: "var(--adm-ink-3)", hint: "Shown, not buyable, alerts on return" },
};

const STATUS_META: Record<string, { color: string; hint: string }> = {
  published: { color: "var(--adm-good)", hint: "Live in the shop" },
  draft: { color: "var(--adm-ink-3)", hint: "Only here, never public" },
  paused: { color: "var(--adm-warn)", hint: "Hidden for now, keeps its place" },
  archived: { color: "var(--adm-ink-3)", hint: "Retired, kept for the record" },
};

const CATEGORY_OPTIONS: SelectOption<ShopCategory>[] = PRODUCT_CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
  icon: CATEGORY_META[c]?.icon,
  hint: CATEGORY_META[c]?.hint,
  group: CATEGORY_META[c]?.group,
}));

const CLASSIFICATION_OPTIONS: SelectOption<ShopClassification>[] = [
  ...CLASSIFICATION_ORDER.filter((c) => c in CLASSIFICATION_LABELS),
  ...(Object.keys(CLASSIFICATION_LABELS) as ShopClassification[]).filter(
    (c) => !CLASSIFICATION_ORDER.includes(c),
  ),
].map((c) => ({
  value: c,
  label: CLASSIFICATION_LABELS[c],
  hint: CLASSIFICATION_META[c]?.hint,
  group: CLASSIFICATION_META[c]?.group ?? "Other",
}));

const INVENTORY_OPTIONS: SelectOption<ShopInventoryStatus>[] = INVENTORY_STATUSES.map((s) => ({
  value: s,
  label: INVENTORY_LABELS[s],
  hint: INVENTORY_META[s].hint,
  icon: <Dot color={INVENTORY_META[s].color} />,
}));

const STATUS_OPTIONS: SelectOption<string>[] = PRODUCT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
  hint: STATUS_META[s]?.hint,
  icon: <Dot color={STATUS_META[s]?.color ?? "var(--adm-ink-3)"} />,
}));

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

type Panel = "products" | "deals" | "requests" | "applications" | "reviews";

export function ShopTab() {
  const [panel, setPanel] = useState<Panel>("products");
  return (
    <div className="space-y-6">
      <SubTabs
        tabs={
          [
            ["products", "Products"],
            ["deals", "Deals & shipping"],
            ["requests", "Icon requests"],
            ["applications", "Merchant applications"],
            ["reviews", "Reviews"],
          ] as const
        }
        active={panel}
        onChange={setPanel}
      />
      {panel === "products" && <ProductsPanel />}
      {panel === "deals" && <GrowthPanel />}
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
  // Stores were already in the response and were being thrown away. The
  // integrity check needs them: a published listing whose store is not live is
  // invisible to shoppers, and that is only knowable by joining the two.
  const [stores, setStores] = useState<{ id: string; status: string }[]>([]);
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  /**
   * A listing read off a distributor's page, waiting to be opened in the
   * editor. Separate from `editing` because it is not a product yet: it has no
   * id, nothing has been written, and closing the editor throws it away.
   */
  const [draft, setDraftState] = useState<ImportedDraft | null>(null);
  /**
   * The on-device draft the open editor writes to (lib/admin/productDrafts).
   * "edit:<id>" for an existing product, "new:<random>" for a listing that has
   * no row yet. Closing the editor no longer throws the work away: the draft
   * stays, and the Unsaved listings card offers it back.
   */
  const [draftId, setDraftId] = useState<string | null>(null);
  /** A stored draft the editor starts from, when one is being resumed. */
  const [resume, setResume] = useState<ProductDraft | null>(null);
  const [deleted, setDeleted] = useState<DeletedProduct[]>([]);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const unsaved = useProductDrafts();
  const [status, setStatus] = useState<string | null>(null);
  /** What just happened, in the good colour. `status` is for what went wrong. */
  const [notice, setNotice] = useState<string | null>(null);

  function setDraft(d: ImportedDraft) {
    setDraftState(d);
    setDraftId(newDraftId());
    setResume(null);
    setEditing("new");
  }

  function startNew() {
    setDraftState(null);
    setDraftId(newDraftId());
    setResume(null);
    setEditing("new");
  }

  function openProduct(p: AdminProduct) {
    setDraftState(null);
    setDraftId(`edit:${p.id}`);
    setResume(null);
    setEditing(p);
  }

  function resumeDraft(d: ProductDraft) {
    if (d.kind === "edit") {
      const p = products.find((x) => x.id === d.productId);
      if (!p) {
        // Deleted, or saved from another device since. The draft points at
        // nothing it could be applied to.
        const storage = draftStorage();
        if (storage) deleteDraft(storage, d.id);
        notifyDraftsChanged();
        setStatus("That product is no longer in the list, so its unsaved changes were dropped.");
        return;
      }
      setDraftState(null);
      setDraftId(d.id);
      setResume(d);
      setEditing(p);
      return;
    }
    setDraftState({
      product: d.product as AdminProduct,
      sourcing: d.sourcing as Partial<Sourcing>,
      supplierName: d.supplierName,
    });
    setDraftId(d.id);
    setResume(d);
    setEditing("new");
  }

  function discardDraft(id: string) {
    const storage = draftStorage();
    if (storage) deleteDraft(storage, id);
    notifyDraftsChanged();
  }

  async function restore(p: AdminProduct) {
    try {
      const res = await fetch("/api/admin/shop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, restore: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus(data.error ?? `Restore failed (${res.status}).`);
        return;
      }
      setNotice(`Restored "${p.title}". It is archived; publish it when it is ready.`);
      invalidateShopCatalog();
      load();
    } catch {
      setStatus("Restore failed: network dropped. Try again.");
    }
  }
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
      const data = (await r.json()) as {
        products: AdminProduct[];
        deleted?: DeletedProduct[];
        sourcing: Sourcing[];
        stores?: { id: string; status: string }[];
      };
      if (!alive) return;
      setProducts(data.products);
      setDeleted(data.deleted ?? []);
      setSourcing(data.sourcing);
      setStores(data.stores ?? []);
      setStatus(null);
    }
    run();
    return () => {
      alive = false;
    };
  }, [version]);

  async function quickUpdate(p: AdminProduct, patch: Partial<AdminProduct>) {
    // Quick actions reuse the full upsert with the row's current values.
    try {
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
    } catch {
      setStatus("Update failed: network dropped. Try again.");
    }
  }

  const sourcingOf = (id: string) => sourcing.find((x) => x.product_id === id);

  // Published in the DB but filtered out of the storefront by the
  // supplier-image rights gate: "published" must never overcount what a
  // shopper can actually see.
  const gatedHidden = (p: AdminProduct) =>
    p.status === "published" && hasSupplierImage(p.media);

  const q = query.trim().toLowerCase();
  // "deleted" swaps the table's rows for the deleted list rather than
  // filtering the live one, so a restore is one click from where it is found.
  const showingDeleted = statusFilter === "deleted";
  const visible = (showingDeleted ? deleted : products).filter((p) => {
    if (statusFilter === "hidden") {
      if (!gatedHidden(p)) return false;
    } else if (!showingDeleted && statusFilter !== "all" && p.status !== statusFilter) return false;
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
    // Contribution, not price minus cost. Same reason as the per-product
    // figures below: the processing fee is real money and is regressive, so
    // omitting it overstates every small item.
    if (cost != null) {
      profit += (p.units_sold ?? 0) * unitEconomics(p.price_cents, cost).contributionCents;
    }
  }
  // "Published" counts what the STOREFRONT shows (status published AND past
  // the image-rights gate); the gap is surfaced as its own number.
  const hiddenByGate = products.filter(gatedHidden).length;
  const published =
    products.filter((p) => p.status === "published").length - hiddenByGate;
  const drafts = products.filter((p) => p.status === "draft").length;
  // So an imported listing cannot land on a slug the shop already uses. The
  // deleted ones count: a deleted product keeps its slug for good, so an old
  // link or an order never starts pointing at something else.
  const takenSlugs = [...products, ...deleted].map((p) => p.slug);
  const outOfStock = products.filter(
    (p) => p.inventory_status === "out_of_stock",
  ).length;

  // The shop checked against itself. See lib/shop/integrity.ts for what each
  // kind means and why markup is reported rather than judged.
  const issues = findShopIssues({
    products: products as unknown as IntegrityProduct[],
    sourcing: sourcing as unknown as IntegritySourcing[],
    stores,
  });
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-6">
      {issues.length > 0 ? (
        <div className="rounded-xl border border-[color:var(--adm-warn)]/35 bg-[color:var(--adm-warn)]/[0.07] p-4">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.1px] text-[color:var(--adm-warn)]">
            {errorCount > 0
              ? `${errorCount} contradiction${errorCount === 1 ? "" : "s"} in the catalogue`
              : "Catalogue notes"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {issues.map((issue) => (
              <li
                key={`${issue.kind}:${issue.slugs.join(",")}`}
                className="font-sans text-caption text-paper/75"
              >
                <span
                  className={
                    issue.severity === "error"
                      ? "text-[color:var(--adm-bad)]"
                      : issue.severity === "warning"
                        ? "text-[color:var(--adm-warn)]"
                        : "text-paper/45"
                  }
                >
                  ●
                </span>{" "}
                <span className="font-medium text-paper">
                  {issue.slugs.join(" + ")}
                </span>{" "}
                {issue.detail}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 font-sans text-caption text-paper/45">
            Supplier links are not checked here. A real listing and a made-up id
            both answer 200 behind the same bot wall, so a link sweep would call
            every one of them dead.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric
          label="Products"
          value={String(products.length)}
          hint={drafts > 0 ? `${drafts} draft` : undefined}
        />
        <Metric
          label="Live in shop"
          value={String(published)}
          tone={published > 0 ? "text-[color:var(--adm-good)]" : undefined}
          hint={hiddenByGate > 0 ? `${hiddenByGate} hidden by image rights` : undefined}
        />
        <Metric
          label="Out of stock"
          value={String(outOfStock)}
          tone={outOfStock > 0 ? "text-[color:var(--adm-warn)]" : "text-paper/40"}
        />
        <Metric label="Views" value={views.toLocaleString()} />
        <Metric
          label="Units sold"
          value={sold.toLocaleString()}
          tone={sold > 0 ? "text-[color:var(--adm-good)]" : undefined}
        />
        {/* NOT "Revenue". This is units_sold multiplied by the price the
            product carries RIGHT NOW, and units_sold is a monotonic counter
            that refunds never decrement. Raise a price from this tab's own
            editor and the figure rises with no sale having happened, while
            the Revenue tab keeps reporting the real number because it sums
            shop_order_items.unit_price_cents, a genuine sale-time snapshot.
            Two tabs of one panel would disagree the moment a price moved.

            Renamed rather than recomputed, so there is exactly one place in
            the panel that claims to state booked revenue, and it is the one
            reading the orders. */}
        <Metric
          label="Sold at today's price"
          value={money(revenue)}
          hint={profit > 0 ? `${money(profit)} contribution` : undefined}
        />
      </div>

      {unsaved.length > 0 ? (
        <Card
          title="📝 Unsaved listings"
          subtitle="Kept on this device as you typed. Resume one to carry on, or discard it."
        >
          <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
            {unsaved.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                style={{ borderColor: "var(--adm-line)" }}
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-detail font-medium text-paper">
                    {d.kind === "import" ? "📥 " : d.kind === "edit" ? "✏️ " : "✍️ "}
                    {d.title || "Untitled listing"}
                  </p>
                  <p className="font-sans text-eyebrow text-paper/45">
                    {d.kind === "import"
                      ? `Imported from ${d.supplierHost ?? "a link"}`
                      : d.kind === "edit"
                        ? "Changes to a saved product"
                        : "New listing"}
                    {" · "}
                    {draftAge(d.savedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ToolbarButton variant="primary" onClick={() => resumeDraft(d)}>
                    Resume
                  </ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => discardDraft(d.id)}>
                    Discard
                  </ToolbarButton>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Paste a distributor's link, get a draft. The panel does the reading
          and this owns the one thing it must not: turning what was read into a
          product the editor can save. */}
      <Card
        title="Make a listing from a link"
        subtitle="Paste a distributor's product page and check what came back"
      >
        <ImportListingPanel onDraft={(req) => setDraft(draftFromImport(req, takenSlugs))} />
      </Card>

      <Card
        title="EIKON products"
        subtitle="Publish, pause, and keep availability honest"
        action={
          <button
            type="button"
            onClick={startNew}
            className="rounded-pill border border-gold/40 bg-gold/[0.08] px-3 py-1 font-sans text-caption font-semibold text-gold-pale"
          >
            New product
          </button>
        }
      >
        {status ? (
          <p className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">{status}</p>
        ) : null}
        {notice ? (
          <p role="status" className="mb-3 font-sans text-detail text-[color:var(--adm-good)]">
            {notice}
          </p>
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
              ...(deleted.length > 0 || statusFilter === "deleted"
                ? [{ id: "deleted", label: "deleted", count: deleted.length }]
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
            showingDeleted
              ? "Nothing deleted."
              : products.length
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
                  onClick={() => (showingDeleted ? undefined : openProduct(p))}
                  disabled={showingDeleted}
                  className="group flex items-center gap-3 text-left disabled:cursor-default"
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/8 bg-night-soft/60">
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
                    <span className="block max-w-[280px] truncate font-medium text-paper group-hover:text-gold-pale">
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
                    className="inline-flex items-center gap-1 whitespace-nowrap font-sans text-detail text-gold-pale hover:underline"
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
                      ? "text-[color:var(--adm-critical)]"
                      : roi < 100
                        ? "text-[color:var(--adm-warn)]"
                        : "text-[color:var(--adm-good)]";
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
                <Select
                  size="sm"
                  value={p.inventory_status as ShopInventoryStatus}
                  onChange={(v) => void quickUpdate(p, { inventory_status: v })}
                  ariaLabel={`Availability for ${p.title}`}
                  options={INVENTORY_OPTIONS}
                  disabled={showingDeleted}
                  menuMinWidth={240}
                />
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
                    <span className="font-semibold text-[color:var(--adm-good)]">{b}</span>
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
              render: (p) =>
                showingDeleted ? (
                  <button
                    type="button"
                    onClick={() => void restore(p)}
                    className="rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption text-paper/70 hover:text-paper"
                  >
                    Restore
                  </button>
                ) : (
                  <span className="inline-flex gap-1.5">
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
                    <button
                      type="button"
                      onClick={() => setPendingDelete(p)}
                      aria-label={`Delete ${p.title}`}
                      className="rounded-pill border border-[color:color-mix(in_oklab,var(--adm-critical),transparent_60%)] px-3 py-1 font-sans text-caption text-[color:var(--adm-critical)] hover:bg-[color:color-mix(in_oklab,var(--adm-critical),transparent_90%)]"
                    >
                      Delete
                    </button>
                  </span>
                ),
            },
          ]}
        />
      </Card>

      {editing && draftId ? (
        <ProductSheet
          key={draftId}
          product={editing === "new" ? null : editing}
          sourcing={
            editing === "new"
              ? null
              : (sourcing.find((s) => s.product_id === editing.id) ?? null)
          }
          draft={editing === "new" ? draft : null}
          draftId={draftId}
          resume={resume}
          onClose={() => {
            // The draft stays on the device; the Unsaved listings card has it.
            setEditing(null);
            setDraftState(null);
            setResume(null);
          }}
          onSaved={() => {
            setEditing(null);
            setDraftState(null);
            setResume(null);
            load();
          }}
          onToggleStatus={(p) =>
            void quickUpdate(p, {
              status: p.status === "published" ? "paused" : "published",
            })
          }
          onDelete={(p) => {
            // Close the sheet first: two dialogs open at once would both
            // answer the same Escape press.
            setEditing(null);
            setResume(null);
            setPendingDelete(p);
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteDialog
          product={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleted={(p) => {
            setPendingDelete(null);
            discardDraft(`edit:${p.id}`);
            setNotice(`Deleted "${p.title}". It is out of the shop; find it under the deleted filter to restore it.`);
            invalidateShopCatalog();
            load();
          }}
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

/** A listing read off a distributor's page, in the shapes this tab edits. */
type ImportedDraft = {
  product: AdminProduct;
  sourcing: Partial<Sourcing>;
  supplierName: string;
};

/**
 * Turn what the importer read into a product the editor can open.
 *
 * Only the facts that came off the page are filled in. CATEGORY AND
 * CLASSIFICATION ARE LEFT AT THEIR DEFAULTS on purpose: a distributor's page
 * has no idea whether a cross is a feast icon or a prayer corner piece, and a
 * guess in those two fields is the kind of wrong that reaches the storefront
 * looking deliberate. The owner picks them, which is one dropdown each.
 *
 * The price is what the owner set in the import panel, and the distributor's
 * own price goes to the sourcing row as the cost, never to the shop price.
 */
function draftFromImport(req: ImportDraftRequest, takenSlugs: string[]): ImportedDraft {
  const { imported, retailCents, ownsImages } = req;
  const l = imported.listing;
  const title = (l.title ?? "").slice(0, 200);
  const alt = title.length >= 3 ? title : "Distributor photo";
  const urls = ownsImages ? imported.images.map((i) => i.url) : l.images;

  const photoNote = ownsImages
    ? `Photos copied into our storage from: ${imported.images.map((i) => i.sourceUrl).join(", ")}`
    : "Photos still point at the distributor's server, so the shop keeps this listing hidden until they are replaced.";

  return {
    supplierName: imported.supplierHost,
    product: {
      ...EMPTY_PRODUCT,
      slug: uniqueSlug(imported.slug || slugify(title), takenSlugs),
      title,
      description_md: l.description,
      price_cents: retailCents,
      materials: l.material,
      dimensions: l.dimensions,
      maker_name: l.brand,
      media: urls.slice(0, 8).map((u) => ({ media_url: u, alt_text: alt })),
      status: "draft",
    },
    sourcing: {
      supplier_sku: l.sku,
      supplier_cost_cents: l.priceCents,
      supplier_url: imported.supplierUrl,
      stock_status: l.availability,
      // Ticking "copy the photos" in the import panel IS the rights claim, so
      // it is recorded as one rather than left for the owner to remember.
      resale_rights_confirmed: ownsImages,
      internal_notes: `Imported ${new Date().toISOString().slice(0, 10)} from ${imported.supplierUrl}\n${photoNote}`,
    },
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

/* ── Delete, confirmed ─────────────────────────────────────────────────────
 * Soft delete (app/api/admin/shop/products PATCH): the product leaves the shop
 * and this list at once, orders keep their record of it, and the deleted
 * filter can bring it back. Its own dialog rather than a native confirm(),
 * so it reads in the panel's voice and says what will and will not happen. */
function ConfirmDeleteDialog({
  product,
  onCancel,
  onDeleted,
}: {
  product: AdminProduct;
  onCancel: () => void;
  onDeleted: (p: AdminProduct) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, deleted: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) onDeleted(product);
      else setError(data.error ?? `Delete failed (${res.status}).`);
    } catch {
      setError("Delete failed: network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Delete "${product.title}"?`} subtitle={product.slug} onClose={onCancel}>
      <ul className="ml-4 list-disc space-y-1.5 font-sans text-detail text-paper/75">
        <li>It leaves the shop and this list straight away, and any cart holding it can no longer check it out.</li>
        <li>Orders that already bought it keep their record of it.</li>
        <li>Its address stays reserved, so an old link never opens a different product.</li>
        <li>The deleted filter above the table can restore it.</li>
      </ul>
      {error ? (
        <p className="mt-3 font-sans text-detail text-[color:var(--adm-critical)]">{error}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <ToolbarButton onClick={onCancel}>Keep it</ToolbarButton>
        <ToolbarButton variant="danger" loading={busy} onClick={() => void remove()}>
          Delete product
        </ToolbarButton>
      </div>
    </Modal>
  );
}

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
  draft,
  draftId,
  resume,
  onClose,
  onSaved,
  onToggleStatus,
  onDelete,
}: {
  product: AdminProduct | null;
  sourcing: Sourcing | null;
  /** A listing imported from a distributor's page, not yet saved. */
  draft?: ImportedDraft | null;
  /** Where the editor keeps its on-device draft. */
  draftId: string;
  /** A stored draft to start from instead of the saved values. */
  resume?: ProductDraft | null;
  onClose: () => void;
  onSaved: () => void;
  onToggleStatus: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
}) {
  // A resumed draft opens straight into the editor, where its changes are.
  const [mode, setMode] = useState<"overview" | "edit">(
    product && !resume ? "overview" : "edit",
  );
  const kind: ProductDraftKind = product ? "edit" : draft || resume?.kind === "import" ? "import" : "custom";

  return (
    <Modal
      wide
      title={product ? product.title : (draft?.product.title || "New product")}
      subtitle={
        product
          ? product.slug
          : draft
            ? `Imported from ${draft.supplierName}. Kept on this device until you press Save.`
            : "Create an EIKON listing"
      }
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
          onDelete={onDelete}
        />
      ) : (
        <ProductEditor
          product={product}
          sourcing={sourcing}
          draft={draft}
          draftId={draftId}
          draftKind={kind}
          resume={resume ?? null}
          supplierHost={draft?.supplierName ?? resume?.supplierHost ?? null}
          onSaved={onSaved}
          onDiscard={onClose}
        />
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
    <div className="rounded-[var(--adm-radius-sm)] border border-white/8 bg-night-soft/40 px-3 py-2.5">
      <p className="font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
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
  onDelete,
}: {
  product: AdminProduct;
  sourcing: Sourcing | null;
  onEdit: () => void;
  onToggleStatus: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
}) {
  const cost = s?.supplier_cost_cents ?? null;
  // AFTER THE PROCESSING FEE. This computed price minus cost, which on a small
  // item is not profit at all: card processing is 2.9% plus a flat 30c, so a
  // $3.00 item costing $2.80 showed "$0.20, ROI 7%" and was painted warn,
  // while lib/shop/pricing.ts on the very same supplier cost returns a fee of
  // 39c, a contribution of MINUS 19c, and grades it "Loses money".
  //
  // Two tabs of one panel disagreeing about whether an item makes money is bad
  // enough; the tone ladder grading the loss as a warning is what let it keep
  // selling. SourcingTab was the only importer of the pricing module.
  const econ = unitEconomics(p.price_cents, cost);
  const grade = gradePrice(econ);
  const profit = econ.costKnown ? econ.contributionCents : null;
  const roi = cost != null && cost > 0 ? (econ.contributionCents / cost) * 100 : null;
  const views = p.view_count ?? 0;
  const sold = p.units_sold ?? 0;
  const conv = views > 0 ? (sold / views) * 100 : null;
  const hero = orderedMedia(p.media)[0] ?? null;
  // Driven off the graded band rather than a raw ROI threshold, so a unit that
  // loses money paints critical instead of warn.
  const roiTone =
    !econ.costKnown
      ? undefined
      : grade.band === "loss"
        ? "text-[color:var(--adm-critical)]"
        : grade.band === "thin"
          ? "text-[color:var(--adm-warn)]"
          : "text-[color:var(--adm-good)]";

  return (
    <div className="space-y-6">
      {hasSupplierImage(p.media) ? (
        <div className="rounded-[var(--adm-radius)] border border-[color-mix(in_oklab,var(--adm-warn),transparent_70%)] bg-[color-mix(in_oklab,var(--adm-warn),transparent_94%)] p-3">
          <p className="font-sans text-detail font-semibold text-[color:var(--adm-warn)]">
            Not shown in the public shop
          </p>
          <p className="mt-0.5 font-sans text-caption text-[color:color-mix(in_oklab,var(--adm-warn),transparent_20%)]">
            The primary photo is hosted on a supplier CDN, so the rights gate
            hides this listing from shoppers even while it is published.
            Upload an owned or licensed photo to make it live.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/8 bg-night-soft/60">
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
            {/* productHref, not /shop/<slug>: that path is the store route,
                so every product opened "Store not found". The admin is
                web-only, so the website form of the link. */}
            <a
              href={productHref(p.slug, false)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill border border-paper/20 px-4 py-1.5 font-sans text-detail text-paper/75 hover:text-paper"
            >
              View on site ↗
            </a>
            <button
              type="button"
              onClick={() => onDelete(p)}
              className="rounded-pill border border-[color:color-mix(in_oklab,var(--adm-critical),transparent_60%)] px-4 py-1.5 font-sans text-detail text-[color:var(--adm-critical)] hover:bg-[color:color-mix(in_oklab,var(--adm-critical),transparent_90%)]"
            >
              Delete
            </button>
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
          tone={sold > 0 ? "text-[color:var(--adm-good)]" : undefined}
        />
        <Metric
          label="Conversion"
          value={conv == null ? "—" : `${conv.toFixed(1)}%`}
          tone={conv == null ? "text-paper/30" : undefined}
          hint={views > 0 ? `${sold} of ${views}` : "no views yet"}
        />
        {/* See the strip above: today's price times a counter that never
            goes down, which is not revenue. */}
        <Metric
          label="Sold at today's price"
          value={money(sold * p.price_cents)}
          hint={profit != null ? `contribution ${money(sold * profit)}` : undefined}
        />
      </div>

      {/* Capped and centred: at the dialog's full 1040px these two lists
          stretched to ~490px each and the shorter Sourcing column left a large
          void bottom-right. A reading-width block sits deliberately instead. */}
      <div className="mx-auto grid max-w-[840px] gap-x-10 gap-y-5 md:grid-cols-2">
        <div>
          <p className="mb-1 font-sans text-detail font-medium text-[color:var(--adm-ink-3)]">
            Listing
          </p>
          <Row
            label="Category"
            value={CATEGORY_LABELS[p.category as ShopCategory] ?? p.category.replace(/_/g, " ")}
          />
          <Row
            label="Classification"
            value={
              CLASSIFICATION_LABELS[p.classification as ShopClassification] ??
              p.classification.replace(/_/g, " ")
            }
          />
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
          <p className="mb-1 font-sans text-detail font-medium text-[color:var(--adm-ink-3)]">
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
                  className="text-gold-pale hover:underline"
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
                <span className="text-[color:var(--adm-good)]">Confirmed</span>
              ) : (
                <span className="text-[color:var(--adm-warn)]">Not confirmed</span>
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

/** Nothing typed, nothing imported: a form with no work in it to keep. */
function isBlankListing(p: AdminProduct, src: Partial<Sourcing>): boolean {
  return (
    !p.title.trim() &&
    !p.price_cents &&
    p.media.length === 0 &&
    !(p.description_md ?? "").trim() &&
    !src.supplier_url &&
    !src.supplier_cost_cents
  );
}

function ProductEditor({
  product,
  sourcing,
  draft,
  draftId,
  draftKind,
  resume,
  supplierHost,
  onSaved,
  onDiscard,
}: {
  product: AdminProduct | null;
  sourcing: Sourcing | null;
  /** Starting values read off a distributor's page. Nothing is saved yet. */
  draft?: ImportedDraft | null;
  /** Where this editor keeps its on-device draft (lib/admin/productDrafts). */
  draftId: string;
  draftKind: ProductDraftKind;
  /** A stored draft to start from instead of the saved values. */
  resume: ProductDraft | null;
  supplierHost: string | null;
  onSaved: () => void;
  /** Throw the draft away and close. */
  onDiscard: () => void;
}) {
  // Everything the form starts from, captured once, plus its serialised form:
  // "untouched" is this string, and an untouched edit has nothing to keep.
  const [initial] = useState(() => {
    const p0: AdminProduct = resume
      ? (resume.product as AdminProduct)
      : product
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
        : (draft?.product ?? EMPTY_PRODUCT);
    const src0: Partial<Sourcing> =
      (resume?.sourcing as Partial<Sourcing> | undefined) ?? sourcing ?? draft?.sourcing ?? {};
    const name0 = resume?.supplierName ?? draft?.supplierName ?? "";
    return { p: p0, src: src0, supplierName: name0, key: JSON.stringify({ p: p0, src: src0, supplierName: name0 }) };
  });
  const [p, setP] = useState<AdminProduct>(initial.p);
  const [supplierName, setSupplierName] = useState(initial.supplierName);
  const [src, setSrc] = useState<Partial<Sourcing>>(initial.src);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── The on-device draft ───────────────────────────────────────────────
  // Changes from an earlier session on a SAVED product are offered back, not
  // applied silently: the saved listing may have moved on since.
  const [waiting, setWaiting] = useState<ProductDraft | null>(() => {
    if (resume || draftKind !== "edit") return null;
    const storage = draftStorage();
    const found = storage ? getDraft(storage, draftId) : null;
    return found && JSON.stringify({ p: found.product, src: found.sourcing, supplierName: found.supplierName }) !== initial.key
      ? found
      : null;
  });
  const [kept, setKept] = useState<{ at: number } | "failed" | null>(resume ? { at: resume.savedAt } : null);

  function writeDraft(cur: { p: AdminProduct; src: Partial<Sourcing>; supplierName: string }): boolean | null {
    const storage = draftStorage();
    if (!storage) return null;
    const untouched = JSON.stringify(cur) === initial.key;
    // An import is kept at once, untouched or not: the scan is the work.
    if (untouched && draftKind !== "import") {
      // Every edit undone by hand: nothing left to keep.
      if (draftKind === "edit") deleteDraft(storage, draftId);
      return null;
    }
    if (draftKind === "custom" && isBlankListing(cur.p, cur.src)) return null;
    return saveDraft(storage, {
      id: draftId,
      kind: draftKind,
      productId: product?.id ?? null,
      title: cur.p.title.trim() || "Untitled listing",
      supplierHost,
      savedAt: Date.now(),
      product: cur.p,
      sourcing: cur.src,
      supplierName: cur.supplierName,
    });
  }

  // Every change lands on the device within 600ms. Paused while an older
  // draft is being offered back, so typing cannot overwrite it unseen.
  useEffect(() => {
    if (waiting) return;
    const t = setTimeout(() => {
      const ok = writeDraft({ p, src, supplierName });
      if (ok !== null) setKept(ok ? { at: Date.now() } : "failed");
      notifyDraftsChanged();
    }, 600);
    return () => clearTimeout(t);
    // writeDraft closes over props that do not change for this editor's life
    // (it is keyed on draftId by its parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, src, supplierName, waiting]);

  // And the last 600ms, when the tab is closed or hidden mid-keystroke.
  const latest = useRef({ p, src, supplierName, waiting });
  useEffect(() => {
    latest.current = { p, src, supplierName, waiting };
  }, [p, src, supplierName, waiting]);
  useEffect(() => {
    const flush = () => {
      const cur = latest.current;
      if (!cur.waiting) writeDraft({ p: cur.p, src: cur.src, supplierName: cur.supplierName });
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function discard() {
    const storage = draftStorage();
    if (storage) deleteDraft(storage, draftId);
    notifyDraftsChanged();
    onDiscard();
  }
  /**
   * The price box's raw text while it is being typed in.
   *
   * Null means "show the stored value". Without it, deriving the input's value
   * from price_cents on every keystroke rewrites the box under the cursor: a
   * half-typed "24." formats to "24.00" and the caret jumps, and clearing the
   * field puts a 0 back instantly. Released on blur, so the box settles to the
   * canonical two-decimal form once the owner leaves it.
   */
  const [dollarsDraft, setDollarsDraft] = useState<string | null>(null);

  function set<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
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
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        // Saved for real, so the device copy has done its job.
        const storage = draftStorage();
        if (storage) deleteDraft(storage, draftId);
        notifyDraftsChanged();
        invalidateShopCatalog();
        onSaved();
      } else setError(data.error ?? `Save failed (${res.status}). Your draft is still on this device.`);
    } catch {
      setError("Save failed: network dropped. Your edits are still here; try again.");
    } finally {
      setBusy(false);
    }
  }

  // No Card wrapper: the title, close control, and Overview/Edit toggle all
  // live in the hosting Modal (ProductSheet).
  return (
    <div>
      {waiting ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--adm-radius)] border p-3"
          style={{
            borderColor: "color-mix(in oklab, var(--adm-accent-line), transparent 60%)",
            background: "color-mix(in oklab, var(--adm-accent), transparent 92%)",
          }}
        >
          <p className="font-sans text-detail text-paper">
            📝 Unsaved changes to this product are on this device, from {draftAge(waiting.savedAt)}.
          </p>
          <div className="flex gap-2">
            <ToolbarButton
              variant="primary"
              onClick={() => {
                setP(waiting.product as AdminProduct);
                setSrc(waiting.sourcing as Partial<Sourcing>);
                setSupplierName(waiting.supplierName);
                setKept({ at: waiting.savedAt });
                setWaiting(null);
              }}
            >
              Restore them
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const storage = draftStorage();
                if (storage) deleteDraft(storage, draftId);
                notifyDraftsChanged();
                setWaiting(null);
              }}
            >
              Discard
            </ToolbarButton>
          </div>
        </div>
      ) : null}
      {/* gap-3 on a phone, gap-4 from md. Worth only about 60px: measured
          afterwards, the rows were already tight at 70px for a 44px input
          plus its label, and the form's real bulk is the blocks BELOW this
          grid, not the space between its rows. The Sourcing disclosure
          further down is where the 781px came from. */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {/* TITLE FIRST, SLUG SECOND. The form opened on Slug, which is a URL
            fragment nobody thinks of before they have named the thing. On a
            phone that put a technical field in the one position guaranteed to
            be read, and the field people actually came to fill in below it. */}
        <label className="space-y-1">
          <span className={labelCls}>Title</span>
          <input value={p.title} onChange={(e) => set("title", e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Slug</span>
          <input value={p.slug} onChange={(e) => set("slug", e.target.value)} className={field} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>Subtitle</span>
          <input
            value={p.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value || null)}
            className={field}
          />
        </label>
        {/* ── Price, in dollars ────────────────────────────────────────
            This field asked for CENTS. To list something at $24.99 the owner
            typed 2499, and the box beside it showed 2499, so there was no
            moment where the form displayed the price the shop would actually
            charge. A slip of one digit is a product listed at $249.90 or
            $2.49, and nothing on screen would have looked wrong.

            Stored in cents, as it must be: money is integer cents everywhere
            in this codebase and lib/shop/checkout.ts re-prices from the
            database regardless. Only the input speaks dollars, and the cent
            value it will store is echoed underneath so the conversion is
            never something the owner has to trust. */}
        <label className="space-y-1">
          <span className={labelCls}>Price (USD)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={dollarsDraft ?? (p.price_cents / 100).toFixed(2)}
            onChange={(e) => {
              // The raw string is kept while typing, so "24." and a cleared
              // box do not get rewritten under the cursor. It is only parsed
              // into cents on the way to state.
              setDollarsDraft(e.target.value);
              const cents = Math.round(Number(e.target.value) * 100);
              set("price_cents", Number.isFinite(cents) && cents >= 0 ? cents : 0);
            }}
            onBlur={() => setDollarsDraft(null)}
            className={field}
          />
          <span className="block font-sans text-eyebrow text-paper/40 tabular-nums">
            stores {p.price_cents} cents
          </span>
        </label>
        {/* Divs, not labels: each field is the panel's Select, which is a
            button, and a <label> around a button forwards its clicks twice. */}
        <div className="space-y-1">
          <span id={`${draftId}-category`} className={labelCls}>
            Category (the shop section it sits in)
          </span>
          <Select
            ariaLabelledBy={`${draftId}-category`}
            value={p.category as ShopCategory}
            onChange={(v) => set("category", v)}
            options={CATEGORY_OPTIONS}
            menuMinWidth={280}
          />
        </div>
        <div className="space-y-1">
          <span id={`${draftId}-classification`} className={labelCls}>
            Classification (what it physically is, honest labels only)
          </span>
          <Select
            ariaLabelledBy={`${draftId}-classification`}
            value={p.classification as ShopClassification}
            onChange={(v) => set("classification", v)}
            options={CLASSIFICATION_OPTIONS}
            menuMinWidth={300}
          />
        </div>
        <div className="space-y-1">
          <span id={`${draftId}-availability`} className={labelCls}>
            Availability
          </span>
          <Select
            ariaLabelledBy={`${draftId}-availability`}
            value={p.inventory_status as ShopInventoryStatus}
            onChange={(v) => set("inventory_status", v)}
            options={INVENTORY_OPTIONS}
            menuMinWidth={280}
          />
        </div>
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
        <div className="space-y-1">
          <span id={`${draftId}-status`} className={labelCls}>
            Listing status
          </span>
          <Select
            ariaLabelledBy={`${draftId}-status`}
            value={p.status}
            onChange={(v) => set("status", v)}
            options={STATUS_OPTIONS}
            menuMinWidth={260}
          />
        </div>
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

      {/* ── Sourcing, folded away ────────────────────────────────────────
          Measured at 375px: this block is 781px, 26% of a 3002px form, and it
          is the part you least often want. Changing a price or fixing a
          typo in a title means scrolling past every supplier field to get
          anywhere, and on a phone that is most of a screen of things you are
          not editing.

          OPEN WHEN IT HAS SOMETHING IN IT. A disclosure that hides data
          already entered is worse than no disclosure: the owner would have to
          remember the supplier fields exist to discover they are filled in.
          So it starts open for any product that already has sourcing, and
          closed for one that does not, which is every new listing.

          <details> rather than state, deliberately. It keeps the contents in
          the DOM, so a browser's find-in-page still reaches them, the form
          posts the same fields either way, and nothing here needs to know
          whether it is open. */}
      <details
        open={Boolean(
          supplierName ||
            src.supplier_sku ||
            src.supplier_cost_cents ||
            src.supplier_url,
        )}
        className="mt-6 rounded-[var(--adm-radius)] border border-[color-mix(in_oklab,var(--adm-critical),transparent_80%)] bg-[color-mix(in_oklab,var(--adm-critical),transparent_97%)] p-4"
      >
        <summary className="cursor-pointer font-sans text-detail font-medium tracking-[1.2px] text-[color:color-mix(in_oklab,var(--adm-critical),transparent_20%)] [&::-webkit-details-marker]:hidden">
          Sourcing (admin-only, never public)
          <span className="ml-2 font-normal tracking-normal text-paper/40">
            supplier, cost, links
          </span>
        </summary>
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
                  className="ml-2 font-semibold text-gold-pale hover:underline"
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
                ? "text-[color:var(--adm-critical)]"
                : roi < 100
                  ? "text-[color:var(--adm-warn)]"
                  : "text-[color:var(--adm-good)]";
          return (
            <div className="mt-4 rounded-[var(--adm-radius)] border border-paper/12 bg-night/50 p-3">
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
      </details>

      {error ? <p className="mt-3 font-sans text-detail text-[color:var(--adm-critical)]">{error}</p> : null}

      {/* ── Save, always reachable ───────────────────────────────────────
          Sticky to the bottom of the sheet's own scroll area. This button used
          to sit at the natural end of the form, which on a phone is four and a
          bit screens down: to save a change to the Title field the owner had
          to scroll past every remaining field to find it, and scroll back up
          to check what they had typed.

          The background is opaque and the top border is real, because the
          fields scrolling underneath a translucent bar read as a rendering
          fault rather than as depth. Negative margins cancel the sheet's own
          padding so the bar spans its full width. */}
      <div
        className="sticky bottom-0 -mx-4 mt-5 flex items-center gap-3 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:-mx-5 md:px-5"
        style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}
      >
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-pill bg-paper px-6 py-2.5 font-sans text-ui font-semibold text-night disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save product"}
        </button>
        {/* The price, spelled out next to the button that commits it. The last
            thing seen before saving is what the shop will charge. */}
        <span className="font-sans text-detail text-paper/45 tabular-nums">
          ${(p.price_cents / 100).toFixed(2)}
        </span>
        {/* Where the work is, said plainly: on this device until Save puts
            it in the shop. A browser that refuses storage is said out loud,
            so nobody closes the tab trusting a draft that does not exist. */}
        <span className="ml-auto flex min-w-0 items-center gap-3 font-sans text-eyebrow text-paper/45">
          {kept === "failed" ? (
            <span className="text-[color:var(--adm-warn)]">This browser will not keep a draft. Save before closing.</span>
          ) : kept ? (
            <>
              <span className="truncate">
                Draft on this device, {new Date(kept.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
              <button
                type="button"
                onClick={discard}
                className="shrink-0 underline underline-offset-2 hover:text-[color:var(--adm-critical)]"
              >
                Discard draft
              </button>
            </>
          ) : null}
        </span>
      </div>
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
      {error ? <p className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">{error}</p> : null}
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
            render: (r) => <Email value={r.email} fallback="(account)" />,
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
              <Select
                size="sm"
                value={r.status}
                onChange={(v) => void setStatus(r.id, v)}
                ariaLabel={`Status for request ${r.subject}`}
                options={REQUEST_STATUSES.map((s) => ({ value: s, label: s }))}
              />
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
      {error ? <p className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">{error}</p> : null}
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
              <li key={a.id} className="rounded-[var(--adm-radius)] border border-paper/10 p-4">
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
                      {a.legal_name} · <Email value={a.email} />
                      {a.phone ? ` · ${a.phone}` : ""}
                    </p>
                    {a.portfolio_url ? (
                      <a
                        href={a.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-eyebrow text-gold-pale underline underline-offset-2"
                      >
                        {a.portfolio_url}
                      </a>
                    ) : null}
                  </div>
                  <Select
                    size="sm"
                    align="end"
                    value={a.status}
                    onChange={(v) => void patch(a.id, { status: v })}
                    ariaLabel={`Status for ${a.proposed_store_name}`}
                    options={APPLICATION_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                  />
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
                          {new Date(n.created_at).toLocaleDateString()} ·{" "}
                          <Email value={n.admin_email} />:
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
    try {
      const res = await fetch("/api/admin/shop/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t, id }),
      });
      if (res.ok) {
        invalidateShopCatalog();
        load();
      } else setStatus("Delete failed.");
    } catch {
      setStatus("Delete failed: network dropped. Try again.");
    }
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
    "mb-1 font-sans text-detail font-medium text-[color:var(--adm-ink-3)]";

  return (
    <div className="space-y-6">
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
          tone={verified > 0 ? "text-[color:var(--adm-good)]" : undefined}
          hint="tied to a real order"
        />
        <Metric
          label="Seeded"
          value={String(seeded)}
          tone={seeded > 0 ? "text-gold-pale" : undefined}
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
          <p className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">{status}</p>
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
                    <span className="text-gold-pale">{starLabel(r.stars)}</span>
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
                    <span className="text-gold-pale">{starLabel(r.stars)}</span>
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
    // try/finally: a thrown fetch (flaky network) must never strand the
    // dialog on "Uploading…" with no error — that is exactly how a seed
    // ends up saved without its photo.
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/shop/media", { method: "POST", body: form });
      const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && d.url) setPhotos((p) => [...p, d.url as string]);
      else setError(d.error ?? `Upload failed (${res.status}). Try again.`);
    } catch {
      setError("Upload failed: network dropped. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function seed() {
    setBusy(true);
    setError(null);
    try {
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
      if (res.ok) {
        invalidateShopCatalog();
        onSaved();
      } else {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error ?? `Couldn't save the review (${res.status}).`);
      }
    } catch {
      setError("Couldn't save: network dropped. Your fields are still here; try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Seed a test review"
      subtitle="A real review, skipping the buyer + delivered gate. It shows live immediately."
      onClose={onClose}
    >
      {error ? (
        <p className="mb-3 font-sans text-detail text-[color:var(--adm-critical)]">{error}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="block">
          <span className={labelCls}>Target</span>
          <Select
            ariaLabel="Target"
            value={target}
            onChange={setTarget}
            options={[
              { value: "product", label: "A product" },
              { value: "store", label: "A store" },
            ]}
          />
        </div>
        {target === "product" ? (
          <div className="block">
            <span className={labelCls}>Product</span>
            {/* Searchable once the catalogue passes ten, which it has. */}
            <Select
              ariaLabel="Product"
              value={productId}
              onChange={setProductId}
              options={(data?.products ?? []).map((p) => ({ value: p.id, label: p.title, hint: p.slug }))}
            />
          </div>
        ) : (
          <div className="block">
            <span className={labelCls}>Store</span>
            <Select
              ariaLabel="Store"
              value={storeId}
              onChange={setStoreId}
              options={(data?.stores ?? []).map((s) => ({ value: s.id, label: s.public_name }))}
            />
          </div>
        )}
        <div className="block">
          <span className={labelCls}>Stars</span>
          <Select
            ariaLabel="Stars"
            value={String(stars)}
            onChange={(v) => setStars(Number(v))}
            options={[5, 4, 3, 2, 1].map((n) => ({
              value: String(n),
              label: `${n} ${n === 1 ? "star" : "stars"}`,
              icon: <span className="text-gold-pale">{starLabel(n)}</span>,
            }))}
          />
        </div>
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
                className="relative h-16 w-16 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/10 bg-night"
              >
                <Image src={u} alt="" fill sizes="64px" unoptimized className="object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-night/80 px-1 font-sans text-eyebrow text-paper/80 hover:text-[color:var(--adm-critical)]"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={uploading || photos.length >= 12}
              className="rounded-pill border border-gold/40 bg-gold/[0.08] px-3 py-1.5 font-sans text-caption font-semibold text-gold-pale disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Add photo"}
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              onChange={(e) => {
                // One after another; addPhoto appends with a functional
                // update, so every photo lands.
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                void (async () => {
                  for (const f of files) await addPhoto(f);
                })();
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
          disabled={busy || uploading}
          title={uploading ? "Wait for the photo upload to finish" : undefined}
          className="rounded-pill border border-gold/40 bg-gold/[0.08] px-4 py-1.5 font-sans text-caption font-semibold text-gold-pale disabled:opacity-50"
        >
          {busy ? "Saving…" : uploading ? "Photo uploading…" : "Add review"}
        </button>
      </div>
    </Modal>
  );
}

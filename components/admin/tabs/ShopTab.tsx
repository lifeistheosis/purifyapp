"use client";

// ShopTab — EIKON product management, icon-request triage, and merchant
// application review. All reads/writes go through /api/admin/shop/*
// (admin-gated, service role). This is the only UI where sourcing and
// supplier data appear.

import { useEffect, useState } from "react";

import { Card, DataTable, Pill } from "../primitives";

/* ── Types (admin payload shapes, deliberately local to this tab) ─────── */

type MediaRow = { id?: string; media_url: string; alt_text: string };
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

function money(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "products" | "requests" | "applications";

export function ShopTab() {
  const [panel, setPanel] = useState<Panel>("products");
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            ["products", "Products"],
            ["requests", "Icon requests"],
            ["applications", "Merchant applications"],
          ] as [Panel, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id)}
            aria-pressed={panel === id}
            className={
              "rounded-pill px-4 py-1.5 font-sans text-detail font-medium transition-colors " +
              (panel === id
                ? "bg-gold text-night"
                : "border border-paper/15 text-paper/65 hover:text-paper")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {panel === "products" && <ProductsPanel />}
      {panel === "requests" && <RequestsPanel />}
      {panel === "applications" && <ApplicationsPanel />}
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
    if (res.ok) load();
    else setStatus("Update failed.");
  }

  return (
    <div className="space-y-5">
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
        <DataTable<AdminProduct>
          rows={products}
          rowKey={(p) => p.id}
          empty="No products yet. Apply the migration, then seed or create one."
          columns={[
            {
              key: "title",
              label: "Product",
              render: (p) => (
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="text-left font-medium text-paper hover:text-gold"
                >
                  {p.title}
                  <span className="block font-sans text-eyebrow text-paper/40">
                    {p.slug}
                  </span>
                </button>
              ),
              csv: (p) => p.title,
            },
            {
              key: "price",
              label: "Price",
              align: "right",
              render: (p) => money(p.price_cents),
              csv: (p) => p.price_cents / 100,
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
              key: "status",
              label: "Status",
              render: (p) => (
                <Pill tone={p.status === "published" ? "emerald" : p.status === "paused" ? "rose" : "neutral"}>
                  {p.status}
                </Pill>
              ),
              csv: (p) => p.status,
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
        <ProductEditor
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

function ProductEditor({
  product,
  sourcing,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  sourcing: Sourcing | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [p, setP] = useState<AdminProduct>(product ?? EMPTY_PRODUCT);
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
    if (res.ok && data.ok) onSaved();
    else setError(data.error ?? "Save failed.");
  }

  return (
    <Card
      title={product ? `Edit: ${product.title}` : "New product"}
      accent
      action={
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill border border-paper/20 px-3 py-1 font-sans text-caption text-paper/70"
        >
          Close
        </button>
      }
    >
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
            {["christ", "theotokos", "saints", "feasts", "prayer_corner", "crosses", "sets"].map((c) => (
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className={labelCls}>
            Media (one per line: URL | alt text)
          </span>
          <textarea
            rows={4}
            value={p.media.map((m) => `${m.media_url} | ${m.alt_text}`).join("\n")}
            onChange={(e) =>
              set(
                "media",
                e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((l) => {
                    const [url, ...alt] = l.split("|");
                    return {
                      media_url: (url ?? "").trim(),
                      alt_text: alt.join("|").trim(),
                    };
                  }),
              )
            }
            className={field}
          />
        </label>
        <label className="space-y-1">
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
      </div>

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
            <span className={labelCls}>Supplier product URL</span>
            <input
              value={src.supplier_url ?? ""}
              onChange={(e) => setSrc((s) => ({ ...s, supplier_url: e.target.value || null }))}
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
    </Card>
  );
}

/* ── Requests ──────────────────────────────────────────────────────────── */

function RequestsPanel() {
  const [requests, setRequests] = useState<IconRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

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

  return (
    <Card title="Icon requests" subtitle="Demand collection; answer by email">
      {error ? <p className="mb-3 font-sans text-detail text-rose-300">{error}</p> : null}
      <DataTable<IconRequest>
        rows={requests}
        rowKey={(r) => r.id}
        empty="No requests yet."
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
                  {r.preferred_size ? ` Â· ${r.preferred_size}` : ""}
                  {r.budget_band ? ` Â· ${r.budget_band}` : ""}
                  {r.notify_when_available ? " Â· notify" : ""}
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

  return (
    <Card
      title="Merchant applications"
      subtitle="Manual review only; approval never auto-creates a store"
    >
      {error ? <p className="mb-3 font-sans text-detail text-rose-300">{error}</p> : null}
      {apps.length === 0 ? (
        <p className="font-sans text-detail text-paper/50">No applications yet.</p>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => {
            const appNotes = notes.filter((n) => n.application_id === a.id);
            return (
              <li key={a.id} className="rounded-lg border border-paper/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-paper">
                      {a.proposed_store_name}
                      <span className="ms-2 font-sans text-eyebrow text-paper/45">
                        {a.seller_type.replace(/_/g, " ")} Â· {a.country}
                      </span>
                    </p>
                    <p className="font-sans text-eyebrow text-paper/50">
                      {a.legal_name} Â· {a.email}
                      {a.phone ? ` Â· ${a.phone}` : ""}
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
                  Methods: {a.product_methods.join(", ") || "n/a"} Â· Offers:{" "}
                  {a.fulfillment_offerings.join(", ") || "n/a"} Â· Applied{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </p>

                {appNotes.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-white/6 pt-3">
                    {appNotes.map((n) => (
                      <li key={n.id} className="font-sans text-eyebrow text-paper/55">
                        <span className="text-paper/35">
                          {new Date(n.created_at).toLocaleDateString()} Â· {n.admin_email}:
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

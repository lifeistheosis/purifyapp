"use client";

// MarketplaceTab — the owner console over the whole marketplace: every
// store, listing, order, conversation, and refund across all sellers.
// Reads/writes go through /api/admin/shop/* (admin-gated, service
// role). The Shop tab stays the EIKON catalog/sourcing workbench; this
// tab is governance: who sells, what's visible, where the money and
// the conversations stand.

import { useCallback, useEffect, useState } from "react";

import { formatPrice } from "@/lib/shop/format";
import { REFUND_REASON_LABELS } from "@/lib/shop/refunds";
import { SELLER_STATUS_LABELS } from "@/lib/shop/sellerOrders";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

import { Card, DataTable, Pill, StatCard, ToolbarButton } from "../primitives";

const field =
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
const labelCls = "font-sans text-caption text-paper/55";

const SELLER_TYPES = [
  "independent_iconographer",
  "monastery",
  "workshop",
  "retailer",
  "purify_owned",
];
const STORE_STATUSES = ["draft", "live", "paused", "closed"];
const SELLER_STATUSES = ["active", "suspended", "closed"];
const LISTING_STATUSES = ["draft", "published", "paused", "archived"];
const FULFILLMENT_STATUSES: ShopFulfillmentStatus[] = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
  "shipped",
  "delivered",
  "cancelled",
];

function useAdminFetch<T>(url: string): {
  data: T | null;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          setError("Couldn't load (are the shop migrations applied?).");
          return;
        }
        setData((await r.json()) as T);
        setError(null);
      } catch {
        if (alive) setError("Couldn't load.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [url, version]);

  return { data, error, reload };
}

async function patchJson(
  url: string,
  body: unknown,
  method: "PATCH" | "POST" = "PATCH",
): Promise<string | null> {
  try {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) return null;
    const data = (await r.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? "Update failed.";
  } catch {
    return "Update failed.";
  }
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "stores" | "listings" | "orders" | "messages" | "refunds";

export function MarketplaceTab() {
  const [panel, setPanel] = useState<Panel>("stores");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["stores", "Stores & sellers"],
            ["listings", "Listings"],
            ["orders", "Orders"],
            ["messages", "Messages"],
            ["refunds", "Refunds"],
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
                ? "bg-gold text-[color:var(--adm-on-accent)]"
                : "border border-paper/15 text-paper/65 hover:text-paper")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {panel === "stores" && <StoresPanel />}
      {panel === "listings" && <ListingsPanel />}
      {panel === "orders" && <OrdersPanel />}
      {panel === "messages" && <MessagesPanel />}
      {panel === "refunds" && <RefundsPanel />}
    </div>
  );
}

/* ── Stores & sellers ──────────────────────────────────────────────────── */

type AdminSeller = {
  id: string;
  user_id: string | null;
  email: string | null;
  seller_type: string;
  public_name: string;
  legal_name: string | null;
  status: string;
  verification_status: string;
  created_at: string;
};

type AdminStore = {
  id: string;
  seller_id: string;
  slug: string;
  public_name: string;
  tagline: string | null;
  support_email: string | null;
  shipping_origin: string | null;
  status: string;
  created_at: string;
  listings: { total: number; published: number };
};

type PendingApplication = {
  id: string;
  proposed_store_name: string;
  seller_type: string;
  email: string;
  status: string;
};

function StoresPanel() {
  const { data, error, reload } = useAdminFetch<{
    sellers: AdminSeller[];
    stores: AdminStore[];
  }>("/api/admin/shop/stores");
  const apps = useAdminFetch<{ applications: PendingApplication[] }>(
    "/api/admin/shop/applications",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<string | null>(null);

  const sellers = data?.sellers ?? [];
  const stores = data?.stores ?? [];
  const sellerById = new Map(sellers.map((s) => [s.id, s]));
  const provisionable = (apps.data?.applications ?? []).filter((a) =>
    ["approved", "store_setup"].includes(a.status),
  );
  const managed = stores.find((s) => s.id === managing) ?? null;
  const managedSeller = managed ? (sellerById.get(managed.seller_id) ?? null) : null;

  async function act(promise: Promise<string | null>) {
    setStatus(null);
    const err = await promise;
    if (err) setStatus(err);
    else {
      reload();
      apps.reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stores" value={stores.length} />
        <StatCard
          label="Live"
          value={stores.filter((s) => s.status === "live").length}
          accent
        />
        <StatCard
          label="Sellers with account"
          value={sellers.filter((s) => s.user_id).length}
          hint="can open the seller console"
        />
        <StatCard
          label="Approved apps waiting"
          value={provisionable.length}
          hint="ready to provision"
        />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      {provisionable.length > 0 && (
        <Card
          title="Approved applications"
          subtitle="One click creates the seller + a draft store"
          accent
        >
          <ul className="space-y-2">
            {provisionable.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--adm-radius-sm)] border border-paper/10 px-3 py-2"
              >
                <p className="font-sans text-detail text-paper">
                  {a.proposed_store_name}
                  <span className="ml-2 text-paper/55">
                    {a.seller_type.replaceAll("_", " ")} · {a.email}
                  </span>
                </p>
                <ToolbarButton
                  variant="primary"
                  onClick={() =>
                    act(
                      patchJson(
                        "/api/admin/shop/applications/provision",
                        { applicationId: a.id },
                        "POST",
                      ),
                    )
                  }
                >
                  Create store
                </ToolbarButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="All stores"
        subtitle="Every storefront, its account, and its switch"
        action={
          <ToolbarButton variant="primary" onClick={() => setCreating((v) => !v)}>
            {creating ? "Close" : "New store"}
          </ToolbarButton>
        }
      >
        {creating && (
          <div className="mb-5">
            <CreateStoreForm
              onDone={() => {
                setCreating(false);
                reload();
              }}
            />
          </div>
        )}
        <DataTable<AdminStore>
          csvFilename="marketplace-stores.csv"
          columns={[
            {
              key: "name",
              label: "Store",
              render: (s) => (
                <span>
                  <a
                    href={`/shop/${s.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-paper underline-offset-4 hover:underline"
                  >
                    {s.public_name}
                  </a>
                  <span className="ml-2 text-paper/45">/{s.slug}</span>
                </span>
              ),
              csv: (s) => s.public_name,
            },
            {
              key: "type",
              label: "Type",
              render: (s) =>
                sellerById.get(s.seller_id)?.seller_type.replaceAll("_", " ") ?? "",
              csv: (s) => sellerById.get(s.seller_id)?.seller_type ?? "",
            },
            {
              key: "email",
              label: "Account",
              render: (s) => {
                const seller = sellerById.get(s.seller_id);
                return seller?.email ? (
                  <span className="text-paper/85">{seller.email}</span>
                ) : (
                  <Pill tone="rose">unassigned</Pill>
                );
              },
              csv: (s) => sellerById.get(s.seller_id)?.email ?? "",
            },
            {
              key: "listings",
              label: "Listings",
              align: "right",
              render: (s) => `${s.listings.published}/${s.listings.total} live`,
              csv: (s) => s.listings.total,
            },
            {
              key: "status",
              label: "Status",
              render: (s) => (
                <Pill
                  tone={
                    s.status === "live"
                      ? "emerald"
                      : s.status === "draft"
                        ? "neutral"
                        : "rose"
                  }
                >
                  {s.status}
                </Pill>
              ),
              csv: (s) => s.status,
            },
            {
              key: "manage",
              label: "",
              render: (s) => (
                <ToolbarButton
                  onClick={() => setManaging(managing === s.id ? null : s.id)}
                >
                  {managing === s.id ? "Close" : "Manage"}
                </ToolbarButton>
              ),
            },
          ]}
          rows={stores}
          rowKey={(s) => s.id}
          empty="No stores yet. Provision an application or create one directly."
        />
      </Card>

      {managed && managedSeller && (
        <ManageStoreCard
          store={managed}
          seller={managedSeller}
          onChanged={() => reload()}
          onError={setStatus}
        />
      )}
    </div>
  );
}

function CreateStoreForm({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const err = await patchJson(
      "/api/admin/shop/stores",
      {
        storeName: String(f.get("storeName") ?? "").trim(),
        sellerType: String(f.get("sellerType")),
        email: String(f.get("email") ?? "").trim() || null,
        legalName: String(f.get("legalName") ?? "").trim() || null,
        supportEmail: String(f.get("supportEmail") ?? "").trim() || null,
        shippingOrigin: String(f.get("shippingOrigin") ?? "").trim() || null,
      },
      "POST",
    );
    setBusy(false);
    if (err) setError(err);
    else onDone();
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-[var(--adm-radius)] border border-gold/25 bg-gold/[0.04] p-4 sm:grid-cols-2"
    >
      <label className="block space-y-1">
        <span className={labelCls}>Store name *</span>
        <input name="storeName" required minLength={2} maxLength={120} className={field} />
      </label>
      <label className="block space-y-1">
        <span className={labelCls}>Seller type *</span>
        <select name="sellerType" defaultValue="independent_iconographer" className={field}>
          {SELLER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className={labelCls}>Owner account email (grants console access)</span>
        <input name="email" type="email" maxLength={320} placeholder="Existing Purify account, or leave empty" className={field} />
      </label>
      <label className="block space-y-1">
        <span className={labelCls}>Legal name</span>
        <input name="legalName" maxLength={200} className={field} />
      </label>
      <label className="block space-y-1">
        <span className={labelCls}>Support email</span>
        <input name="supportEmail" type="email" maxLength={320} className={field} />
      </label>
      <label className="block space-y-1">
        <span className={labelCls}>Ships from</span>
        <input name="shippingOrigin" maxLength={200} placeholder="United States" className={field} />
      </label>
      {error && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)] sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-pill bg-gold px-5 py-1.5 font-sans text-detail font-semibold text-[color:var(--adm-on-accent)] disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create store (draft)"}
        </button>
      </div>
    </form>
  );
}

function ManageStoreCard({
  store,
  seller,
  onChanged,
  onError,
}: {
  store: AdminStore;
  seller: AdminSeller;
  onChanged: () => void;
  onError: (e: string | null) => void;
}) {
  const [email, setEmail] = useState(seller.email ?? "");
  const [busy, setBusy] = useState(false);

  async function patch(body: unknown) {
    setBusy(true);
    onError(null);
    const err = await patchJson("/api/admin/shop/stores", body);
    setBusy(false);
    if (err) onError(err);
    else onChanged();
  }

  return (
    <Card
      title={`Manage · ${store.public_name}`}
      subtitle="Account, switches, and who this store answers to"
      accent
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className={labelCls}>Console account</p>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="account email"
              className={field}
            />
            <ToolbarButton
              loading={busy}
              variant="primary"
              onClick={() =>
                patch({
                  assignEmail: {
                    sellerId: seller.id,
                    email: email.trim() || null,
                  },
                })
              }
            >
              {email.trim() ? "Assign" : "Detach"}
            </ToolbarButton>
          </div>
          <p className="font-sans text-eyebrow text-paper/45">
            The account that signs into the seller console for this store.
          </p>
        </div>

        <div className="space-y-1">
          <p className={labelCls}>Store status</p>
          <div className="flex flex-wrap gap-1.5">
            {STORE_STATUSES.map((s) => (
              <ToolbarButton
                key={s}
                loading={busy}
                variant={store.status === s ? "primary" : "default"}
                onClick={() => patch({ storeStatus: { storeId: store.id, status: s } })}
              >
                {s}
              </ToolbarButton>
            ))}
          </div>
          <p className="font-sans text-eyebrow text-paper/45">
            Only live stores (and their published listings) are public.
          </p>
        </div>

        <div className="space-y-1">
          <p className={labelCls}>Seller status</p>
          <div className="flex flex-wrap gap-1.5">
            {SELLER_STATUSES.map((s) => (
              <ToolbarButton
                key={s}
                loading={busy}
                variant={seller.status === s ? "primary" : s === "suspended" ? "danger" : "default"}
                onClick={() => patch({ sellerStatus: { sellerId: seller.id, status: s } })}
              >
                {s}
              </ToolbarButton>
            ))}
          </div>
          <p className="font-sans text-eyebrow text-paper/45">
            Suspended locks the console and every seller API.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ── Listings ──────────────────────────────────────────────────────────── */

type AdminListing = {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  currency: string;
  category: string;
  inventory_status: string;
  status: string;
  created_at: string;
  store: { id: string; slug: string; public_name: string } | null;
  media: { media_url: string; alt_text: string }[];
};

function ListingsPanel() {
  const { data, error, reload } = useAdminFetch<{ products: AdminListing[] }>(
    "/api/admin/shop/listings",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const products = data?.products ?? [];
  const filtered =
    filter === "all" ? products : products.filter((p) => p.status === filter);

  async function setListingStatus(p: AdminListing, s: string) {
    setStatus(null);
    const err = await patchJson("/api/admin/shop/listings", {
      productId: p.id,
      status: s,
    });
    if (err) setStatus(err);
    else reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Listings" value={products.length} />
        <StatCard
          label="Live"
          value={products.filter((p) => p.status === "published").length}
          accent
        />
        <StatCard
          label="Drafts"
          value={products.filter((p) => p.status === "draft").length}
        />
        <StatCard
          label="Paused / archived"
          value={
            products.filter((p) => p.status === "paused" || p.status === "archived")
              .length
          }
        />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Every listing"
        subtitle="Across all stores; moderation switches only"
        action={
          <div className="flex gap-1.5">
            {["all", ...LISTING_STATUSES].map((s) => (
              <ToolbarButton
                key={s}
                variant={filter === s ? "primary" : "default"}
                onClick={() => setFilter(s)}
              >
                {s}
              </ToolbarButton>
            ))}
          </div>
        }
      >
        <DataTable<AdminListing>
          csvFilename="marketplace-listings.csv"
          columns={[
            {
              key: "title",
              label: "Listing",
              render: (p) => (
                <a
                  href={`/shop/icons/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-paper underline-offset-4 hover:underline"
                >
                  {p.title}
                </a>
              ),
              csv: (p) => p.title,
            },
            {
              key: "store",
              label: "Store",
              render: (p) => p.store?.public_name ?? "",
              csv: (p) => p.store?.public_name ?? "",
            },
            {
              key: "price",
              label: "Price",
              align: "right",
              render: (p) => formatPrice(p.price_cents, p.currency),
              csv: (p) => (p.price_cents / 100).toFixed(2),
            },
            {
              key: "inventory",
              label: "Availability",
              render: (p) => p.inventory_status.replaceAll("_", " "),
              csv: (p) => p.inventory_status,
            },
            {
              key: "status",
              label: "Status",
              render: (p) => (
                <Pill
                  tone={
                    p.status === "published"
                      ? "emerald"
                      : p.status === "draft"
                        ? "neutral"
                        : "rose"
                  }
                >
                  {p.status}
                </Pill>
              ),
              csv: (p) => p.status,
            },
            {
              key: "actions",
              label: "",
              render: (p) => (
                <div className="flex justify-end gap-1.5">
                  {p.status !== "published" && (
                    <ToolbarButton
                      variant="primary"
                      onClick={() => setListingStatus(p, "published")}
                    >
                      Publish
                    </ToolbarButton>
                  )}
                  {p.status === "published" && (
                    <ToolbarButton onClick={() => setListingStatus(p, "paused")}>
                      Pause
                    </ToolbarButton>
                  )}
                  {p.status !== "archived" && (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => setListingStatus(p, "archived")}
                    >
                      Archive
                    </ToolbarButton>
                  )}
                </div>
              ),
            },
          ]}
          rows={filtered}
          rowKey={(p) => p.id}
          empty="No listings in this view."
        />
      </Card>
    </div>
  );
}

/* ── Orders ────────────────────────────────────────────────────────────── */

type AdminOrder = {
  id: string;
  email: string | null;
  total_cents: number;
  currency: string;
  payment_status: string;
  fulfillment_status: ShopFulfillmentStatus;
  outbound_tracking: string | null;
  created_at: string;
  store: { public_name: string; slug: string } | null;
  items: { title: string; unit_price_cents: number; quantity: number }[];
};

function OrdersPanel() {
  const { data, error, reload } = useAdminFetch<{ orders: AdminOrder[] }>(
    "/api/admin/shop/orders",
  );
  const [status, setStatus] = useState<string | null>(null);

  const orders = data?.orders ?? [];
  const paid = orders.filter((o) => o.payment_status === "paid");
  const open = paid.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.fulfillment_status),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={orders.length} />
        <StatCard label="Open (paid)" value={open.length} accent />
        <StatCard
          label="Awaiting payment"
          value={orders.filter((o) => o.payment_status === "pending").length}
        />
        <StatCard
          label="Refunded"
          value={orders.filter((o) => o.payment_status === "refunded").length}
        />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Every order"
        subtitle="Full pipeline control; paid orders can only leave through refunds"
      >
        <DataTable<AdminOrder>
          csvFilename="marketplace-orders.csv"
          columns={[
            {
              key: "placed",
              label: "Placed",
              render: (o) => shortDate(o.created_at),
              csv: (o) => o.created_at,
            },
            {
              key: "store",
              label: "Store",
              render: (o) => o.store?.public_name ?? "",
              csv: (o) => o.store?.public_name ?? "",
            },
            {
              key: "items",
              label: "Items",
              render: (o) => (
                <span className="block max-w-[260px] truncate">
                  {o.items.map((i) => i.title).join(", ")}
                </span>
              ),
              csv: (o) => o.items.map((i) => i.title).join("; "),
            },
            {
              key: "buyer",
              label: "Buyer",
              render: (o) => o.email ?? "",
              csv: (o) => o.email ?? "",
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (o) => formatPrice(o.total_cents, o.currency),
              csv: (o) => (o.total_cents / 100).toFixed(2),
            },
            {
              key: "payment",
              label: "Payment",
              render: (o) => (
                <Pill
                  tone={
                    o.payment_status === "paid"
                      ? "emerald"
                      : o.payment_status === "pending"
                        ? "neutral"
                        : "rose"
                  }
                >
                  {o.payment_status}
                </Pill>
              ),
              csv: (o) => o.payment_status,
            },
            {
              key: "fulfillment",
              label: "Fulfillment",
              render: (o) => (
                <OrderControls order={o} onError={setStatus} onChanged={reload} />
              ),
              csv: (o) => o.fulfillment_status,
            },
          ]}
          rows={orders}
          rowKey={(o) => o.id}
          empty="No orders yet."
        />
      </Card>
    </div>
  );
}

function OrderControls({
  order,
  onError,
  onChanged,
}: {
  order: AdminOrder;
  onError: (e: string | null) => void;
  onChanged: () => void;
}) {
  const [tracking, setTracking] = useState(order.outbound_tracking ?? "");
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    onError(null);
    const err = await patchJson("/api/admin/shop/orders", {
      orderId: order.id,
      ...body,
    });
    setBusy(false);
    if (err) onError(err);
    else onChanged();
  }

  return (
    <div className="flex min-w-[260px] flex-col gap-1.5">
      <select
        value={order.fulfillment_status}
        disabled={busy}
        onChange={(e) => void patch({ fulfillmentStatus: e.target.value })}
        className={field}
        aria-label="Fulfillment status"
      >
        {FULFILLMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {SELLER_STATUS_LABELS[s]}
          </option>
        ))}
        {order.fulfillment_status === "refunded" && (
          <option value="refunded">{SELLER_STATUS_LABELS.refunded}</option>
        )}
      </select>
      <div className="flex gap-1.5">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="tracking #"
          className={field}
          aria-label="Outbound tracking"
        />
        <ToolbarButton
          loading={busy}
          onClick={() => patch({ outboundTracking: tracking.trim() || null })}
        >
          Save
        </ToolbarButton>
      </div>
    </div>
  );
}

/* ── Messages ──────────────────────────────────────────────────────────── */

type AdminConversation = {
  id: string;
  subject: string;
  status: string;
  order_id: string | null;
  last_message_at: string;
  buyer_email: string | null;
  store: { public_name: string; slug: string } | null;
};

type AdminMessage = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

function MessagesPanel() {
  const { data, error, reload } = useAdminFetch<{
    conversations: AdminConversation[];
  }>("/api/admin/shop/conversations");
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const conversations = data?.conversations ?? [];
  const opened = conversations.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    // The click handler clears `messages` when the thread toggles; this
    // effect only ever loads the newly opened one.
    if (!openId) return;
    let alive = true;
    (async () => {
      const r = await fetch(`/api/admin/shop/conversations?id=${openId}`, {
        cache: "no-store",
      });
      if (!alive) return;
      if (!r.ok) {
        setStatus("Couldn't load the thread.");
        return;
      }
      const d = (await r.json()) as { messages: AdminMessage[] };
      setMessages(d.messages);
    })();
    return () => {
      alive = false;
    };
  }, [openId]);

  async function setThreadStatus(c: AdminConversation, s: "open" | "closed") {
    setStatus(null);
    const err = await patchJson("/api/admin/shop/conversations", {
      conversationId: c.id,
      status: s,
    });
    if (err) setStatus(err);
    else reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Conversations" value={conversations.length} />
        <StatCard
          label="Open"
          value={conversations.filter((c) => c.status === "open").length}
          accent
        />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Every conversation"
        subtitle="Read-only oversight; replies belong to the store's console"
      >
        <DataTable<AdminConversation>
          csvFilename="marketplace-conversations.csv"
          columns={[
            {
              key: "subject",
              label: "Subject",
              render: (c) => c.subject,
              csv: (c) => c.subject,
            },
            {
              key: "store",
              label: "Store",
              render: (c) => c.store?.public_name ?? "",
              csv: (c) => c.store?.public_name ?? "",
            },
            {
              key: "buyer",
              label: "Buyer",
              render: (c) => c.buyer_email ?? "",
              csv: (c) => c.buyer_email ?? "",
            },
            {
              key: "last",
              label: "Last message",
              render: (c) => shortDate(c.last_message_at),
              csv: (c) => c.last_message_at,
            },
            {
              key: "status",
              label: "Status",
              render: (c) => (
                <Pill tone={c.status === "open" ? "emerald" : "neutral"}>
                  {c.status}
                </Pill>
              ),
              csv: (c) => c.status,
            },
            {
              key: "actions",
              label: "",
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  <ToolbarButton
                    onClick={() => {
                      setMessages(null);
                      setOpenId(openId === c.id ? null : c.id);
                    }}
                  >
                    {openId === c.id ? "Hide" : "Read"}
                  </ToolbarButton>
                  <ToolbarButton
                    variant={c.status === "open" ? "danger" : "default"}
                    onClick={() =>
                      setThreadStatus(c, c.status === "open" ? "closed" : "open")
                    }
                  >
                    {c.status === "open" ? "Close" : "Reopen"}
                  </ToolbarButton>
                </div>
              ),
            },
          ]}
          rows={conversations}
          rowKey={(c) => c.id}
          empty="No conversations yet."
        />
      </Card>

      {opened && (
        <Card
          title={`Thread · ${opened.subject}`}
          subtitle={`${opened.store?.public_name ?? "Store"} ↔ ${opened.buyer_email ?? "buyer"}`}
          accent
        >
          {!messages ? (
            <p className="font-sans text-detail text-paper/45">Loading…</p>
          ) : (
            <ol className="space-y-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={
                    "max-w-[75%] rounded-[var(--adm-radius-sm)] border px-3 py-2 " +
                    (m.sender === "seller"
                      ? "ml-auto border-gold/25 bg-gold/[0.05]"
                      : "border-paper/10 bg-paper/[0.02]")
                  }
                >
                  <p className="whitespace-pre-wrap font-sans text-detail text-paper/85">
                    {m.body}
                  </p>
                  <p className="mt-1 font-sans text-eyebrow text-paper/40">
                    {m.sender} ·{" "}
                    {new Date(m.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </div>
  );
}

/* ── Refunds ───────────────────────────────────────────────────────────── */

type AdminRefund = {
  id: string;
  status: string;
  reason: keyof typeof REFUND_REASON_LABELS;
  details: string | null;
  amount_cents: number | null;
  resolution_note: string | null;
  created_at: string;
  order: {
    id: string;
    email: string | null;
    total_cents: number;
    currency: string;
    payment_status: string;
    store: { public_name: string } | null;
    items: { title: string; quantity: number }[];
  } | null;
};

function RefundsPanel() {
  const { data, error, reload } = useAdminFetch<{ refunds: AdminRefund[] }>(
    "/api/admin/shop/refunds",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const refunds = data?.refunds ?? [];
  const pending = refunds.filter((r) => r.status === "requested");
  const parked = refunds.filter((r) => r.status === "approved");

  async function act(promise: Promise<string | null>) {
    setStatus(null);
    const err = await promise;
    if (err) setStatus(err);
    else {
      setDeclining(null);
      setNote("");
      reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Requests" value={refunds.length} />
        <StatCard label="Awaiting decision" value={pending.length} accent />
        <StatCard
          label="Approved, awaiting release"
          value={parked.length}
          hint="a seller decided; nobody has paid yet"
          accent
        />
        <StatCard
          label="Processed"
          value={refunds.filter((r) => r.status === "processed").length}
        />
      </div>

      {(error ?? status) && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error ?? status}
        </p>
      )}

      <Card
        title="Refund pipeline"
        subtitle="Sellers decide; only this page pays. Release sends the Stripe refund, Mark processed records money that moved elsewhere"
      >
        <DataTable<AdminRefund>
          csvFilename="marketplace-refunds.csv"
          columns={[
            {
              key: "created",
              label: "Filed",
              render: (r) => shortDate(r.created_at),
              csv: (r) => r.created_at,
            },
            {
              key: "store",
              label: "Store",
              render: (r) => r.order?.store?.public_name ?? "",
              csv: (r) => r.order?.store?.public_name ?? "",
            },
            {
              key: "order",
              label: "Order",
              render: (r) => (
                <span className="block max-w-[220px] truncate">
                  {r.order?.items.map((i) => i.title).join(", ") ?? ""}
                </span>
              ),
              csv: (r) => r.order?.items.map((i) => i.title).join("; ") ?? "",
            },
            {
              key: "buyer",
              label: "Buyer",
              render: (r) => r.order?.email ?? "",
              csv: (r) => r.order?.email ?? "",
            },
            {
              key: "amount",
              label: "Amount",
              align: "right",
              render: (r) =>
                r.order ? formatPrice(r.amount_cents ?? r.order.total_cents, r.order.currency) : "",
              csv: (r) => ((r.amount_cents ?? r.order?.total_cents ?? 0) / 100).toFixed(2),
            },
            {
              key: "reason",
              label: "Reason",
              render: (r) => REFUND_REASON_LABELS[r.reason] ?? r.reason,
              csv: (r) => r.reason,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Pill
                  tone={
                    r.status === "processed"
                      ? "emerald"
                      : r.status === "requested"
                        ? "gold"
                        : r.status === "approved"
                          ? "rose"
                          : "neutral"
                  }
                >
                  {r.status}
                </Pill>
              ),
              csv: (r) => r.status,
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  {r.status === "requested" && (
                    <>
                      <ToolbarButton
                        variant="primary"
                        onClick={() =>
                          act(
                            patchJson(
                              "/api/admin/shop/refunds",
                              { refundId: r.id, decision: "approved" },
                              "POST",
                            ),
                          )
                        }
                      >
                        Approve
                      </ToolbarButton>
                      <ToolbarButton
                        variant="danger"
                        onClick={() => setDeclining(declining === r.id ? null : r.id)}
                      >
                        Decline
                      </ToolbarButton>
                    </>
                  )}
                  {r.status === "approved" && (
                    <>
                      <ToolbarButton
                        variant="primary"
                        title="Send this refund through Stripe now"
                        onClick={() =>
                          act(
                            patchJson("/api/admin/shop/refunds", {
                              refundId: r.id,
                              action: "release",
                            }),
                          )
                        }
                      >
                        Release refund
                      </ToolbarButton>
                      <ToolbarButton
                        title="The money already moved outside Stripe; just record it"
                        onClick={() =>
                          act(
                            patchJson("/api/admin/shop/refunds", {
                              refundId: r.id,
                              action: "mark-processed",
                            }),
                          )
                        }
                      >
                        Mark processed
                      </ToolbarButton>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={refunds}
          rowKey={(r) => r.id}
          empty="No refund requests."
        />

        {declining && (
          <div className="mt-4 flex flex-wrap items-end gap-2 rounded-[var(--adm-radius)] border border-[color-mix(in_oklab,var(--adm-critical),transparent_70%)] bg-[color-mix(in_oklab,var(--adm-critical),transparent_96%)] p-3">
            <label className="min-w-[260px] flex-1 space-y-1">
              <span className={labelCls}>
                Why decline? The buyer sees this note. *
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                className={field}
              />
            </label>
            <ToolbarButton
              variant="danger"
              onClick={() => {
                if (!note.trim()) {
                  setStatus("A decline needs a note.");
                  return;
                }
                void act(
                  patchJson(
                    "/api/admin/shop/refunds",
                    { refundId: declining, decision: "declined", note: note.trim() },
                    "POST",
                  ),
                );
              }}
            >
              Confirm decline
            </ToolbarButton>
            <ToolbarButton onClick={() => setDeclining(null)}>Cancel</ToolbarButton>
          </div>
        )}
      </Card>
    </div>
  );
}

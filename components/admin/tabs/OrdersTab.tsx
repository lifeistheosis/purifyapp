"use client";

// Orders — a first-class view of every order across every store. Reuses
// the existing /api/admin/shop/orders route (GET all + PATCH fulfillment).
// Status filter, CSV export, and an order-detail panel with the same
// fulfillment control the Marketplace console uses.

import { useEffect, useState } from "react";
import { Card, DataTable, Pill, SubTabs, ToolbarButton } from "../primitives";
import { formatPrice } from "@/lib/shop/format";
import { SELLER_STATUS_LABELS } from "@/lib/shop/sellerOrders";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

type AdminOrder = {
  id: string;
  email: string | null;
  total_cents: number;
  items_total_cents: number;
  shipping_cents: number;
  currency: string;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: ShopFulfillmentStatus;
  outbound_tracking: string | null;
  shipping_address: unknown;
  created_at: string;
  store: { public_name: string | null; slug: string } | null;
  items: {
    title: string;
    unit_price_cents: number;
    quantity: number;
    product_id: string | null;
  }[];
};

type SupplierLink = { url: string | null; sku: string | null };

type PayFilter = "all" | "pending" | "paid" | "refunded" | "cancelled";

const FILTERS = [
  ["all", "All"],
  ["paid", "Paid"],
  ["pending", "Pending"],
  ["refunded", "Refunded"],
  ["cancelled", "Cancelled"],
] as const;

const FULFILLMENT_OPTIONS: ShopFulfillmentStatus[] = [
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

function payTone(s: AdminOrder["payment_status"]) {
  if (s === "paid") return "emerald" as const;
  if (s === "refunded" || s === "cancelled") return "rose" as const;
  return "neutral" as const;
}

function money(cents: number, currency: string) {
  return formatPrice(cents, currency);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [supplierByProduct, setSupplierByProduct] = useState<
    Record<string, SupplierLink>
  >({});
  const [filter, setFilter] = useState<PayFilter>("all");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetch("/api/admin/shop/orders", {
          cache: "no-store",
        }).then((r) => r.json());
        if (alive) {
          setOrders(d.orders ?? []);
          setSupplierByProduct(d.supplierByProduct ?? {});
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function setFulfillment(order: AdminOrder, status: ShopFulfillmentStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shop/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, fulfillmentStatus: status }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Update failed.");
      } else {
        setSelected((s) =>
          s && s.id === order.id ? { ...s, fulfillment_status: status } : s,
        );
        setReloadKey((k) => k + 1);
      }
    } catch {
      setError("Update failed.");
    } finally {
      setSaving(false);
    }
  }

  const rows =
    filter === "all"
      ? orders
      : orders.filter((o) => o.payment_status === filter);

  const addr = (a: unknown): string => {
    if (!a || typeof a !== "object") return "—";
    const o = a as Record<string, unknown>;
    const name = o.name as string | undefined;
    const line = (o.address as Record<string, unknown> | undefined) ?? o;
    const parts = [
      line.line1,
      line.line2,
      line.city,
      line.state,
      line.postal_code,
      line.country,
    ].filter(Boolean);
    return [name, parts.join(", ")].filter(Boolean).join(" · ") || "—";
  };

  return (
    <div className="space-y-5">
      <SubTabs tabs={FILTERS} active={filter} onChange={setFilter} />

      <Card title={`Orders · ${rows.length}`}>
        <DataTable<AdminOrder>
          rows={rows}
          rowKey={(o) => o.id}
          csvFilename="orders.csv"
          empty="No orders in this view."
          columns={[
            {
              key: "date",
              label: "Date",
              render: (o) => (
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className="text-gold hover:underline"
                >
                  {fmtDate(o.created_at)}
                </button>
              ),
              csv: (o) => o.created_at,
            },
            {
              key: "email",
              label: "Buyer",
              render: (o) => o.email ?? "Guest",
              csv: (o) => o.email ?? "Guest",
            },
            {
              key: "store",
              label: "Store",
              render: (o) => o.store?.public_name ?? "—",
              csv: (o) => o.store?.public_name ?? "",
            },
            {
              key: "items",
              label: "Items",
              align: "right",
              render: (o) => o.items.reduce((a, i) => a + i.quantity, 0),
              csv: (o) => o.items.reduce((a, i) => a + i.quantity, 0),
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (o) => money(o.total_cents, o.currency),
              csv: (o) => (o.total_cents / 100).toFixed(2),
            },
            {
              key: "pay",
              label: "Payment",
              render: (o) => <Pill tone={payTone(o.payment_status)}>{o.payment_status}</Pill>,
              csv: (o) => o.payment_status,
            },
            {
              key: "fulfil",
              label: "Fulfillment",
              render: (o) => SELLER_STATUS_LABELS[o.fulfillment_status],
              csv: (o) => o.fulfillment_status,
            },
          ]}
        />
      </Card>

      {selected && (
        <Card
          title={`Order ${selected.id.slice(0, 8)}`}
          accent
          action={
            <ToolbarButton onClick={() => setSelected(null)}>Close</ToolbarButton>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 font-sans text-detail">
            <div className="space-y-2">
              <Row label="Buyer" value={selected.email ?? "Guest"} />
              <Row label="Placed" value={fmtDate(selected.created_at)} />
              <Row
                label="Items subtotal"
                value={money(selected.items_total_cents, selected.currency)}
              />
              <Row
                label="Shipping"
                value={
                  selected.shipping_cents === 0
                    ? "Free"
                    : money(selected.shipping_cents, selected.currency)
                }
              />
              <Row
                label="Total"
                value={money(selected.total_cents, selected.currency)}
              />
              <Row label="Ship to" value={addr(selected.shipping_address)} />
              {selected.outbound_tracking && (
                <Row label="Tracking" value={selected.outbound_tracking} />
              )}
            </div>
            <div>
              <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45 mb-2">
                Line items
              </p>
              <ul className="space-y-1.5">
                {selected.items.map((it, i) => {
                  const src = it.product_id
                    ? supplierByProduct[it.product_id]
                    : null;
                  return (
                    <li key={i} className="flex justify-between gap-3 text-paper/85">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate">
                          {it.title} × {it.quantity}
                        </span>
                        {src?.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            title={
                              src.sku
                                ? `Reorder from supplier · SKU ${src.sku}`
                                : "Open the supplier listing to reorder"
                            }
                            className="shrink-0 whitespace-nowrap font-semibold text-gold hover:text-gold-pale"
                          >
                            reorder ↗
                          </a>
                        ) : null}
                      </span>
                      <span className="tabular-nums shrink-0">
                        {money(it.unit_price_cents * it.quantity, selected.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45 mt-4 mb-2">
                Fulfillment stage
              </p>
              <select
                value={selected.fulfillment_status}
                disabled={saving}
                onChange={(e) =>
                  setFulfillment(selected, e.target.value as ShopFulfillmentStatus)
                }
                className="w-full rounded-md border border-paper/20 bg-night px-3 py-2 font-sans text-detail text-paper focus:border-gold focus:outline-none disabled:opacity-50"
              >
                {FULFILLMENT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SELLER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {error && (
                <p className="mt-2 font-sans text-eyebrow text-rose-300">{error}</p>
              )}
              <p className="mt-2 font-sans text-eyebrow text-paper/40">
                Paid orders cannot be cancelled here; use the refund pipeline.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-paper/45">{label}</span>
      <span className="text-paper/85 text-right">{value}</span>
    </div>
  );
}

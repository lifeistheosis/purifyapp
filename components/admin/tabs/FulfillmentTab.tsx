"use client";

// Fulfillment: the road from "somebody paid" to "it is on their doorstep".
//
// The Orders tab answers "what is this order doing". This one answers the two
// questions that tab cannot: where is the work piling up, and what is late.
// The stages, their targets and the fold are lib/shop/funnel.ts, so the
// ladder, the queue and the tests all count the same way.
//
// Everything a parcel needs is on one screen: the stage it is in and the one
// move out of it, the buyer's address, the supplier link for a thing that
// still has to be bought, the packing slip, and the tracking number that
// tells the buyer it left.

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import { parseStoredAddress } from "@/lib/eikonBox/address";
import {
  ageText,
  buildFunnel,
  hoursBetween,
  isLate,
  nextStage,
  prevStage,
  STAGE,
  workQueue,
  type Funnel,
  type FunnelOrder,
} from "@/lib/shop/funnel";
import { formatPrice } from "@/lib/shop/format";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

import { Card, DataTable, Email, Modal, Pill, Sensitive, ToolbarButton } from "../primitives";
import { PackingSlip } from "../shop/PackingSlip";

type Row = FunnelOrder & {
  email: string | null;
  shipping_address: unknown;
  outbound_tracking: string | null;
  inbound_tracking: string | null;
  supplier_order_status: string | null;
  stripe_payment_intent: string | null;
  store: { public_name: string | null; slug: string } | null;
  items: { title: string; quantity: number; unit_price_cents: number; product_id: string | null }[];
};

type Feed = {
  funnel: Funnel;
  medians: Partial<Record<ShopFulfillmentStatus, number>>;
  orders: Row[];
  supplierByProduct: Record<string, { url: string | null; sku: string | null }>;
  historyReady: boolean;
  at: string;
};

type Filter = ShopFulfillmentStatus | "late" | "open";

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

/** Rounded to something a person says out loud. */
function hoursText(h: number | undefined): string | null {
  if (h === undefined) return null;
  return h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)} days`;
}

export function FulfillmentTab() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [open, setOpen] = useState<Row | null>(null);
  // The nonce is what makes a second press of Print reach the printer: the
  // slip prints when it mounts, and re-selecting the same order would
  // otherwise leave the mounted one exactly as it was.
  const [printing, setPrinting] = useState<{ order: Row; nonce: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await adminJson<Feed>("/api/admin/shop/funnel");
    setFeed(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with Refresh; every write is past an await. */
    void load();
  }, [load]);

  // Recomputed here rather than trusting the payload's own fold, so the ages
  // are measured against this device's clock while the tab sits open.
  const now = new Date();
  const orders = feed?.orders ?? [];
  const funnel = feed ? buildFunnel(orders, now) : null;
  const late = workQueue(orders, now) as Row[];
  const lateIds = new Set(late.map((o) => o.id));

  const shown = orders.filter((o) => {
    if (o.payment_status !== "paid") return false;
    if (filter === "late") return lateIds.has(o.id);
    if (filter === "open") return o.fulfillment_status !== "delivered";
    return o.fulfillment_status === filter;
  });

  async function move(order: Row, to: ShopFulfillmentStatus, extra?: { tracking?: string; note?: string }) {
    setError(null);
    const res = await fetch("/api/admin/shop/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        fulfillmentStatus: to,
        ...(extra?.tracking !== undefined ? { outboundTracking: extra.tracking } : {}),
        ...(extra?.note ? { note: extra.note } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? `That did not save (${res.status}).`);
      return false;
    }
    setOpen(null);
    await load();
    return true;
  }

  const max = Math.max(1, ...(funnel?.stages.map((s) => s.count) ?? [1]));

  return (
    <div className="space-y-5">
      <Card
        title="From paid to posted"
        subtitle={
          funnel
            ? `${funnel.openCount} order${funnel.openCount === 1 ? "" : "s"} in flight, ${formatPrice(
                funnel.openCents,
              )} of them. ${
                funnel.lateCount === 0
                  ? "Nothing is late."
                  : funnel.lateCount === 1
                    ? "One is past its target."
                    : `${funnel.lateCount} are past their target.`
              }`
            : "Reading the pipeline…"
        }
        action={
          <ToolbarButton onClick={load} loading={loading}>
            Refresh
          </ToolbarButton>
        }
      >
        {error && (
          <p role="alert" className="mb-3 font-sans text-[12.5px]" style={{ color: "var(--adm-critical)" }}>
            {error}
          </p>
        )}
        {feed && !feed.historyReady && (
          <p className="mb-3 font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
            Stage timings need supabase/migrations/20260920_order_events.sql. Counts and lateness work without it.
          </p>
        )}

        <div className="@container">
          <ul className="grid gap-2 @min-[560px]:grid-cols-2 @min-[980px]:grid-cols-4">
            {(funnel?.stages ?? []).map((s) => {
              const on = filter === s.stage;
              const usually = hoursText(feed?.medians?.[s.stage]);
              return (
                <li key={s.stage}>
                  <button
                    type="button"
                    onClick={() => setFilter(on ? "open" : s.stage)}
                    aria-pressed={on}
                    className="w-full rounded-[var(--adm-radius)] border px-3 py-2.5 text-left"
                    style={{
                      borderColor: on ? "var(--adm-accent)" : s.late ? "color-mix(in oklab, var(--adm-warn), transparent 55%)" : "var(--adm-line)",
                      background: on ? "color-mix(in oklab, var(--adm-accent), transparent 90%)" : "var(--adm-panel-2)",
                    }}
                  >
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="font-sans text-[12.5px] font-semibold" style={ink}>
                        <span aria-hidden>{s.meta.emoji} </span>
                        {s.meta.label}
                      </span>
                      <span className="font-sans text-[18px] font-bold tabular-nums" style={ink}>
                        {s.count}
                      </span>
                    </p>
                    <div
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-[var(--adm-radius-pill)]"
                      style={{ background: "color-mix(in oklab, var(--adm-ink-3), transparent 80%)" }}
                    >
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.round((s.count / max) * 100)}%`,
                          background: s.late ? "var(--adm-warn)" : "var(--adm-accent)",
                        }}
                      />
                    </div>
                    <p className="mt-1.5 font-sans text-[11.5px]" style={ink3}>
                      {s.count > 0 ? `${formatPrice(s.cents)} · oldest ${ageText(s.oldestHours)}` : "Nothing here"}
                      {usually ? ` · usually ${usually}` : ""}
                    </p>
                    {s.late > 0 && (
                      <p className="mt-1 font-sans text-[11.5px] font-semibold" style={{ color: "var(--adm-warn)" }}>
                        {s.late} past {STAGE[s.stage].targetHours}h
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      <Card
        title={
          filter === "late"
            ? "Late"
            : filter === "open"
              ? "Everything in flight"
              : STAGE[filter as ShopFulfillmentStatus].label
        }
        subtitle={
          filter === "open"
            ? "Every paid order that has not been delivered. Pick a stage above to narrow it."
            : filter === "late"
              ? "Past the target for the stage they are in, most overdue first."
              : STAGE[filter as ShopFulfillmentStatus].waitingOn
        }
        action={
          <div className="flex flex-wrap gap-1.5">
            <ToolbarButton variant={filter === "open" ? "primary" : "default"} onClick={() => setFilter("open")}>
              In flight {funnel ? funnel.openCount : ""}
            </ToolbarButton>
            <ToolbarButton variant={filter === "late" ? "primary" : "default"} onClick={() => setFilter("late")}>
              Late {funnel?.lateCount ? funnel.lateCount : 0}
            </ToolbarButton>
            {shown.length > 0 && <ToolbarButton onClick={() => downloadAddresses(shown)}>Addresses CSV</ToolbarButton>}
          </div>
        }
      >
        <DataTable<Row>
          rows={filter === "late" ? (late as Row[]) : shown}
          rowKey={(o) => o.id}
          empty={loading ? "Reading orders…" : "Nothing here."}
          csvFilename="fulfillment.csv"
          columns={[
            {
              key: "order",
              label: "Order",
              render: (o) => (
                <button type="button" onClick={() => setOpen(o)} className="text-left underline decoration-dotted">
                  {orderConfirmationNumber(o.id)}
                </button>
              ),
              csv: (o) => orderConfirmationNumber(o.id),
            },
            {
              key: "stage",
              label: "Stage",
              render: (o) => (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{STAGE[o.fulfillment_status].emoji}</span>
                  <span>{STAGE[o.fulfillment_status].label}</span>
                  {isLate(o, now) && <Pill tone="rose">late</Pill>}
                </span>
              ),
              csv: (o) => o.fulfillment_status,
            },
            {
              key: "waiting",
              label: "In this stage",
              render: (o) => ageText(hoursBetween(o.updated_at, now)),
              csv: (o) => Math.round(hoursBetween(o.updated_at, now)),
            },
            {
              key: "buyer",
              label: "Buyer",
              render: (o) => <Email value={o.email} />,
              csv: (o) => o.email ?? "",
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (o) => formatPrice(o.total_cents),
              csv: (o) => o.total_cents / 100,
            },
            {
              key: "next",
              label: "",
              align: "right",
              render: (o) => {
                const to = nextStage(o.fulfillment_status);
                if (!to) return <span style={ink3}>done</span>;
                return (
                  <ToolbarButton onClick={() => void move(o, to)}>{STAGE[o.fulfillment_status].action}</ToolbarButton>
                );
              },
            },
          ]}
        />
      </Card>

      {open && (
        <OrderPanel
          order={open}
          supplierByProduct={feed?.supplierByProduct ?? {}}
          onClose={() => setOpen(null)}
          onMove={move}
          onPrint={() => setPrinting({ order: open, nonce: Date.now() })}
        />
      )}

      {printing && (
        <PackingSlip
          key={printing.nonce}
          order={printing.order}
          address={parseStoredAddress(printing.order.shipping_address)}
          onDone={() => setPrinting(null)}
        />
      )}
    </div>
  );
}

/** Everything a parcel needs, in one dialog. */
function OrderPanel({
  order,
  supplierByProduct,
  onClose,
  onMove,
  onPrint,
}: {
  order: Row;
  supplierByProduct: Record<string, { url: string | null; sku: string | null }>;
  onClose: () => void;
  onMove: (o: Row, to: ShopFulfillmentStatus, extra?: { tracking?: string; note?: string }) => Promise<boolean>;
  onPrint: () => void;
}) {
  const [tracking, setTracking] = useState(order.outbound_tracking ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const address = parseStoredAddress(order.shipping_address);
  const to = nextStage(order.fulfillment_status);
  const back = prevStage(order.fulfillment_status);
  const number = orderConfirmationNumber(order.id);

  const addressText = address
    ? [
        address.name,
        address.address.line1,
        address.address.line2,
        `${address.address.city}, ${address.address.state} ${address.address.postal_code}`,
        address.address.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  async function go(next: ShopFulfillmentStatus, extra?: { tracking?: string }) {
    setBusy(true);
    await onMove(order, next, { ...extra, note: note.trim() || undefined });
    setBusy(false);
  }

  const field = {
    borderColor: "var(--adm-line-strong)",
    background: "var(--adm-control)",
    color: "var(--adm-ink)",
  } as const;

  return (
    <Modal
      title={`Order ${number}`}
      subtitle={`${STAGE[order.fulfillment_status].label} · ${STAGE[order.fulfillment_status].waitingOn}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <section>
          <h3 className="font-sans text-[11.5px] font-semibold uppercase tracking-wide" style={ink3}>
            In the parcel
          </h3>
          <ul className="mt-1.5 space-y-1">
            {order.items.map((i, n) => {
              const supplier = i.product_id ? supplierByProduct[i.product_id] : undefined;
              return (
                <li key={`${i.title}-${n}`} className="flex flex-wrap items-baseline gap-x-2 font-sans text-[12.5px]" style={ink2}>
                  <span style={ink}>
                    {i.quantity} × {i.title}
                  </span>
                  <span style={ink3}>{formatPrice(i.unit_price_cents * i.quantity)}</span>
                  {supplier?.url && (
                    <a
                      href={supplier.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                      style={{ color: "var(--adm-accent)" }}
                    >
                      reorder{supplier.sku ? ` (${supplier.sku})` : ""}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="font-sans text-[11.5px] font-semibold uppercase tracking-wide" style={ink3}>
            Ship to
          </h3>
          <p className="mt-1 whitespace-pre-line font-sans text-[12.5px]" style={ink2}>
            <Sensitive value={addressText || null} fallback="No address on this order." />
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ToolbarButton
              loading={!addressText}
              onClick={() => {
                void navigator.clipboard?.writeText(addressText).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy address"}
            </ToolbarButton>
            <ToolbarButton onClick={onPrint}>Print packing slip</ToolbarButton>
            {order.stripe_payment_intent && (
              <a
                href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-[34px] items-center rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
                style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-2)" }}
              >
                Open in Stripe
              </a>
            )}
          </div>
          <p className="mt-1.5 font-sans text-[11.5px]" style={ink3}>
            Stripe does not print labels itself. Buy one from the payment in Stripe with the Parcelcraft app, or paste
            this address into Pirate Ship, then bring the tracking number back here.
          </p>
        </section>

        <section>
          <h3 className="font-sans text-[11.5px] font-semibold uppercase tracking-wide" style={ink3}>
            Tracking
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Paste the tracking number"
              className="min-w-0 flex-1 rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px] outline-none"
              style={field}
            />
            <ToolbarButton
              variant="primary"
              loading={busy || tracking.trim().length === 0}
              onClick={() => void go("shipped", { tracking: tracking.trim() })}
            >
              Save and tell the buyer
            </ToolbarButton>
          </div>
          {order.outbound_tracking && (
            <p className="mt-1.5 font-sans text-[11.5px]" style={ink3}>
              On file: {order.outbound_tracking}
              {(() => {
                const link = trackingLink(order.outbound_tracking ?? "");
                return link ? (
                  <>
                    {" · "}
                    <a href={link.url} target="_blank" rel="noreferrer noopener" className="underline">
                      track it with {link.carrier}
                    </a>
                  </>
                ) : null;
              })()}
            </p>
          )}
        </section>

        <section>
          <h3 className="font-sans text-[11.5px] font-semibold uppercase tracking-wide" style={ink3}>
            Move it
          </h3>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A line for the history, if you want one"
            maxLength={500}
            className="mt-1.5 w-full rounded-[var(--adm-radius-sm)] border px-2.5 py-1.5 font-sans text-[12.5px] outline-none"
            style={field}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {to && (
              <ToolbarButton variant="primary" loading={busy} onClick={() => void go(to)}>
                {STAGE[order.fulfillment_status].action}
              </ToolbarButton>
            )}
            {back && (
              <ToolbarButton loading={busy} onClick={() => void go(back)}>
                Back: {STAGE[back].label}
              </ToolbarButton>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}

/**
 * The addresses, as a file a label tool can read.
 *
 * Generic column names on purpose: Pirate Ship and Shippo both map columns on
 * import, and inventing one tool's exact header spelling would make the file
 * useless in the other. Weight is left empty because nothing here records it.
 */
function downloadAddresses(rows: Row[]) {
  const head = ["Order", "Name", "Street1", "Street2", "City", "State", "Zip", "Country", "Email", "Weight (lb)"];
  const lines = [head.join(",")];
  for (const o of rows) {
    const a = parseStoredAddress(o.shipping_address);
    const cell = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    lines.push(
      [
        cell(orderConfirmationNumber(o.id)),
        cell(a?.name),
        cell(a?.address.line1),
        cell(a?.address.line2),
        cell(a?.address.city),
        cell(a?.address.state),
        cell(a?.address.postal_code),
        cell(a?.address.country),
        cell(o.email),
        cell(""),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "addresses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

"use client";

// Live carts and abandoned checkouts: what readers are about to buy, and the
// checkouts they started and left. Both read /api/admin/carts.
//
// They were two panels inside the Users tab, beside the profiles. The owner's
// pick A for the rail on sheet r3-15 (2026-10-30) has one level of views, so
// they are views of Users now, under the readers' directory. They stay in
// Users rather than moving to Orders while his answer on that is open.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, StatCard, DataTable, Pill, Email } from "../primitives";
import { formatPrice } from "@/lib/shop/format";

type LiveCart = {
  // Identity of the SHOPPER, not of one cart token: the API merges every
  // cart a signed-in user has open (one per device/session) into a single
  // row, so a person's basket reads as one basket. Guests stay per token.
  key: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  who: string;
  signedIn: boolean;
  cartCount: number;
  itemCount: number;
  subtotalCents: number;
  currency: string;
  items: { slug: string; title: string; quantity: number }[];
  updatedAt: string;
};
type Abandoned = {
  id: string;
  email: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  items: { title: string; quantity: number }[];
  stale: boolean;
};

function ago(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function itemsLabel(items: { title: string; quantity: number }[]): string {
  if (items.length === 0) return "none";
  return items.map((i) => `${i.title} x${i.quantity}`).join(", ");
}

function useCartsData() {
  const [liveCarts, setLiveCarts] = useState<LiveCart[]>([]);
  const [abandoned, setAbandoned] = useState<Abandoned[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await adminJson<{
          liveCarts?: LiveCart[];
          abandoned?: Abandoned[];
        }>("/api/admin/carts");
        if (!alive) return;
        // `return` inside try still runs finally, so a failed read used to set
        // loaded = true with both arrays still empty. That printed 0 live
        // carts, $0 of cart value, 0 abandoned checkouts and the copy "No live
        // carts.", five separate assertions that the shop is quiet, made
        // because the request came back 403.
        if (!d) {
          setFailed(true);
          return;
        }
        setLiveCarts(d.liveCarts ?? []);
        setAbandoned(d.abandoned ?? []);
        setLoaded(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { liveCarts, abandoned, loaded, failed };
}

export function LiveCartsTab() {
  const { liveCarts, loaded, failed } = useCartsData();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Live carts"
          value={failed ? "Unavailable" : loaded ? liveCarts.length : "Loading"}
          accent
        />
        <StatCard
          label="Cart value"
          value={
            failed
              ? "Unavailable"
              : loaded
                ? formatPrice(
                    liveCarts.reduce((a, c) => a + c.subtotalCents, 0),
                    "usd",
                  )
                : "Loading"
          }
        />
      </div>
      <Card
        title="Carts with items"
        subtitle="One row per shopper. A signed-in user's carts are merged across devices; guests are listed per session."
      >
        <DataTable<LiveCart>
          rows={liveCarts}
          rowKey={(c) => c.key}
          csvFilename="live-carts.csv"
          empty={
            failed
              ? "The carts could not be read, so this is not an empty list."
              : loaded
                ? "No live carts. (Needs the shop_carts migration applied.)"
                : "Loading"
          }
          columns={[
            {
              key: "who",
              label: "Shopper",
              render: (c) => (
                <div className="min-w-0">
                  <span
                    className={
                      "block truncate font-sans text-detail " +
                      (c.signedIn ? "font-semibold text-paper" : "text-paper/55")
                    }
                  >
                    {c.name ?? (c.email ? <Email value={c.email} /> : c.who)}
                  </span>
                  {/* Name AND email when we have both, so a cart is always
                      traceable to a person without opening the profile. */}
                  {c.name && c.email ? (
                    <span className="block truncate font-sans text-eyebrow text-paper/45">
                      <Email value={c.email} />
                    </span>
                  ) : null}
                  {!c.signedIn ? (
                    <span className="block font-sans text-eyebrow text-paper/30">
                      not signed in
                    </span>
                  ) : null}
                  {c.cartCount > 1 ? (
                    <span className="mt-0.5 inline-block font-sans text-eyebrow text-paper/40">
                      merged from {c.cartCount} devices
                    </span>
                  ) : null}
                </div>
              ),
              csv: (c) => c.name ?? c.email ?? c.who,
            },
            {
              key: "email",
              label: "Email",
              render: (c) =>
                c.email ? (
                  <Email value={c.email} className="font-sans text-detail text-paper/70" />
                ) : (
                  <span className="text-paper/25">none</span>
                ),
              csv: (c) => c.email ?? "",
            },
            {
              key: "items",
              label: "Items",
              // One line per product rather than a comma run, so a multi-item
              // cart stays readable.
              render: (c) =>
                c.items.length === 0 ? (
                  <span className="text-paper/25">none</span>
                ) : (
                  <ul className="space-y-0.5">
                    {c.items.map((i) => (
                      <li
                        key={i.slug}
                        className="font-sans text-detail text-paper/80"
                      >
                        {i.title}
                        <span className="text-paper/40"> x{i.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ),
              csv: (c) => itemsLabel(c.items),
            },
            {
              key: "count",
              label: "Qty",
              align: "right",
              render: (c) => c.itemCount,
              csv: (c) => c.itemCount,
            },
            {
              key: "subtotal",
              label: "Subtotal",
              align: "right",
              render: (c) => formatPrice(c.subtotalCents, c.currency),
              csv: (c) => (c.subtotalCents / 100).toFixed(2),
            },
            {
              key: "updated",
              label: "Updated",
              render: (c) => ago(c.updatedAt),
              csv: (c) => c.updatedAt,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export function AbandonedTab() {
  const { abandoned, loaded, failed } = useCartsData();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unpaid checkouts" value={failed ? "Unavailable" : loaded ? abandoned.length : "Loading"} />
        <StatCard
          label="Abandoned (over a day)"
          value={failed ? "Unavailable" : loaded ? abandoned.filter((a) => a.stale).length : "Loading"}
          accent
        />
      </div>
      <Card
        title="Started but unpaid"
        subtitle="A pending order is created before Stripe, so these are real abandoned checkouts."
      >
        <DataTable<Abandoned>
          rows={abandoned}
          rowKey={(a) => a.id}
          csvFilename="abandoned-checkouts.csv"
          empty={
            failed
              ? "The checkouts could not be read, so this is not an empty list."
              : loaded
                ? "No unpaid checkouts."
                : "Loading"
          }
          columns={[
            { key: "email", label: "Buyer", render: (a) => <Email value={a.email} />, csv: (a) => a.email },
            {
              key: "items",
              label: "Items",
              render: (a) => itemsLabel(a.items),
              csv: (a) => itemsLabel(a.items),
            },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (a) => formatPrice(a.totalCents, a.currency),
              csv: (a) => (a.totalCents / 100).toFixed(2),
            },
            {
              key: "started",
              label: "Started",
              render: (a) => ago(a.createdAt),
              csv: (a) => a.createdAt,
            },
            {
              key: "state",
              label: "State",
              render: (a) => (
                <Pill tone={a.stale ? "rose" : "neutral"}>
                  {a.stale ? "abandoned" : "in flight"}
                </Pill>
              ),
              csv: (a) => (a.stale ? "abandoned" : "in flight"),
            },
          ]}
        />
      </Card>
    </div>
  );
}

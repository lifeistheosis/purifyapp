"use client";

// Users hub — the existing profiles view plus two shopping-intent panels:
// live carts (server-synced, guests included) and abandoned checkouts
// (started-but-unpaid orders). Both read /api/admin/carts.

import { useEffect, useState } from "react";
import { Card, StatCard, DataTable, Pill, SubTabs } from "../primitives";
import { UsersTab } from "./UsersTab";
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
  if (items.length === 0) return "—";
  return items.map((i) => `${i.title} ×${i.quantity}`).join(", ");
}

function useCartsData() {
  const [liveCarts, setLiveCarts] = useState<LiveCart[]>([]);
  const [abandoned, setAbandoned] = useState<Abandoned[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetch("/api/admin/carts", { cache: "no-store" }).then(
          (r) => r.json(),
        );
        if (!alive) return;
        setLiveCarts(d.liveCarts ?? []);
        setAbandoned(d.abandoned ?? []);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { liveCarts, abandoned, loaded };
}

function LiveCartsPanel() {
  const { liveCarts, loaded } = useCartsData();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live carts" value={loaded ? liveCarts.length : "—"} accent />
        <StatCard
          label="Cart value"
          value={
            loaded
              ? formatPrice(
                  liveCarts.reduce((a, c) => a + c.subtotalCents, 0),
                  "usd",
                )
              : "—"
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
            loaded
              ? "No live carts. (Needs the shop_carts migration applied.)"
              : "Loading…"
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
                    {c.name ?? c.email ?? c.who}
                  </span>
                  {/* Name AND email when we have both, so a cart is always
                      traceable to a person without opening the profile. */}
                  {c.name && c.email ? (
                    <span className="block truncate font-sans text-eyebrow text-paper/45">
                      {c.email}
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
                  <span className="font-sans text-detail text-paper/70">{c.email}</span>
                ) : (
                  <span className="text-paper/25">—</span>
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
                  <span className="text-paper/25">—</span>
                ) : (
                  <ul className="space-y-0.5">
                    {c.items.map((i) => (
                      <li
                        key={i.slug}
                        className="font-sans text-detail text-paper/80"
                      >
                        {i.title}
                        <span className="text-paper/40"> ×{i.quantity}</span>
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

function AbandonedPanel() {
  const { abandoned, loaded } = useCartsData();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unpaid checkouts" value={loaded ? abandoned.length : "—"} />
        <StatCard
          label="Abandoned (>1d)"
          value={loaded ? abandoned.filter((a) => a.stale).length : "—"}
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
          empty={loaded ? "No unpaid checkouts." : "Loading…"}
          columns={[
            { key: "email", label: "Buyer", render: (a) => a.email, csv: (a) => a.email },
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
                  {a.stale ? "abandoned" : "in-flight"}
                </Pill>
              ),
              csv: (a) => (a.stale ? "abandoned" : "in-flight"),
            },
          ]}
        />
      </Card>
    </div>
  );
}

type Panel = "profiles" | "carts" | "abandoned";
const TABS = [
  ["profiles", "Profiles"],
  ["carts", "Live carts"],
  ["abandoned", "Abandoned checkouts"],
] as const;

export function UsersHubTab() {
  const [panel, setPanel] = useState<Panel>("profiles");
  return (
    <div className="space-y-5">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "profiles" && <UsersTab />}
      {panel === "carts" && <LiveCartsPanel />}
      {panel === "abandoned" && <AbandonedPanel />}
    </div>
  );
}

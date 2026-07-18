"use client";

// Users hub — the existing profiles view plus two shopping-intent panels:
// live carts (server-synced, guests included) and abandoned checkouts
// (started-but-unpaid orders). Both read /api/admin/carts.

import { useEffect, useState } from "react";
import { Card, StatCard, DataTable, Pill, SubTabs } from "../primitives";
import { UsersTab } from "./UsersTab";
import { formatPrice } from "@/lib/shop/format";

type LiveCart = {
  cartToken: string;
  who: string;
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
        subtitle="Server-synced from active shoppers (guests included). Cleared when emptied."
      >
        <DataTable<LiveCart>
          rows={liveCarts}
          rowKey={(c) => c.cartToken}
          csvFilename="live-carts.csv"
          empty={
            loaded
              ? "No live carts. (Needs the shop_carts migration applied.)"
              : "Loading…"
          }
          columns={[
            { key: "who", label: "Shopper", render: (c) => c.who, csv: (c) => c.who },
            {
              key: "items",
              label: "Items",
              render: (c) => itemsLabel(c.items),
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

"use client";

// Subscriptions — the current Plus/Pro picture from the entitlements table.
// Active counts, a tier donut, a source donut, and an estimated run-rate.
// Honest about what is NOT knowable: no churn/cohort history exists.

import { useEffect, useState } from "react";
import { Card, StatCard, ChartFrame } from "../primitives";
import { Donut, SERIES_COLORS } from "../charts";
import { formatPrice } from "@/lib/shop/format";

type Subs = {
  activePlus: number;
  activePro: number;
  plusOnly: number;
  supporters: number;
  bySource: Record<string, number>;
  mrrCents: number;
  arrCents: number;
  estimated: boolean;
};

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
  stripe: "Web (Stripe)",
  comp: "Comped",
  unknown: "Unknown",
};

function money(cents: number) {
  return formatPrice(cents, "usd");
}

export function SubscriptionsTab() {
  const [data, setData] = useState<Subs | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/subscriptions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const tierSegments = data
    ? [
        { name: "Pro", value: data.activePro, color: SERIES_COLORS[1] },
        { name: "Plus only", value: data.plusOnly, color: SERIES_COLORS[0] },
      ].filter((s) => s.value > 0)
    : [];

  const sourceSegments = data
    ? Object.entries(data.bySource)
        .map(([k, v], i) => ({
          name: SOURCE_LABELS[k] ?? k,
          value: v,
          color: SERIES_COLORS[i % SERIES_COLORS.length],
        }))
        .filter((s) => s.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Plus"
          value={data?.activePlus ?? "—"}
          accent
          hint="includes Pro"
        />
        <StatCard label="Active Pro" value={data?.activePro ?? "—"} hint="members" />
        <StatCard label="Plus only" value={data?.plusOnly ?? "—"} />
        <StatCard
          label="Supporters"
          value={data?.supporters ?? "—"}
          hint="lifetime sync"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartFrame
          title="By tier"
          subtitle="Active paid subscribers."
          isEmpty={tierSegments.length === 0}
          empty="No active subscribers."
        >
          <div className="flex justify-center">
            <Donut segments={tierSegments} size={200} label="Subs" />
          </div>
        </ChartFrame>

        <ChartFrame
          title="By source"
          subtitle="Where the subscription was purchased."
          isEmpty={sourceSegments.length === 0}
          empty="No active subscribers."
        >
          <div className="flex justify-center">
            <Donut segments={sourceSegments} size={200} label="Source" />
          </div>
        </ChartFrame>
      </div>

      <Card title="Estimated recurring revenue">
        <div className="grid grid-cols-2 gap-4 font-sans">
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
              MRR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.mrrCents) : "—"}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
              ARR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.arrCents) : "—"}
            </p>
          </div>
        </div>
        <p className="mt-3 font-sans text-eyebrow text-paper/40 leading-relaxed">
          Estimated: active subscribers × list monthly price, comped accounts
          excluded. The entitlements table stores no billed amount, and the
          RevenueCat webhook keeps no event history, so new/churned counts and
          exact billed revenue are not available here.
        </p>
      </Card>
    </div>
  );
}

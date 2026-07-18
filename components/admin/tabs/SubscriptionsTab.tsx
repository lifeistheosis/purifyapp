"use client";

// Subscriptions — the current Plus/Pro picture from the entitlements table.
// Active counts, a tier donut, a source donut, and an estimated run-rate.
// Honest about what is NOT knowable: no churn/cohort history exists.

import { useEffect, useState } from "react";
import { Card, StatCard, ChartFrame, DataTable, Pill, SubTabs } from "../primitives";
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

function SummaryPanel() {
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

/* ── Members ───────────────────────────────────────────────────────────── */

type Member = {
  userId: string;
  name: string | null;
  email: string | null;
  tier: "Plus" | "Pro";
  source: string;
  comped: boolean;
  nextBilling: string | null;
  startDate: string | null;
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<{ enriched: boolean; revenuecat: boolean } | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetch("/api/admin/subscriptions/members", {
          cache: "no-store",
        }).then((r) => r.json());
        if (!alive) return;
        setMembers(d.members ?? []);
        setMeta({ enriched: !!d.enriched, revenuecat: !!d.revenuecat });
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Members" value={loaded ? members.length : "—"} accent />
        <StatCard
          label="Pro"
          value={loaded ? members.filter((m) => m.tier === "Pro").length : "—"}
        />
      </div>

      {loaded && meta && !meta.revenuecat ? (
        <p className="rounded-md border border-amber-400/25 bg-amber-400/[0.05] px-3 py-2 font-sans text-eyebrow text-amber-200/90">
          Start dates come from the RevenueCat REST API. Set
          REVENUECAT_REST_API_KEY in the environment to show them; next-billing
          and everything else works from the database now.
        </p>
      ) : null}

      <Card
        title="Active subscribers"
        subtitle="No card or financial data is shown — only who is subscribed and when it renews."
      >
        <DataTable<Member>
          rows={members}
          rowKey={(m) => m.userId}
          csvFilename="subscribers.csv"
          empty={loaded ? "No active subscribers." : "Loading…"}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (m) => m.name ?? "—",
              csv: (m) => m.name ?? "",
            },
            {
              key: "email",
              label: "Email",
              render: (m) => m.email ?? "—",
              csv: (m) => m.email ?? "",
            },
            {
              key: "tier",
              label: "Tier",
              render: (m) => (
                <Pill tone={m.tier === "Pro" ? "gold" : "emerald"}>{m.tier}</Pill>
              ),
              csv: (m) => m.tier,
            },
            {
              key: "source",
              label: "Source",
              render: (m) => (m.comped ? "Comped" : SOURCE_LABELS[m.source] ?? m.source),
              csv: (m) => m.source,
            },
            {
              key: "start",
              label: "Started",
              render: (m) => shortDate(m.startDate),
              csv: (m) => m.startDate ?? "",
            },
            {
              key: "next",
              label: "Next billing",
              render: (m) => shortDate(m.nextBilling),
              csv: (m) => m.nextBilling ?? "",
            },
          ]}
        />
      </Card>
    </div>
  );
}

/* ── Tab shell ─────────────────────────────────────────────────────────── */

type Panel = "members" | "summary";
const TABS = [
  ["members", "Members"],
  ["summary", "Summary"],
] as const;

export function SubscriptionsTab() {
  const [panel, setPanel] = useState<Panel>("members");
  return (
    <div className="space-y-5">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "members" ? <MembersPanel /> : <SummaryPanel />}
    </div>
  );
}

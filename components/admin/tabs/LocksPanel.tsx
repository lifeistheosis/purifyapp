"use client";

import { useState, type ReactNode } from "react";

import type { LocksAdminPayload } from "@/app/api/admin/locks/route";
import { LOCK_LABELS, type LockRow } from "@/lib/analytics/lockCounting";

import { useAdminFetch } from "../adminFetch";
import { Card, DataTable, KpiCard, SubTabs } from "../primitives";

/**
 * Money > Subscriptions > Locks (1.9, item 12 of docs/1.9-build/PLAN.md):
 * which lock a reader meets, and which leads to a purchase. The counts are
 * lib/analytics/lockCounting.ts, a row a feature; none of them names a reader.
 * Four numbers across the top and one table, the Onboarding view's shape.
 */

type Days = "7" | "30" | "90";

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
] as const;

// The locks' names live beside the counting, so the Monday email (a server
// module) can name them too.
export { LOCK_LABELS };

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

/** A purchase for every so many meetings, as a share; a dash when the lock was never met. */
export function rate(row: Pick<LockRow, "taps" | "bought">): string {
  if (row.taps === 0) return "-";
  const pct = (row.bought / row.taps) * 100;
  return `${pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%`;
}

export function LocksPanel() {
  const [days, setDays] = useState<Days>("30");
  const { data, error } = useAdminFetch<LocksAdminPayload>(`/api/admin/locks?days=${days}`);
  const periods = <SubTabs tabs={PERIODS} active={days} onChange={setDays} />;

  if (error || (data && "unavailable" in data)) {
    return (
      <div className="space-y-6">
        {periods}
        <Card title="Couldn't load">
          <Quiet>{data && "unavailable" in data ? data.unavailable : error}</Quiet>
        </Card>
      </div>
    );
  }
  if (!data) return <Quiet>Loading.</Quiet>;
  if (data.absent) {
    return (
      <Card title="Not counting yet">
        <Quiet>The events table is not on the database, so there is nothing to count.</Quiet>
      </Card>
    );
  }

  const met = data.locks.filter((r) => r.lock !== "general");
  const mostMet = met[0];
  const bestSeller = [...data.locks].sort((a, b) => b.bought - a.bought)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {periods}
        {data.truncated ? <Quiet>Partial: the first 50,000 counts only.</Quiet> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Locks met" value={met.reduce((n, r) => n + r.taps, 0)} hint="the upgrade sheet opened on a feature" />
        <KpiCard label="Bought in the sheet" value={data.bought} hint={data.taps ? `${rate(data)} of every opening` : "nothing opened yet"} />
        <KpiCard label="Most met" value={mostMet ? LOCK_LABELS[mostMet.lock] : "None yet"} hint={mostMet ? `${mostMet.taps} times` : "waits for a reader"} />
        <KpiCard
          label="Sells the most"
          value={bestSeller && bestSeller.bought > 0 ? LOCK_LABELS[bestSeller.lock] : "None yet"}
          hint={bestSeller && bestSeller.bought > 0 ? `${bestSeller.bought} bought` : "waits for a purchase"}
        />
      </div>

      <Card title="Each lock" subtitle="How often the sheet opened on it, and how often a purchase followed in that sheet.">
        <DataTable<LockRow>
          rows={data.locks}
          rowKey={(r) => r.lock}
          empty="Nothing counted in this window."
          csvFilename={`purify-locks-${days}d.csv`}
          columns={[
            { key: "lock", label: "Feature", render: (r) => LOCK_LABELS[r.lock], csv: (r) => r.lock },
            { key: "taps", label: "Met", render: (r) => r.taps, csv: (r) => r.taps, align: "right" },
            { key: "bought", label: "Bought", render: (r) => r.bought, csv: (r) => r.bought, align: "right" },
            { key: "rate", label: "Rate", render: (r) => rate(r), csv: (r) => (r.taps ? r.bought / r.taps : ""), align: "right" },
            { key: "yearly", label: "A year", render: (r) => r.yearly, csv: (r) => r.yearly, align: "right" },
            { key: "monthly", label: "A month", render: (r) => r.monthly, csv: (r) => r.monthly, align: "right" },
          ]}
        />
        <div className="mt-3">
          <Quiet>
            Counted from 1.9: each time the upgrade sheet opens on something that needs Plus, and each purchase made in that
            sheet, with the kind of device and the day. No reader, no account, no page. Purchases on the pricing page and
            restores are not here. On the iPhone nothing is locked until the App Store sells Plus, so iPhone readers meet no
            lock.
          </Quiet>
        </div>
      </Card>
    </div>
  );
}

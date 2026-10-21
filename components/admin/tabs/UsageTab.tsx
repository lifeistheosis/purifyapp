"use client";

import { viewLabel } from "@/lib/admin/pages";
import type { UsageSummary } from "@/lib/admin/usage";

import { useAdminFetch } from "../adminFetch";
import { Card, KpiCard } from "../primitives";

/**
 * How the admin is used (1.8 admin silent patch).
 *
 * The owner asked for it so the admin can be shaped by what he actually
 * opens. Four plain answers: what is opened most, what is never opened, what
 * is left within seconds, and which pages are opened one after the other
 * (a pair opened together every time probably belongs on one page).
 */

type Payload = UsageSummary & { days: number };

const minutes = (ms: number) => (ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60_000)} min`);

function Rows({ rows }: { rows: { key: string; left: string; right: string }[] }) {
  if (rows.length === 0) {
    return (
      <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Nothing yet.
      </p>
    );
  }
  return (
    <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
          <span className="min-w-0 truncate font-sans text-[13px]" style={{ color: "var(--adm-ink)" }}>
            {r.left}
          </span>
          <span className="shrink-0 font-sans text-[12.5px] tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
            {r.right}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UsageTab() {
  const { data, error } = useAdminFetch<Payload>("/api/admin/usage");

  if (error) {
    return (
      <Card title="Not recording yet">
        <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
          The usage table is not on the database yet. Once docs/1.8-build/sql/admin-usage.sql is run, the admin
          starts keeping this.
        </p>
      </Card>
    );
  }
  if (!data) {
    return (
      <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Loading.
      </p>
    );
  }

  const opened = data.views.slice(0, 10);
  const quick = data.views
    .filter((v) => v.opens >= 3 && v.quickExits / v.opens >= 0.5)
    .sort((a, b) => b.quickExits / b.opens - a.quickExits / a.opens);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pages opened" value={data.views.reduce((s, v) => s + v.opens, 0)} hint={`last ${data.days} days`} />
        <KpiCard label="Never opened" value={data.never.length} hint="pages with no visit" />
        <KpiCard label="Left within seconds" value={quick.length} hint="half their visits under 5 s" />
        <KpiCard label="Buttons pressed" value={data.actions.reduce((s, a) => s + a.count, 0)} hint="top 15 kinds" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Opened most">
          <Rows
            rows={opened.map((v) => ({
              key: v.tab,
              left: viewLabel(v.tab),
              right: `${v.opens} times, ${minutes(v.totalMs)}`,
            }))}
          />
        </Card>
        <Card title="Never opened">
          <Rows rows={data.never.map((t) => ({ key: t, left: viewLabel(t), right: "" }))} />
        </Card>
        <Card title="Left within seconds">
          <Rows
            rows={quick.map((v) => ({
              key: v.tab,
              left: viewLabel(v.tab),
              right: `${v.quickExits} of ${v.opens}`,
            }))}
          />
        </Card>
        <Card title="Opened one after the other">
          <Rows
            rows={data.paths.map((p) => ({
              key: `${p.from}>${p.to}`,
              left: `${viewLabel(p.from)}, then ${viewLabel(p.to)}`,
              right: `${p.count} times`,
            }))}
          />
        </Card>
        <Card title="Buttons pressed most">
          <Rows
            rows={data.actions.map((a) => ({
              key: `${a.tab}>${a.label}`,
              left: `${a.label}`,
              right: `${viewLabel(a.tab)}, ${a.count}`,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

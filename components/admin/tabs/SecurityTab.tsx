"use client";

// Security tab — CSP report stream (active + dismissed), rate-limit activity
// by category, and the debug-flag status. Mark CSP reports dismissed.

import { useEffect, useState, useTransition } from "react";
import { Card, DataTable, Pill, Toolbar, ToolbarButton } from "../primitives";
import { BarChart } from "../charts";
import { CountUp } from "../CountUp";

type CspReport = {
  id: number;
  received_at: string;
  document_uri: string | null;
  blocked_uri: string | null;
  violated_directive: string | null;
  source_file: string | null;
  line_number: number | null;
  disposition: string | null;
  dismissed_at: string | null;
};

type Payload = {
  csp: {
    total: number;
    active: CspReport[];
    dismissed: CspReport[];
    byDirective: { directive: string; count: number }[];
  };
  rateLimits: {
    windowHour: { category: string; total: number }[];
    topKeysHour: { key: string; windowStart: string; count: number }[];
    last24hHits: number;
  };
  flags: { adminDebugEnabled: boolean };
};

export function SecurityTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [, startTransition] = useTransition();

  async function reload() {
    const r = await fetch("/api/admin/security", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/security", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function dismiss(id: number) {
    const r = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "csp-dismiss", id }),
    });
    if (r.ok) startTransition(() => reload());
  }

  async function dismissAllActive() {
    if (!data || data.csp.active.length === 0) return;
    if (!confirm(`Dismiss all ${data.csp.active.length} active CSP reports?`)) return;
    const r = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "csp-bulk-dismiss",
        ids: data.csp.active.map((r) => r.id),
      }),
    });
    if (r.ok) startTransition(() => reload());
  }

  if (!data) {
    return <p className="font-sans text-[13px] text-paper/40 py-8 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Active CSP reports" accent={data.csp.active.length > 0}>
          <p className="font-sans text-[40px] font-bold tabular-nums leading-none text-paper">
            <CountUp value={data.csp.active.length} />
          </p>
        </Card>
        <Card title="Dismissed">
          <p className="font-sans text-[40px] font-bold tabular-nums leading-none text-paper/65">
            <CountUp value={data.csp.dismissed.length} />
          </p>
        </Card>
        <Card title="Rate-limit hits · 1h">
          <p className="font-sans text-[40px] font-bold tabular-nums leading-none text-paper">
            <CountUp value={data.rateLimits.windowHour.reduce((a, b) => a + b.total, 0)} />
          </p>
        </Card>
        <Card title="Rate-limit hits · 24h">
          <p className="font-sans text-[40px] font-bold tabular-nums leading-none text-paper">
            <CountUp value={data.rateLimits.last24hHits} />
          </p>
        </Card>
      </div>

      <Card title="System flags">
        <ul className="space-y-2 font-sans text-[13px] text-paper/85">
          <li className="flex items-center justify-between gap-3">
            <span>Admin debug endpoints</span>
            {data.flags.adminDebugEnabled ? (
              <Pill tone="rose">ENABLED · exposed</Pill>
            ) : (
              <Pill tone="emerald">disabled · default</Pill>
            )}
          </li>
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Active CSP by directive">
          <BarChart
            rows={data.csp.byDirective.map((d) => ({
              label: d.directive,
              value: d.count,
            }))}
          />
        </Card>
        <Card title="Rate-limit categories · 1h">
          <BarChart
            rows={data.rateLimits.windowHour.map((c) => ({
              label: c.category,
              value: c.total,
            }))}
          />
        </Card>
      </div>

      <Card
        title={`Active CSP reports · ${data.csp.active.length}`}
        action={
          <Toolbar>
            <ToolbarButton
              variant="danger"
              onClick={dismissAllActive}
              title="Dismiss every active report"
            >
              Dismiss all
            </ToolbarButton>
          </Toolbar>
        }
      >
        <DataTable
          rows={data.csp.active}
          rowKey={(r) => String(r.id)}
          csvFilename="csp-active.csv"
          columns={[
            {
              key: "received",
              label: "Received",
              render: (r) => new Date(r.received_at).toLocaleString(),
              csv: (r) => r.received_at,
            },
            {
              key: "directive",
              label: "Directive",
              render: (r) => (
                <span className="font-mono text-[11px]">{r.violated_directive ?? "—"}</span>
              ),
              csv: (r) => r.violated_directive ?? "",
            },
            {
              key: "blocked",
              label: "Blocked URI",
              render: (r) => (
                <span className="font-mono text-[11px] truncate max-w-[280px] inline-block">
                  {r.blocked_uri ?? "—"}
                </span>
              ),
              csv: (r) => r.blocked_uri ?? "",
            },
            {
              key: "source",
              label: "Source",
              render: (r) =>
                r.source_file ? `${r.source_file}:${r.line_number ?? ""}` : "—",
              csv: (r) =>
                r.source_file ? `${r.source_file}:${r.line_number ?? ""}` : "",
            },
            {
              key: "disposition",
              label: "",
              render: (r) =>
                r.disposition === "enforce" ? (
                  <Pill tone="rose">Enforced</Pill>
                ) : (
                  <Pill tone="neutral">Report-only</Pill>
                ),
            },
            {
              key: "action",
              label: "",
              render: (r) => (
                <ToolbarButton variant="default" onClick={() => dismiss(r.id)}>
                  Dismiss
                </ToolbarButton>
              ),
            },
          ]}
        />
      </Card>

      <Card title={`Top rate-limit keys · 1h`}>
        <DataTable
          rows={data.rateLimits.topKeysHour}
          rowKey={(r) => `${r.key}-${r.windowStart}`}
          csvFilename="rate-limit-keys-1h.csv"
          columns={[
            {
              key: "key",
              label: "Key",
              render: (r) => <span className="font-mono text-[11px]">{r.key}</span>,
              csv: (r) => r.key,
            },
            {
              key: "window",
              label: "Window start",
              render: (r) => new Date(r.windowStart).toLocaleTimeString(),
              csv: (r) => r.windowStart,
            },
            {
              key: "count",
              label: "Hits",
              align: "right",
              render: (r) => r.count,
              csv: (r) => r.count,
            },
          ]}
        />
      </Card>

      {data.csp.dismissed.length > 0 && (
        <Card title={`Dismissed CSP reports · ${data.csp.dismissed.length}`}>
          <DataTable
            rows={data.csp.dismissed}
            rowKey={(r) => String(r.id)}
            csvFilename="csp-dismissed.csv"
            columns={[
              {
                key: "dismissed",
                label: "Dismissed",
                render: (r) =>
                  r.dismissed_at ? new Date(r.dismissed_at).toLocaleString() : "—",
                csv: (r) => r.dismissed_at ?? "",
              },
              {
                key: "directive",
                label: "Directive",
                render: (r) => (
                  <span className="font-mono text-[11px]">{r.violated_directive ?? "—"}</span>
                ),
                csv: (r) => r.violated_directive ?? "",
              },
              {
                key: "blocked",
                label: "Blocked",
                render: (r) => (
                  <span className="font-mono text-[11px] truncate max-w-[280px] inline-block">
                    {r.blocked_uri ?? "—"}
                  </span>
                ),
                csv: (r) => r.blocked_uri ?? "",
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

"use client";

// i18n Coverage tab — message-key gap per locale vs en.json, plus a
// ship/stage flag so the operator can promote a locale after the
// editorial team has hand-checked it.

import { useEffect, useState, useTransition } from "react";
import { Card, DataTable, Pill, StatCard, Toolbar, ToolbarButton } from "../primitives";

type LocaleRow = {
  code: string;
  nativeLabel: string;
  englishLabel: string;
  registryReady: boolean;
  fileExists: boolean;
  totalKeys: number;
  presentCount: number;
  missingCount: number;
  extraCount: number;
  coveragePct: number;
  missingExamples: string[];
  status: "draft" | "staged" | "shipped";
  lastReviewedAt: string | null;
  reviewerEmail: string | null;
  notes: string | null;
};

type Payload = {
  enTotalKeys: number;
  locales: LocaleRow[];
};

export function I18nTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function reload() {
    const r = await fetch("/api/admin/i18n-coverage", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/i18n-coverage", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function setStatus(locale: string, status: "draft" | "staged" | "shipped") {
    const r = await fetch("/api/admin/i18n-coverage/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "locale-status-set", locale, status }),
    });
    if (r.ok) startTransition(() => reload());
  }

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const shipped = data.locales.filter((l) => l.status === "shipped").length;
  const staged = data.locales.filter((l) => l.status === "staged").length;
  const totalLocales = data.locales.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total locales" value={totalLocales} />
        <StatCard label="Shipped" value={shipped} accent />
        <StatCard label="Staged (preview)" value={staged} />
        <StatCard label="en.json keys" value={data.enTotalKeys} />
      </div>

      <Card
        title={`Per-locale coverage · ${totalLocales}`}
        subtitle="Coverage = (keys present in locale.json) / (keys in en.json). Click a row to see missing keys and change ship status."
      >
        <DataTable
          rows={data.locales}
          rowKey={(r) => r.code}
          csvFilename="i18n-coverage.csv"
          columns={[
            {
              key: "code",
              label: "Locale",
              render: (r) => (
                <button
                  type="button"
                  onClick={() => setOpen(open === r.code ? null : r.code)}
                  className="text-left"
                >
                  <p className="font-semibold text-paper">{r.nativeLabel}</p>
                  <p className="font-mono text-eyebrow text-paper/45">
                    {r.code} · {r.englishLabel}
                  </p>
                </button>
              ),
              csv: (r) => r.code,
            },
            {
              key: "coverage",
              label: "Coverage",
              align: "right",
              render: (r) => (
                <CoverageBar pct={r.coveragePct} />
              ),
              csv: (r) => r.coveragePct,
            },
            {
              key: "keys",
              label: "Keys",
              align: "right",
              render: (r) => `${r.presentCount} / ${r.totalKeys}`,
              csv: (r) => r.presentCount,
            },
            {
              key: "missing",
              label: "Missing",
              align: "right",
              render: (r) => r.missingCount,
              csv: (r) => r.missingCount,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <StatusPill status={r.status} />,
              csv: (r) => r.status,
            },
            {
              key: "reviewed",
              label: "Last reviewed",
              render: (r) =>
                r.lastReviewedAt
                  ? new Date(r.lastReviewedAt).toLocaleDateString()
                  : "—",
              csv: (r) => r.lastReviewedAt ?? "",
            },
          ]}
        />
      </Card>

      {open && (() => {
        const row = data.locales.find((l) => l.code === open);
        if (!row) return null;
        return (
          <Card
            title={`${row.nativeLabel} (${row.code}) · detail`}
            action={
              <Toolbar>
                <ToolbarButton
                  onClick={() => setStatus(row.code, "draft")}
                  title="Hide from locale switcher"
                >
                  Draft
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => setStatus(row.code, "staged")}
                  title="Visible with ?preview=1"
                >
                  Stage
                </ToolbarButton>
                <ToolbarButton
                  variant="primary"
                  onClick={() => setStatus(row.code, "shipped")}
                  title="Promote to live"
                >
                  Ship
                </ToolbarButton>
              </Toolbar>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">File</p>
                <p className="font-mono text-caption text-paper">
                  lib/i18n/messages/{row.code}.json{" "}
                  {!row.fileExists && <Pill tone="rose">missing</Pill>}
                </p>
              </div>
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">
                  Registry .ready flag
                </p>
                <p className="font-sans text-detail text-paper">
                  {row.registryReady ? (
                    <Pill tone="emerald">true</Pill>
                  ) : (
                    <Pill tone="neutral">false</Pill>
                  )}
                </p>
              </div>
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">
                  Extra keys (not in en)
                </p>
                <p className="font-sans text-detail text-paper tabular-nums">{row.extraCount}</p>
              </div>
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">
                  Reviewer
                </p>
                <p className="font-sans text-detail text-paper">{row.reviewerEmail ?? "—"}</p>
              </div>
            </div>
            <p className="font-sans text-caption uppercase tracking-[1px] text-paper/45 mb-2">
              First {row.missingExamples.length} missing keys
            </p>
            {row.missingExamples.length === 0 ? (
              <p className="font-sans text-caption text-emerald-300">
                Nothing missing.
              </p>
            ) : (
              <ul className="font-mono text-eyebrow text-paper/75 space-y-0.5 max-h-[260px] overflow-y-auto">
                {row.missingExamples.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
          </Card>
        );
      })()}
    </div>
  );
}

function CoverageBar({ pct }: { pct: number }) {
  const color =
    pct >= 95
      ? "bg-emerald-400"
      : pct >= 75
        ? "bg-gold"
        : pct >= 40
          ? "bg-amber-400"
          : "bg-rose-400";
  return (
    <div className="inline-flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1.5 rounded-full bg-paper/[0.08] overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-sans text-caption tabular-nums text-paper/85 w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: "draft" | "staged" | "shipped" }) {
  if (status === "shipped") return <Pill tone="emerald">Shipped</Pill>;
  if (status === "staged") return <Pill tone="gold">Staged</Pill>;
  return <Pill tone="neutral">Draft</Pill>;
}

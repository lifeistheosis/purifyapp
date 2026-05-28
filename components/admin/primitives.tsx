"use client";

// Shared primitives used across every admin tab. Kept colocated so a
// styling tweak in one place propagates everywhere.

import { useState, type ReactNode } from "react";
import { Sparkline } from "./charts";
import { downloadCsv, toCsv } from "@/lib/admin/csv";

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  action,
  children,
  accent,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={
        "rounded-lg border p-5 " +
        (accent
          ? "border-gold/25 bg-gold/[0.04]"
          : "border-paper/10 bg-night")
      }
    >
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
          {title && (
            <p
              className={
                "font-sans text-[12px] font-semibold uppercase tracking-[1.2px] " +
                (accent ? "text-gold/80" : "text-paper/45")
              }
            >
              {title}
            </p>
          )}
          {action}
        </div>
      )}
      {subtitle && (
        <p className="font-sans text-[11px] text-paper/40 mb-4">{subtitle}</p>
      )}
      {!subtitle && (title || action) && <div className="mb-4" />}
      {children}
    </section>
  );
}

// ── StatCard ────────────────────────────────────────────────────────────────
// Just a big number + label. Optional accent makes it gold-tinted.
export function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 " +
        (accent
          ? "border-gold/30 bg-gold/[0.06]"
          : "border-paper/10 bg-night")
      }
    >
      <p
        className={
          "font-sans text-[12px] font-semibold uppercase tracking-[1.2px] " +
          (accent ? "text-gold/80" : "text-paper/45")
        }
      >
        {label}
      </p>
      <p
        className={
          "mt-2 font-sans text-[34px] font-bold tabular-nums leading-none " +
          (accent ? "text-gold" : "text-paper")
        }
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 font-sans text-[11px] text-paper/45">{hint}</p>
      )}
    </div>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────────────────
// Big number + sparkline + delta vs prior period. Used on the Overview hero row.
export function KpiCard({
  label,
  value,
  trend,
  delta,
  accent,
}: {
  label: string;
  value: string | number;
  trend?: number[];
  delta?: { value: number; positive: boolean };
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 " +
        (accent
          ? "border-gold/30 bg-gold/[0.06]"
          : "border-paper/10 bg-night")
      }
    >
      <p
        className={
          "font-sans text-[12px] font-semibold uppercase tracking-[1.2px] " +
          (accent ? "text-gold/80" : "text-paper/45")
        }
      >
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          className={
            "font-sans text-[32px] font-bold tabular-nums leading-none " +
            (accent ? "text-gold" : "text-paper")
          }
        >
          {value}
        </p>
        {trend && trend.length > 1 && (
          <Sparkline data={trend} width={90} height={28} />
        )}
      </div>
      {delta && (
        <p
          className={
            "mt-2 font-sans text-[11px] tabular-nums " +
            (delta.positive ? "text-emerald-400" : "text-rose-400")
          }
        >
          {delta.positive ? "▲" : "▼"} {Math.abs(delta.value)}% vs prior
        </p>
      )}
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────
// Right-aligned row of small action buttons that sit beside a Card title.
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="inline-flex items-center gap-2">{children}</div>;
}

export function ToolbarButton({
  onClick,
  children,
  loading,
  variant = "default",
  title,
}: {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loading?: boolean;
  variant?: "default" | "danger" | "primary";
  title?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-sans text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default:
      "border-paper/20 bg-paper/[0.04] text-paper/75 hover:border-gold/50 hover:text-gold",
    primary:
      "border-gold/40 bg-gold/[0.08] text-gold hover:bg-gold/[0.14]",
    danger:
      "border-rose-400/40 bg-rose-400/[0.06] text-rose-300 hover:bg-rose-400/[0.12]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={title}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

// ── DataTable ───────────────────────────────────────────────────────────────
// Header row + data rows + built-in CSV + Markdown export.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No data.",
  csvFilename,
}: {
  columns: {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    csv?: (row: T) => string | number | null | undefined;
    align?: "left" | "right";
  }[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  csvFilename?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCsv() {
    const headers = columns.map((c) => c.label);
    const data = rows.map((r) =>
      columns.map((c) => (c.csv ? c.csv(r) : "")),
    );
    downloadCsv(
      csvFilename ?? "export.csv",
      toCsv(headers, data),
    );
  }

  function handleMarkdown() {
    const head = `| ${columns.map((c) => c.label).join(" | ")} |`;
    const sep = `| ${columns.map(() => "---").join(" | ")} |`;
    const body = rows
      .map(
        (r) =>
          `| ${columns
            .map((c) => (c.csv ? String(c.csv(r) ?? "") : ""))
            .join(" | ")} |`,
      )
      .join("\n");
    const md = [head, sep, body].join("\n");
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-2">
        <ToolbarButton onClick={handleCsv} title="Download as CSV">
          CSV
        </ToolbarButton>
        <ToolbarButton onClick={handleMarkdown} title="Copy as markdown">
          {copied ? "Copied" : "MD"}
        </ToolbarButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-sans text-[13px]">
          <thead>
            <tr className="border-b border-paper/10">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={
                    "px-3 py-2 font-semibold uppercase tracking-[1px] text-[10px] text-paper/45 " +
                    (c.align === "right" ? "text-right" : "text-left")
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-paper/45 text-[13px]"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={rowKey(r)}
                  className="border-b border-paper/[0.06] hover:bg-paper/[0.02] transition-colors"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={
                        "px-3 py-2.5 text-paper/85 " +
                        (c.align === "right" ? "text-right tabular-nums" : "")
                      }
                    >
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pill ────────────────────────────────────────────────────────────────────
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "rose" | "emerald";
}) {
  const tones = {
    neutral: "border-paper/20 bg-paper/[0.04] text-paper/70",
    gold: "border-gold/40 bg-gold/[0.08] text-gold",
    rose: "border-rose-400/40 bg-rose-400/[0.06] text-rose-300",
    emerald: "border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300",
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[1px] " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

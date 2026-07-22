"use client";

// Shared primitives used across every admin tab. Kept colocated so a
// styling tweak in one place propagates everywhere.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkline } from "./charts";
import { CountUp } from "./CountUp";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

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
        "rounded-xl border p-5 " +
        (accent
          ? "admin-surface-gold border-gold/25 bg-gold/[0.04]"
          : "admin-surface border-white/8 bg-night")
      }
    >
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
          {title && (
            <p
              className={
                "font-sans text-caption font-semibold uppercase tracking-[1.2px] " +
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
        <p className="font-sans text-eyebrow text-paper/40 mb-4">{subtitle}</p>
      )}
      {!subtitle && (title || action) && <div className="mb-4" />}
      {children}
    </section>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
// Centered overlay dialog. Closes on Escape, on backdrop click, and from the
// header's X. The panel scrolls internally and the page behind it is frozen,
// so a long form never leaves the admin scrolled somewhere unexpected when it
// closes. The backdrop is a real <button> rather than a click-handled div so
// it is reachable by keyboard and needs no a11y escape hatch.
export function Modal({
  title,
  subtitle,
  onClose,
  header,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Controls rendered in the header, left of the close button. */
  header?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [onClose]);

  // The OVERLAY no longer scrolls: the panel below caps itself and scrolls its
  // own body. Leaving overflow-y-auto here with an auto-margined panel split
  // the overflow evenly above and below it, which pushed the dialog down the
  // screen and cut its bottom off. items-center is what centres it now.
  //
  // Portalled onto <body> so the `fixed` overlay is anchored to the viewport.
  // The admin tab wrapper (.admin-fade-in) keeps a persistent translateY(0)
  // after its entrance animation (animation-fill-mode: both), and any non-none
  // transform makes that wrapper the containing block for fixed descendants —
  // which trapped this dialog inside the tab-content box (offset below the
  // header, as tall as the page) instead of centring it on screen. Portalling
  // past it fixes every admin dialog, not just this one.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm md:p-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      {/* The panel is capped to the viewport and scrolls INTERNALLY. Letting
          it grow past the viewport pushed the header (close button and the
          Overview/Edit toggle) off screen, so the only way back to them was
          scrolling the overlay — reported as the dialog being unusable on a
          laptop. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          // max-h-full, not a dvh fraction: the overlay's own padding is
          // already subtracted, so the panel can never exceed the space it
          // actually has. No auto margins — items-center does the centring.
          "admin-surface relative flex max-h-full w-full flex-col rounded-2xl border border-white/10 bg-night shadow-2xl " +
          (wide ? "max-w-[1040px]" : "max-w-[760px]")
        }
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="truncate font-sans text-title-sm font-semibold text-paper">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 truncate font-sans text-caption text-paper/45">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {header}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full border border-paper/20 px-2.5 py-1 font-sans text-caption text-paper/60 hover:border-paper/40 hover:text-paper"
            >
              ✕
            </button>
          </div>
        </div>
        {/* min-h-0 is what actually lets a flex child scroll. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
        "rounded-xl border p-5 " +
        (accent
          ? "admin-surface-gold border-gold/30 bg-gold/[0.06]"
          : "admin-surface border-white/8 bg-night")
      }
    >
      <p
        className={
          "font-sans text-caption font-semibold uppercase tracking-[1.2px] " +
          (accent ? "text-gold/80" : "text-paper/45")
        }
      >
        {label}
      </p>
      <p
        className={
          "mt-2 font-sans text-heading font-bold tabular-nums leading-none " +
          (accent ? "text-gold" : "text-paper")
        }
      >
        <CountUp value={value} />
      </p>
      {hint && (
        <p className="mt-1.5 font-sans text-eyebrow text-paper/45">{hint}</p>
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
  subtitle,
  hint,
}: {
  label: string;
  value: string | number;
  trend?: number[];
  delta?: { value: number; positive: boolean };
  accent?: boolean;
  /** Small caption above the big number (e.g. "since 2026-05-18"). */
  subtitle?: string;
  /** Small caption below the big number, replaces delta when both set. */
  hint?: ReactNode;
}) {
  return (
    <div
      className={
        "rounded-xl border p-5 " +
        (accent
          ? "admin-surface-gold border-gold/30 bg-gold/[0.06]"
          : "admin-surface border-white/8 bg-night")
      }
    >
      <p
        className={
          "font-sans text-caption font-semibold uppercase tracking-[1.2px] " +
          (accent ? "text-gold/80" : "text-paper/45")
        }
      >
        {label}
      </p>
      {subtitle && (
        <p className="mt-0.5 font-sans text-eyebrow text-paper/45 tabular-nums">
          {subtitle}
        </p>
      )}
      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          className={
            "font-sans text-heading font-bold tabular-nums leading-none " +
            (accent ? "text-gold" : "text-paper")
          }
        >
          <CountUp value={value} />
        </p>
        {trend && trend.length > 1 && (
          <Sparkline data={trend} width={90} height={28} />
        )}
      </div>
      {hint
        ? <p className="mt-2 font-sans text-eyebrow text-paper/55">{hint}</p>
        : delta && (
            <p
              className={
                "mt-2 font-sans text-eyebrow tabular-nums " +
                (delta.positive ? "text-emerald-400" : "text-rose-400")
              }
            >
              {delta.positive ? "▲" : "▼"} {Math.abs(delta.value)}% vs prior
            </p>
          )}
    </div>
  );
}

// ── ChartFrame ──────────────────────────────────────────────────────────────
// Thin wrapper for chart cards: a Card with a built-in slot for a small
// range selector or legend hint and consistent empty-state copy. Tabs use
// this so chart layout stays the same across the panel.
export function ChartFrame({
  title,
  subtitle,
  rangeSelector,
  legendHint,
  children,
  empty,
  isEmpty,
  accent,
}: {
  title?: string;
  subtitle?: string;
  rangeSelector?: ReactNode;
  legendHint?: ReactNode;
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
  accent?: boolean;
}) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      accent={accent}
      action={rangeSelector}
    >
      {isEmpty ? (
        <p className="font-sans text-detail text-paper/40 py-8 text-center">
          {empty ?? "No data in range."}
        </p>
      ) : (
        <>
          {children}
          {legendHint && (
            <p className="mt-3 font-sans text-eyebrow text-paper/45">
              {legendHint}
            </p>
          )}
        </>
      )}
    </Card>
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
    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-sans text-eyebrow font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
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
        <table className="w-full font-sans text-detail">
          <thead>
            <tr className="border-b border-paper/10">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={
                    "px-3 py-2 font-semibold uppercase tracking-[1px] text-eyebrow text-paper/45 " +
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
                  className="px-3 py-6 text-center text-paper/45 text-detail"
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

// ── SubTabs ───────────────────────────────────────────────────────────────
// Pill row for switching sub-panels inside a hub tab. Same look as the
// existing Marketplace panel switcher, extracted so the hub shells share it.
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly (readonly [T, string])[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={active === id}
          className={
            "rounded-pill px-4 py-1.5 font-sans text-detail font-medium transition-colors " +
            (active === id
              ? "bg-gold text-night"
              : "border border-paper/15 text-paper/65 hover:text-paper")
          }
        >
          {label}
        </button>
      ))}
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
        "inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] " +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

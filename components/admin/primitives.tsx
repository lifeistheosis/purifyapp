"use client";

// Shared primitives used across every admin tab. Kept colocated so a
// styling tweak in one place propagates everywhere.
//
// Every export below keeps the exact signature the 21 tabs already import.
// The visual layer is rebuilt on the operator theme in app/admin/admin-theme.css;
// no tab had to change to receive it.
//
// Two rules this file now holds that it did not before:
//   1. Colour is information. The accent marks selection and primary action;
//      the four status hues are reserved for state and always ship beside a
//      word, never as colour alone.
//   2. Labels are sentence case. The old panel set every label in tracked
//      uppercase, which flattens hierarchy: when everything is a heading,
//      the eye has nothing to skip to. Size and weight carry rank instead.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkline } from "./charts";
import { CountUp } from "./CountUp";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

// ── Skeleton ────────────────────────────────────────────────────────────────
// Loading placeholder shaped like the thing it replaces. Additive export:
// tabs can adopt it to drop their spinners.
export function Skeleton({
  w = "100%",
  h = 12,
  className = "",
}: {
  w?: string | number;
  h?: string | number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={"adm-skeleton block " + className}
      style={{ width: w, height: h }}
    />
  );
}

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
      className="rounded-[var(--adm-radius)] border p-4 md:p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        // None on dark, where the surface step already separates the card from
        // the ground. Light needs it: a white card on a near-white ground has
        // nothing else to sit on.
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && (
            <h3
              className="font-sans text-[14px] font-semibold leading-tight"
              style={{ color: accent ? "var(--adm-accent)" : "var(--adm-ink)" }}
            >
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {subtitle && (
        <p
          className="-mt-2 mb-3 font-sans text-[12.5px] leading-snug"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {subtitle}
        </p>
      )}
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
  // Any ancestor with a non-none transform becomes the containing block for
  // fixed descendants, which previously trapped this dialog inside the tab
  // content box. Portalling past it fixes every admin dialog, not just this one.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="adm fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm md:p-8"
      // Was bg-black/70, which is far too heavy over a light panel. The
      // portal target is document.body, which is why the light palette keys
      // off <html> rather than off the shell root: this node carries .adm but
      // sits outside the shell entirely.
      style={{ background: "var(--adm-scrim)" }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      {/* The panel is capped to the viewport and scrolls INTERNALLY. Letting
          it grow past the viewport pushed the header off screen, so the only
          way back was scrolling the overlay — reported as the dialog being
          unusable on a laptop. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "adm-panel-enter relative flex max-h-full w-full flex-col rounded-[var(--adm-radius-lg)] border " +
          (wide ? "max-w-[1040px]" : "max-w-[760px]")
        }
        style={{
          background: "var(--adm-panel)",
          borderColor: "var(--adm-line-strong)",
          boxShadow: "var(--adm-shadow-pop)",
        }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-3.5 md:px-6"
          style={{ borderColor: "var(--adm-line)" }}
        >
          <div className="min-w-0">
            <p
              className="truncate font-sans text-[15px] font-semibold"
              style={{ color: "var(--adm-ink)" }}
            >
              {title}
            </p>
            {subtitle ? (
              <p
                className="mt-0.5 truncate font-sans text-[12.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
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
              className="rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12px] transition-colors"
              style={{
                borderColor: "var(--adm-line-strong)",
                color: "var(--adm-ink-2)",
              }}
            >
              Esc
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
// One number and what it counts. The number is the element; the label is
// support, so the label is quiet and small and the number is not.
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
      className="rounded-[var(--adm-radius)] border p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <p
        className="font-sans text-[13px] font-medium leading-5"
        style={{ color: "var(--adm-ink-3)" }}
      >
        {label}
      </p>
      <p
        className="mt-3 font-sans text-[28px] font-semibold leading-none tracking-[-0.02em]"
        style={{ color: accent ? "var(--adm-accent)" : "var(--adm-ink)" }}
      >
        <CountUp value={value} />
      </p>
      {hint && (
        <p
          className="mt-1.5 font-sans text-[12px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Delta ───────────────────────────────────────────────────────────────────
// Change against the prior period. Carries a word, not only a colour and an
// arrow, so it survives colour-blindness, greyscale print, and forced colours.
function Delta({ value, positive }: { value: number; positive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 font-sans text-[12px] font-medium"
      style={{ color: positive ? "var(--adm-good)" : "var(--adm-critical)" }}
    >
      <span aria-hidden>{positive ? "↑" : "↓"}</span>
      {Math.abs(value)}%
      <span style={{ color: "var(--adm-ink-3)" }}>
        {positive ? "up on" : "down on"} prior
      </span>
    </span>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────────────────
// Big number + trend + delta vs prior period. Used on the Overview hero row.
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
      className="flex flex-col rounded-[var(--adm-radius)] border p-5"
      style={{
        background: accent
          ? "color-mix(in oklab, var(--adm-accent), var(--adm-panel) 93%)"
          : "var(--adm-panel)",
        borderColor: accent
          ? "color-mix(in oklab, var(--adm-accent), transparent 70%)"
          : "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-sans text-[13px] font-medium leading-5"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {label}
        </p>
        {subtitle && (
          <p
            className="font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p
          className="font-sans text-[28px] font-semibold leading-none tracking-[-0.02em]"
          style={{ color: accent ? "var(--adm-accent)" : "var(--adm-ink)" }}
        >
          <CountUp value={value} />
        </p>
        {/* The sparkline earns its place only when there is a shape to see.
            Two points is a line segment, not a trend. */}
        {trend && trend.length > 2 && (
          <Sparkline data={trend} width={88} height={26} />
        )}
      </div>

      <div className="mt-2 min-h-[16px]">
        {hint ? (
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
            {hint}
          </p>
        ) : delta ? (
          <Delta value={delta.value} positive={delta.positive} />
        ) : null}
      </div>
    </div>
  );
}

// ── ChartFrame ──────────────────────────────────────────────────────────────
// Thin wrapper for chart cards: a Card with a built-in slot for a small
// range selector or legend hint and consistent empty-state copy.
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
    <Card title={title} subtitle={subtitle} accent={accent} action={rangeSelector}>
      {isEmpty ? (
        <p
          className="py-10 text-center font-sans text-[13px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {empty ?? "Nothing in this range yet. Widen the dates to see more."}
        </p>
      ) : (
        <>
          {children}
          {legendHint && (
            <p
              className="mt-3 font-sans text-[12px]"
              style={{ color: "var(--adm-ink-3)" }}
            >
              {legendHint}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="inline-flex flex-wrap items-center gap-1.5">{children}</div>;
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
  // Hover is handed down as custom properties rather than set here, because
  // an inline `background` beats any class rule and a hover:bg-* utility
  // could never win. The previous workaround, hover:brightness-125, is
  // theme-blind: it does nothing to a white control and washes out a
  // saturated primary. .adm-control in admin-theme.css resolves these.
  const style: Record<string, React.CSSProperties> = {
    default: {
      borderColor: "var(--adm-line-strong)",
      "--_bg": "var(--adm-control)",
      "--_bg-hover": "color-mix(in oklab, var(--adm-control), var(--adm-ink) 8%)",
      color: "var(--adm-ink-2)",
    } as React.CSSProperties,
    // A gradient fill and a glow the same hue as the fill. .adm-control
    // assigns --_bg to `background`, which takes a gradient as happily as a
    // colour, so this needed no new mechanism.
    //
    // The gradient stops at --adm-grad-to and does NOT run on to
    // --adm-grad-vivid. White on that magenta is 3.46:1, which is legal for
    // large text and not for a 12.5px button label. The vivid stop belongs
    // to FeatureCard, where the type is big enough to earn it.
    primary: {
      borderColor: "transparent",
      "--_bg":
        "linear-gradient(135deg, var(--adm-grad-from) 0%, var(--adm-grad-to) 100%)",
      "--_bg-hover":
        "linear-gradient(135deg, var(--adm-grad-to) 0%, var(--adm-grad-from) 100%)",
      color: "var(--adm-on-accent)",
      boxShadow: "0 4px 14px color-mix(in oklab, var(--adm-accent), transparent 72%)",
    } as React.CSSProperties,
    danger: {
      borderColor: "color-mix(in oklab, var(--adm-critical), transparent 60%)",
      "--_bg": "color-mix(in oklab, var(--adm-critical), transparent 90%)",
      "--_bg-hover": "color-mix(in oklab, var(--adm-critical), transparent 84%)",
      color: "var(--adm-critical)",
    } as React.CSSProperties,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-busy={loading || undefined}
      className={
        "adm-rail-item adm-control inline-flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-2.5 py-[5px] font-sans text-[12.5px] font-medium " +
        "disabled:cursor-not-allowed disabled:opacity-45"
      }
      style={style[variant]}
    >
      {loading && (
        <span
          aria-hidden
          className="adm-skeleton"
          style={{ width: 10, height: 10, borderRadius: 999 }}
        />
      )}
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
  empty = "Nothing here yet.",
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
    const data = rows.map((r) => columns.map((c) => (c.csv ? c.csv(r) : "")));
    downloadCsv(csvFilename ?? "export.csv", toCsv(headers, data));
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
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </p>
        <Toolbar>
          <ToolbarButton onClick={handleCsv} title="Download these rows as CSV">
            CSV
          </ToolbarButton>
          <ToolbarButton onClick={handleMarkdown} title="Copy these rows as a markdown table">
            {copied ? "Copied" : "Markdown"}
          </ToolbarButton>
        </Toolbar>
      </div>
      <div
        className="overflow-auto rounded-[var(--adm-radius)] border"
        style={{ borderColor: "var(--adm-line)", maxHeight: "70vh" }}
      >
        <table className="w-full font-sans text-[13px]">
          <thead className="adm-thead">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={
                    "border-b px-3 py-2 font-medium " +
                    (c.align === "right" ? "text-right" : "text-left")
                  }
                  style={{
                    borderColor: "var(--adm-line)",
                    color: "var(--adm-ink-3)",
                  }}
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
                  className="px-3 py-10 text-center font-sans text-[13px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={rowKey(r)}
                  className="adm-rail-item border-b hover:bg-[var(--adm-hover)]"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={
                        "px-3 py-2 " + (c.align === "right" ? "text-right" : "")
                      }
                      style={{ color: "var(--adm-ink)" }}
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

// ── SubTabs ─────────────────────────────────────────────────────────────────
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
    <div
      className="inline-flex flex-wrap gap-0.5 rounded-[var(--adm-radius)] border p-0.5"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
    >
      {tabs.map(([id, label]) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={on}
            className="adm-rail-item rounded-[var(--adm-radius-sm)] px-3 py-1.5 font-sans text-[12.5px] font-medium"
            style={
              on
                ? { background: "var(--adm-accent)", color: "var(--adm-on-accent)" }
                : { color: "var(--adm-ink-2)" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter toolbar ──────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={"relative " + className}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
        style={{ color: "var(--adm-ink-3)" }}
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m13.2 13.2 3.8 3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--adm-radius-sm)] border py-1.5 pl-8 pr-8 font-sans text-[13px] outline-none"
        style={{
          borderColor: "var(--adm-line-strong)",
          background: "var(--adm-control)",
          color: "var(--adm-ink)",
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--adm-radius-sm)] px-1 font-sans text-[12px]"
          style={{ color: "var(--adm-ink-3)" }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => {
        const on = o.id === active;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className="adm-rail-item inline-flex items-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-2.5 py-1 font-sans text-[12.5px] font-medium capitalize"
            style={
              on
                ? {
                    borderColor: "transparent",
                    background: "var(--adm-accent)",
                    color: "var(--adm-on-accent)",
                  }
                : {
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  }
            }
          >
            {o.label}
            {o.count != null ? (
              <span
                className="rounded-[var(--adm-radius-pill)] px-1.5 font-sans text-[11px] font-semibold"
                style={
                  on
                    ? { background: "var(--adm-on-accent-wash)" }
                    : { background: "var(--adm-panel-2)", color: "var(--adm-ink-3)" }
                }
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12.5px] outline-none"
        style={{
          borderColor: "var(--adm-line-strong)",
          background: "var(--adm-control)",
          color: "var(--adm-ink)",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  children,
  matched,
  total,
  noun,
  onClear,
}: {
  children: ReactNode;
  matched: number;
  total: number;
  /** Plural noun for the count line ("products", "reviews"). */
  noun: string;
  /** Rendered as a "Clear filters" action; pass null when nothing is active. */
  onClear?: (() => void) | null;
}) {
  const narrowed = matched !== total;
  const label = (n: number) => `${n} ${n === 1 ? noun.replace(/s$/, "") : noun}`;
  return (
    <div
      className="mb-3 rounded-[var(--adm-radius)] border p-2.5"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{children}</div>
      <p className="mt-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {narrowed ? `${matched} of ${label(total)} shown` : label(total)}
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-3 font-medium"
            style={{ color: "var(--adm-accent)" }}
          >
            Clear filters
          </button>
        ) : null}
      </p>
    </div>
  );
}

// ── Pill ────────────────────────────────────────────────────────────────────
// Status marker. Tone names are kept for compatibility with the tabs that
// already pass them; they now resolve to the reserved status vocabulary.
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "rose" | "emerald";
}) {
  const tones: Record<string, { fg: string; bg: string }> = {
    neutral: { fg: "var(--adm-ink-2)", bg: "var(--adm-panel-2)" },
    // 92%, not 88%. At a 12% tint the light-theme text lands around 4.2:1 on
    // its own wash, which is the trap Shopify's own success green falls into.
    // At 8% every tone clears 4.5:1 and the dark tint is still clearly a pill.
    gold: { fg: "var(--adm-accent)", bg: "color-mix(in oklab, var(--adm-accent), transparent 92%)" },
    rose: { fg: "var(--adm-critical)", bg: "color-mix(in oklab, var(--adm-critical), transparent 92%)" },
    emerald: { fg: "var(--adm-good)", bg: "color-mix(in oklab, var(--adm-good), transparent 92%)" },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11.5px] font-medium"
      style={{ color: t.fg, background: t.bg }}
    >
      {/* A dot in the same hue, so the state reads at a glance, while the
          word beside it carries the meaning without relying on colour. */}
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: "currentColor" }}
      />
      {children}
    </span>
  );
}

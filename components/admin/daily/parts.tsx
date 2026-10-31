"use client";

/**
 * The parts the Daily pages are built from (sheet r3-15, the owner's picks of
 * 2026-10-30): the switch, a card with a quiet title, a figure, an estimate,
 * a row of bars, the lit point, and the small "open" link that makes a row a
 * door. They are drawn the way the sheet drew them, out of the admin's own
 * tokens, so Light is the same parts with the ink and the ground swapped.
 *
 * No data here and no fetch: each page reads its own routes and hands the
 * numbers down.
 */

import type { CSSProperties, ReactNode } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";

/**
 * The switch: a well, the chosen segment solid and lit. For a period (Now,
 * Today, 7 days, 30 days) or a page's views on the phone. `scroll` lets a long
 * set slide on a phone instead of wrapping into a second row.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  scroll = false,
  stretch = false,
  tall = false,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  /** What the switch chooses, for a screen reader. */
  label: string;
  scroll?: boolean;
  /** Fill the width, each segment an equal share (the phone's period switch). */
  stretch?: boolean;
  /** 38px segments, for a thumb. */
  tall?: boolean;
}) {
  const group = (
    <div
      role="group"
      aria-label={label}
      className={"adm-seg" + (stretch ? " w-full" : "")}
    >
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={"adm-seg-btn font-sans" + (stretch ? " flex-1" : "") + (tall ? " min-h-[38px] px-[13px] text-[13.5px]" : "")}
        >
          {text}
        </button>
      ))}
    </div>
  );
  return scroll ? <div className="adm-seg-scroll -mx-1 px-1">{group}</div> : group;
}

/** A card: a hairline box with a quiet title, and an optional link at the right of it. */
export function Panel({
  title,
  action,
  children,
  className = "",
  style,
  pad = "px-4 py-3.5",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  pad?: string;
}) {
  return (
    <section
      className={`relative min-w-0 rounded-[8px] border ${pad} ${className}`}
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)", ...style }}
    >
      {title || action ? (
        <div className="mb-2.5 flex min-w-0 items-center gap-2">
          {title ? (
            <h2 className="min-w-0 flex-1 truncate font-sans text-[12px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
              {title}
            </h2>
          ) : (
            <span className="flex-1" />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The small link at the right of a card's title: "Sources", "Open Goals". */
export function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-[4px] font-sans text-[12px] underline decoration-[var(--adm-line-strong)] underline-offset-[3px] hover:decoration-[var(--adm-ink-2)]"
      style={{ color: "var(--adm-ink-2)" }}
    >
      {children}
    </button>
  );
}

/** The chevron a door wears at its right edge. */
export function Chevron({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 4.5l5.5 5.5L8 15.5" />
    </svg>
  );
}

/** "Orders >": where a row goes, quiet, at its right. */
export function GoLabel({ children }: { children?: ReactNode }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
      <Chevron />
    </span>
  );
}

/** A reader on the site now, as a mark: the lit point. */
export function LiveDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`adm-live-dot ${className}`} />;
}

/**
 * A figure in the mono face. `lit` gives it the glow, for the one that needs
 * him; `sensitive` blurs it under streamer mode (money, always).
 */
export function Figure({
  children,
  size = 27,
  lit = false,
  sensitive = false,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  lit?: boolean;
  sensitive?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`adm-fig ${sensitive ? SENSITIVE : ""} ${className}`}
      data-lit={lit || undefined}
      style={{ fontSize: size }}
    >
      {children}
    </span>
  );
}

/** An estimate: the figure over a dashed line, and the word "est." beside it. */
export function Est({ children, word = true }: { children: ReactNode; word?: boolean }) {
  return (
    <>
      <span className="adm-est">{children}</span>
      {word ? (
        <span className="ml-1.5 font-sans text-[11px] font-medium tracking-normal" style={{ color: "var(--adm-ink-3)" }}>
          est.
        </span>
      ) : null}
    </>
  );
}

/**
 * One of a page's headline numbers: a quiet label, the figure, one grey line
 * under it, and a lit point in the corner when it counts readers live.
 */
export function FigureCard({
  label,
  value,
  sub,
  live = false,
  lit = false,
  sensitive = false,
  unread = false,
  extra,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  live?: boolean;
  lit?: boolean;
  sensitive?: boolean;
  /** The value is a word ("Not measured"), not a number: set it small. */
  unread?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div
      className="relative min-w-0 rounded-[8px] border px-4 pb-3 pt-3.5"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}
    >
      {live ? <LiveDot className="absolute right-4 top-[18px]" /> : null}
      <p className="truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </p>
      <p className="mt-2.5 flex min-h-[29px] items-center">
        {unread ? (
          <span className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
            {value}
          </span>
        ) : (
          <Figure lit={lit} sensitive={sensitive}>
            {value}
          </Figure>
        )}
      </p>
      <p className="mt-1.5 truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {sub}
      </p>
      {extra ? <div className="mt-2.5">{extra}</div> : null}
    </div>
  );
}

export type BarRow = { key: string; label: ReactNode; value: number; shown?: ReactNode };

/**
 * Rows of bars: a label, a track filled by the value, and the number. The
 * first is lit unless `lit` is false. `max` sets the full track; by default
 * the largest row fills it.
 */
export function Bars({
  rows,
  max,
  labelWidth = 110,
  numberWidth = 46,
  lit = true,
  sensitive = false,
}: {
  rows: BarRow[];
  max?: number;
  labelWidth?: number;
  numberWidth?: number;
  lit?: boolean;
  sensitive?: boolean;
}) {
  const top = Math.max(1, max ?? Math.max(0, ...rows.map((r) => r.value)));
  return (
    <ul className="space-y-0">
      {rows.map((r, i) => (
        <li key={r.key} className="flex h-[27px] items-center gap-2.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          <span className="shrink-0 truncate" style={{ width: labelWidth }}>
            {r.label}
          </span>
          <span className="adm-hbar-track" aria-hidden>
            <span
              className="adm-hbar-fill"
              data-lit={lit && i === 0 ? true : undefined}
              style={{ width: `${Math.max(0, Math.min(100, (r.value / top) * 100)).toFixed(1)}%` }}
            />
          </span>
          <span
            className={"shrink-0 text-right font-mono text-[12px] font-medium " + (sensitive ? SENSITIVE : "")}
            style={{ width: numberWidth, color: "var(--adm-ink)" }}
          >
            {r.shown ?? r.value.toLocaleString("en-US")}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A quiet line of words, for a panel that has nothing to draw yet or could not read. */
export function Quiet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-sans text-[12.5px] ${className}`} style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

/** A share as the panel says it: "31%", "under 1%", never a bare zero for something that happened. */
export function pct(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return "0%";
  const p = Math.round((part / whole) * 100);
  return p < 1 ? "under 1%" : `${p}%`;
}

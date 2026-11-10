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

import { useId, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";
import { useReducedMotion } from "@/lib/ui/motion";

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
          className={"adm-seg-btn font-sans" + (stretch ? " flex-1" : "") + (tall ? " min-h-11 px-[13px] text-[13.5px]" : "")}
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
      // hit-44: the link paints 19px tall; a thumb gets 44 (app/globals.css).
      className="hit-44 shrink-0 rounded-[4px] font-sans text-[12px] underline decoration-[var(--adm-line-strong)] underline-offset-[3px] hover:decoration-[var(--adm-ink-2)]"
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

/**
 * Two weeks as a line, under a figure: no axis, the last point lit. `dash` is
 * the period before, dashed, when there is one. Nothing is drawn for fewer
 * than two points, because a line needs two.
 */
export function Spark({
  values,
  dash,
  width = 158,
  height = 26,
  label,
}: {
  values: readonly number[];
  dash?: readonly number[];
  width?: number;
  height?: number;
  /** What the line shows, for a screen reader. */
  label: string;
}) {
  if (values.length < 2) return <div style={{ height }} aria-hidden />;
  const all = dash ? [...values, ...dash] : [...values];
  const max = Math.max(...all);
  const min = Math.min(...all);
  const x = (i: number, n: number) => 2 + (i * (width - 6)) / Math.max(1, n - 1);
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 7);
  const path = (a: readonly number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i, a.length).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = values.length - 1;
  return (
    // The line stretches with its card; the last point is drawn over it in
    // HTML so it stays a round point at any width.
    <div className="relative" style={{ height }}>
      <svg
        role="img"
        aria-label={label}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block overflow-visible"
      >
        {dash && dash.length > 1 ? (
          <path d={path(dash)} fill="none" stroke="var(--adm-ink-3)" strokeWidth={1.2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ) : null}
        <path d={path(values)} fill="none" stroke="var(--adm-ink)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        aria-hidden
        className="absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${((x(last, values.length) / width) * 100).toFixed(2)}%`,
          top: y(values[last]),
          background: "var(--adm-ink)",
          boxShadow: "var(--adm-lit-soft)",
        }}
      />
    </div>
  );
}

/**
 * A period as a line over a soft area, the period before it dashed, the last
 * point lit, and three marks under it (its first day, its middle, today).
 * With `median`, a dotted line runs across at that value with its figure on
 * it. With `days`, one label per point, any day can be picked (the owner,
 * 2026-11-02: "ensure you can highlight each single day on the chart"): a
 * mouse over it, a tap or a drag on a phone, or the arrow keys, and a line,
 * the point and a label with its day and figure come up. A mouse leaving
 * lets it go; a tap stays until the next. The line stretches with its card;
 * the marks, the points and the labels are HTML so they keep their size.
 *
 * IT DRAWS ITSELF (the owner, 2026-11-04: "can you add animations to the
 * chart? Because when we revamped the design, they removed it"). The line
 * and its area sweep in from the left when the chart opens and again each
 * time `drawKey` changes (the range, what it counts), and the last point and
 * the median's figure arrive as the sweep ends. A live refresh of the same
 * chart does not replay it. A clip, not a dash: the line keeps its width
 * when the card stretches (non-scaling stroke), which a dash length measured
 * on the path would not match. Off with the panel's Motion switch, read
 * through useReducedMotion, never a media query (admin-theme.css says why).
 */
export function TrendLine({
  values,
  before,
  median,
  days,
  valueText = (v) => v.toLocaleString("en-US"),
  marks,
  height = 150,
  label,
  drawKey = "",
  overlays = [],
  soFar = false,
}: {
  values: readonly number[];
  before?: readonly number[];
  median?: { value: number; text: string } | null;
  days?: readonly string[];
  /** A value as the picked day's label says it. */
  valueText?: (v: number) => string;
  marks: [string, string, string];
  height?: number;
  label: string;
  /** What the chart shows; a change replays the draw. The same chart refreshed keeps its key. */
  drawKey?: string;
  /**
   * More lines on the same days (his pick A on sheet r3-35, switches on one
   * chart: Page views and Signups beside Visitors). Each is drawn to its own
   * height, so a count of ten a day and one of seven thousand both have a
   * shape; the picked day says every figure in words.
   */
  overlays?: readonly { values: readonly number[]; valueText: (v: number) => string; dash: string }[];
  /** The last point is the day still running (his pick A on r3-36): its stretch dashed, its point open. */
  soFar?: boolean;
}) {
  const reduced = useReducedMotion();
  const W = 600;
  // Letters and digits only: the id goes into url(#...), where React's own marks are awkward.
  const gid = `adm-trend-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // The pick remembers how many points it was made on, so a new range lets it go.
  const [pick, setPick] = useState<{ i: number; of: number } | null>(null);
  if (values.length < 2) return <Quiet className="py-6">Not enough days to draw yet.</Quiet>;
  const max = Math.max(1, ...values, ...(before ?? [])) * 1.12;
  const x = (i: number, n: number) => (i * W) / Math.max(1, n - 1);
  const y = (v: number) => height - (v / max) * height;
  const path = (a: readonly number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i, a.length).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = values.length - 1;
  const canPick = Boolean(days && days.length === values.length);
  const picked = canPick && pick && pick.of === values.length ? pick.i : null;
  const pickAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)));
    setPick({ i: Math.round(f * last), of: values.length });
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return setPick(null);
    const from = picked ?? last;
    const to = e.key === "ArrowLeft" ? from - 1 : e.key === "ArrowRight" ? from + 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (to === null) return;
    e.preventDefault();
    setPick({ i: Math.min(last, Math.max(0, to)), of: values.length });
  };
  const said = (i: number) =>
    [days?.[i] ?? "", valueText(values[i]), ...overlays.map((o) => (o.values[i] === undefined ? "" : o.valueText(o.values[i])))]
      .filter(Boolean)
      .join(", ");
  // An overlay to its own height, on the same days.
  const pathOwn = (a: readonly number[]) => {
    const top = Math.max(1, ...a) * 1.12;
    return a.map((v, i) => `${i ? "L" : "M"}${x(i, a.length).toFixed(1)},${(height - (v / top) * height).toFixed(1)}`).join("");
  };
  const at = picked === null ? 0 : (picked / last) * 100;
  return (
    <div>
      <div
        className="relative"
        style={{ height, touchAction: canPick ? "pan-y" : undefined, cursor: canPick ? "crosshair" : undefined }}
        {...(canPick
          ? {
              role: "slider",
              tabIndex: 0,
              "aria-label": "Pick a day",
              "aria-valuemin": 0,
              "aria-valuemax": last,
              "aria-valuenow": picked ?? last,
              "aria-valuetext": said(picked ?? last),
              onPointerDown: pickAt,
              onPointerMove: pickAt,
              onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
                if (e.pointerType === "mouse") setPick(null);
              },
              onKeyDown: onKey,
            }
          : {})}
      >
        <svg
          key={`draw:${drawKey}`}
          role="img"
          aria-label={label}
          width="100%"
          height={height}
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className={`block overflow-visible${reduced ? "" : " adm-trend-draw"}`}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--adm-ink)" stopOpacity={0.17} />
              <stop offset="1" stopColor="var(--adm-ink)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[1, 2, 3].map((k) => (
            <line key={k} x1={0} x2={W} y1={(height * k) / 4} y2={(height * k) / 4} stroke="var(--chart-grid)" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1={0} x2={W} y1={height} y2={height} stroke="var(--adm-line-strong)" vectorEffect="non-scaling-stroke" />
          {before && before.length > 1 ? (
            <path d={path(before)} fill="none" stroke="var(--adm-ink-3)" strokeWidth={1.3} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ) : null}
          <path d={`${path(values)}L${x(last, values.length)},${height}L0,${height}Z`} fill={`url(#${gid})`} />
          {overlays.map((o, k) => (
            <path
              key={k}
              d={pathOwn(o.values)}
              fill="none"
              stroke="var(--adm-ink-2)"
              strokeWidth={1.4}
              strokeDasharray={o.dash}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {soFar ? (
            <>
              <path d={path(values.slice(0, last))} fill="none" stroke="var(--adm-ink)" strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path
                d={`M${x(last - 1, values.length).toFixed(1)},${y(values[last - 1]).toFixed(1)}L${x(last, values.length).toFixed(1)},${y(values[last]).toFixed(1)}`}
                fill="none"
                stroke="var(--adm-ink)"
                strokeWidth={1.8}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : (
            <path d={path(values)} fill="none" stroke="var(--adm-ink)" strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
          {median ? (
            <line x1={0} x2={W} y1={y(median.value)} y2={y(median.value)} stroke="var(--adm-ink-2)" strokeWidth={1.2} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        {median ? (
          <span
            key={`median:${drawKey}`}
            aria-hidden
            className={`absolute left-0 -translate-y-full rounded-[4px] px-1 pb-0.5 font-mono text-[10.5px]${reduced ? "" : " adm-trend-late"}`}
            style={{ top: y(median.value), color: "var(--adm-ink-2)", background: "var(--adm-panel)" }}
          >
            {median.text}
          </span>
        ) : null}
        <span
          key={`last:${drawKey}`}
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: "100%", top: y(values[last]) }}
        >
          <span
            className={`block h-[8px] w-[8px] rounded-full${reduced ? "" : " adm-trend-arrive"}`}
            style={
              soFar
                ? { background: "var(--adm-panel)", border: "1.6px solid var(--adm-ink)" }
                : { background: "var(--adm-ink)", boxShadow: "var(--adm-lit-soft)" }
            }
          />
        </span>
        {picked !== null ? (
          <>
            <span aria-hidden className="pointer-events-none absolute top-0 w-px" style={{ left: `${at}%`, height, background: "var(--chart-hover)" }} />
            <span
              aria-hidden
              className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ left: `${at}%`, top: y(values[picked]), background: "var(--adm-ink)", borderColor: "var(--adm-panel)" }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 whitespace-nowrap rounded-[var(--adm-radius-sm)] border px-1.5 py-0.5 font-sans text-eyebrow tabular-nums"
              style={{
                left: `${at}%`,
                // The label stays inside the card at either end.
                transform: `translateX(${at < 15 ? "0" : at > 85 ? "-100%" : "-50%"})`,
                background: "var(--adm-panel)",
                borderColor: "var(--adm-line-strong)",
                color: "var(--adm-ink)",
                boxShadow: "var(--adm-shadow-pop)",
              }}
            >
              {days?.[picked]}
              <span style={{ color: "var(--adm-ink-3)" }}> · </span>
              {valueText(values[picked])}
              {overlays.map((o, k) =>
                o.values[picked] === undefined ? null : (
                  <span key={k}>
                    <span style={{ color: "var(--adm-ink-3)" }}> · </span>
                    {o.valueText(o.values[picked])}
                  </span>
                ),
              )}
            </span>
          </>
        ) : null}
      </div>
      <div aria-hidden className="mt-1.5 flex justify-between font-mono text-[10.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {marks.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
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

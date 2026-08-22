"use client";

// The hero layer: what the panel says before a tab is opened.
//
// Everything below the rail used to start at a tab body. An operator landing
// on /admin saw whichever section they left off in, which answers "what am I
// looking at" and never answers "how are we doing". These four components are
// the answer to the second question, and they sit above the tab.
//
// The vocabulary is deliberately small and repeats down the panel:
//
//   SectionHead   eyebrow, count chip, title, controls
//   MetricCard    one number, its movement, and its shape over time
//   FeatureCard   the one thing worth doing next
//   PeriodChips   the window every number on screen is measured over
//
// WHY A SECOND SPARKLINE. charts.tsx already exports one, and twenty tab
// files call it. It is a 1.5px polyline with a dot on the end, correct for a
// 120x32 slot inside a table row. The hero needs a smoothed curve, a gradient
// under it, a baseline to read movement against and a labelled end node, at
// four times the size. Bolting five optional props onto the shared component
// would have put that cost on all twenty call sites to serve three. So: one
// small sparkline for rows, one large one for the hero, sharing smoothPath.

import type { ReactNode } from "react";
import { smoothPath } from "./charts";
import { Skeleton } from "./primitives";

/* ────────────────────────────────────────────────────────────────────────
   HeroSpark
   ──────────────────────────────────────────────────────────────────────── */

const SW = 280;
const SH = 78;
const SPAD = 10;

export function HeroSpark({
  points,
  color = "var(--adm-accent)",
  format = (v: number) => String(Math.round(v)),
  id,
}: {
  points: number[];
  color?: string;
  format?: (v: number) => string;
  /** Unique per card: two gradients sharing an id makes the second one blank. */
  id: string;
}) {
  if (points.length < 2) {
    return <div style={{ height: SH }} aria-hidden />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat series has zero span, and dividing by it puts every point at NaN.
  // Falling back to 1 draws it as a straight line through the middle, which
  // is what a flat series actually looks like.
  const span = max - min || 1;
  const plotH = SH - SPAD * 2;
  const x = (i: number) => (i / (points.length - 1)) * SW;
  const y = (v: number) => SPAD + plotH - ((v - min) / span) * plotH;

  const xy = points.map((v, i) => ({ x: x(i), y: y(v) }));
  const line = smoothPath(xy);
  const area = `${line} L ${SW} ${SH} L 0 ${SH} Z`;

  const lastX = x(points.length - 1);
  const lastY = y(points[points.length - 1]);
  // The baseline is where the series STARTED, so height above it reads as
  // the movement the delta chip states in words. A mean would be prettier
  // and would not mean anything.
  const baseY = y(points[0]);

  return (
    <svg
      viewBox={`0 0 ${SW} ${SH}`}
      className="block w-full overflow-visible"
      // maxHeight matters more than it looks. SW = 280 was exactly the card
      // width under the old 1400px shell, so `height: auto` happened to
      // resolve to SH. On the full-bleed shell the card is wider and the
      // sparkline scales with it, reaching roughly 116px tall at 1920 and
      // swallowing the number it is supposed to annotate.
      style={{ height: "auto", maxHeight: SH }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <line
        x1="0"
        x2={SW}
        y1={baseY}
        y2={baseY}
        stroke="var(--adm-line-strong)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      <path d={area} fill={`url(#${id}-fill)`} className="own-fill" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Measured, not guessed: a wrong dash length either clips the line or
        // shows it before the animation starts, and both read as a stutter.
        ref={(el) => {
          if (el) el.style.setProperty("--own-len", String(el.getTotalLength()));
        }}
        className="own-draw"
      />

      {/* Halo, then node. Two circles rather than a filter: a blur costs a
          raster pass on every frame of the draw-in for the same effect. */}
      <circle cx={lastX} cy={lastY} r="6" fill={color} opacity="0.18" />
      <circle
        cx={lastX}
        cy={lastY}
        r="3.25"
        fill="var(--adm-panel)"
        stroke={color}
        strokeWidth="2"
      />

      {/* Anchored to the right edge, so a long value cannot push off-card. */}
      <g transform={`translate(${SW}, ${Math.max(12, lastY - 14)})`}>
        <rect
          x="-58"
          y="-11"
          width="58"
          height="19"
          rx="6"
          fill="var(--adm-panel-2)"
          stroke="var(--adm-line-strong)"
        />
        <text
          x="-29"
          y="2.5"
          textAnchor="middle"
          fontSize="10.5"
          fontFamily="var(--font-sans)"
          fill="var(--adm-ink-2)"
        >
          {format(points[points.length - 1])}
        </text>
      </g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   MetricCard
   ──────────────────────────────────────────────────────────────────────── */

export function MetricCard({
  icon,
  eyebrow,
  title,
  label,
  value,
  delta,
  points,
  format,
  color,
  onOpen,
  openLabel,
  loading = false,
  id,
}: {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  label: string;
  value: string;
  /**
   * `positive` drives both the arrow and the colour. It means "went up",
   * and up is treated as good, which is true of every metric this card
   * currently carries (visitors, sign-ups, revenue). A metric where a rise
   * is bad (refund rate, failed webhooks) needs its own tone prop before it
   * goes here, or the card will congratulate the operator on it.
   */
  delta?: { value: number; positive: boolean; suffix?: string } | null;
  points?: number[];
  format?: (v: number) => string;
  color?: string;
  onOpen?: () => void;
  openLabel?: string;
  loading?: boolean;
  id: string;
}) {
  const accent = color ?? "var(--adm-accent)";

  return (
    <div
      className="flex min-w-0 flex-col rounded-[var(--adm-radius)] border p-4"
      style={{
        background: "var(--adm-panel)",
        borderColor: "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--adm-radius-sm)]"
            style={{ background: "var(--adm-panel-2)", color: accent }}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-sans text-[11px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {eyebrow}
          </span>
          <span
            className="block truncate font-sans text-[13px] font-medium"
            style={{ color: "var(--adm-ink)" }}
          >
            {title}
          </span>
        </span>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={openLabel ?? `Open ${title}`}
            title={openLabel ?? `Open ${title}`}
            // hit-44 rather than a 44px box: the reference's affordance is a
            // small square in the corner, and growing the ink to meet the
            // touch floor would make it the loudest thing on the card. The
            // pseudo-element takes the tap area to 44 without moving a pixel.
            className="adm-control hit-44 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--adm-radius-sm)] border"
            style={
              {
                borderColor: "var(--adm-line)",
                color: "var(--adm-ink-3)",
                "--_bg": "transparent",
                "--_bg-hover": "var(--adm-hover)",
              } as React.CSSProperties
            }
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 13L13 7M8 7h5v5" />
            </svg>
          </button>
        ) : null}
      </div>

      <p className="mt-4 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </p>

      {loading ? (
        <div className="mt-1.5">
          <Skeleton w={120} h={30} />
        </div>
      ) : (
        <p
          className="mt-0.5 font-sans text-[30px] font-semibold leading-none tracking-[-0.02em]"
          style={{ color: "var(--adm-ink)" }}
        >
          {value}
        </p>
      )}

      {delta ? (
        <p className="mt-2 flex items-center gap-1.5 font-sans text-[12px]">
          {/* Direction gets a colour AND an arrow. Colour alone would make
              the sign invisible to a reader who cannot separate the two
              hues, which is the same rule the status vocabulary follows. */}
          <span
            aria-hidden
            className="grid h-3.5 w-3.5 place-items-center"
            style={{ color: delta.positive ? "var(--adm-good)" : "var(--adm-critical)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {delta.positive ? <path d="M5 8V2M2.2 4.8 5 2l2.8 2.8" /> : <path d="M5 2v6M2.2 5.2 5 8l2.8-2.8" />}
            </svg>
          </span>
          <span style={{ color: delta.positive ? "var(--adm-good)" : "var(--adm-critical)" }}>
            {delta.positive ? "+" : ""}
            {delta.value.toFixed(2)}
            {delta.suffix ?? "%"}
          </span>
          <span style={{ color: "var(--adm-ink-3)" }}>vs previous</span>
        </p>
      ) : null}

      <div className="mt-3 min-h-[78px]">
        {loading ? (
          <Skeleton w="100%" h={78} />
        ) : points && points.length > 1 ? (
          <HeroSpark points={points} color={accent} format={format} id={id} />
        ) : (
          <p
            className="pt-6 text-center font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            No history yet
          </p>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   FeatureCard
   ──────────────────────────────────────────────────────────────────────── */

/**
 * The one card on the screen allowed a gradient.
 *
 * It earns it by being the only one: a panel where three things glow has
 * nothing that stands out. What goes here is whatever the operator should
 * deal with next, which is why the copy is passed in rather than fixed.
 *
 * The gradient is identical in both themes on purpose. It is a coloured
 * surface, not a tinted one, so it reads as a deliberate object on a light
 * ground exactly as it does on a dark one, and the ink on it stays white in
 * both rather than flipping halfway down the panel.
 */
export function FeatureCard({
  badge,
  title,
  body,
  primary,
  secondary,
}: {
  badge?: string;
  title: string;
  body: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div
      // Ink on this card is hardcoded white rather than tokenised, because
      // the gradient is a coloured SURFACE that does not flip with the theme.
      // That puts the contrast burden on the gradient: --adm-grad-to is
      // pinned dark enough that white clears 4.5:1 on it, and the body copy
      // sits at 94% for the same reason. Lightening either end of the
      // gradient, or raising the bloom past 20%, breaks this and no test
      // will tell you, because adminTheme.test.ts cannot parse a gradient.
      className="flex min-w-0 flex-col rounded-[var(--adm-radius)] p-5"
      style={{
        // Two layers. The base gradient runs from deep violet to indigo and
        // is what every piece of text sits on. The vivid magenta is a corner
        // BLOOM over the top, capped at 20%, never a hard stop.
        //
        // The difference matters and it is measured. Running the base
        // gradient on to full #d946ef puts the body copy at 2.99:1, well
        // under the 4.5 floor for 12.5px text, because that magenta is far
        // lighter than it looks. Capping the bloom at 20% gives a worst-case
        // ground of #8f3ced, where the body clears at 4.63:1. The reference
        // does the same thing: its promo card blooms, it does not band.
        background:
          "radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, var(--adm-grad-vivid), transparent 80%) 0%, transparent 60%), " +
          "linear-gradient(155deg, var(--adm-grad-from) 0%, var(--adm-grad-to) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-[var(--adm-radius-sm)]"
          style={{ background: "rgb(255 255 255 / 0.16)", color: "#ffffff" }}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M8 2.2v11.6M5.9 4.4h4.2M4.2 7.1h7.6M6.1 10.6l3.8-1.1" />
          </svg>
        </span>
        {badge ? (
          <span
            className="rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11px] font-medium"
            style={{ background: "rgb(255 255 255 / 0.18)", color: "#ffffff" }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h2
        className="mt-5 font-sans text-[19px] font-semibold leading-tight tracking-[-0.01em]"
        style={{ color: "#ffffff" }}
      >
        {title}
      </h2>
      <p
        className="mt-2 font-sans text-[12.5px] leading-relaxed"
        style={{ color: "rgb(255 255 255 / 0.94)" }}
      >
        {body}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-5">
        {primary ? (
          <button
            type="button"
            onClick={primary.onClick}
            className="adm-control flex h-11 w-full items-center justify-center rounded-[var(--adm-radius-sm)] font-sans text-[12.5px] font-medium"
            style={
              {
                color: "#1a1636",
                "--_bg": "rgb(255 255 255 / 0.92)",
                "--_bg-hover": "#ffffff",
              } as React.CSSProperties
            }
          >
            {primary.label}
          </button>
        ) : null}
        {secondary ? (
          <button
            type="button"
            onClick={secondary.onClick}
            className="adm-control flex h-11 w-full items-center justify-center rounded-[var(--adm-radius-sm)] border font-sans text-[12.5px] font-medium"
            style={
              {
                borderColor: "rgb(255 255 255 / 0.28)",
                color: "#ffffff",
                "--_bg": "transparent",
                "--_bg-hover": "rgb(255 255 255 / 0.12)",
              } as React.CSSProperties
            }
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   SectionHead and PeriodChips
   ──────────────────────────────────────────────────────────────────────── */

export function SectionHead({
  eyebrow,
  chip,
  title,
  children,
}: {
  eyebrow?: string;
  chip?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow || chip ? (
          <div className="mb-1 flex items-center gap-2">
            {eyebrow ? (
              <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {eyebrow}
              </span>
            ) : null}
            {chip ? (
              <span
                className="rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11px] font-medium"
                style={{ background: "var(--adm-panel-2)", color: "var(--adm-ink-2)" }}
              >
                {chip}
              </span>
            ) : null}
          </div>
        ) : null}
        <h2
          className="truncate font-sans text-[22px] font-semibold tracking-[-0.02em]"
          style={{ color: "var(--adm-ink)" }}
        >
          {title}
        </h2>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export type PeriodId = "24h" | "7d" | "30d" | "90d";

export const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: "24h", label: "24H", days: 1 },
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
];

export function PeriodChips({
  active,
  onChange,
  options,
}: {
  active: PeriodId;
  onChange: (id: PeriodId) => void;
  /** Subset of PERIODS. The hero passes 7D/30D because its sparklines are
      built from daily buckets, and a 24H window is one point, not a line. */
  options?: PeriodId[];
}) {
  const shown = options ? PERIODS.filter((p) => options.includes(p.id)) : PERIODS;
  return (
    <div
      role="group"
      aria-label="Time window"
      className="flex items-center gap-0.5 rounded-[var(--adm-radius-pill)] border p-0.5"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}
    >
      {shown.map((p) => {
        const on = p.id === active;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            aria-pressed={on}
            // h-11 keeps the ratchet happy without hit-44: these sit in a row
            // with real spacing, and the doc warns that overlapping hit areas
            // let the later control in paint order silently win.
            className="h-11 rounded-[var(--adm-radius-pill)] px-3 font-sans text-[12px] font-medium"
            style={
              on
                ? { background: "var(--adm-accent)", color: "var(--adm-on-accent)" }
                : { background: "transparent", color: "var(--adm-ink-3)" }
            }
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

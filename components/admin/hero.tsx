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

import { useState, type ReactNode } from "react";
import { smoothPath } from "./charts";
import { Odometer } from "./Odometer";
import { useReducedMotion } from "@/lib/ui/motion";
import { SENSITIVE } from "@/lib/admin/streamer";
import { Skeleton } from "./primitives";

/* ────────────────────────────────────────────────────────────────────────
   HeroSpark
   ──────────────────────────────────────────────────────────────────────── */

const SW = 280;
const SH = 78;
const SPAD = 10;

// What sits on the one filled card (FeatureCard below): a wash of that card's
// own ink, for the icon tile, the badge and the rows, and a slightly heavier
// one for a row under the pointer. Mixed from the token so they turn over with
// the theme along with the card.
const ON_SOLID_WASH = "color-mix(in oklab, var(--adm-on-accent), transparent 86%)";
const ON_SOLID_WASH_HOVER = "color-mix(in oklab, var(--adm-on-accent), transparent 76%)";

export function HeroSpark({
  points,
  color = "var(--adm-accent)",
  format = (v: number) => String(Math.round(v)),
  labels,
  title,
}: {
  points: number[];
  color?: string;
  format?: (v: number) => string;
  /** One per point, same order. Shown under the value while scrubbing. */
  labels?: string[];
  /** What the series measures, for the accessible name. */
  title?: string;
}) {
  const reduced = useReducedMotion();
  // REPLAY ON EVERY PERIOD CHANGE. A CSS animation runs when an element
  // mounts, and switching Today / 7D / 30D only swaps the `d` attribute on the
  // same two paths, so the chart silently redrew without ever animating. Keyed
  // on the series, the paths are new elements each time and the draw runs
  // again, which is what makes the window change read as a change.
  const seriesKey = `${points.length}:${points[0] ?? 0}:${points[points.length - 1] ?? 0}`;
  const [hover, setHover] = useState<number | null>(null);

  // Before the early return, because hooks cannot run conditionally. The guard
  // below returns for a series too short to draw, and a hook declared after it
  // would run on some renders and not others.
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

  // The point being read. Hover when there is one, otherwise the latest, which
  // is what this chart always showed and so is what it falls back to.
  const idx = hover ?? points.length - 1;
  const lastX = x(idx);
  const lastY = y(idx === points.length - 1 ? points[points.length - 1] : points[idx]);
  // The baseline is where the series STARTED, so height above it reads as
  // the movement the delta chip states in words. A mean would be prettier
  // and would not mean anything.
  const baseY = y(points[0]);

  // Pointer events rather than onMouseMove, which is what every other chart in
  // this panel uses. A mouse fires pointermove on hover and a finger fires it
  // while touching, so one handler covers scrubbing on both. touch-action is
  // deliberately NOT set to none: that would win the gesture from the page and
  // a finger dragged over the card could no longer scroll past it.
  const at = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const readout = format(points[idx]);
  const caption = labels?.[idx];

  return (
    <svg
      viewBox={`0 0 ${SW} ${SH}`}
      className="adm-spark block w-full cursor-crosshair overflow-visible"
      // maxHeight matters more than it looks. SW = 280 was exactly the card
      // width under the old 1400px shell, so `height: auto` happened to
      // resolve to SH. On the full-bleed shell the card is wider and the
      // sparkline scales with it, reaching roughly 116px tall at 1920 and
      // swallowing the number it is supposed to annotate.
      style={{ height: "auto", maxHeight: SH }}
      onPointerMove={at}
      onPointerDown={at}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
      // Focusable and arrow-key driven, because a read-out reachable only by
      // hovering is a read-out a keyboard cannot reach. This was aria-hidden
      // when it carried no information beyond the headline number; now that it
      // reports a value per day it has to be reachable and has to say so.
      tabIndex={0}
      role="img"
      aria-label={
        `${title ? title + ": " : ""}${readout}${caption ? ", " + caption : ""}` +
        `. ${points.length} points, use the arrow keys to read each one.`
      }
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const step = e.key === "ArrowRight" ? 1 : -1;
          setHover((h) =>
            Math.max(0, Math.min(points.length - 1, (h ?? points.length - 1) + step)),
          );
        } else if (e.key === "Escape") {
          setHover(null);
        }
      }}
      onBlur={() => setHover(null)}
      focusable="false"
    >
      {/* The line and nothing under it. There was a fade from the line down
          to the baseline, and under a flat series it read as a shadow cast by
          a rule. The dashed baseline already says where the series started. */}
      <line
        x1="0"
        x2={SW}
        y1={baseY}
        y2={baseY}
        stroke="var(--adm-line-strong)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />

      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Measured, not guessed: a wrong dash length either clips the line or
        // shows it before the animation starts, and both read as a stutter.
        key={`line-${seriesKey}`}
        ref={(el) => {
          if (el) el.style.setProperty("--own-len", String(el.getTotalLength()));
        }}
        className={reduced ? "own-static" : "own-draw"}
      />

      {/* The crosshair, only while scrubbing. Drawn before the node so the
          node sits on top of it. */}
      {hover !== null && (
        <line
          x1={lastX}
          x2={lastX}
          y1={SPAD - 6}
          y2={SH - SPAD + 6}
          stroke="var(--adm-line-strong)"
          strokeWidth="1"
        />
      )}

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

      {/* Anchored to the right edge, so a long value cannot push off-card.
          It follows the scrubbed point vertically but never horizontally: a
          badge that tracked the cursor would sit under it half the time and
          would clip off the left edge on the first few points. */}
      <g transform={`translate(${SW}, ${Math.max(12, lastY - 14)})`}>
        <rect
          x="-58"
          y={caption ? -15 : -11}
          width="58"
          height={caption ? 28 : 19}
          rx="6"
          fill="var(--adm-panel-2)"
          stroke="var(--adm-line-strong)"
        />
        <text
          x="-29"
          y={caption ? -2.5 : 2.5}
          textAnchor="middle"
          fontSize="10.5"
          fontFamily="var(--font-sans)"
          fill="var(--adm-ink)"
        >
          {readout}
        </text>
        {caption && (
          <text
            x="-29"
            y="8.5"
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-sans)"
            fill="var(--adm-ink-3)"
          >
            {caption}
          </text>
        )}
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
  labels,
  format,
  color,
  onOpen,
  openLabel,
  loading = false,
  className,
  emptyLabel,
  sensitive = false,
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
  /** One per point, same order. Shown while scrubbing the sparkline. */
  labels?: string[];
  format?: (v: number) => string;
  color?: string;
  onOpen?: () => void;
  openLabel?: string;
  loading?: boolean;
  /**
   * Replaces the card's DISPLAY, not its layout. The default is `flex`; a
   * caller that wants the card only above a breakpoint passes
   * `hidden lg:flex`. Kept as a whole-class swap rather than appended,
   * because `flex` and `hidden` both set display and which one wins would
   * then depend on stylesheet order rather than on what was written here.
   */
  className?: string;
  /** Replaces "No history yet" when the series is absent for a reason worth naming. */
  emptyLabel?: string;
  /**
   * Masks the change and the sparkline under streamer mode, not only the
   * figure. Added 2026-09-13 after the owner saw the Revenue card on a stream:
   * the value blurred, because Odometer masks anything with a currency mark,
   * but the line underneath drew every sale in the window and its readout
   * badge printed the amount under the cursor. A chart of money is money.
   */
  sensitive?: boolean;
}) {
  const accent = color ?? "var(--adm-accent)";

  return (
    <div
      className={["min-w-0 flex-col rounded-[var(--adm-radius)] border p-4", className ?? "flex"].join(" ")}
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
        {/* The name of the measure first, then where it comes from. The
            source used to sit above the name as a small label, which made the
            eye read the footnote before the thing it is a footnote to. */}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-sans text-[13px] font-semibold"
            style={{ color: "var(--adm-ink)" }}
          >
            {title}
          </span>
          <span
            className="block truncate font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {eyebrow}
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
          {/* The hero row is the first thing read and the last thing to get
              the odometer: it renders its own <p> rather than going through
              StatCard, so wiring the cards alone left the four biggest numbers
              on the dashboard swapping silently. */}
          <Odometer value={value} />
        </p>
      )}

      {delta ? (
        <p
          className={
            "mt-2 flex items-center gap-1.5 font-sans text-[12px]" + (sensitive ? ` ${SENSITIVE}` : "")
          }
        >
          {/* Direction is the arrow and the sign on the figure. It used to be
              a colour as well; with one ink the arrow carries it alone, which
              it was already drawn to be able to do. */}
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

      {/* The class sits on the box, so the readout badge inside HeroSpark is
          masked with the line. Hover lifts it, like every other mask. */}
      <div className={"mt-3 min-h-[78px]" + (sensitive ? ` ${SENSITIVE}` : "")}>
        {loading ? (
          <Skeleton w="100%" h={78} />
        ) : points && points.length > 1 ? (
          <HeroSpark
            points={points}
            color={accent}
            format={format}
            labels={labels}
            title={title}
          />
        ) : (
          <p
            className="pt-6 text-center font-sans text-[11.5px]"
            style={{ color: "var(--adm-ink-3)" }}
          >
            {emptyLabel ?? "No history yet"}
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
 * The one filled card on the screen.
 *
 * It earns the fill by being the only one: on a panel with no hue, a solid
 * block is the loudest thing there is, and a screen where three things are
 * solid has nothing that stands out. What goes here is whatever the operator
 * should deal with next, which is why the copy is passed in rather than fixed.
 *
 * The fill is the panel's own ink, so it turns over with the theme: black on
 * the white panel, white on the black one, the way the board sets its Ads
 * side against its Organic side. Everything on it is therefore drawn in
 * --adm-on-accent or a wash of it, never in a literal white, which would
 * vanish in the dark theme.
 */
export function FeatureCard({
  badge,
  title,
  body,
  rows,
  primary,
  secondary,
}: {
  badge?: string;
  title: string;
  body: string;
  /**
   * The queues behind the headline, one line each: "3 awaiting payment",
   * "1 open ticket". The card still has one job, whatever is on top; these
   * are the rest of the answer to "what is waiting on me", in the order the
   * derivation ranks them, so nothing has to be opened to learn the count.
   */
  rows?: { label: string; onClick: () => void }[];
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div
      // The contrast on this card is the theme test's --adm-on-accent on
      // --adm-accent pair, which is the ink on the ground turned over, so it
      // is the best pair the theme has. The washes below are all mixed from
      // --adm-on-accent for the same reason.
      className="flex min-w-0 flex-col rounded-[var(--adm-radius)] p-5"
      style={{ background: "var(--adm-accent)", color: "var(--adm-on-accent)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-[var(--adm-radius-sm)]"
          style={{ background: ON_SOLID_WASH, color: "var(--adm-on-accent)" }}
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M8 2.2v11.6M5.9 4.4h4.2M4.2 7.1h7.6M6.1 10.6l3.8-1.1" />
          </svg>
        </span>
        {badge ? (
          <span
            className="rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11px] font-medium"
            style={{ background: ON_SOLID_WASH, color: "var(--adm-on-accent)" }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h2
        className="mt-5 font-sans text-[19px] font-semibold leading-tight tracking-[-0.015em]"
        style={{ color: "var(--adm-on-accent)" }}
      >
        {title}
      </h2>
      <p
        className="mt-2 font-sans text-[12.5px] leading-relaxed"
        // 88% of the card's ink: a step back from the title without leaving
        // the ink. Still 12:1 or better on the solid in both themes.
        style={{ color: "color-mix(in oklab, var(--adm-on-accent), transparent 12%)" }}
      >
        {body}
      </p>

      {rows && rows.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.label}>
              <button
                type="button"
                onClick={r.onClick}
                className="adm-control flex h-11 w-full items-center justify-between rounded-[var(--adm-radius-sm)] px-3 font-sans text-[12.5px] font-medium"
                style={
                  {
                    color: "var(--adm-on-accent)",
                    "--_bg": ON_SOLID_WASH,
                    "--_bg-hover": ON_SOLID_WASH_HOVER,
                  } as React.CSSProperties
                }
              >
                <span className="min-w-0 truncate">{r.label}</span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 13L13 7M8 7h5v5" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-5">
        {primary ? (
          <button
            type="button"
            onClick={primary.onClick}
            className="adm-control flex h-11 w-full items-center justify-center rounded-[var(--adm-radius-sm)] font-sans text-[12.5px] font-medium"
            // The card's primary action is the card turned inside out: the
            // ground's own colour on the solid, with the solid as its ink.
            style={
              {
                color: "var(--adm-accent)",
                "--_bg": "var(--adm-on-accent)",
                "--_bg-hover": "color-mix(in oklab, var(--adm-on-accent), var(--adm-accent) 12%)",
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
                borderColor: "color-mix(in oklab, var(--adm-on-accent), transparent 62%)",
                color: "var(--adm-on-accent)",
                "--_bg": "transparent",
                "--_bg-hover": ON_SOLID_WASH,
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

/**
 * The title of the tab that is open, set the way the board sets the title of
 * each of its parts: large, tight, with one line of what the tab is under it
 * and a rule in full ink closing the block.
 *
 * It used to be a small heading with the group's name over it and the
 * description in a capsule beside that. The group is already what the rail
 * files the tab under, so saying it again above the title was a label for a
 * label, and the description reads better as a sentence than as a tag.
 *
 * The rule is the one line on the page drawn in ink rather than in the
 * hairline grey. Everything under it belongs to this tab.
 */
export function SectionHead({
  sub,
  title,
  children,
}: {
  /** One line under the title: what this tab is for. */
  sub?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4"
      style={{ borderColor: "var(--adm-ink)" }}
    >
      <div className="min-w-0">
        <h2
          className="font-sans text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] [text-wrap:balance] md:text-[46px]"
          style={{ color: "var(--adm-ink)" }}
        >
          {title}
        </h2>
        {sub ? (
          <p
            className="mt-2 font-sans text-[14px] leading-snug md:text-[15px]"
            style={{ color: "var(--adm-ink-2)" }}
          >
            {sub}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export type PeriodId = "24h" | "7d" | "30d" | "90d" | "all";

/**
 * `days: 0` on "all" is a SENTINEL, not a duration.
 *
 * The window for All time is not knowable on the client: it depends on when
 * the oldest record was written. The route resolves it with daysSince() in
 * lib/admin/dayWindow.ts, from the earliest row it can find, capped so one
 * bad timestamp cannot ask Postgres for a decade of empty buckets.
 *
 * Zero rather than Infinity or -1 because every consumer that multiplies or
 * slices by `days` degrades to "nothing" rather than to a hang or a negative
 * length if it ever forgets to special-case it.
 */
export const PERIODS: { id: PeriodId; label: string; days: number }[] = [
  { id: "24h", label: "24H", days: 1 },
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "all", label: "All", days: 0 },
];

export function PeriodChips({
  active,
  onChange,
  options,
  labels,
}: {
  active: PeriodId;
  onChange: (id: PeriodId) => void;
  /** Subset of PERIODS, in PERIODS order. */
  options?: PeriodId[];
  /**
   * Per-caller label overrides.
   *
   * The hero calls the one day window "Today" rather than "24H", and the
   * difference is not cosmetic: its buckets are calendar days in UTC, so the
   * shortest window is today's bucket, not a rolling twenty four hours. A
   * surface reading a genuinely rolling series should keep "24H", which is why
   * this overrides per caller instead of renaming PERIODS.
   */
  labels?: Partial<Record<PeriodId, string>>;
}) {
  const shown = options ? PERIODS.filter((p) => options.includes(p.id)) : PERIODS;
  return (
    // The board's segmented switch: one outlined box, a hairline between the
    // choices, the chosen one solid.
    <div
      role="group"
      aria-label="Time window"
      className="flex items-stretch overflow-hidden rounded-[var(--adm-radius-sm)] border"
      style={{ background: "var(--adm-control)", borderColor: "var(--adm-line-strong)" }}
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
            className="adm-control h-11 border-l px-3 font-sans text-[12.5px] font-medium first:border-l-0"
            style={
              on
                ? ({
                    "--_bg": "var(--adm-accent)",
                    "--_bg-hover": "var(--adm-accent)",
                    borderColor: "var(--adm-accent)",
                    color: "var(--adm-on-accent)",
                  } as React.CSSProperties)
                : ({
                    "--_bg": "transparent",
                    "--_bg-hover": "var(--adm-panel-2)",
                    borderColor: "var(--adm-line-strong)",
                    color: "var(--adm-ink-2)",
                  } as React.CSSProperties)
            }
          >
            {labels?.[p.id] ?? p.label}
          </button>
        );
      })}
    </div>
  );
}

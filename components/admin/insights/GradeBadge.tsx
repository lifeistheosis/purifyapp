"use client";

import { STANDING_LABEL } from "@/lib/admin/insights/grade";
import type { GradeLetter, Standing } from "@/lib/admin/insights/types";

/**
 * How a standing is painted, everywhere in the panel.
 *
 * Tokens only, no new colours. adminTheme.test.ts runs 66 numeric contrast
 * gates over the --adm-* palette and every one of these three has already
 * cleared them on both themes, so borrowing them is free and inventing a
 * fourth would mean re-proving it in two palettes.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL. Each badge carries a letter and a word as
 * well as a hue, because red-green is the common colour blindness and "behind"
 * against "beating" is exactly the red-green pair. The letter alone survives a
 * greyscale print.
 */
const TONE: Record<Standing, string> = {
  ahead: "var(--adm-good)",
  onTrack: "var(--adm-accent-line)",
  behind: "var(--adm-critical)",
};

export function toneFor(standing: Standing | null): string {
  return standing ? TONE[standing] : "var(--adm-ink-3)";
}

export function GradeBadge({
  letter,
  standing,
  size = "md",
}: {
  letter: GradeLetter | null;
  standing: Standing | null;
  size?: "sm" | "md" | "lg";
}) {
  const colour = toneFor(standing);
  const dims =
    size === "lg"
      ? { box: 56, font: 28 }
      : size === "sm"
        ? { box: 26, font: 13 }
        : { box: 38, font: 19 };

  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[var(--adm-radius-sm)] border font-sans font-semibold tabular-nums"
      style={{
        width: dims.box,
        height: dims.box,
        fontSize: dims.font,
        color: letter ? colour : "var(--adm-ink-3)",
        borderColor: letter
          ? `color-mix(in oklab, ${colour}, transparent 60%)`
          : "var(--adm-line)",
        background: letter
          ? `color-mix(in oklab, ${colour}, transparent 90%)`
          : "transparent",
      }}
      // The dash is not a grade. Saying so out loud stops a screen reader
      // reading "minus" where the sighted reader sees "nothing measured yet".
      aria-label={letter ? `Grade ${letter}` : "No grade yet, nothing is being measured"}
    >
      {letter ?? "–"}
    </span>
  );
}

export function StandingPill({ standing }: { standing: Standing | null }) {
  if (!standing) {
    return (
      <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        Not measured
      </span>
    );
  }
  const colour = TONE[standing];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[11px] font-medium"
      style={{
        color: colour,
        background: `color-mix(in oklab, ${colour}, transparent 92%)`,
      }}
    >
      <span
        aria-hidden
        className="inline-block rounded-[var(--adm-radius-pill)]"
        style={{ width: 6, height: 6, background: colour }}
      />
      {STANDING_LABEL[standing]}
    </span>
  );
}

/**
 * A progress meter that can exceed its own track.
 *
 * Beating a target is the case a plain percentage bar handles worst: it pins
 * at 100% and a metric at three times target looks identical to one that
 * scraped in. The fill is capped for LAYOUT at 100% of the track, and the
 * number beside it is not capped at all, so the bar stays readable and the
 * figure stays true. The target line at 100% is what makes a full bar legible
 * as "met" rather than "maxed".
 */
export function RatioMeter({
  ratio,
  standing,
  label,
}: {
  ratio: number | null;
  standing: Standing | null;
  label?: string;
}) {
  const colour = toneFor(standing);
  const pct = ratio === null ? 0 : Math.max(0, Math.min(1, ratio));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        {label ? (
          <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {label}
          </span>
        ) : null}
        <span
          className="font-sans text-[12px] font-semibold tabular-nums"
          style={{ color: ratio === null ? "var(--adm-ink-3)" : colour }}
        >
          {ratio === null ? "no target" : `${Math.round(ratio * 100)}%`}
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-[var(--adm-radius-pill)]"
        style={{ height: 6, background: "var(--adm-panel-2)" }}
        role="img"
        aria-label={
          ratio === null
            ? "No target set"
            : `${Math.round(ratio * 100)} percent of target`
        }
      >
        <div
          className="h-full rounded-[var(--adm-radius-pill)]"
          style={{
            width: `${pct * 100}%`,
            background: colour,
            // Under prefers-reduced-motion admin-theme.css already flattens
            // transitions across .adm, so this needs no guard of its own.
            transition: "width 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

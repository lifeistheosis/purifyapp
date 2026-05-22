import type { FastKind } from "./orthodox";

/**
 * Liturgical "tone" for a day: the accent the calendar UI takes on.
 *   gold    — feasts and ordinary days (the festal/joyful default)
 *   crimson — strict and plain fast days (the penitential register)
 *   green   — fast-free days (release, paschal joy)
 *   muted   — a quiet gold for unremarkable weekdays
 *
 * Surfaced as a `--tone` CSS variable (an "R G B" triplet) on a wrapper, so the
 * lampada glow, ornament rules, and markers all read one source of truth.
 */
export type Tone = "gold" | "crimson" | "green" | "muted";

export function toneFor(opts: { hasFeast: boolean; fast: FastKind }): Tone {
  if (opts.hasFeast) return "gold";
  if (opts.fast === "strict" || opts.fast === "fast") return "crimson";
  if (opts.fast === "fast-free") return "green";
  if (opts.fast === "wine-oil" || opts.fast === "fish") return "gold";
  return "muted";
}

// Space-separated RGB triplets for use as `rgb(var(--tone) / <alpha>)`.
export const TONE_RGB: Record<Tone, string> = {
  gold: "212 175 55",
  crimson: "193 39 45",
  green: "16 185 129",
  muted: "212 175 55",
};

/** Inline style object that sets the `--tone` variable for a subtree. */
export function toneVars(tone: Tone): React.CSSProperties {
  return { ["--tone" as string]: TONE_RGB[tone] };
}

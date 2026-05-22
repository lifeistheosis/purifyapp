import type { FastKind } from "./orthodox";

/**
 * Liturgical "tone" for a day: the accent the calendar UI takes on.
 * gold , feasts and ordinary days (the festal/joyful default)
 * crimson, strict and plain fast days (the penitential register)
 * green , fast-free days (release, paschal joy)
 * muted , a quiet gold for unremarkable weekdays
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

/**
 * Liturgical-season tone, the colour the page chrome takes on during a
 * named Orthodox season. Applied via `--season-tone` on the menaion-surface
 * wrapper; affects ornaments, section-label crosses, and the vignette
 * overlay only. Body text stays paper-coloured.
 */
export type SeasonRgb = {
 /** Space-separated "R G B" triplet for use as `rgb(var(--season-tone))`. */
 rgb: string;
 /** Human label for accessibility / debug. */
 label: string;
};

export const SEASON_TONES: Record<string, SeasonRgb> = {
 "Great Lent": { rgb: "120 35 70", label: "Lenten burgundy" },
 "Palm Sunday": { rgb: "82 130 70", label: "Palm green" },
 "Holy Week": { rgb: "82 36 110", label: "Holy Week violet" },
 "Bright Week": { rgb: "240 220 140", label: "Paschal white-gold" },
 "Paschal season": { rgb: "240 220 140", label: "Paschal white-gold" },
 "Pre-Lent": { rgb: "150 110 60", label: "Quiet ochre" },
 "Apostles' Fast": { rgb: "108 130 80", label: "Olive" },
 "Dormition Fast": { rgb: "60 95 155", label: "Marian blue" },
 "Nativity Fast": { rgb: "50 60 130", label: "Nativity indigo" },
 "The Twelve Days": { rgb: "240 220 140", label: "Paschal white-gold" },
};

/**
 * Resolves a `SeasonInfo` (from `currentSeason(today)`) to a `SeasonRgb`,
 * or `null` for ordinary time. Pass null through to mean "no season tint."
 */
export function seasonTone(
 season: { label: string } | null,
): SeasonRgb | null {
 if (!season) return null;
 return SEASON_TONES[season.label] ?? null;
}

/**
 * Inline style object that sets both `--tone` and (when in a named season)
 * `--season-tone`. Use on the calendar page wrapper.
 */
export function calendarPageVars(
 tone: Tone,
 season: { label: string } | null,
): React.CSSProperties {
 const out: Record<string, string> = { "--tone": TONE_RGB[tone] };
 const s = seasonTone(season);
 if (s) out["--season-tone"] = s.rgb;
 return out as React.CSSProperties;
}

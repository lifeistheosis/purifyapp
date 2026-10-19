/**
 * The highlight palette (1.7.1), pure: no React, no storage, so the tests
 * read exactly what the readers see.
 *
 * WHY IT CHANGED. The owner, 2026-10-18: "I want you to work on the highlight
 * colors and pretty much the UI design and the color picking". The palette it
 * replaces was a desk highlighter set, yellow first, and the owner has banned
 * yellow and gold from Purify's screens (even the antique #c9a25a read to him
 * as "vibe coded yellow"). On the dark page its washes were near grey (chroma
 * 0.02, under a white box the stylesheet laid over every highlighted verse),
 * and on Parchment they all but vanished: 2 to 4 units of OKLab difference
 * from the paper, with the blue and the green turned the paper's own yellow.
 *
 * WHAT IT IS NOW. Six washes, one family: the same lightness and chroma, each
 * a different hue, from the warm end round to the green, with the yellow and
 * orange arc (about 45 to 115 degrees of OKLCH hue) left out entirely. Red,
 * the rubric red of the service books and of Purify's own marks, rose,
 * violet, blue, teal and green. Each is a quiet wash behind the words, laid
 * line by line, never a box and never a stripe.
 *
 *   - On the dark grounds a wash is the colour at 36% over the page, landing
 *     at OKLCH lightness 0.30 to 0.345 and chroma about 0.055, where the white
 *     words stay over 9:1 (AAA) on the default page.
 *   - On Parchment a wash darkens the paper a little: lightness 0.835 to
 *     0.87, chroma about 0.06, the ink over 7:1.
 *   - Their lightness steps in three levels, so the pairs a colour-blind
 *     reader confuses by hue (red and green, violet and blue, rose and teal)
 *     still differ in lightness. The names and the check carry the rest.
 *   - A word marked inside a verse (the desktop's drag) wears the `mark`, an
 *     opaque step stronger than the wash, so a mark inside a washed verse is
 *     the same colour as a mark alone and its words never sit on two layers.
 *   - The `swatch` is the disc a reader taps, the dot in Saved and in the key:
 *     a solid colour that holds 3:1 against its ground, and under the check.
 *
 * lib/bible/__tests__/highlightPalette.test.ts holds every one of those
 * numbers, in every reading mode the app has.
 *
 * THE IDS ARE STORAGE KEYS. A highlight's colour is kept by `id` on the
 * device, in public.annotations.color (checked `^[a-z]{1,16}$` there,
 * docs/1.7-build/sql/annotation-color-and-journal.sql) and in a reader's
 * names. So the five ids of before stay, each with its new colour, and a
 * sixth is added: "yellow" is the first colour and is drawn red, "purple" is
 * violet. An older build on a reader's second phone still shows its own
 * colour for the same id, and nothing a reader marked is orphaned. `name` is
 * what a colour is called, and is the catalog's key
 * (bible.highlight.color.<name>).
 *
 * THEMES. Each colour carries both themes' values, and the element that wears
 * one carries both as custom properties (`highlightVars`). app/globals.css
 * picks between them by the reading mode ("Highlight colours"): Parchment
 * takes `light`, every other mode is dark and takes `dark`. So a theme switch
 * recolours every highlight in one paint, with nothing re-rendered.
 */

export type HighlightTheme = {
  /** The wash behind a highlighted verse or paragraph: translucent, laid line by line. */
  wash: string;
  /** A marked word's wash: opaque, a step stronger than `wash`. */
  mark: string;
  /** The solid disc and dot: the picker, Saved, the key under a chapter. */
  swatch: string;
};

export type HighlightHue = "red" | "rose" | "violet" | "blue" | "teal" | "green";

export type HighlightColor = {
  /** Storage key, never shown: the annotation's `color`, the names map's key. */
  id: string;
  /** What it is called: bible.highlight.color.<name>. */
  name: HighlightHue;
  /** OKLCH hue, in degrees: what the test checks the yellow arc against. */
  hue: number;
  dark: HighlightTheme;
  light: HighlightTheme;
};

/**
 * In the order they are offered, warm to cool. Computed in OKLCH and checked
 * by the test; adjust a value here and the test says whether it still holds.
 */
export const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  {
    id: "yellow",
    name: "red",
    hue: 22,
    dark: { wash: "rgba(168, 63, 56, 0.36)", mark: "#592b2a", swatch: "#dd7573" },
    light: { wash: "rgba(240, 167, 171, 0.72)", mark: "#e7a5a2", swatch: "#a43a3d" },
  },
  {
    id: "rose",
    name: "rose",
    hue: 344,
    dark: { wash: "rgba(184, 90, 141, 0.36)", mark: "#5e354d", swatch: "#e698c5" },
    light: { wash: "rgba(243, 182, 225, 0.72)", mark: "#e8b0d0", swatch: "#a14c81" },
  },
  {
    id: "purple",
    name: "violet",
    hue: 295,
    dark: { wash: "rgba(106, 79, 170, 0.36)", mark: "#3d325c", swatch: "#9e87e0" },
    light: { wash: "rgba(188, 179, 246, 0.72)", mark: "#bcb0e5", swatch: "#6a51a4" },
  },
  {
    id: "blue",
    name: "blue",
    hue: 248,
    dark: { wash: "rgba(62, 137, 201, 0.36)", mark: "#284968", swatch: "#89c0f5" },
    light: { wash: "rgba(175, 213, 254, 0.85)", mark: "#a1c9f0", swatch: "#3979b2" },
  },
  {
    id: "teal",
    name: "teal",
    hue: 195,
    dark: { wash: "rgba(0, 119, 114, 0.36)", mark: "#044444", swatch: "#49aaa9" },
    light: { wash: "rgba(122, 207, 213, 0.72)", mark: "#7dc8c8", swatch: "#017272" },
  },
  {
    id: "green",
    name: "green",
    hue: 148,
    dark: { wash: "rgba(72, 152, 79, 0.36)", mark: "#2c5032", swatch: "#88ce92" },
    light: { wash: "rgba(161, 222, 179, 0.72)", mark: "#a1d3a7", swatch: "#3b874a" },
  },
];

/** The first colour: what a highlight wears when nothing else was ever chosen. */
export const DEFAULT_HIGHLIGHT_COLOR = "yellow";

const BY_ID = new Map(HIGHLIGHT_COLORS.map((c) => [c.id, c]));

export function isHighlightColor(id: unknown): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

/** A colour by its id, or the first colour for an id this build does not know. */
export function colorById(id?: string | null): HighlightColor {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_HIGHLIGHT_COLOR)!;
}

/** The catalog key of a colour's own name ("Rose"). */
export function colorNameKey(id?: string | null): string {
  return `bible.highlight.color.${colorById(id).name}`;
}

/**
 * Both themes' values as custom properties, for an element with
 * `data-hl-color`: app/globals.css turns them into --hl-verse, --hl-word and
 * --hl-swatch for the reading mode in use.
 */
export function highlightVars(id?: string | null): Record<string, string> {
  const c = colorById(id);
  return {
    "--hl-verse-d": c.dark.wash,
    "--hl-verse-l": c.light.wash,
    "--hl-word-d": c.dark.mark,
    "--hl-word-l": c.light.mark,
    "--hl-swatch-d": c.dark.swatch,
    "--hl-swatch-l": c.light.swatch,
  };
}

// ── What each colour means to the reader ────────────────────────────────────

/**
 * A reader's names, by colour id. A colour with no name is simply absent:
 * names start empty, and the reader gives them (1.7.1). What a colour is
 * called (Rose, Blue) stands in where a name is wanted and none is given.
 */
export type HighlightNames = Readonly<Record<string, string>>;

/** The longest name kept: enough for "To learn by heart" in any language. */
export const NAME_MAX = 32;

/** One name as kept: trimmed, single-spaced, at most NAME_MAX characters. */
export function cleanName(v: unknown): string {
  if (typeof v !== "string") return "";
  const one = v.replace(/\s+/g, " ").trim();
  return Array.from(one).slice(0, NAME_MAX).join("").trim();
}

/**
 * Names from storage, from the account, from anywhere: only colours this
 * build has, only non-empty names, each cleaned. Anything else is dropped,
 * never shown.
 */
export function normalizeNames(raw: unknown): HighlightNames {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const c of HIGHLIGHT_COLORS) {
    const name = cleanName((raw as Record<string, unknown>)[c.id]);
    if (name) out[c.id] = name;
  }
  return out;
}

/** The names with one colour's name given, changed or (empty) taken away. */
export function withName(names: HighlightNames, id: string, name: string): HighlightNames {
  if (!isHighlightColor(id)) return names;
  const next: Record<string, string> = { ...names };
  const clean = cleanName(name);
  if (clean) next[id] = clean;
  else delete next[id];
  return next;
}

export function sameNames(a: HighlightNames, b: HighlightNames): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

/**
 * The account's copy, as user_metadata keeps it (lib/sync/highlightNames.ts):
 * the names and when they last changed. Null when there is none to read.
 */
export type AccountNames = { names: HighlightNames; at: string };

export function readAccountNames(raw: unknown): AccountNames | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.at !== "string" || !Number.isFinite(Date.parse(r.at))) return null;
  return { names: normalizeNames(r.names), at: r.at };
}

/**
 * Which copy wins when a device meets its account: the one changed last.
 * "take" writes the account's names here, "send" sends this device's, "keep"
 * does nothing. A device with no date on its names (none given, or names
 * written before 1.7.1 dated them) takes whatever the account has; an account
 * with nothing is sent this device's names, if it has any or ever had.
 */
export function reconcileNames(
  local: { names: HighlightNames; at: string | null },
  account: AccountNames | null,
): "take" | "send" | "keep" {
  if (!account) return local.at || Object.keys(local.names).length > 0 ? "send" : "keep";
  if (!local.at) return "take";
  const here = Date.parse(local.at);
  const there = Date.parse(account.at);
  if (!Number.isFinite(here)) return "take";
  if (there > here) return sameNames(local.names, account.names) ? "keep" : "take";
  if (here > there) return sameNames(local.names, account.names) ? "keep" : "send";
  return "keep";
}

/**
 * Ideas a reader can tap instead of typing, in the names sheet: the owner's
 * three ("Promises", "To pray over", "Questions") and three more in the same
 * voice. Each fits NAME_MAX in every catalog; the test reads them.
 */
export const NAME_IDEA_KEYS = [
  "bible.highlight.idea.promises",
  "bible.highlight.idea.prayOver",
  "bible.highlight.idea.questions",
  "bible.highlight.idea.comfort",
  "bible.highlight.idea.teaching",
  "bible.highlight.idea.byHeart",
] as const;

// What a profile can wear, and who may wear it.
//
// The owner's pick of r3-28 (notes 75 and 81, 2026-10-31): "Two for normal
// users, one for plus users". A free reader's profile is the sheet's way 2:
// black, white and four greys (Night, Smoke, Stone and Silver, GREYS below)
// for the banner and the theme, and no colour of their own. A Plus or Pro
// member's is way 1: the Church's colours for the banner and the theme
// (BANNER_COLORS, THEMES), any colour of their own, and the gold the rest of
// the app goes without: "gold is allowed for the community profiles by the
// way but only exclusive to plus members" (his word of the same night; the
// rest of the app is held to it by lib/ui/__tests__/noGold.test.ts).
//
// Free for every reader, then: a banner and a theme in the greys, a status
// line, a bio, a favourite verse, a patron saint. Plus and Pro, like Nitro: a
// banner or theme in any other colour, a banner picture, an avatar frame, a
// profile effect, a name colour, an animated banner, and a choice of which
// badges show (20261005000000_community_three.sql). Saved settings outlive a
// lapsed subscription and come back with it; nothing is deleted. Until then
// a saved colour shows as the grey nearest it (visibleCosmetics).
//
// The frames and effects are drawn in the app (components/community/profile),
// so the catalog is only ids. The database checks the shape of an id
// (20261001000000_profiles_badges.sql), this file decides which ids exist.

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { oklchOf, rgbOfHex } from "@/lib/ui/goldTone";

export const DECORATIONS = ["halo", "pearls", "laurel", "candle", "paschal", "stars"] as const;

/**
 * Frames that can only be put on in their season, like Discord's limited
 * decorations: the red eggs of Pascha, the star of the Nativity, the dove of
 * Theophany, the lilies of the Dormition. A reader who puts one on keeps it
 * until they change it; it simply cannot be chosen out of season.
 */
export const SEASONAL_DECORATIONS = ["pascha-eggs", "nativity-star", "theophany-dove", "dormition-lilies"] as const;
export type Decoration = (typeof DECORATIONS)[number] | (typeof SEASONAL_DECORATIONS)[number];

export const EFFECTS = ["incense", "gold-dust", "candlelight", "snowfall"] as const;
/** Effects with a season, on the same rule as the seasonal frames. */
export const SEASONAL_EFFECTS = ["paschal-embers", "theophany-drops"] as const;
export type Effect = (typeof EFFECTS)[number] | (typeof SEASONAL_EFFECTS)[number];

export function isDecoration(v: unknown): v is Decoration {
  return (
    typeof v === "string" &&
    ((DECORATIONS as readonly string[]).includes(v) || (SEASONAL_DECORATIONS as readonly string[]).includes(v))
  );
}

export function isEffect(v: unknown): v is Effect {
  return (
    typeof v === "string" &&
    ((EFFECTS as readonly string[]).includes(v) || (SEASONAL_EFFECTS as readonly string[]).includes(v))
  );
}

export type SeasonId = "pascha" | "nativity" | "theophany" | "dormition";

const SEASON_OF: Record<string, SeasonId> = {
  "pascha-eggs": "pascha",
  "paschal-embers": "pascha",
  "nativity-star": "nativity",
  "theophany-dove": "theophany",
  "theophany-drops": "theophany",
  "dormition-lilies": "dormition",
};

/** The season a cosmetic belongs to, or null for one that is always there. */
export function seasonOf(id: string | null | undefined): SeasonId | null {
  return (id && SEASON_OF[id]) || null;
}

const DAY = 86_400_000;

/**
 * A season's window in a given year, by the civil calendar, as UTC instants
 * [start, end). Pascha runs from the feast to its leave-taking, the eve of
 * the Ascension; the fixed feasts run from their forefeast or fast to their
 * leave-taking. The Nativity window opens in December and closes on the eve
 * of Theophany, so it straddles the new year: `year` is the year it opens.
 */
export function seasonWindow(season: SeasonId, year: number): [number, number] {
  switch (season) {
    case "pascha": {
      const p = orthodoxPascha(year);
      const start = Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate());
      return [start, start + 39 * DAY];
    }
    case "nativity":
      return [Date.UTC(year, 11, 1), Date.UTC(year + 1, 0, 6)];
    case "theophany":
      return [Date.UTC(year, 0, 6), Date.UTC(year, 0, 15)];
    case "dormition":
      return [Date.UTC(year, 7, 1), Date.UTC(year, 7, 24)];
  }
}

/** Whether a cosmetic can be put on now. Anything without a season always can. */
export function inSeason(id: string | null | undefined, now: Date = new Date()): boolean {
  const season = seasonOf(id);
  if (!season) return true;
  const t = now.getTime();
  const y = now.getUTCFullYear();
  return [y - 1, y].some((year) => {
    const [a, b] = seasonWindow(season, year);
    return t >= a && t < b;
  });
}

/** When a seasonal cosmetic next comes round (its season's start), as an ISO date. */
export function nextSeasonStart(id: string | null | undefined, now: Date = new Date()): string | null {
  const season = seasonOf(id);
  if (!season) return null;
  const t = now.getTime();
  const y = now.getUTCFullYear();
  for (const year of [y, y + 1]) {
    const [a] = seasonWindow(season, year);
    if (a > t) return new Date(a).toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Way 2, the free profile's colours: four greys, each a banner (`primary`, its
 * woven cross drawn over it) and a theme (`primary` at the top, `accent` at
 * the foot). The sheet's own values (r3-28-kit.js, GREYS).
 */
export const GREYS = [
  { id: "night", primary: "#232327", accent: "#0d0d10" },
  { id: "smoke", primary: "#3a3a40", accent: "#121215" },
  { id: "stone", primary: "#55555c", accent: "#18181b" },
  { id: "silver", primary: "#8c8c94", accent: "#1c1c20" },
] as const;
export type Grey = (typeof GREYS)[number];

/**
 * The Church's own colours for the banner, darkened to sit under white text.
 * Way 1: every one of them is Plus (bannerNeedsPlus), gold among them.
 */
export const BANNER_COLORS = [
  { id: "gold", hex: "#8f6f35" },
  { id: "paschal", hex: "#7d1d27" },
  { id: "theotokos", hex: "#1f3a6b" },
  { id: "pentecost", hex: "#2f5d3a" },
  { id: "lenten", hex: "#4b2c5e" },
  { id: "holyweek", hex: "#1b1b20" },
  { id: "theophany", hex: "#5b6e7a" },
] as const;

/** Two-colour profile themes in the Church's colours, for Plus: top colour then bottom. */
export const THEMES = [
  { id: "gilded", primary: "#8f6f35", accent: "#221a0f" },
  { id: "paschal", primary: "#7d1d27", accent: "#220a0d" },
  { id: "theotokos", primary: "#1f3a6b", accent: "#0b1424" },
  { id: "vespers", primary: "#4b2c5e", accent: "#120c18" },
  { id: "pentecost", primary: "#2f5d3a", accent: "#0e1a11" },
  { id: "theophany", primary: "#5b6e7a", accent: "#14191c" },
] as const;

const HEX = /^#[0-9a-f]{6}$/;

/** A colour as the database stores it (#rrggbb, lowercase), or null. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return HEX.test(s) ? s : null;
}

/** The grey a colour is, when it is one of the four. */
export function greyOf(v: unknown): Grey | null {
  const hex = normalizeHex(v);
  return GREYS.find((g) => g.primary === hex) ?? null;
}

/**
 * Whether a banner colour is a Plus cosmetic: every colour but the four
 * greys, the Church's and the reader's own alike, gold among them (see the
 * top of this file). None at all is free, and so is taking one off.
 */
export function bannerNeedsPlus(v: unknown): boolean {
  const hex = normalizeHex(v);
  return hex !== null && greyOf(hex) === null;
}

/**
 * Whether a theme is a Plus cosmetic: any pair but one of the four greys'.
 * No theme at all is free.
 */
export function themeNeedsPlus(primary: unknown, accent: unknown): boolean {
  const a = normalizeHex(primary);
  const b = normalizeHex(accent);
  if (a === null && b === null) return false;
  return !GREYS.some((g) => g.primary === a && g.accent === b);
}

/**
 * The grey a colour shows as on a free profile: the one nearest it in
 * lightness (OKLCH L, the lightness the eye reads), so a deep Paschal red
 * becomes Smoke and a pale blue Silver. Null when it is not a colour.
 */
export function nearestGrey(v: unknown): Grey | null {
  const rgb = rgbOfHex(normalizeHex(v));
  if (!rgb) return null;
  const L = oklchOf(rgb).L;
  let best: Grey = GREYS[0];
  let gap = Infinity;
  for (const g of GREYS) {
    const d = Math.abs(oklchOf(rgbOfHex(g.primary)!).L - L);
    if (d < gap) {
      gap = d;
      best = g;
    }
  }
  return best;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A theme colour may be no lighter than this: white text keeps 4.5:1 on it. */
export const THEME_MAX_LUMINANCE = 0.18;

/**
 * A theme colour as it is drawn: the reader's own choice, darkened just
 * enough that the white text on a themed profile stays readable. A theme can
 * be any hue, but the words on it have to be legible to everyone else, so a
 * pale pick is deepened rather than refused. Null when it is not a colour.
 */
export function readableThemeColor(v: unknown): string | null {
  return deepenTo(normalizeHex(v), THEME_MAX_LUMINANCE);
}

/**
 * A theme's foot (`accent`, the colour at the bottom of the card) may be no
 * lighter than this. Most of a themed card's words stand on its lower half,
 * where the theme deepens to its foot, and a themed card wears the dark
 * palette's ink with its faint lines at 75 percent (app/globals.css,
 * .theme-island): on a foot this dark they hold 4.5:1. On a foot at the top
 * colour's limit they did not, measured on a reader's own pale pick (a red,
 * a white, a yellow and a cyan, each deepened to 0.18): 2.87:1 to 4.29:1,
 * the full ink on the card's panels among them. Every house theme's foot and
 * every grey's is darker already (the lightest, the silver grey's, 0.0118),
 * so this deepens only a reader's own pale pick, and only its foot: the top
 * colour keeps THEME_MAX_LUMINANCE, and gilded and silver look as they did.
 */
export const THEME_ACCENT_MAX_LUMINANCE = 0.012;

/** A theme's foot as it is drawn: the reader's own colour, deepened just enough, keeping its hue. Null when it is not a colour. */
export function readableThemeAccent(v: unknown): string | null {
  return deepenTo(normalizeHex(v), THEME_ACCENT_MAX_LUMINANCE);
}

/** A colour no lighter than `limit`: scaled toward black in small steps, a handful of which reaches any colour. */
function deepenTo(hex: string | null, limit: number): string | null {
  if (!hex) return null;
  if (luminance(hex) <= limit) return hex;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let k = 0.95; k > 0; k -= 0.05) {
    const next = `#${rgb.map((c) => Math.round(c * k).toString(16).padStart(2, "0")).join("")}`;
    if (luminance(next) <= limit) return next;
  }
  return "#000000";
}

/**
 * Name colours, by id: a solid colour or a gilded gradient on the reader's
 * name, on their profile and beside every post and reply. Drawn by CSS
 * (app/globals.css, "Name colours"), each with a deeper ink for the light
 * Parchment palette, so a name stays legible on either ground. Ids only; the
 * colours live in the stylesheet.
 */
export const NAME_COLORS = ["gold", "rose", "sage", "sky", "violet", "ember", "pearl", "gilded", "dawn", "royal", "jordan"] as const;
export type NameColor = (typeof NAME_COLORS)[number];

export function isNameColor(v: unknown): v is NameColor {
  return typeof v === "string" && (NAME_COLORS as readonly string[]).includes(v);
}

/**
 * Animated banners: slow light moving across the banner, over its colour or
 * picture. CSS only (app/globals.css, "Animated banners"), transform and
 * opacity, still under the motion switch.
 */
export const BANNER_MOTIONS = ["aurora", "shimmer", "rays", "glow", "drift"] as const;
export type BannerMotion = (typeof BANNER_MOTIONS)[number];

export function isBannerMotion(v: unknown): v is BannerMotion {
  return typeof v === "string" && (BANNER_MOTIONS as readonly string[]).includes(v);
}

/** The profile fields only an active Plus or Pro subscription may set. */
export const PLUS_FIELDS = ["bannerUrl", "decoration", "effect", "nameColor", "bannerMotion", "hiddenBadges"] as const;
export type PlusField = (typeof PLUS_FIELDS)[number];

/**
 * The fields anyone may set to one of the four greys, and only Plus to any
 * other colour (bannerNeedsPlus, themeNeedsPlus).
 */
export const PLUS_UNLESS_GREY = ["bannerColor", "themePrimary", "themeAccent"] as const;

/** Saved cosmetics, as the editor and the public profile carry them. */
export type Cosmetics = {
  bannerColor: string | null;
  bannerUrl: string | null;
  themePrimary: string | null;
  themeAccent: string | null;
  decoration: string | null;
  effect: string | null;
  /** 20261005. Optional so a payload from an older server still types. */
  nameColor?: string | null;
  bannerMotion?: string | null;
};

/**
 * What the world sees of a reader's cosmetics: everything they saved while a
 * subscription runs. Without one, the free profile (way 2): the banner and the
 * theme in the grey nearest each saved colour, so a colour chosen while Plus
 * ran, or while the Church's colours were free, is kept and shows grey until
 * Plus returns, and nothing else. An id the catalog no longer carries is
 * dropped rather than drawn as nothing.
 */
export function visibleCosmetics(saved: Cosmetics, subscribed: boolean): Cosmetics {
  const bannerColor = normalizeHex(saved.bannerColor);
  const themePrimary = readableThemeColor(saved.themePrimary);
  const themeAccent = readableThemeColor(saved.themeAccent);
  if (!subscribed) {
    // A theme is a pair: half of one is not drawn, grey or not.
    const theme = themePrimary && themeAccent ? nearestGrey(saved.themePrimary) : null;
    return {
      bannerColor: nearestGrey(bannerColor)?.primary ?? null,
      bannerUrl: null,
      themePrimary: theme ? readableThemeColor(theme.primary) : null,
      themeAccent: theme ? theme.accent : null,
      decoration: null,
      effect: null,
      nameColor: null,
      bannerMotion: null,
    };
  }
  return {
    bannerColor,
    bannerUrl: saved.bannerUrl ?? null,
    // A theme is a pair: half of one is not drawn.
    themePrimary: themePrimary && themeAccent ? themePrimary : null,
    themeAccent: themePrimary && themeAccent ? themeAccent : null,
    decoration: isDecoration(saved.decoration) ? saved.decoration : null,
    effect: isEffect(saved.effect) ? saved.effect : null,
    nameColor: isNameColor(saved.nameColor) ? saved.nameColor : null,
    bannerMotion: isBannerMotion(saved.bannerMotion) ? saved.bannerMotion : null,
  };
}

/** The paid tier from live subscription dates; Pro covers Plus. */
export function subscriptionTier(
  row: { plus_until?: string | null; pro_until?: string | null } | null | undefined,
  now: Date = new Date(),
): "plus" | "pro" | null {
  if (!row) return null;
  const live = (ts: string | null | undefined) => {
    if (!ts) return false;
    const at = new Date(ts).getTime();
    return Number.isFinite(at) && at > now.getTime();
  };
  if (live(row.pro_until)) return "pro";
  if (live(row.plus_until)) return "plus";
  return null;
}

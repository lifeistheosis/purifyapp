// What a profile can wear, and who may wear it.
//
// Free for every reader: a banner colour (the liturgical colours below, or
// any colour), a status line, a bio, a favourite verse, a patron saint.
// Plus and Pro, like Nitro: a banner picture, a two-colour theme, an avatar
// frame and a profile effect. Saved settings outlive a lapsed subscription
// and simply stop showing until it returns; nothing is deleted.
//
// The frames and effects are drawn in the app (components/profile), so the
// catalog is only ids. The database checks the shape of an id
// (20261001_profiles_badges.sql), this file decides which ids exist.

export const DECORATIONS = ["halo", "pearls", "laurel", "candle", "paschal", "stars"] as const;
export type Decoration = (typeof DECORATIONS)[number];

export const EFFECTS = ["incense", "gold-dust", "candlelight", "snowfall"] as const;
export type Effect = (typeof EFFECTS)[number];

export function isDecoration(v: unknown): v is Decoration {
  return typeof v === "string" && (DECORATIONS as readonly string[]).includes(v);
}

export function isEffect(v: unknown): v is Effect {
  return typeof v === "string" && (EFFECTS as readonly string[]).includes(v);
}

/** The Church's own colours for the banner, darkened to sit under white text. */
export const BANNER_COLORS = [
  { id: "gold", hex: "#8f6f35" },
  { id: "paschal", hex: "#7d1d27" },
  { id: "theotokos", hex: "#1f3a6b" },
  { id: "pentecost", hex: "#2f5d3a" },
  { id: "lenten", hex: "#4b2c5e" },
  { id: "holyweek", hex: "#1b1b20" },
  { id: "theophany", hex: "#5b6e7a" },
] as const;

/** Two-colour profile themes for Plus, top colour then bottom. */
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
  const hex = normalizeHex(v);
  if (!hex) return null;
  if (luminance(hex) <= THEME_MAX_LUMINANCE) return hex;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Scale toward black in small steps; a handful of steps reaches any colour.
  for (let k = 0.95; k > 0; k -= 0.05) {
    const next = `#${rgb.map((c) => Math.round(c * k).toString(16).padStart(2, "0")).join("")}`;
    if (luminance(next) <= THEME_MAX_LUMINANCE) return next;
  }
  return "#000000";
}

/** The profile fields only an active Plus or Pro subscription may set. */
export const PLUS_FIELDS = ["bannerUrl", "themePrimary", "themeAccent", "decoration", "effect"] as const;
export type PlusField = (typeof PLUS_FIELDS)[number];

/** Saved cosmetics, as the editor and the public profile carry them. */
export type Cosmetics = {
  bannerColor: string | null;
  bannerUrl: string | null;
  themePrimary: string | null;
  themeAccent: string | null;
  decoration: string | null;
  effect: string | null;
};

/**
 * What the world sees of a reader's cosmetics: everything they saved while a
 * subscription runs, only the free banner colour when it does not. An id the
 * catalog no longer carries is dropped rather than drawn as nothing.
 */
export function visibleCosmetics(saved: Cosmetics, subscribed: boolean): Cosmetics {
  const bannerColor = normalizeHex(saved.bannerColor);
  if (!subscribed) {
    return { bannerColor, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null };
  }
  const themePrimary = readableThemeColor(saved.themePrimary);
  const themeAccent = readableThemeColor(saved.themeAccent);
  return {
    bannerColor,
    bannerUrl: saved.bannerUrl ?? null,
    // A theme is a pair: half of one is not drawn.
    themePrimary: themePrimary && themeAccent ? themePrimary : null,
    themeAccent: themePrimary && themeAccent ? themeAccent : null,
    decoration: isDecoration(saved.decoration) ? saved.decoration : null,
    effect: isEffect(saved.effect) ? saved.effect : null,
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

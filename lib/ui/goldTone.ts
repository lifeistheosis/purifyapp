/**
 * Gold, yellow and amber, measured (1.8, refinement 2).
 *
 * The owner's rule since 2026-10-28: no gold, yellow or amber in Purify, the
 * accent is a glowing white ("that yellow is vibe coded"). His word of
 * 2026-10-31 made one exception: "gold is allowed for the community profiles
 * by the way but only exclusive to plus members". So one question gets asked
 * in two places, and this file is the one answer to both:
 *
 *   - lib/ui/__tests__/noGold.test.ts walks the app and refuses any colour
 *     this calls gold outside the places allowed to wear it;
 *   - lib/profile/cosmetics.ts asks it whether a banner colour a reader picks
 *     is gold, and so a Plus cosmetic.
 *
 * Measured in OKLCH, where hue, colourfulness and lightness are each their
 * own number and a hue looks the same at every lightness:
 *
 *   - hue 60 to 115 degrees: amber at about 70, gold 80 to 90, yellow 95 to
 *     110. Orange (under 60: a flame, the Reddit mark, the ember name colour)
 *     and the greens (over 115) are not in it;
 *   - chroma at least 0.06, so the creams of the Parchment page (#f1e8d4 is
 *     0.028) and the warm greys stay out, while a muted antique gold such as
 *     #c9a25a (0.10) or the old dark accent #7c621d (0.09) is in;
 *   - lightness at least 0.36, so the deep browns Parchment shades its paper
 *     with (rgb(70 52 20), 0.34) are shadow and not gold. The brown to olive
 *     gradient the owner read as yellow on 2026-09-25 ends at #5a3f1c, 0.39,
 *     and is in.
 *
 * Pure and dependency-free, so a test and the server read the same numbers.
 */

export type Rgb = readonly [number, number, number];
export type Oklch = { L: number; C: number; h: number };

export const GOLD_HUE_MIN = 60;
export const GOLD_HUE_MAX = 115;
export const GOLD_MIN_CHROMA = 0.06;
export const GOLD_MIN_LIGHTNESS = 0.36;

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const toChannel = (v: number) => {
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
};

/** An sRGB colour (0 to 255 a channel) in OKLCH: L 0 to 1, C from 0, h in degrees. */
export function oklchOf([R, G, B]: Rgb): Oklch {
  const r = toLinear(R);
  const g = toLinear(G);
  const b = toLinear(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { L, C: Math.sqrt(a * a + bb * bb), h: h < 0 ? h + 360 : h };
}

/** An OKLCH colour back in sRGB, clipped to the screen's range. */
export function rgbOfOklch({ L, C, h }: Oklch): Rgb {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    toChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toChannel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toChannel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** #rgb, #rgba, #rrggbb or #rrggbbaa as sRGB (the alpha is left out), or null. */
export function rgbOfHex(hex: string | null | undefined): Rgb | null {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  const digits = m[1].length <= 4 ? [...m[1]].map((d) => d + d).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as unknown as Rgb;
}

/** Whether a colour reads as gold, yellow or amber (see the note at the top). */
export function isGoldTone({ L, C, h }: Oklch): boolean {
  return h >= GOLD_HUE_MIN && h <= GOLD_HUE_MAX && C >= GOLD_MIN_CHROMA && L >= GOLD_MIN_LIGHTNESS;
}

/** The same question of a hex colour. Anything that is not a colour is not gold. */
export function isGoldHex(hex: string | null | undefined): boolean {
  const rgb = rgbOfHex(hex);
  return rgb ? isGoldTone(oklchOf(rgb)) : false;
}

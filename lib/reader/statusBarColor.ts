// The colour of the strip behind the phone's status bar.
//
// On Android 14 and older the status bar is an opaque strip the app paints
// (components/native/NativeBridge.tsx). It kept the app's night colour on
// every palette but True black, so on a palette whose page is another colour
// the strip was the one thing on the screen that was not the page: a grey
// band over Candlelight's black and Night sky's, a neutral band over
// Mosaic's lapis and Damask's wine (docs/1.9-build/notes/themes-fable.md,
// section 24). On Android 15 and later, and on the iPhone, the page runs
// under the bar and nothing is painted.
//
// So the strip is the page colour of the palette the app is WEARING, for
// every dark palette. The page says its own colour (--color-night), which
// each palette declares as a plain six-digit colour, the form the status bar
// takes; lib/reader/__tests__/statusBarPalette.test.ts holds every palette
// of the registry to that.
//
// Light, and a light look over it, keep the night strip Light has always
// had. The bar's marks are drawn light on every palette, and a paper strip
// would change how Light itself looks, which nobody asked for.
//
// Pure, so it can be tested without a phone.

/** The app's night colour: Dark's page, and the strip over Light. */
export const BAR_NIGHT = "#101013";

const HEX = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;

/**
 * @param mode  the root's data-reading-mode ("parchment" under Light and under a light look), or null
 * @param page  the root's --color-night as the browser gives it: "#0d1c40", or "rgb(13, 28, 64)"
 * @returns     the strip's colour, as "#rrggbb"
 */
export function statusBarColor(mode: string | null, page: string | null | undefined): string {
  if (mode === "parchment") return BAR_NIGHT;
  const value = (page ?? "").trim();
  const hex = HEX.exec(value);
  if (hex) return `#${hex[1].toLowerCase()}`;
  const rgb = RGB.exec(value);
  if (rgb) {
    const parts = rgb.slice(1, 4).map(Number);
    if (parts.every((n) => n <= 255)) return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  return BAR_NIGHT;
}

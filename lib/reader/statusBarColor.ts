// The phone's status bar: the colour of the strip behind it, and the colour
// of the clock and battery marks drawn on it.
//
// THE STRIP. On Android 14 and older the status bar is an opaque strip the
// app paints (components/native/statusBar.ts). It kept the app's night colour
// on every palette but True black, so on a palette whose page is another
// colour the strip was the one thing on the screen that was not the page: a
// grey band over Candlelight's black, a neutral band over Mosaic's lapis, a
// dark band over Light's paper (docs/1.9-build/notes/themes-fable.md,
// sections 24, 32 and 34). It is the page colour of the palette the app is
// WEARING now, on every palette. The page says its own colour
// (--color-night), which each palette declares as a plain six-digit colour,
// the form the status bar takes. On Android 15 and later, and on the iPhone,
// the page itself lies under the bar and nothing is painted.
//
// THE MARKS. They were drawn light on every palette. The owner's word,
// 2026-11-10 ("match light"): Light and the light looks have their own paper
// up there, with dark marks, so the top reads as one page. The arbiter's
// call the same evening made it one rule for every phone: the marks suit
// what is behind them. Behind them is one of three things:
//
//   - the strip the app painted (Android 14 and older): the page colour;
//   - the page itself (the iPhone, and Android 15 and later with a WebView
//     of 140 or later): whatever the page shows at that place, which is the
//     paper on most screens and the night on a surface that is dark on every
//     palette (the launch frame, the tour, Now playing: groundOf below);
//   - the window's own night colour (Android 15 and later with an older
//     WebView, where the page is set below the bar): light marks, always.
//
// And wherever the app cannot tell what is behind them, the marks are light,
// as they have always been, so no phone ends up worse than it was.
//
// Everything here is pure, so it is tested without a phone
// (lib/reader/__tests__/statusBarPalette.test.ts). Nothing here can show a
// phone's status bar: only a phone does.

/** The app's night colour: Dark's page, the window behind the web view, and the strip when a page's colour cannot be read. */
export const BAR_NIGHT = "#101013";

const HEX = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

/**
 * A plain, opaque colour as "#rrggbb", from the forms a stylesheet, a browser
 * or the phone writes it in ("#0D1C40", "rgb(13, 28, 64)", "rgb(13 28 64)").
 * Null for anything else: a variable, another colour space, a colour that is
 * partly clear.
 */
export function plainColor(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  const hex = HEX.exec(text);
  if (hex) return `#${hex[1].toLowerCase()}`;
  const rgb = RGB.exec(text);
  if (!rgb) return null;
  const parts = rgb.slice(1, 4).map(Number);
  if (!parts.every((n) => n <= 255)) return null;
  const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
  if (!(alpha >= 0.999)) return null;
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The strip's colour: the page colour of the palette worn.
 *
 * @param page  the root's --color-night as the browser gives it: "#0d1c40", or "rgb(13, 28, 64)"
 * @returns     "#rrggbb"; the night colour for anything that cannot be read, never a broken colour
 */
export function statusBarColor(page: string | null | undefined): string {
  return plainColor(page) ?? BAR_NIGHT;
}

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
/** The relative luminance of "#rrggbb", as WCAG reckons it. */
export function luminanceOf(hex: string): number {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(n[0]) + 0.7152 * channel(n[1]) + 0.0722 * channel(n[2]);
}

export type BarMarks = "light" | "dark";

/**
 * The marks that read on a ground: dark where dark marks stand out more than
 * light ones would, light everywhere else, and light when the ground is not
 * known.
 */
export function statusBarMarks(behind: string | null | undefined): BarMarks {
  const ground = plainColor(behind);
  if (!ground) return "light";
  const l = luminanceOf(ground);
  // Black marks on it against white marks on it, each as a contrast ratio.
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? "dark" : "light";
}

/** Where the marks stand: on the strip the app painted, on the page itself, on the window behind the web view, or the app cannot tell. */
export type BarPlace = "strip" | "page" | "window" | "unknown";

export type BarFacts = {
  /** The phone: an Android phone says what colour its strip is, an iPhone has no strip to say. */
  platform: "android" | "ios";
  /** The colour the app asked the strip to be (statusBarColor). */
  asked: string;
  /** The strip's colour as the phone gives it back after the asking. */
  strip?: string | null;
  /** The room the page is given under the status bar, in px: more than 0 when the page itself lies under the bar. */
  inset: number;
};

/**
 * Where the status bar's marks stand on this phone.
 *
 * An Android phone that gives back the colour it was asked for has taken it:
 * the strip is the app's own, opaque, over whatever the page draws (Android
 * 14 and older). A phone whose strip is not the app's to paint either lays
 * the page under the bar (it gives the page room there) or sets the page
 * below it, where the window's own night colour shows. An Android phone that
 * does not say what its strip is leaves nothing known.
 */
export function barPlace(facts: BarFacts): BarPlace {
  if (facts.platform === "android") {
    const strip = plainColor(facts.strip);
    if (!strip) return "unknown";
    if (strip === plainColor(facts.asked)) return "strip";
  }
  return facts.inset > 0 ? "page" : "window";
}

/**
 * What lies behind the marks, as "#rrggbb", or null when the app cannot tell
 * (and the marks then stay light).
 *
 * @param asked  the colour the strip was asked to be
 * @param under  what the page shows at the bar's place (groundOf), or null
 */
export function behindTheBar(place: BarPlace, asked: string, under: string | null): string | null {
  if (place === "strip") return plainColor(asked);
  if (place === "page") return plainColor(under);
  if (place === "window") return BAR_NIGHT;
  return null;
}

/** One thing drawn at the bar's place, as the page stacks them. */
export type BarLayer = {
  /** It is, or is inside, a surface that is dark on every palette (.dark-island). */
  island?: boolean;
  /** A picture, a video or a drawing: it has no one colour. */
  picture?: boolean;
  /** Its background colour: red, green, blue (0 to 255) and how solid it is (0 to 1). */
  color?: readonly [number, number, number, number] | null;
  /** The colours of its background's gradient, the same way; an empty list for none. */
  gradient?: readonly (readonly [number, number, number, number])[];
  /** Its own opacity times that of every box it is in. */
  opacity?: number;
};

const SOLID = 0.98;
const CLEAR = 0.02;
/** How solid a dark colour in a gradient has to be before it could darken what is behind the marks. */
const FAINT = 0.12;
/** Under this a colour is dark enough to matter (mid grey is 0.21). */
const DARKISH = 0.4;

/**
 * The colour a stack of layers shows, topmost first, as "#rrggbb"; null when
 * it cannot be told.
 *
 * It answers only what it can stand behind. A surface that is dark on every
 * palette is the night, whatever it draws. A picture has no one colour, and
 * neither has a gradient with something dark in it: null. Plain colours that
 * are partly clear are laid over the first solid one beneath them. A stack
 * with nothing solid in it is null.
 */
export function groundOf(layers: readonly BarLayer[]): string | null {
  const veils: (readonly [number, number, number, number])[] = [];
  for (const layer of layers) {
    const opacity = layer.opacity ?? 1;
    if (opacity < CLEAR) continue;
    if (layer.island) return BAR_NIGHT;
    if (layer.picture) return null;
    for (const [r, g, b, a] of layer.gradient ?? []) {
      const hex = `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
      if (a * opacity > FAINT && luminanceOf(hex) < DARKISH) return null;
    }
    if (!layer.color) continue;
    const [r, g, b, a] = layer.color;
    const solid = a * opacity;
    if (solid < CLEAR) continue;
    if (solid < SOLID) {
      veils.push([r, g, b, solid]);
      continue;
    }
    // The first solid colour, with every veil above it laid over it, nearest first.
    let seen: [number, number, number] = [r, g, b];
    for (let i = veils.length - 1; i >= 0; i--) {
      const [vr, vg, vb, va] = veils[i];
      seen = [vr * va + seen[0] * (1 - va), vg * va + seen[1] * (1 - va), vb * va + seen[2] * (1 - va)];
    }
    return `#${seen.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

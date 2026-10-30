/**
 * The reading place (1.8): where a page puts what it takes the reader to.
 *
 * The owner, on build 81, with a photo of Colossians 4 read aloud whose
 * verse 7, the one being read, sat low, just over the chapter pill, the mini
 * player and the tab bar: "the automatic, like going to the verse, it kind of
 * starts like at the bottom rather than the middle of the user's screen. So
 * can you make it a standard so that it goes to the middle of the user's
 * screen rather than popping up too high or too low?"
 *
 * Each page had its own middle, and none of them looked at what covers the
 * screen. Read aloud and a link to a verse centred the verse in the WINDOW,
 * whose foot, about a quarter of it, is the pill, the mini player and the tab
 * bar, and read aloud let the verse sink to 72% of the window before moving
 * it. Begin and Your rule today stood the prayer at the very top, under the
 * bar. The line being prayed was lit two fifths down the window.
 *
 * The standard:
 *  - The band: the part of the screen the page is seen through. Below what
 *    stands at the top (the tabs' bar, a page's bar, the apps' back bar, the
 *    Bible's round buttons, the website's header) and above what stands at
 *    the foot (the tab bar, the mini player, the Bible's chapter pill, today's
 *    readings bar, a verse's tools while they are open). Each of those
 *    carries `data-screen-edge="top"` or `"bottom"`, and the ones on screen
 *    are measured, so a bar that has stepped away (the Bible's, while the
 *    reader reads on) frees its room. The phone's own edges, the status bar
 *    and the home indicator, always count. A page that marks nothing is read
 *    from the CSS variables the foot's pieces set (app/globals.css).
 *  - The reading place: two fifths of the way down the band, where the
 *    prayer pages light the line being prayed
 *    (components/prayers/service/useLitLine.ts).
 *  - Going somewhere stands its top at the reading place. A short block (a
 *    verse of a few lines, under a fifth of the band) has its middle at the
 *    band's middle instead, so it reads as centred. One too tall for the room
 *    under the reading place starts a tenth of the way down, so as much of it
 *    shows as can.
 *  - Smooth, unless Purify's motion setting is off.
 *
 * The arithmetic is pure and tested (lib/ui/__tests__/readingPlace.test.ts);
 * the measuring is apart from it, in readScreen().
 */

import { prefersReducedMotion } from "./motion";

/** A stretch of the screen, in CSS pixels from the top of the window. */
export type Span = { top: number; bottom: number };

/** How a block is set at the reading place. */
export type Align =
  /** A short block centred in the band, a taller one's top at the reading place. */
  | "auto"
  /** Its top at the reading place whatever its height: a line to be lit there. */
  | "top";

/** The reading place: this far down the band. */
export const READING_PLACE = 0.4;
/** A block shorter than this share of the band is centred in it. */
export const SHORT_BLOCK = 0.2;
/**
 * The middle of the band, where read aloud leaves the verse being read alone:
 * from a tenth of the way down (ZONE_TOP) to seven tenths (ZONE_FOOT). A
 * verse whose top rises above the one, or whose foot sinks below the other,
 * is moved back to the reading place.
 */
export const ZONE_TOP = 0.1;
export const ZONE_FOOT = 0.7;
/**
 * A block set by its top stands this far above the reading place, so the line
 * the prayer pages light there is that one even when the scroll is rounded to
 * the screen's own pixels.
 */
export const HAIR_PX = 2;
/** Less room than this between the bars, and the band is the screen between the phone's edges. */
export const MIN_BAND_PX = 96;

/** The attribute that marks what stands at an edge of the screen: "top" or "bottom". */
export const SCREEN_EDGE_ATTR = "data-screen-edge";

/** What the screen shows, as measured: all the arithmetic needs. */
export type Screen = {
  /** The window's height. */
  height: number;
  /** The phone's own edges: the status bar or notch, and the home indicator. */
  insets: Span;
  /** What is on screen of the marked pieces, by edge; null when the page marks none. */
  edges: { top: Span[]; bottom: Span[] } | null;
  /** The foot's pieces by the CSS variables (the tab bar, the mini player, today's readings), for a page that marks none. */
  cssFoot: number;
};

/** The point this share of the way down the band. */
export function placeIn(band: Span, share: number = READING_PLACE): number {
  return band.top + (band.bottom - band.top) * share;
}

/**
 * The band: under the lowest piece standing at the top, over the highest
 * piece standing at the foot, and never past the phone's own edges.
 */
export function bandOf(screen: Screen): Span {
  const { height, edges } = screen;
  const insetTop = Math.max(0, screen.insets.top);
  const insetBottom = Math.max(0, screen.insets.bottom);
  let top = insetTop;
  let bottom = height - insetBottom - (edges ? 0 : Math.max(0, screen.cssFoot));
  if (edges) {
    // A piece counts at its own edge only: a top bar in the upper half of
    // the screen, a foot piece in the lower.
    for (const r of edges.top) {
      if (r.bottom > 0 && r.top < height / 2) top = Math.max(top, Math.min(r.bottom, height));
    }
    for (const r of edges.bottom) {
      if (r.top < height && r.bottom > height / 2) bottom = Math.min(bottom, Math.max(r.top, 0));
    }
  }
  if (bottom - top >= MIN_BAND_PX) return { top, bottom };
  // The bars over nearly all of it (a phone on its side with each one up):
  // the screen between the phone's edges, or the whole of it.
  if (height - insetBottom - insetTop >= MIN_BAND_PX) return { top: insetTop, bottom: height - insetBottom };
  return { top: 0, bottom: height };
}

/**
 * How far the page must scroll (added to the window's scrollY) for the block
 * to stand at the reading place of the band.
 */
export function shiftToReadingPlace(band: Span, block: Span, align: Align = "auto"): number {
  const room = band.bottom - band.top;
  const size = block.bottom - block.top;
  if (align === "auto") {
    // Short: its middle at the band's middle, so it reads as centred.
    if (size < room * SHORT_BLOCK) return (block.top + block.bottom) / 2 - placeIn(band, 0.5);
    // Taller than the room under the reading place: it starts higher.
    if (size > room * (1 - READING_PLACE)) return block.top - placeIn(band, ZONE_TOP);
  }
  return block.top - (placeIn(band) - HAIR_PX);
}

/** Whether the block stands in the band's middle, where read aloud leaves it alone. */
export function inReadingZone(band: Span, block: Span): boolean {
  return block.top >= placeIn(band, ZONE_TOP) && block.bottom <= placeIn(band, ZONE_FOOT);
}

/** One span around them all: a verse that runs over several lines, or a range of verses. */
export function spanOf(rects: readonly Span[]): Span | null {
  let top = Infinity;
  let bottom = -Infinity;
  for (const r of rects) {
    if (r.bottom <= r.top) continue;
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
  }
  return top < bottom ? { top, bottom } : null;
}

// ---------------------------------------------------------------------------
// Measuring. Called from effects and handlers only, never while rendering.

let insetsFor: { width: number; insets: Span } | null = null;

/**
 * The phone's own edges, resolved by the browser from env(): read through a
 * probe, once for each width of the window (a turned phone has new edges).
 */
function phoneInsets(): Span {
  const width = window.innerWidth;
  if (insetsFor && insetsFor.width === width) return insetsFor.insets;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    "padding-top:var(--inset-top, env(safe-area-inset-top, 0px));" +
    "padding-bottom:var(--inset-bottom, env(safe-area-inset-bottom, 0px));";
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  insetsFor = { width, insets };
  return insets;
}

/** The foot's pieces by the variables app/globals.css keeps for them. */
function cssFoot(): number {
  const style = window.getComputedStyle(document.documentElement);
  const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
  return px("--tab-bar-h") + px("--now-playing-h") + px("--readings-flow-h");
}

/** On screen: drawn, and not faded or stepped away (the Bible's bars while the reader reads on). */
function standing(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && parseFloat(style.opacity) > 0;
}

/** Measures what the band is made of, now. */
export function readScreen(): Screen {
  const height = window.innerHeight;
  const insets = phoneInsets();
  const marked = document.querySelectorAll(`[${SCREEN_EDGE_ATTR}]`);
  if (marked.length === 0) return { height, insets, edges: null, cssFoot: cssFoot() };
  const edges = { top: [] as Span[], bottom: [] as Span[] };
  marked.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || !standing(el)) return;
    (el.getAttribute(SCREEN_EDGE_ATTR) === "top" ? edges.top : edges.bottom).push({ top: r.top, bottom: r.bottom });
  });
  return { height, insets, edges, cssFoot: 0 };
}

/** The part of the screen the reader can see the page through, now. */
export function visibleBand(): Span {
  if (typeof window === "undefined") return { top: 0, bottom: 0 };
  return bandOf(readScreen());
}

/**
 * Scrolls the page so what it is given stands at the reading place (several
 * elements stand there together: a range of verses). Smooth unless asked
 * otherwise or Purify's motion setting is off. `band` is one measured a
 * moment ago, to save measuring twice. Answers where the page is going, or
 * null when there is nothing to go to.
 */
export function goToReadingPlace(
  target: Element | readonly Element[],
  { smooth = true, align = "auto", band }: { smooth?: boolean; align?: Align; band?: Span } = {},
): number | null {
  if (typeof window === "undefined") return null;
  const list: readonly Element[] = Array.isArray(target) ? target : [target as Element];
  const block = spanOf(list.map((el) => el.getBoundingClientRect()));
  if (!block) return null;
  const shift = shiftToReadingPlace(band ?? visibleBand(), block, align);
  const end = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.min(end, Math.max(0, window.scrollY + shift));
  window.scrollTo({ top, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
  return top;
}

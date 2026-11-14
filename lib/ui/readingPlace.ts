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
 *  - Read back the same way (the owner's note 68): the block the reader is
 *    at is the one over the band's middle (KEPT_AT, blockAt), the line every
 *    block set here covers, so the Bible keeps the verse it lands on.
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

/**
 * The line a page reads which block the reader is at (1.8, the owner's note
 * 68: the Bible keeps the verse a reader stopped at). The middle of the band,
 * because every way shiftToReadingPlace stands a block leaves it over this
 * line: a short one centred on it, a longer one from the reading place above
 * it to below it, a tall one from a tenth of the way down to past seven
 * tenths. So a place read here and gone back to is read here again as the
 * same block: a return never walks.
 */
export const KEPT_AT = 0.5;

/**
 * Which of a run of blocks, in the page's order, the reader is at: the last
 * one whose top is at or above the line (one that starts lower has not been
 * reached). The first when none is, the reader being above them all.
 * `topOf` is asked for as few tops as a halving search needs, so a page can
 * hand it a measure of its own.
 */
export function blockAt(count: number, topOf: (i: number) => number, line: number): number {
  let lo = 0;
  let hi = count - 1;
  let at = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (topOf(mid) <= line) {
      at = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return at;
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

/**
 * Measures what the band is made of, now. `around` leaves out the bar that
 * holds it (or that it holds): the update tour lights Today's magnifier in
 * Today's own bar, and the mini player is a piece at the foot itself.
 */
export function readScreen(around?: Element | null): Screen {
  const height = window.innerHeight;
  const insets = phoneInsets();
  const marked = document.querySelectorAll(`[${SCREEN_EDGE_ATTR}]`);
  if (marked.length === 0) return { height, insets, edges: null, cssFoot: cssFoot() };
  const edges = { top: [] as Span[], bottom: [] as Span[] };
  marked.forEach((el) => {
    if (around && (el.contains(around) || around.contains(el))) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || !standing(el)) return;
    (el.getAttribute(SCREEN_EDGE_ATTR) === "top" ? edges.top : edges.bottom).push({ top: r.top, bottom: r.bottom });
  });
  return { height, insets, edges, cssFoot: 0 };
}

/** The part of the screen the reader can see the page through, now (`around`: as readScreen). */
export function visibleBand(around?: Element | null): Span {
  if (typeof window === "undefined") return { top: 0, bottom: 0 };
  return bandOf(readScreen(around));
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

/**
 * How many screens away a place may be and still be glided to. Further, no
 * raster keeps up: Morals on Job, opened at Book 5's paragraph 131, glided
 * through some two hours of text in about a second, and the screen stood
 * empty for 265 to 415ms of it (the gate's frames, Updates 37 and 38). A
 * place further than this is reached as a pager's Next is, the screen as it
 * stood cross-fading into the place (lib/ui/inPageMove.ts, movePage).
 */
export const GLIDE_SCREENS = 2;

/** Whether what is given stands further from the screen than a glide can carry the page (GLIDE_SCREENS). */
export function beyondGlide(target: Element, screens: number = GLIDE_SCREENS): boolean {
  if (typeof window === "undefined") return false;
  return Math.abs(target.getBoundingClientRect().top) > screens * window.innerHeight;
}

/**
 * How long a place gone to is held while the page settles under it (build 90
 * note 9). The page can still change after it has gone somewhere: a Bible
 * chapter is drawn in English first and its Greek, when the reader keeps it
 * on, is read a moment later and set beside every verse, which about doubles
 * the height above the verse landed on. Held for this long at most; the
 * reader's own hand lets go at once.
 */
export const HOLD_MS = 8000;

/**
 * What a held place does when the page has changed under it: let go (the
 * reader moved the page, or the hold has run its time), keep still (it
 * stands where it was set, to a hair), or move the page by this much.
 */
export function heldPlace(
  { elapsedMs, readerMoved, shift }: { elapsedMs: number; readerMoved: boolean; shift: number },
  holdMs: number = HOLD_MS,
): "let go" | "still" | number {
  if (readerMoved || elapsedMs > holdMs) return "let go";
  if (Math.abs(shift) <= HAIR_PX) return "still";
  return shift;
}

/** What a reader's hand does to a page: any of these lets a held place go. */
export const HAND_EVENTS = ["pointerdown", "touchstart", "wheel", "keydown"] as const;

/**
 * Holds what was just gone to at the reading place while the page settles
 * (build 90 note 9, the owner on build 90: a saved verse of Matthew 1 opened
 * at verse 9 with his Greek on). Whenever the page or the block holding the
 * target changes size, the target is set back at the reading place, at once
 * and not smoothly, so it does not seem to move at all while the rest of the
 * page moves around it. Nothing is moved unless the page changed, so it costs
 * nothing while the page is still; and the reader's first touch, wheel or key
 * lets it go, so a hold never fights a hand. Answers the way to let go early.
 */
export function holdAtReadingPlace(
  target: Element | readonly Element[],
  { align = "auto", holdMs = HOLD_MS }: { align?: Align; holdMs?: number } = {},
): () => void {
  if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return () => {};
  const list: readonly Element[] = Array.isArray(target) ? target : [target as Element];
  const started = performance.now();
  const heights = new Map<Element, number>();
  let readerMoved = false;
  let frame = 0;
  let done = false;

  const setBack = () => {
    frame = 0;
    if (done) return;
    const block = spanOf(list.map((el) => el.getBoundingClientRect()));
    if (!block) return;
    const move = heldPlace({ elapsedMs: performance.now() - started, readerMoved, shift: shiftToReadingPlace(visibleBand(), block, align) }, holdMs);
    if (move === "let go") {
      letGo();
      return;
    }
    if (move === "still") return;
    const end = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(end, Math.max(0, window.scrollY + move)), behavior: "auto" });
  };
  // The first report of each element is its size as it stands, not a change.
  const observer = new ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
      const height = entry.contentRect.height;
      const was = heights.get(entry.target);
      heights.set(entry.target, height);
      if (was !== undefined && Math.abs(was - height) > 0.5) changed = true;
    }
    if (changed && !frame) frame = requestAnimationFrame(setBack);
  });
  const hand = () => {
    readerMoved = true;
    letGo();
  };
  const timer = setTimeout(() => letGo(), holdMs);
  function letGo() {
    if (done) return;
    done = true;
    observer.disconnect();
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    for (const type of HAND_EVENTS) window.removeEventListener(type, hand, true);
  }

  observer.observe(document.body);
  const holder = list[0]?.closest("article");
  if (holder) observer.observe(holder);
  for (const type of HAND_EVENTS) window.addEventListener(type, hand, { capture: true, passive: true });
  return letGo;
}

// The tour on the page (1.8; the engine mended for the owner's note 51 of
// build 85, "laggy and buggy ... certain parts where it doesn't even show"):
// finding a stop's element, when to give up on it, where the story's foot
// stands, how far the page moves, and the lit part of the element. The
// geometry and the rules are pure and tested
// (lib/whatsNew/__tests__/tourDom.test.ts); the measuring is apart from them,
// and called from effects, observers and handlers only, never while rendering.
//
// What his photo of build 85 showed (r18/build85-notes/51): the atlas door is
// taller than the room left between the bars, and the ring wrapped all of it,
// so the ring and part of the door ran on under the tab bar. The rule now:
//   - THE STAGE. What is lit stays between the bars (lib/ui/readingPlace.ts,
//     the band; the bar that holds the element itself is left out, so Today's
//     magnifier can be lit in Today's bar) and clear of the story's foot, the
//     words at the edge of the screen. The words never cover what they point
//     at.
//   - THE MOVE. The page brings the element to the stage's reading place, the
//     house standard; one too tall for it starts near the stage's top, and
//     only the part on the stage is lit. While the tour shows a stop the page
//     has the foot's height of room after its end (app/globals.css,
//     html[data-tour-room]), so the last thing on a page can rise above the
//     words as well. An element held in place (fixed or sticky) does not
//     move: the words go to the other edge when they would cover it.
//   - THE WAIT. A stop waits for its page, not for a clock: while the page is
//     still arriving (a skeleton, its parts drawn one after another) it waits;
//     only a page that has settled without the element, or one that never
//     settles, passes the stop over.

import { bandOf, inReadingZone, readScreen, shiftToReadingPlace, type Span } from "@/lib/ui/readingPlace";
import { isRouteExiting } from "@/lib/ui/routeTransition";

import { TOUR_ATTR } from "./tour";

/** A box on the screen, in CSS pixels from the window's top left. */
export type Box = { top: number; left: number; width: number; height: number };

/** Where the story's foot stands: at the foot of the screen, or at its top. */
export type FootPlace = "top" | "bottom";

/** The stage: where a lit element may show. */
export type Stage = { top: number; bottom: number; left: number; right: number };

/** Between the stage and the foot's words, and the stage's sides from the window's. */
export const STAGE_GAP = 12;
export const STAGE_EDGE = 4;
/** Less than this of an element on the stage, and nothing of it is lit. */
export const MIN_LIT_PX = 8;

/** "/theology/" and "/theology" are one page; the app's export writes the first. */
export function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0] || "/";
  return bare.length > 1 ? bare.replace(/\/+$/, "") || "/" : bare;
}

export function samePage(pathname: string | null | undefined, route: string): boolean {
  return normalizePath(pathname ?? "/") === normalizePath(route);
}

// ---------------------------------------------------------------------------
// The stage.

/**
 * The story's foot at one edge of the screen: `height` all of it, from the
 * screen's edge (the phone's own edge is inside it) to where its night begins
 * to rise.
 */
export function footBox(place: FootPlace, height: number, view: { height: number }): Span {
  const h = Math.max(0, Math.min(height, view.height));
  return place === "bottom" ? { top: view.height - h, bottom: view.height } : { top: 0, bottom: h };
}

/** The room between the bars (`band`), clear of the foot's words at their edge, inside the window. */
export function stageOf(band: Span, foot: Span | null, place: FootPlace, view: { width: number; height: number }): Stage {
  let top = Math.max(0, band.top);
  let bottom = Math.min(view.height, band.bottom);
  if (foot) {
    if (place === "bottom") bottom = Math.min(bottom, foot.top - STAGE_GAP);
    else top = Math.max(top, foot.bottom + STAGE_GAP);
  }
  return { top, bottom: Math.max(top, bottom), left: STAGE_EDGE, right: view.width - STAGE_EDGE };
}

/** The part of a box on the stage: what is lit. Null when too little of it is there. */
export function litBox(box: Box, stage: Stage): Box | null {
  const top = Math.max(box.top, stage.top);
  const bottom = Math.min(box.top + box.height, stage.bottom);
  const left = Math.max(box.left, stage.left);
  const right = Math.min(box.left + box.width, stage.right);
  if (bottom - top < MIN_LIT_PX || right - left < MIN_LIT_PX) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/** Whether two boxes are the same to the eye (half a pixel). */
export function sameBox(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export type PlanInput = {
  /** The element, as it stands now. */
  box: Box;
  /** Held in place (fixed or sticky): the page's scroll does not move it. */
  pinned: boolean;
  view: { width: number; height: number };
  /** Between the bars, the element's own bar left out. */
  band: Span;
  /** The phone's own edges: nothing is lit under them. */
  insets: { top: number; bottom: number };
  /** The story's foot: its height, the phone's own edge inside it. */
  foot: { height: number };
  scrollY: number;
  /** How far the page can scroll, the room after its end included. */
  maxScrollY: number;
};

export type Plan = {
  /** Where the words stand. */
  place: FootPlace;
  /** Where the page goes (the window's scrollY). */
  scrollTo: number;
  /** What is lit once it is there: the element held to the stage, or null when none of it can be. */
  lit: Box | null;
  stage: Stage;
};

/**
 * A stop, planned before anything moves: where the words stand, where the
 * page goes, and what is lit there. The words stand at the foot, near the
 * thumb, as the story draws them, unless the element shows better with them
 * at the top (one held low on the screen: a pill at the foot). The page moves
 * only when the element is not already in the stage's middle (read aloud's
 * zone, lib/ui/readingPlace.ts), and then to the stage's reading place, a
 * tall one starting near its top so that as much of it shows as can.
 */
export function planStop(p: PlanInput): Plan {
  // The band never reaches under the phone's own edges.
  const band = {
    top: Math.max(p.band.top, Math.max(0, p.insets.top)),
    bottom: Math.min(p.band.bottom, p.view.height - Math.max(0, p.insets.bottom)),
  };
  const choose = (place: FootPlace) => {
    const stage = stageOf(band, footBox(place, p.foot.height, p.view), place, p.view);
    let scrollTo = p.scrollY;
    const block = { top: p.box.top, bottom: p.box.top + p.box.height };
    if (!p.pinned && !inReadingZone(stage, block)) {
      const shift = shiftToReadingPlace(stage, block);
      scrollTo = Math.min(Math.max(0, p.scrollY + shift), Math.max(0, p.maxScrollY));
    }
    const moved = { ...p.box, top: p.box.top - (scrollTo - p.scrollY) };
    const lit = litBox(moved, stage);
    return { place, scrollTo, lit, stage, shown: lit ? lit.width * lit.height : 0 };
  };
  const bottom = choose("bottom");
  const top = choose("top");
  const pick = top.shown > bottom.shown + 1 ? top : bottom;
  return { place: pick.place, scrollTo: pick.scrollTo, lit: pick.lit, stage: pick.stage };
}

/** A lit element that moved further than this from its light is planned again, not just followed. */
export const REPLAN_PX = 24;

/**
 * What takes a tap round the lit box and does nothing with it, so the page
 * under a stop cannot be used: above, below, before and after it, and the box
 * itself too unless the stop asks for a try. Drawn from the light's own
 * variables (--tour-x, --tour-y, --tour-w, --tour-h), so they follow it as it
 * moves with nothing rendered; with the light gone out the box is nothing
 * and the four cover the whole screen.
 */
export type Blocker = { name: string; style: Record<string, string | number> };

export function tapBlockers(tryIt: boolean): Blocker[] {
  const x = "var(--tour-x, 0px)";
  const y = "var(--tour-y, 0px)";
  const w = "var(--tour-w, 0px)";
  const h = "var(--tour-h, 0px)";
  const parts: Blocker[] = [
    { name: "above", style: { top: 0, left: 0, right: 0, height: y } },
    { name: "below", style: { top: `calc(${y} + ${h})`, left: 0, right: 0, bottom: 0 } },
    { name: "before", style: { top: y, height: h, left: 0, width: x } },
    { name: "after", style: { top: y, height: h, left: `calc(${x} + ${w})`, right: 0 } },
  ];
  if (!tryIt) parts.push({ name: "over", style: { top: y, left: x, width: w, height: h } });
  return parts;
}

// ---------------------------------------------------------------------------
// The wait.

/**
 * Away to a stop's page: this long for the page to come at all. Long, on
 * purpose: on the export slowed four times on a busy computer, /history took
 * 18 s to draw the atlas, and only a page that never comes should be passed
 * over. The reader can Skip at any moment meanwhile.
 */
export const ROUTE_WAIT_MS = 15_000;
/** On the page, this long at most, settled or not: a page that never settles. */
export const PAGE_WAIT_MS = 12_000;
/**
 * Settled: no change to the page for this long ... A page that fetches its
 * parts is quiet while it waits for them: 700 ms passed the Bible's Listen
 * over on the export slowed four times, its pill drawn 1.7 s after the page.
 */
export const QUIET_MS = 1200;
/** ... and this many frames drawn since, so one long task is not read as quiet. */
export const QUIET_FRAMES = 12;

export type Looking = {
  /** The stop's page is the one showing (always, for a stop with no page of its own). */
  onPage: boolean;
  /** Since the stop began. */
  sinceStart: number;
  /** Since its page showed; null while away. */
  sinceArrived: number | null;
  /** Since the page last changed (an element added, taken away or marked). */
  sinceChange: number;
  /** Frames drawn since that change. */
  framesSinceChange: number;
  /** Still arriving: the route's way out, a skeleton on screen, or the stop's element still fading in. */
  arriving: boolean;
};

/**
 * Whether to keep waiting for a stop's element, or pass the stop over. The
 * element being there is checked first, every time, and always wins: this
 * only says when to give up on one that is not.
 */
export function lookVerdict(l: Looking): "wait" | "missing" {
  if (!l.onPage || l.sinceArrived === null) return l.sinceStart >= ROUTE_WAIT_MS ? "missing" : "wait";
  if (l.sinceArrived >= PAGE_WAIT_MS) return "missing";
  if (l.arriving) return "wait";
  return l.sinceChange >= QUIET_MS && l.framesSinceChange >= QUIET_FRAMES ? "missing" : "wait";
}

// ---------------------------------------------------------------------------
// The glide: the light and the page together, on the house curve.

/** The light's move to the next stop and the page's under it, as long as the story's pages take to turn. */
export const GLIDE_MS = 560;

/** A cubic Bezier timing curve, as CSS draws one: x is time, y is progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let s = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(s);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}

/** The house curve, --ease-house in app/globals.css. */
export const houseEase = cubicBezier(0.22, 1, 0.36, 1);

export function mixNumber(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

export function mixBox(a: Box, b: Box, u: number): Box {
  return {
    top: mixNumber(a.top, b.top, u),
    left: mixNumber(a.left, b.left, u),
    width: mixNumber(a.width, b.width, u),
    height: mixNumber(a.height, b.height, u),
  };
}

/** A box closed to a point at another's middle: the light gone out where it stood. */
export function closedAt(b: Box): Box {
  return { top: b.top + b.height / 2, left: b.left + b.width / 2, width: 0, height: 0 };
}

// ---------------------------------------------------------------------------
// Measuring.

/** On screen: a box of its own, and not hidden or faded out. */
function drawn(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && parseFloat(style.opacity) > 0;
}

/** The element a stop lights, when it is on screen: the first drawn one. */
export function findTarget(target: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const all = document.querySelectorAll<HTMLElement>(`[${TOUR_ATTR}="${CSS.escape(target)}"]`);
  for (const el of all) if (drawn(el)) return el;
  return null;
}

/** Held in place on the screen (fixed or sticky, itself or a box it is in): scrolling does not bring it nearer. */
export function isPinned(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const position = window.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/** The element's box, now. */
export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** The band between the bars for this element, its own bar left out (lib/ui/readingPlace.ts). */
export function bandFor(el: Element): Span {
  return bandOf(readScreen(el));
}

/** The page is still arriving: the route's way out, or a skeleton drawn (components/ui/Skeleton.tsx). */
export function pageArriving(): boolean {
  if (typeof document === "undefined") return false;
  if (isRouteExiting()) return true;
  // A skeleton bar is `.sk` since 1.9 (components/ui/Skeleton.tsx); the old mark is kept for any drawn with it.
  const shapes = document.querySelectorAll(".sk, [data-skeleton]");
  for (let i = 0; i < shapes.length && i < 6; i++) if (drawn(shapes[i])) return true;
  return false;
}

/**
 * The stop's element is on the page but still coming in: an animation or a
 * transition runs on it, so it is not drawn yet (1.9: a chapter's first
 * verses fade in half a second after the page, page-open-fade in
 * app/globals.css, and the tour passed John 1:1 over while it was clear). A
 * fade changes nothing a MutationObserver sees, so while this holds the layer
 * looks for the element every frame and counts the page as still arriving;
 * the page's own limit (PAGE_WAIT_MS) still holds.
 */
export function targetComing(target: string): boolean {
  if (typeof document === "undefined") return false;
  const all = document.querySelectorAll<HTMLElement>(`[${TOUR_ATTR}="${CSS.escape(target)}"]`);
  for (const el of all) {
    // Not in every WebView the apps can run in; without it, the rule before.
    if (typeof el.getAnimations !== "function") continue;
    if (el.getAnimations().some((a) => a.playState === "running")) return true;
  }
  return false;
}

/** How far the page can scroll now. */
export function maxScroll(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

let insetsFor: { width: number; insets: { top: number; bottom: number } } | null = null;

/** The phone's own edges, read once for each width of the window. */
export function phoneEdges(): { top: number; bottom: number } {
  if (typeof document === "undefined") return { top: 0, bottom: 0 };
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

/**
 * Whether the apps' opening cover is still up (lib/platform/launchFrame.ts):
 * it leaves once the page carries both data-launch="ready" and
 * data-intro="played". A page that never had one (the website) has neither
 * the cover nor the marks; the apps' document has the cover from its first
 * paint, before its own lines have marked anything.
 */
export function launchCoverUp(): boolean {
  if (typeof document === "undefined") return false;
  const d = document.documentElement;
  const launch = d.getAttribute("data-launch");
  if (!launch && !document.querySelector("[data-launch-frame]")) return false;
  return !(launch === "ready" && d.getAttribute("data-intro") === "played");
}

// ---------------------------------------------------------------------------
// The intro held for the release's title page (the owner's pick B: "the
// intro the reader has just watched does not lift away"). TourHost holds it
// on an open that will offer the tour; the title page, once drawn over it,
// takes it, and the cover goes at once under the title page, unseen
// (app/globals.css, html[data-intro-hold]).

export const INTRO_HOLD_ATTR = "data-intro-hold";

export function holdIntro(): void {
  document.documentElement.setAttribute(INTRO_HOLD_ATTR, "on");
}

/** The title page is over the cover: it may go, at once. */
export function takeIntro(): void {
  if (document.documentElement.getAttribute(INTRO_HOLD_ATTR) === "on") {
    document.documentElement.setAttribute(INTRO_HOLD_ATTR, "taken");
  }
}

/** Let the cover lift as it always does (nothing took it), or forget the hold once the title page is gone. */
export function releaseIntro(): void {
  document.documentElement.removeAttribute(INTRO_HOLD_ATTR);
}

export function introHeld(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute(INTRO_HOLD_ATTR) === "on";
}

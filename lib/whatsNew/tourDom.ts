// The tour on the page: finding a step's element, the lit hole around it, and
// where its words stand. The geometry is pure and tested
// (lib/whatsNew/__tests__/tourDom.test.ts); the measuring is apart from it, and
// called from effects and handlers only, never while rendering.

import { goToReadingPlace, inReadingZone, visibleBand } from "@/lib/ui/readingPlace";

import { TOUR_ATTR } from "./tour";

/** A box on the screen, in CSS pixels from the window's top left. */
export type Box = { top: number; left: number; width: number; height: number };

/** The lit hole: the element's box with room around it, and its corners. */
export type Hole = Box & { radius: number };

/** The room the ring leaves around what it lights. */
export const HOLE_PAD = 8;
/** The hole keeps this far inside the window's edges. */
export const HOLE_EDGE = 4;
/** Between the hole and the words. */
export const CAPTION_GAP = 12;

/** "/theology/" and "/theology" are one page; the app's export writes the first. */
export function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0] || "/";
  return bare.length > 1 ? bare.replace(/\/+$/, "") || "/" : bare;
}

export function samePage(pathname: string | null | undefined, route: string): boolean {
  return normalizePath(pathname ?? "/") === normalizePath(route);
}

/**
 * The hole around an element: its box with HOLE_PAD all round, its corners the
 * element's own and the pad, held inside the window. Null when nothing of it
 * is left on screen.
 */
export function holeAround(box: Box, radius: number, view: { width: number; height: number }): Hole | null {
  const top = Math.max(HOLE_EDGE, box.top - HOLE_PAD);
  const left = Math.max(HOLE_EDGE, box.left - HOLE_PAD);
  const bottom = Math.min(view.height - HOLE_EDGE, box.top + box.height + HOLE_PAD);
  const right = Math.min(view.width - HOLE_EDGE, box.left + box.width + HOLE_PAD);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  const r = Math.max(0, radius) + HOLE_PAD;
  return { top, left, width, height, radius: Math.min(r, width / 2, height / 2) };
}

/** Whether two holes are the same to the eye (half a pixel). */
export function sameHole(a: Hole | null, b: Hole | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    Math.abs(a.radius - b.radius) < 0.5
  );
}

/**
 * Where a step's words stand: under the hole when they fit there (nearer the
 * thumb), over it when they fit there instead, and otherwise on the side with
 * more room. `insets` are the phone's own edges, the status bar and the home
 * indicator.
 */
export function captionPlace(
  hole: Hole | null,
  captionHeight: number,
  view: { height: number },
  insets: { top: number; bottom: number },
): "top" | "bottom" {
  if (!hole) return "bottom";
  const below = view.height - insets.bottom - (hole.top + hole.height) - CAPTION_GAP * 2;
  const above = hole.top - insets.top - CAPTION_GAP * 2;
  if (below >= captionHeight) return "bottom";
  if (above >= captionHeight) return "top";
  return above > below ? "top" : "bottom";
}

/**
 * The parts of the screen around the hole that take a tap and do nothing with
 * it, so the page under a step cannot be used: above, below, before and after
 * the hole. The hole itself is covered too unless the step asks for a try.
 */
export function blockersAround(hole: Hole | null, view: { width: number; height: number }, tryIt: boolean): Box[] {
  if (!hole) return [{ top: 0, left: 0, width: view.width, height: view.height }];
  const bottom = hole.top + hole.height;
  const right = hole.left + hole.width;
  const parts: Box[] = [
    { top: 0, left: 0, width: view.width, height: hole.top },
    { top: bottom, left: 0, width: view.width, height: Math.max(0, view.height - bottom) },
    { top: hole.top, left: 0, width: hole.left, height: hole.height },
    { top: hole.top, left: right, width: Math.max(0, view.width - right), height: hole.height },
  ];
  if (!tryIt) parts.push({ top: hole.top, left: hole.left, width: hole.width, height: hole.height });
  return parts.filter((p) => p.width > 0 && p.height > 0);
}

// ---------------------------------------------------------------------------
// Measuring.

/** On screen: a box of its own, and not hidden or faded out. */
function drawn(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && parseFloat(style.opacity) > 0;
}

/** The element a step lights, when it is on screen: the first drawn one. */
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

/** The element's corner, in pixels (a percentage read against its smaller side). */
export function cornerOf(el: HTMLElement): number {
  const raw = window.getComputedStyle(el).borderTopLeftRadius || "0";
  const first = raw.split(" ")[0];
  const n = parseFloat(first) || 0;
  if (first.endsWith("%")) {
    const r = el.getBoundingClientRect();
    return (Math.min(r.width, r.height) * n) / 100;
  }
  return n;
}

/** The element's hole, now. */
export function measureHole(el: HTMLElement): Hole | null {
  const r = el.getBoundingClientRect();
  return holeAround({ top: r.top, left: r.left, width: r.width, height: r.height }, cornerOf(el), {
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

/**
 * Brings the element to the reading place (lib/ui/readingPlace.ts), smoothly
 * unless Purify's motion is off or `smooth` is false. Nothing to do for one
 * held in place, or one already standing in the band's middle.
 */
export function bringIntoPlace(el: HTMLElement, smooth = true): void {
  if (isPinned(el)) return;
  const band = visibleBand();
  const r = el.getBoundingClientRect();
  if (inReadingZone(band, { top: r.top, bottom: r.bottom })) return;
  goToReadingPlace(el, { smooth, band });
}

/**
 * Whether any of the element shows between the bars. A page still arriving
 * (a skeleton, then the page, then what it fetches) can push the element away
 * after it was brought into place; this is how the layer notices.
 */
export function inSight(el: HTMLElement): boolean {
  if (isPinned(el)) return true;
  const band = visibleBand();
  const r = el.getBoundingClientRect();
  return r.bottom > band.top && r.top < band.bottom;
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
 * data-intro="played". A page that never had one has neither.
 */
export function launchCoverUp(): boolean {
  if (typeof document === "undefined") return false;
  const d = document.documentElement;
  const launch = d.getAttribute("data-launch");
  if (!launch) return false;
  return !(launch === "ready" && d.getAttribute("data-intro") === "played");
}

/**
 * A page opened by going forward starts at its top, and stays there while it
 * arrives.
 *
 * Measured on the live app on 2026-10-05, at a phone's size: from the saints
 * list scrolled to 7,176px, tapping a saint opened that saint's page at
 * 5,979px, the bottom of it; from the shop scrolled to 1,096px, a product
 * opened at 1,147px. Two things did it together, and neither is ours:
 *
 *   1. The router skips its own scroll to the top when the first element of
 *      the new page is already inside the screen. The moment the long list is
 *      swapped for a short loading screen the browser clamps the scroll to
 *      what is left, which puts that first element on screen, so the router
 *      sees nothing to do.
 *   2. Chrome then keeps whatever it had pinned in place while the real page
 *      grows around it (scroll anchoring), and drags the scroll down with it.
 *      Safari has no scroll anchoring, so an iPhone showed only the first
 *      half.
 *
 * So on every forward navigation this puts the scroll at the top itself, and
 * switches scroll anchoring off until the reader touches the page (or a few
 * seconds pass), which covers a page that keeps arriving in pieces: a
 * skeleton, then the page, then what it fetches. After the first touch the
 * browser's anchoring is back, because from then on it is protecting what the
 * reader is looking at.
 *
 * Left alone, on purpose:
 *   - Back and forward. The browser and the router restore where the reader
 *     was, and they are right to.
 *   - A link to a place on a page (#post-…, #v11, #s4). The router scrolls
 *     to it.
 *   - A page that puts the reader back where they left off (a Father's work,
 *     lib/reader/position). It scrolls after this does, and wins.
 *
 * No React here, so it can be tested with a stubbed window; the mount is
 * components/nav/ScrollResetBridge.tsx.
 */

/** How long anchoring stays off when the reader touches nothing. */
export const HOLD_MS = 4000;

/**
 * A popstate is followed by its route within this long. Past it, the mark is
 * stale: the popstate was for a #hash on the same page, which commits no
 * route, and must not excuse the next real navigation.
 */
export const TRAVERSAL_MS = 1500;

const RELEASE_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

let lastTraversalAt = Number.NEGATIVE_INFINITY;
let releaseHold: (() => void) | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Call from a `popstate` listener: the next route is a step through history. */
export function noteTraversal(): void {
  lastTraversalAt = now();
}

/** True once, for the route that follows a popstate. */
function takeTraversal(): boolean {
  const recent = now() - lastTraversalAt < TRAVERSAL_MS;
  lastTraversalAt = Number.NEGATIVE_INFINITY;
  return recent;
}

/** Hands scroll anchoring back to the browser. Safe to call at any time. */
export function endScrollHold(): void {
  releaseHold?.();
}

/**
 * Call when a new pathname has committed (not on the first render). Returns
 * what it did, for the test and for nothing else.
 */
export function onRouteCommitted(): "reset" | "traversal" | "hash" | "none" {
  if (typeof window === "undefined" || typeof document === "undefined") return "none";
  if (takeTraversal()) return "traversal";
  if (window.location.hash) return "hash";

  endScrollHold();
  const root = document.documentElement;
  root.style.setProperty("overflow-anchor", "none");
  window.scrollTo(0, 0);

  let done = false;
  const timer = window.setTimeout(() => release(), HOLD_MS);
  function release() {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    for (const type of RELEASE_EVENTS) window.removeEventListener(type, release);
    root.style.removeProperty("overflow-anchor");
    if (releaseHold === release) releaseHold = null;
  }
  // Passive, and never preventing anything: these only listen for the first
  // sign that the reader has taken the page in hand.
  for (const type of RELEASE_EVENTS) window.addEventListener(type, release, { passive: true });
  releaseHold = release;
  return "reset";
}

/** Test seam. */
export function resetScrollResetForTests(): void {
  endScrollHold();
  lastTraversalAt = Number.NEGATIVE_INFINITY;
  releaseHold = null;
}

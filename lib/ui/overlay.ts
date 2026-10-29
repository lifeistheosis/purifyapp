/**
 * Tiny shared overlay-open flag, used to coordinate floating UI that
 * shouldn't appear on top of an open sheet or toolbar (e.g. the PWA
 * install banner during a verse-action toolbar interaction).
 *
 * Sets `document.body.dataset.overlayOpen` so other components can
 * watch it via a MutationObserver, no shared state library needed,
 * and the flag is observable from any client component without prop
 * drilling.
 *
 * Call site contract: every caller of `setOverlayOpen(true)` MUST
 * call `setOverlayOpen(false)` on unmount or close. The implementation
 * uses a depth counter so nested overlays don't prematurely clear the
 * flag if two open at once.
 */

import { useSyncExternalStore } from "react";

let depth = 0;

function sync() {
  if (typeof document === "undefined") return;
  if (depth > 0) {
    document.body.dataset.overlayOpen = "1";
  } else {
    delete document.body.dataset.overlayOpen;
  }
}

export function setOverlayOpen(open: boolean): void {
  if (open) depth += 1;
  else depth = Math.max(0, depth - 1);
  sync();
}

export function isOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.dataset.overlayOpen === "1";
}

/**
 * Reactive form of `isOverlayOpen`, for floating UI that must step aside the
 * moment a sheet opens rather than whenever it happens to re-render next.
 *
 * `isOverlayOpen()` read at render time is a snapshot: nothing re-renders the
 * caller when the flag flips. That is tolerable for the install banner, which
 * is transient, and not tolerable for the tab bar, which is always mounted and
 * would otherwise keep sitting on top of an open sheet for the rest of the
 * session.
 *
 * Subscribes to the `data-overlay-open` attribute the depth counter above
 * writes, exactly as this module's header describes.
 */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(subscribeOverlay, isOverlayOpen, () => false);
}

function subscribeOverlay(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-overlay-open"],
  });
  return () => mo.disconnect();
}

/**
 * Counted page-scroll lock.
 *
 * Every overlay used to do its own `prev = body.style.overflow` save and
 * restore. That is correct for ONE overlay and silently broken for two,
 * which the Bible reader has four of (settings sheet, chapter-picker sheet,
 * commentary sheet, search overlay). Interleave any two and the page locks
 * forever:
 *
 *   A opens  → prev_A = ""       → overflow = hidden
 *   B opens  → prev_B = "hidden" → overflow = hidden   (B captured A's lock)
 *   A closes → overflow = ""                            (unlocked too early)
 *   B closes → overflow = "hidden"                      (locked with nothing open)
 *
 * The page then cannot scroll at all and looks frozen until a reload. Sheet's
 * 220ms exit animation keeps a closing sheet mounted, so "close one, open the
 * other" is enough to hit it, no double-tap required.
 *
 * Only the OUTERMOST lock captures and restores the real value; nested locks
 * just move the counter. Mirrors the depth counter above, and for the same
 * reason. Do not go back to per-component save/restore: a single unconverted
 * call site re-introduces the deadlock for every other overlay.
 *
 * THE LOCK IS ON <html>, NOT <body> (build 80, the owner's note 2: with the
 * full player open, a drag or a wheel moved the page under it). The names
 * are older than that and stay, for their callers.
 *
 * Since 1.5.2 app/globals.css gives <html> `overflow-x: clip` on phones and
 * in the apps. A root whose overflow is not `visible` keeps its own: the
 * viewport takes the root's overflow and the body's is never carried up to
 * it. So `overflow: hidden` on the body stopped reaching the viewport there,
 * and it did two things instead. The page under every sheet went on
 * scrolling to a finger, and the body became a scroll container of its own,
 * which pinned every sticky bar (the top bars) to the body's top, off the
 * screen once the page was scrolled, for as long as the sheet was open.
 * Measured in Chromium with the app's root rules: a 150px drag over a fixed
 * overlay moved the page 135px with the body locked, none with the root
 * locked, and a scrolling list inside the overlay scrolled in both.
 *
 * `overflow: hidden` on the root is the viewport's own wherever the page
 * runs: a phone, the apps, a computer (where the body's lock had worked,
 * because the root there is `visible`). The root's `scrollbar-gutter: stable`
 * keeps its gutter under `hidden`, so nothing beside a sheet moves sideways
 * on a computer. Never put the lock back on the body.
 */
let scrollDepth = 0;
let scrollRestore = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (scrollDepth === 0) scrollRestore = root.style.overflow;
  scrollDepth += 1;
  root.style.overflow = "hidden";
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  // Already unlocked: return WITHOUT touching overflow. Writing the stale
  // `scrollRestore` here would clobber whatever the page currently has, which
  // is reachable in dev (StrictMode double-invokes effect cleanups) and from
  // any unbalanced call. Only a real 1 → 0 transition restores.
  if (scrollDepth === 0) return;
  scrollDepth -= 1;
  if (scrollDepth === 0) document.documentElement.style.overflow = scrollRestore;
}

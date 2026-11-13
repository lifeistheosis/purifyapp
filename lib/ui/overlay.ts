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

/** Sheets that have risen and have not begun to leave (sheetRises). */
let up = 0;
/** Sheets on their way out (sheetLeaves), and of those, the ones `depth` counts. */
let leaving = 0;
let leavingCounted = 0;

function mark(name: "overlayOpen" | "overlayCovers" | "sheetUp" | "sheetLeaving", on: boolean) {
  if (on) document.body.dataset[name] = "1";
  else delete document.body.dataset[name];
}

function sync() {
  if (typeof document === "undefined") return;
  mark("overlayOpen", depth > 0);
  // What covers the screen: an overlay that is open and not a sheet on its
  // way out. Floating UI comes back as a sheet leaves, not after it has gone
  // (useOverlayOpen, build 89 note 16).
  mark("overlayCovers", depth - leavingCounted > 0);
  // A sheet's own moments, which app/globals.css times what stands behind
  // it by ("What stands behind a sheet").
  mark("sheetUp", up > 0);
  mark("sheetLeaving", leaving > 0);
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
 * A sheet has risen (lib/ui/useDraggableSheet.ts, which every sheet is built
 * on): what stands behind it, the tab bar, the players, the reader's pill and
 * dock and its plates, goes with it, on the sheet's own time and curve
 * (app/globals.css, "What stands behind a sheet"; build 89 note 16, his
 * words: "make the objects in the back fade out better when this new screen
 * shows up (bottom UI + player)"). Returns its end: when it begins to leave,
 * or goes without leaving.
 */
export function sheetRises(): () => void {
  up += 1;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    up = Math.max(0, up - 1);
    sync();
  };
}

/** Toasts standing at the foot (toastRises). */
let toasts = 0;
let toastBack: ReturnType<typeof setTimeout> | undefined;

/**
 * How long what stepped aside for a toast takes to come back: the time a page
 * takes to arrive (app/globals.css, --duration-route-enter, 260ms) and a frame
 * or two. body[data-toast-leaving] times its return till then.
 */
export const TOAST_RETURN_MS = 300;

function syncToasts(ended: boolean) {
  if (typeof document === "undefined") return;
  const body = document.body;
  clearTimeout(toastBack);
  if (toasts > 0) {
    body.dataset.toastUp = "1";
    delete body.dataset.toastLeaving;
    return;
  }
  delete body.dataset.toastUp;
  if (!ended) return;
  body.dataset.toastLeaving = "1";
  toastBack = setTimeout(() => {
    if (typeof document !== "undefined") delete document.body.dataset.toastLeaving;
  }, TOAST_RETURN_MS);
}

/**
 * A toast stands at the foot (the Undo bar, components/ui/UndoBar.tsx, in the
 * day's readings bar's place, over the tab bar and the mini player): what
 * floats in its band, the reader's pill and dock, a work's pill, the day's
 * readings bar, a verse's tools, steps aside while it shows and comes back as
 * it goes (app/globals.css, "What steps aside for a toast"). Build 95 note 7,
 * his word: "ui overlalping". After a double tap on John 1:5 the Highlighted
 * toast stood over the chapter pill, whose rounded top and Listen button
 * showed above it. The tab bar and the mini player stay: the toast stands
 * above them. Returns its end.
 */
export function toastRises(): () => void {
  toasts += 1;
  syncToasts(false);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    toasts = Math.max(0, toasts - 1);
    syncToasts(true);
  };
}

/**
 * A sheet stands over the page: risen, or on its way out and not yet gone.
 * A page that answers Escape itself asks, and stands aside: every listener
 * hears the key, and the press that closes a sheet must not also leave the
 * page under it (as the phone's Back is kept, lib/platform/useAndroidBack.ts,
 * overlayOwnsBack). Found on the page that starts a prayer campaign, where
 * Escape over the Terms of Service closed the sheet and left the page, with
 * everything written on it.
 */
export function isSheetUp(): boolean {
  return up > 0 || leaving > 0;
}

/**
 * A sheet on its way out: what stood behind it comes back with it, on its
 * time and curve. It is still open (isOverlayOpen) until it has gone, and it
 * covers nothing (useOverlayOpen). A sheet that never raised the overlay
 * flag (the admin's menu, the shop's offer as a reader leaves) has nothing to
 * give back to it, so it is taken off only while something is counted there.
 * Returns its end, when it has gone.
 */
export function sheetLeaves(): () => void {
  const counted = depth - leavingCounted > 0;
  leaving += 1;
  if (counted) leavingCounted += 1;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    leaving = Math.max(0, leaving - 1);
    if (counted) leavingCounted = Math.max(0, leavingCounted - 1);
    sync();
  };
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
 * Subscribes to the `data-overlay-covers` attribute the counters above write:
 * the depth counter, less the sheets already on their way out (build 89
 * note 16), so what steps aside comes back as a sheet leaves.
 */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(subscribeOverlay, isCovered, () => false);
}

/**
 * Whether something covers the screen: an overlay open that is not a sheet on
 * its way out. A sheet that has begun to leave gives the floating UI back at
 * once, so it returns with the sheet rather than after it (build 89 note 16).
 */
function isCovered(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.dataset.overlayCovers === "1";
}

/**
 * Run once nothing covers the screen: at once when nothing does, or as soon as
 * the cover lifts (the same flag as useOverlayOpen). For a question that must
 * not stand over another (the downloads' ask, components/native/
 * DownloadsBridge.tsx). Returns a cancel.
 */
export function whenUncovered(run: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  if (!isCovered()) {
    run();
    return () => {};
  }
  const mo = new MutationObserver(() => {
    if (isCovered()) return;
    mo.disconnect();
    run();
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ["data-overlay-covers"] });
  return () => mo.disconnect();
}

function subscribeOverlay(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-overlay-covers"],
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

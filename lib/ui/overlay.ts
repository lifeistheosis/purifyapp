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
 * Counted body-scroll lock.
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
 * other" is enough to hit it — no double-tap required.
 *
 * Only the OUTERMOST lock captures and restores the real value; nested locks
 * just move the counter. Mirrors the depth counter above, and for the same
 * reason. Do not go back to per-component save/restore: a single unconverted
 * call site re-introduces the deadlock for every other overlay.
 */
let scrollDepth = 0;
let scrollRestore = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (scrollDepth === 0) scrollRestore = document.body.style.overflow;
  scrollDepth += 1;
  document.body.style.overflow = "hidden";
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  // Already unlocked: return WITHOUT touching overflow. Writing the stale
  // `scrollRestore` here would clobber whatever the page currently has, which
  // is reachable in dev (StrictMode double-invokes effect cleanups) and from
  // any unbalanced call. Only a real 1 → 0 transition restores.
  if (scrollDepth === 0) return;
  scrollDepth -= 1;
  if (scrollDepth === 0) document.body.style.overflow = scrollRestore;
}

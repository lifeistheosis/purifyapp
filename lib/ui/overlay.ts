/**
 * Tiny shared overlay-open flag, used to coordinate floating UI that
 * shouldn't appear on top of an open sheet or toolbar (e.g. the PWA
 * install banner during a verse-action toolbar interaction).
 *
 * Sets `document.body.dataset.overlayOpen` so other components can
 * watch it via a MutationObserver — no shared state library needed,
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

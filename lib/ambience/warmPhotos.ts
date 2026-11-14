import { AMBIENCE_TRACKS } from "./ambience";

/**
 * The six photographs, loaded and decoded before the sheet first rises (build
 * 97 note 10, Updates 63). Measured on the export at 390x844 with the CPU
 * slowed four times while John 1 played: on the sheet's first opening every
 * tile's photograph had its bytes but none was decoded, so the six faded in
 * as the sheet rose and after it stood (the last at 800ms or more).
 *
 * Once a picture has loaded in the page, the browser lists it as available,
 * and an image made later with the same address is whole the moment it is
 * made (the HTML standard's "list of available images"): the tile's own
 * lib/ui/useArrivingImage.ts then marks it arrived before the first paint, so
 * the sheet rises with every photograph in place. Six JPEGs at 288x216, kept
 * for the session.
 */
let kept: HTMLImageElement[] | null = null;
let ready: Promise<void> = Promise.resolve();

/** Load and decode every sound's photograph, once a session. Safe to call again. */
export function warmAmbiencePhotos(): Promise<void> {
  if (kept || typeof Image === "undefined") return ready;
  kept = AMBIENCE_TRACKS.map((track) => {
    const img = new Image();
    img.decoding = "async";
    img.src = track.photo.src;
    return img;
  });
  ready = Promise.all(kept.map((img) => (typeof img.decode === "function" ? img.decode().catch(() => undefined) : undefined))).then(() => undefined);
  return ready;
}

/** How long after the screen is drawn the warm waits, so it never competes with a page arriving. */
const SETTLE_MS = 1200;
/** How long it may wait for an idle moment after that. */
const IDLE_LIMIT_MS = 3000;

/**
 * Warm the photographs once the app is idle, from the sheet's host (mounted
 * once in the root frame, on every screen). Returns the undo for an unmount.
 */
export function warmAmbiencePhotosWhenIdle(): () => void {
  if (kept || typeof window === "undefined") return () => {};
  let idle: number | null = null;
  const settle = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => void warmAmbiencePhotos(), { timeout: IDLE_LIMIT_MS });
    else void warmAmbiencePhotos();
  }, SETTLE_MS);
  return () => {
    window.clearTimeout(settle);
    if (idle !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  };
}

/** For tests: forget what was warmed. */
export function resetWarmAmbiencePhotos(): void {
  kept = null;
  ready = Promise.resolve();
}

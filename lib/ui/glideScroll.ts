"use client";

// A scroll that goes over a moment, a frame at a time.
//
// Why not scrollBy({ behavior: "smooth" }): Chrome ends a smooth scroll the
// moment a field inside the scrolled box reveals its caret, and a field
// reveals its caret on every letter typed. Seen in Chrome 153 on 2026-11-07,
// the engine of the Android WebView: Community's page for a new post folds
// its head on the first words (components/community/ComposePage.tsx), and the
// smooth scroll it asked for was ended by the very letter that asked for it,
// so the head never folded (scripts/export-walk.mjs, section 47). Set a frame
// at a time, a caret cannot end it. A finger can: a touch or a wheel on the
// box hands it back to the reader where it stands.

/** How long the glide takes, about the app's own motion for a short move. */
export const GLIDE_MS = 320;

/**
 * Scroll `el` by `by` pixels, within the room it has. With `smooth` off (the
 * reader asked for less motion) it is there at once. Returns a stop, which
 * leaves the box where it stands.
 */
export function glideScroll(el: HTMLElement, by: number, { smooth, ms = GLIDE_MS }: { smooth: boolean; ms?: number }): () => void {
  const from = el.scrollTop;
  const to = Math.max(0, Math.min(from + by, el.scrollHeight - el.clientHeight));
  if (!smooth || to === from || typeof requestAnimationFrame !== "function") {
    el.scrollTop = to;
    return () => {};
  }
  let frame = 0;
  let start: number | null = null;
  const stop = () => {
    cancelAnimationFrame(frame);
    el.removeEventListener("touchstart", stop);
    el.removeEventListener("wheel", stop);
  };
  const step = (now: number) => {
    start ??= now;
    const t = Math.min(1, (now - start) / ms);
    // Out quickly and settle: an ease-out, as the app's sheets move.
    el.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  el.addEventListener("touchstart", stop, { passive: true });
  el.addEventListener("wheel", stop, { passive: true });
  frame = requestAnimationFrame(step);
  return stop;
}

/** The house curve (app/globals.css, --ease-house: cubic-bezier(0.22, 1, 0.36, 1)), as a function of time. */
export function easeHouse(t: number): number {
  // Solve the bezier's x for t by bisection, then read its y: exact enough for a frame.
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

/**
 * The page itself (its scrolling element), by `by` pixels over `ms` on the
 * house curve, for a page that grows as it goes (1.9, build 89 note 8: a
 * chapter of the prayer book folding open). The browser keeps each frame
 * within the room the page has at that moment, so the glide reaches further
 * as the room opens, and goes on a little past `ms` until it arrives or the
 * room stops growing. A touch or a wheel hands the page back to the reader
 * where it stands. Returns a stop.
 */
export function glidePageBy(by: number, { ms = GLIDE_MS }: { ms?: number } = {}): () => void {
  const el = typeof document === "undefined" ? null : (document.scrollingElement as HTMLElement | null);
  if (!el || by === 0 || typeof requestAnimationFrame !== "function") return () => {};
  const from = el.scrollTop;
  const to = from + by;
  let frame = 0;
  let start: number | null = null;
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("wheel", stop);
  };
  const step = (now: number) => {
    start ??= now;
    const t = Math.min(1, (now - start) / ms);
    el.scrollTop = from + by * easeHouse(t);
    const arrived = Math.abs(el.scrollTop - to) < 1;
    if (t < 1 || (!arrived && now - start < ms + 240)) frame = requestAnimationFrame(step);
    else stop();
  };
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("wheel", stop, { passive: true });
  frame = requestAnimationFrame(step);
  return stop;
}

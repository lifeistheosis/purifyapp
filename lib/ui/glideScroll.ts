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

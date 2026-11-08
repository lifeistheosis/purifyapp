"use client";

// When the page last scrolled (1.9, build 88 note 2): a touch that begins
// while the page is still gliding is the scroll's, never a tap on what is
// under it (lib/bible/verseGesture.ts, isTap).
//
// One listener for the whole page, put on the first time it is asked for, in
// the capture phase so a scroll inside any scrolling box counts too. Passive:
// it only notes the time.

let lastAt = -Infinity;
let listening = false;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function listen() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener(
    "scroll",
    () => {
      lastAt = now();
    },
    { capture: true, passive: true },
  );
}

/** When the page (or anything in it) last scrolled, on performance.now()'s clock. */
export function lastPageScrollAt(): number {
  listen();
  return lastAt;
}

/** Start listening before the first touch, so the first glide is seen. */
export function watchPageScroll(): void {
  listen();
}

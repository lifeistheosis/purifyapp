/**
 * When the reader last touched, wheeled, clicked or pressed a key, so a screen
 * can tell "the reader has started on their own" from "the page is still
 * opening".
 *
 * Made for a reader that resumes where it was left (WritingReader): on a
 * phone the work's text lands a moment after the page opens, and a reader
 * who has already begun to scroll by then was taken to their saved place in
 * the middle of their own swipe. Traced on 2026-10-14: scrolling at 23 px,
 * the page jumped to 580 and the section that opened there pushed the rest
 * down. It showed on the owner's Android phone, where the place was saved,
 * and never on his iPad, where it was not.
 *
 * Passive listeners on the window, installed once by the first screen that
 * asks. They never stop anything.
 */

let last = -Infinity;
let watching = false;

const mark = () => {
  last = performance.now();
};

export function watchInput(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  for (const type of ["touchstart", "wheel", "pointerdown", "keydown"]) {
    window.addEventListener(type, mark, { passive: true, capture: true });
  }
}

/** Whether the reader has done anything since `since` (a performance.now() time). */
export function inputSince(since: number): boolean {
  return last >= since;
}

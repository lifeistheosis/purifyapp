// What a finger on a verse means (1.9, build 88 notes 1 and 2).
//
// A verse decides for itself what a touch is (components/bible/VerseRow.tsx):
// a hold opens its window, two taps highlight it in the colour picked last,
// and a lone tap does nothing (build 90 note 10, his word: "when you double
// tap, it automatically highlights the last color you picked ... when you
// hold it down, then that window pops up"; until then a lone tap opened the
// window, which lay over the verse before a second tap could land). Two things
// a phone never calls a tap passed the old rule, which only asked whether the
// finger came up soon and had not moved:
//
//   - the touch that stops a glide: after a swipe the page glides on, and a
//     finger put down to stop it and lifted again has not moved, so it read
//     as a tap on whatever verse was under it;
//   - a finger held still while the page moved under it: the rule measured
//     the finger on the screen, not the page.
//
// His words of 2026-11-07: "when scrolling to another verse and letting go my
// finger on the next verse my finger lands on it, clicks it". And such a
// false tap was remembered as the first of a double tap, so a real tap soon
// after it highlighted the verse instead of selecting it.
//
// And a hold on a phone also sends the page a contextmenu (Android's WebView,
// as Chrome on a phone), which the verse answered with the computer's
// right-click menu over its own tools (note 1). A contextmenu that comes from
// a touch is the hold's, not a mouse's.

/** How long a finger rests before it is a hold. */
export const LONG_PRESS_MS = 400;
/** How far a finger may drift and still be a tap or a hold, in CSS px. */
export const SCROLL_SLOP_PX = 8;
/** Two taps this close in time, and in place, are a double tap. */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_SLOP_PX = 28;
/** A touch that begins this soon after the page last scrolled is the scroll's: it stops a glide. */
export const SCROLL_SETTLE_MS = 100;
/** The page moving this far during a touch makes the touch the scroll's. */
export const PAGE_MOVE_PX = 2;
/** A mouse event or a contextmenu this soon after a touch is the touch's echo. */
export const TOUCH_ECHO_MS = 1500;

export type TouchFacts = {
  /** The finger came up before the hold fired, and without drifting past the slop. */
  quick: boolean;
  /** When the touch began, and when the page last scrolled before it (ms, one clock). */
  startedAt: number;
  lastScrollAt: number;
  /** The page's scroll position when the touch began and when it ended. */
  startScrollY: number;
  endScrollY: number;
  /** The touch landed on one of the verse's own buttons or links. */
  onControl: boolean;
};

/** Whether a touch on a verse was a tap: quick, still, not on a control, and not the scroll's. */
export function isTap(f: TouchFacts): boolean {
  if (!f.quick || f.onControl) return false;
  if (f.startedAt - f.lastScrollAt < SCROLL_SETTLE_MS) return false;
  if (Math.abs(f.endScrollY - f.startScrollY) > PAGE_MOVE_PX) return false;
  return true;
}

export type TapAt = { t: number; x: number; y: number };

/** Whether this tap is the second of a double tap after `last` (itself a real tap, or null). */
export function isSecondTap(last: TapAt | null, now: TapAt): boolean {
  if (!last) return false;
  return now.t - last.t < DOUBLE_TAP_MS && Math.hypot(now.x - last.x, now.y - last.y) < DOUBLE_TAP_SLOP_PX;
}

/** Whether a contextmenu came from a finger (a hold), not a mouse's right button. */
export function isTouchContextMenu(pointerType: string | undefined, msSinceTouch: number): boolean {
  if (pointerType === "touch" || pointerType === "pen") return true;
  if (pointerType === "mouse") return false;
  return msSinceTouch < TOUCH_ECHO_MS;
}

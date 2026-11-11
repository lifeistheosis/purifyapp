/**
 * What opens shows itself: the page moves with it (1.9, build 93 note 15).
 *
 * The owner, three times. Build 89, on the prayer book: "I don't like how it
 * doesn't move the screen also down in a smooth way". Build 90, on Settings'
 * language list, which opened off the screen. And build 93, the prayer book
 * again, with every chapter shut and "Before & after daily life" opened:
 * "Again, I want the screen to move with the bottom if it's too big." The
 * chapter's own page had ended 24px over the tab bar, so the page had been
 * left where it was, and the two chapters after it had gone under the bar.
 *
 * The rule, his "Again" made standing: anything that opens (a section of a
 * list, a card, a menu, words that go on) and ends below what the screen
 * shows moves the page with it, so its end stands clear of the tab bar. It
 * never takes the top of what was opened off the screen. With Purify's
 * motion off the page moves at once, with no glide.
 *
 * How, in three parts.
 *
 *  - What has to be in sight: what opened, the control that opened it, and
 *    the thing it is part of when that thing says so (`data-shown-whole`: the
 *    prayer book's chapters are one book, and a reader who opens the second
 *    wants to see the fourth still). The page goes as far as the lowest of
 *    those needs, and no further than the control's top may go: under the
 *    bar at the top of the screen, never past it (moveFor).
 *  - The page follows, it does not jump ahead. What opens here may fold open
 *    over a moment, be drawn at once, or arrive from the device a beat later,
 *    and nothing here can know which or how tall it will be. So each frame
 *    the page closes a share of the distance to where it should be (about
 *    two thirds every CATCH_UP_MS). Behind a fold it runs with the fold and
 *    settles as the fold does; behind something drawn at once it is a short
 *    glide that eases out, as the house's motion does. It is watched until
 *    it has been still a few frames, and never longer than WATCH_MS.
 *  - Whose it is. A part inside a sheet moves the sheet's own scroll, and the
 *    page under it stays. A part in something fixed to the screen (a bar, a
 *    sheet with no scroll of its own) cannot be brought nearer by scrolling,
 *    and is left alone.
 *
 * The reader's hand ends it at once: a touch, a drag, a wheel, a key.
 *
 * A part that is still filling has not arrived (1.9, the pre-build gate,
 * 2026-11-11). Community's "3 replies" opens on two grey rows while the
 * replies come from the website, and says so (`aria-busy`). The grey rows
 * ended in sight, the page was still, the watch let go after its 0.4s, and
 * the replies then landed under the tab bar with nothing watching: their end
 * 939px down a screen whose bar stood at 761px. So while what opened says it
 * is busy, itself or anything in it, the watch does not end on "still", and
 * its moment (WATCH_MS, SETTLE_MS) begins when it stops saying so: what has
 * arrived is followed as anything that opens is. It is not waited for for
 * ever (BUSY_WATCH_MS), and the reader's hand ends it as before: a reader
 * who has moved on is not pulled back to replies that come late.
 *
 * Nothing calls this by hand. One mount at the root
 * (components/nav/OpenedBridge.tsx) hears a tap on anything that says it
 * opens something (`aria-expanded`, a `<summary>`), and when that control
 * then turns to open, follows what it names (`aria-controls`, or the
 * `<details>` itself). So a part that opens has only to say what it opens,
 * which a screen reader needs of it anyway, and
 * lib/ui/__tests__/openedParts.test.ts fails a control that does not. Only
 * an opening the reader has just asked for is followed: one a page makes on
 * its own moves nothing under their finger.
 *
 * No React here, so it can be tested with a stubbed window.
 */

import { prefersReducedMotion } from "./motion";
import { visibleBand } from "./readingPlace";

/** The room kept between what opened and the bars, top and foot. */
export const CLEAR_PX = 12;

/** How long an opening is watched, at most. */
export const WATCH_MS = 1400;

/** How long a part that says it is still filling is waited for, at most. */
export const BUSY_WATCH_MS = 12000;

/** What says it is still filling: `aria-busy`, on the part or on anything in it. */
const BUSY = '[aria-busy="true"]';

/** It is not let go before this, so a fold that starts a moment late is still followed. */
export const SETTLE_MS = 360;

/** Still for this many frames, and it is over. */
export const STEADY_FRAMES = 8;

/** The page closes about two thirds of the distance to where it should be in this time. */
export const CATCH_UP_MS = 70;

/** A tap older than this did not open what opens now. */
export const TAP_MS = 2000;

/** On the thing a part belongs to, when its end should be in sight too. */
export const WHOLE_ATTR = "data-shown-whole";

/** On a control or its part, when the page is not to be moved for it. */
export const IN_PLACE_ATTR = "data-opens-in-place";

/** What says it opens something. */
const CONTROL = "[aria-expanded], summary";

/** A field the reader types in keeps its own place: the browser minds the caret. */
const TYPED_IN = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='combobox']";

/** The reader's own hand. Passive, and never preventing anything. */
const HAND_EVENTS = ["pointerdown", "touchstart", "touchmove", "wheel", "keydown"] as const;

/** A frame is never counted as longer than this (a tab that slept, a slow first frame). */
const LONGEST_FRAME_MS = 50;

/**
 * How far the page should go for what has opened: enough for its end to
 * stand clear of the foot of the band, but never so far that its top goes
 * under the bar at the top. Zero when it ends in sight. Heights from the top
 * of the screen. Pure, for its test.
 */
export function moveFor({ top, bottom, roof, floor }: { top: number; bottom: number; roof: number; floor: number }): number {
  const hidden = bottom - (floor - CLEAR_PX);
  if (hidden <= 0) return 0;
  return Math.max(0, Math.min(hidden, top - (roof + CLEAR_PX)));
}

/**
 * How much of that the page takes in one frame of `ms`. All of it with the
 * glide off, or when a pixel or so is all that is left; else the share that
 * closes two thirds of the distance every CATCH_UP_MS, and never less than
 * a pixel, so it arrives. Pure, for its test.
 */
export function stepFor(by: number, ms: number, smooth: boolean): number {
  if (by <= 0) return 0;
  if (!smooth || by <= 1.5) return by;
  const share = 1 - Math.exp(-Math.min(Math.max(ms, 1), LONGEST_FRAME_MS) / CATCH_UP_MS);
  return Math.min(by, Math.max(1, by * share));
}

type Where = { kind: "page" } | { kind: "box"; el: HTMLElement } | { kind: "nowhere" };

let lastTap: { control: Element; top: number; at: number } | null = null;
let stopWatching: (() => void) | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * What scrolls to bring `el` nearer: the nearest box around it that scrolls
 * up and down and has somewhere to go, else the page; nowhere when it rides
 * in something fixed or stuck to the screen. Asked each frame: a sheet's box
 * has nowhere to go until the part in it has opened.
 */
function whereOf(el: Element): Where {
  for (let node: Element | null = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    if (node !== el && (style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1) {
      return { kind: "box", el: node as HTMLElement };
    }
    // Held to the screen before anything that scrolls is reached: scrolling brings it no nearer.
    if (style.position === "fixed" || style.position === "sticky") return { kind: "nowhere" };
  }
  return { kind: "page" };
}

/** The part of the screen `where` is seen through. */
function bandOf(where: Where): { top: number; bottom: number } {
  if (where.kind !== "box") return visibleBand();
  const box = where.el.getBoundingClientRect();
  return { top: Math.max(0, box.top), bottom: Math.min(window.innerHeight, box.bottom) };
}

function moveBy(where: Where, by: number): void {
  // At once, whatever the scroll behaviour set on it says: the glide is made here, a frame at a time.
  const jump = { top: by, left: 0, behavior: "instant" as ScrollBehavior };
  if (where.kind === "page") window.scrollBy(jump);
  else if (where.kind === "box") {
    if (typeof where.el.scrollBy === "function") where.el.scrollBy(jump);
    else where.el.scrollTop += by;
  }
}

/** Whether what opened says it is still filling: itself, or anything in it. */
function isFilling(part: Element): boolean {
  if (part.getAttribute("aria-busy") === "true") return true;
  return typeof part.querySelector === "function" && part.querySelector(BUSY) !== null;
}

/** Ends the following. Safe to call at any time. */
export function endShowOpened(): void {
  stopWatching?.();
}

/** Whether the page is being moved for something that has opened. */
export function isShowingOpened(): boolean {
  return stopWatching !== null;
}

/**
 * Moves the page (or the sheet that holds it) with `part` as it opens, until
 * its end is in sight or its top has reached the top of the band.
 *
 *  - `head`: the control that opened it. It is kept in sight with the part,
 *    and its top is the top that may not leave the screen.
 *  - `whole`: what the part belongs to, when its end should be in sight too.
 *  - `tapped`: where the head's top stood when the reader tapped it, from
 *    the top of the screen. Words that go on push their own control down
 *    the page, and the place to keep is where the reader's thumb was.
 *  - `smooth`: the glide. Off when Purify's motion is off, unless said.
 *
 * Returns a stop. One opening is followed at a time: a new one ends the last.
 */
export function showOpened(
  part: Element,
  { head = null, whole = null, tapped = null, smooth }: { head?: Element | null; whole?: Element | null; tapped?: number | null; smooth?: boolean } = {},
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  endShowOpened();
  const glide = smooth ?? !prefersReducedMotion();
  const began = now();
  // When it arrived: as it opened, or when it last said it was still filling.
  let arrived = began;
  let last = began;
  let moved = 0;
  let steady = 0;
  let frame = 0;
  let first = true;
  let done = false;

  function stop() {
    if (done) return;
    done = true;
    if (frame) window.cancelAnimationFrame(frame);
    for (const type of HAND_EVENTS) window.removeEventListener(type, stop);
    if (stopWatching === stop) stopWatching = null;
  }

  function look() {
    if (done) return;
    if (!part.isConnected) {
      stop();
      return;
    }
    const at = now();
    const ms = first ? 16 : at - last;
    last = at;

    const where = whereOf(part);
    let by = 0;
    if (where.kind !== "nowhere") {
      const band = bandOf(where);
      const box = part.getBoundingClientRect();
      const lead = head && head.isConnected ? head.getBoundingClientRect() : null;
      // The top that may not leave the screen: the control's, or where the
      // reader's thumb was when the control has since been carried down.
      let top = lead ? lead.top : box.top;
      if (tapped !== null) top = Math.min(top, tapped - moved);
      let bottom = Math.max(box.bottom, lead ? lead.bottom : box.bottom);
      if (whole && whole.isConnected) bottom = Math.max(bottom, whole.getBoundingClientRect().bottom);
      // Opened where the reader is not looking: it is not gone to.
      if (first && top > band.bottom) {
        stop();
        return;
      }
      by = moveFor({ top, bottom, roof: band.top, floor: band.bottom });
      const step = stepFor(by, ms, glide);
      if (step > 0) {
        moveBy(where, step);
        moved += step;
      }
    }
    first = false;
    steady = by < 0.5 ? steady + 1 : 0;
    // Still filling: it has not arrived, and being still is not being done.
    const filling = isFilling(part);
    if (filling) arrived = at;
    const spent = at - arrived;
    if (at - began >= BUSY_WATCH_MS || (!filling && (spent >= WATCH_MS || (steady >= STEADY_FRAMES && spent >= SETTLE_MS)))) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(look);
  }

  for (const type of HAND_EVENTS) window.addEventListener(type, stop, { passive: true });
  stopWatching = stop;
  // Once now, before the page is painted, then frame by frame.
  look();
  return stop;
}

/**
 * Call from a capturing `click` listener on the document. Remembers the
 * control under the thumb and where it stood; a tap on anything else forgets
 * the last, so an opening is only ever the answer to the tap before it.
 */
export function noteOpeningTap(event: { target: EventTarget | null }): void {
  if (typeof window === "undefined") return;
  const target = event.target as Element | null;
  const control = target && typeof target.closest === "function" ? target.closest(CONTROL) : null;
  lastTap = control ? { control, top: control.getBoundingClientRect().top, at: now() } : null;
}

/**
 * Call when the reader moves the page with their own hand (a drag, a wheel).
 * What they tapped before it is no longer where it was, and what opens after
 * it is not followed.
 */
export function noteReaderMoved(): void {
  lastTap = null;
}

/**
 * Call when an element's `aria-expanded` or `open` has changed. If it has
 * turned to open and it is the control the reader has just tapped (or the
 * `<details>` of the `<summary>` they tapped), follows what it opens.
 * Answers whether it did, for the test and nothing else.
 */
export function followIfOpened(el: Element): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const tap = lastTap;
  if (!tap || now() - tap.at > TAP_MS) return false;

  let control: Element | null = null;
  let part: Element | null = null;
  if (el.tagName === "DETAILS") {
    if (!(el as HTMLDetailsElement).open) return false;
    control = tap.control.tagName === "SUMMARY" && tap.control.parentElement === el ? tap.control : null;
    part = el;
  } else {
    if (el.getAttribute("aria-expanded") !== "true") return false;
    control = el;
    // One part, or several (a post's quote and its own words unfold together): the one that ends lowest.
    for (const name of (el.getAttribute("aria-controls") ?? "").split(/\s+/)) {
      const named = name ? document.getElementById(name) : null;
      if (named && (!part || named.getBoundingClientRect().bottom > part.getBoundingClientRect().bottom)) part = named;
    }
  }
  if (!control || control !== tap.control || !part) return false;
  if (control.matches(TYPED_IN)) return false;
  if (control.closest(`[${IN_PLACE_ATTR}]`) || part.closest(`[${IN_PLACE_ATTR}]`)) return false;

  lastTap = null;
  showOpened(part, { head: control, whole: part.closest(`[${WHOLE_ATTR}]`) ?? control.closest(`[${WHOLE_ATTR}]`), tapped: tap.top });
  return true;
}

/** Test seam. */
export function resetShowOpenedForTests(): void {
  endShowOpened();
  lastTap = null;
  stopWatching = null;
}

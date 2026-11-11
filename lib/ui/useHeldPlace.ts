"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

// A page that changes above the finger.
//
// A reader marks a day of a reading plan read. The card over the list turns
// to the next day, which is taller or shorter than the last, and a line of
// days in a row comes in over the list: the circle the finger was on moved
// 41px on one plan and up to 48px on another (fresh eyes L3,
// docs/1.9-build/notes/fresh-eyes.md; his build 93 note 16 kind, "a page
// that jumps under the finger").
//
// Two parts keep it still:
//
//  - useHeldPlace: at the tap, where the pressed thing stands on the screen
//    is kept, and for a moment after, each time the page is drawn, the page
//    is scrolled by whatever the thing has moved, before the reader sees it.
//    What grew above the finger goes up off the screen instead of pushing
//    the finger's place down.
//  - useNoShrink: a part of the page that does not get shorter under a tap.
//    Scrolling cannot answer a part that shrinks at the very top of a page,
//    where there is nothing above to scroll to, so at the tap the part over
//    the list is told to stay as tall as it is.
//
// A page that gets shorter BELOW the finger is not held here: the page keeps
// the length the reader is looking at after any tap, from one mount at the
// root (lib/ui/keepLength.ts). The two meet without quarrel: that one lets go
// the moment it sees the pressed thing has moved in the page, which is the
// very case this one answers.

/** For how long after a tap the pressed thing is kept in its place. */
export const HOLD_MS = 600;

/**
 * Where the page must be scrolled to put a thing back where it was on the
 * screen: by as much as it moved, within what the page can scroll.
 */
export function scrollToHold({ was, now, scrollY, max }: { was: number; now: number; scrollY: number; max: number }): number {
  return Math.min(Math.max(0, scrollY + (now - was)), Math.max(0, max));
}

/**
 * Returns `hold(el)`, called in the tap with the thing that was pressed,
 * before the change it makes.
 */
export function useHeldPlace(): (el: Element | null) => void {
  const letGo = useRef<() => void>(() => {});
  useEffect(() => () => letGo.current(), []);
  return useCallback((el: Element | null) => {
    if (!el || typeof window === "undefined") return;
    letGo.current();
    const was = el.getBoundingClientRect().top;
    const until = performance.now() + HOLD_MS;
    let frame = 0;
    let holding = true;
    // The reader's next touch is theirs. A finger that starts to scroll within the moment of the hold would
    // otherwise be scrolled straight back; the hold lets go the instant the reader reaches for the page again.
    const theirs = ["touchstart", "pointerdown", "wheel", "keydown"] as const;
    const stop = () => {
      holding = false;
      cancelAnimationFrame(frame);
      for (const e of theirs) window.removeEventListener(e, stop, true);
    };
    for (const e of theirs) window.addEventListener(e, stop, { capture: true, passive: true });
    letGo.current = stop;
    const keep = () => {
      if (!holding) return;
      // The thing left the page (its row was drawn anew): nothing to keep.
      if (!el.isConnected) return stop();
      const now = el.getBoundingClientRect().top;
      if (Math.abs(now - was) >= 0.5) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const top = scrollToHold({ was, now, scrollY: window.scrollY, max });
        if (Math.abs(top - window.scrollY) >= 0.5) window.scrollTo({ top, behavior: "instant" });
      }
      if (performance.now() < until) frame = requestAnimationFrame(keep);
      else stop();
    };
    // Each frame is asked before it is drawn, so the answer is in the same drawing as the change.
    frame = requestAnimationFrame(keep);
  }, []);
}

/**
 * A part of the page that does not get shorter under a tap: `ref` goes on
 * it, and `keep()` is called in the tap, before the change it makes.
 *
 * Nothing is written on the page until a tap. At the tap the part is told to
 * stay as tall as it is, to the fraction, which changes nothing; whatever the
 * tap then does, it cannot get shorter. (It was first told so as the page
 * was drawn, rounded up to a whole pixel: that set a reading plan's days
 * under a pixel lower at rest, and on one plan put a day on the screen's
 * foot, half risen. Then it was told nothing until it had grown: a part
 * that got SHORTER at the first tap, the Gospel of John's card turning to a
 * shorter day, was held by nothing and the circle went up 6.9px.)
 *
 * What it gains in the moment after a tap, it gains by whole pixels. A page
 * scrolls by whole pixels (halves on a sharp screen), so a part that grew by
 * 41.4px left the pressed thing four tenths of a pixel off after the page
 * had answered; grown by 42, it is answered exactly.
 *
 * A new width (the phone turned) starts it afresh.
 */
export function useNoShrink<T extends HTMLElement>(): { ref: RefObject<T | null>; keep: () => void } {
  const ref = useRef<T>(null);
  // How tall it stood at the last tap, how wide, and until when what it gains is that tap's doing.
  const tap = useRef({ base: 0, width: 0, until: 0 });
  const keep = useCallback(() => {
    const el = ref.current;
    if (!el || typeof performance === "undefined") return;
    const base = el.getBoundingClientRect().height;
    tap.current = { base, width: el.offsetWidth, until: performance.now() + HOLD_MS };
    el.style.minHeight = `${base}px`;
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(() => {
      const { base, width, until } = tap.current;
      // Never tapped: it is as it is drawn.
      if (base === 0) return;
      if (el.offsetWidth !== width) {
        tap.current = { base: 0, width: 0, until: 0 };
        el.style.minHeight = "";
        return;
      }
      // What it gains later is not a tap's doing, and is left to the fraction.
      if (performance.now() > until) return;
      const gained = el.getBoundingClientRect().height - base;
      if (gained > 0.01) el.style.minHeight = `${base + Math.ceil(gained - 0.01)}px`;
    });
    watch.observe(el);
    return () => {
      watch.disconnect();
      el.style.minHeight = "";
    };
  }, []);
  return { ref, keep };
}

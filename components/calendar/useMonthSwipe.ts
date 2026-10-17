"use client";

import { useEffect, useRef, type RefObject } from "react";

/** The house curve (--ease-house in app/globals.css), for the Web Animations API. */
export const HOUSE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Whether the app's motion is on. One switch, `data-motion` on <html>
 * (lib/ui/motionPrepaint.ts), never the system's own setting: the phone apps
 * keep their motion on a phone set to reduce it, and a reader's own choice
 * in Settings has to reach this as it reaches the CSS.
 */
export function motionOn(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "full";
}

/** How far the month moves under the finger: half the finger's travel, to a point. */
const FOLLOW = 0.5;
const MAX_SHIFT = 96;
/** Past this, or a quick flick past FLICK_MIN, the month turns. */
const TURN_AT = 64;
const FLICK_MIN = 24;
const FLICK_SPEED = 0.45; // px per ms
/** Movement before the gesture is read as sideways or as a scroll. */
const SLOP = 8;
/** The click a drag ends with opens no day. */
const SWALLOW_MS = 400;

/**
 * A month the reader pushes aside with a finger (1.7.1), the way a phone's
 * own calendar turns its months.
 *
 * A sideways drag on the grid moves the month with the finger, held back to
 * half its travel, since the next month is not drawn beside this one. Let go
 * past TURN_AT, or flick, and `turn` is called with +1 for the next month and
 * -1 for the one before: a push to the left brings the next month, and in
 * Arabic and Urdu, read right to left, a push to the right does. Let go short
 * of it and the month goes back to its place.
 *
 * An up and down drag is the page's own scroll: the grid asks the browser
 * for `touch-action: pan-y pinch-zoom`, so a scroll and a pinch never wait on
 * this, and only a sideways drag reaches it. The chevrons beside the month's
 * name do the same thing for a reader who does not swipe, so nothing here is
 * the only way to a month.
 *
 * The finger is followed whether motion is on or off: that is the reader's
 * hand, not an animation. Only the return to place eases, and only with
 * motion on. Everything is written straight to the element's style, so a
 * drag renders nothing in React.
 */
export function useMonthSwipe(ref: RefObject<HTMLElement | null>, turn: (step: 1 | -1) => void): void {
  const turnRef = useRef(turn);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let pointer: number | null = null;
    let x0 = 0;
    let y0 = 0;
    let dx = 0;
    let axis: "x" | "y" | null = null;
    let lastX = 0;
    let lastT = 0;
    let speed = 0;
    let swallowUntil = 0;

    const settle = () => {
      const from = el.style.transform;
      const fade = el.style.opacity;
      el.style.transform = "";
      el.style.opacity = "";
      if (from && motionOn()) {
        el.animate(
          [
            { transform: from, opacity: fade || "1" },
            { transform: "translateX(0)", opacity: "1" },
          ],
          { duration: 220, easing: HOUSE_EASE },
        );
      }
    };

    const down = (e: PointerEvent) => {
      if (pointer !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointer = e.pointerId;
      x0 = lastX = e.clientX;
      y0 = e.clientY;
      lastT = e.timeStamp;
      dx = 0;
      speed = 0;
      axis = null;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      const ddx = e.clientX - x0;
      const ddy = e.clientY - y0;
      if (axis === null) {
        if (Math.abs(ddx) < SLOP && Math.abs(ddy) < SLOP) return;
        axis = Math.abs(ddx) > Math.abs(ddy) ? "x" : "y";
        if (axis === "x") {
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            // A pointer that has already gone needs no capture.
          }
          for (const a of el.getAnimations()) a.cancel();
        }
      }
      if (axis !== "x") return;
      dx = ddx;
      const dt = e.timeStamp - lastT;
      if (dt > 0) speed = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = e.timeStamp;
      const shift = Math.sign(dx) * Math.min(Math.abs(dx) * FOLLOW, MAX_SHIFT);
      el.style.transform = `translateX(${shift.toFixed(1)}px)`;
      el.style.opacity = String(1 - Math.min(Math.abs(shift) / 280, 0.3));
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (axis !== "x") return;
      swallowUntil = e.timeStamp + SWALLOW_MS;
      const far = Math.abs(dx) > TURN_AT || (Math.abs(dx) > FLICK_MIN && Math.abs(speed) > FLICK_SPEED);
      if (!far) {
        settle();
        return;
      }
      const rtl = document.documentElement.dir === "rtl";
      turnRef.current((dx < 0) !== rtl ? 1 : -1);
    };

    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (axis === "x") settle();
    };

    // The click that ends a sideways drag opens no day.
    const click = (e: MouseEvent) => {
      if (e.timeStamp > swallowUntil) return;
      swallowUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    };
    // A day is a link, and a mouse drag on a link starts the browser's own
    // drag of it, which ends this one.
    const dragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("click", click, true);
    el.addEventListener("dragstart", dragStart);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("click", click, true);
      el.removeEventListener("dragstart", dragStart);
    };
  }, [ref]);
}

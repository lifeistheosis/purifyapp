"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * The pixel width of a box, measured before first paint and kept current.
 *
 * The ledger charts draw in pixel units rather than a scaled viewBox, so a
 * 1.25px line is 1.25px on every screen and a dash length computed in JS
 * matches what the browser strokes. That needs the real width. clientWidth
 * is read synchronously in a layout effect so the first frame is already
 * right; the ResizeObserver only handles later changes. Same reasoning as
 * useNarrowWidth in charts.tsx, which this is a narrower copy of.
 *
 * Returns 0 until mounted, which every chart treats as "draw nothing yet".
 */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.clientWidth));
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return [ref, width];
}

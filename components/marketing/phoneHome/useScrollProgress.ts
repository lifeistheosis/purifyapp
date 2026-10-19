"use client";

import { useEffect, type RefObject } from "react";

import { useReducedMotion } from "@/lib/ui/motion";

/**
 * Where a piece of the phone front page stands in its scroll, written as
 * `--p` (0 to 1) on an element, once a frame while the page moves. The
 * transforms that read it are plain CSS, so the pictures move on the
 * compositor and React never renders on scroll.
 *
 * `progress` is handed the top of `watch` on the screen, the screen's height
 * and the page's scroll, each frame. `watch` is measured once (and again when
 * the page or the window changes size), so a frame costs no layout read: it
 * should be an element that does not move itself, the section around a stage
 * rather than the stage.
 *
 * Behind Purify's motion switch: with motion off (lib/ui/motion, the
 * data-motion answer), nothing listens and `--p` stays at `rest`, the pose
 * the page is drawn in.
 */
export function useScrollProgress(
  watch: RefObject<HTMLElement | null>,
  write: RefObject<HTMLElement | null>,
  progress: (top: number, viewport: number, scrollY: number) => number,
  rest: number,
): void {
  const reduced = useReducedMotion();

  useEffect(() => {
    const watched = watch.current;
    const target = write.current;
    if (!watched || !target) return;
    if (reduced) {
      target.style.setProperty("--p", String(rest));
      return;
    }
    let docTop = 0;
    let viewport = 1;
    let frame = 0;
    // The phone page is in the front page's HTML at every width and hidden
    // from 768px: there a frame does nothing, until the window is narrowed.
    let hidden = false;
    const measure = () => {
      viewport = window.innerHeight || 1;
      hidden = watched.offsetParent === null;
      docTop = watched.getBoundingClientRect().top + window.scrollY;
    };
    const draw = () => {
      frame = 0;
      if (hidden) return;
      const y = window.scrollY;
      const p = Math.min(1, Math.max(0, progress(docTop - y, viewport, y)));
      target.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    draw();
    const grows = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
    grows?.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      grows?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      target.style.setProperty("--p", String(rest));
    };
  }, [watch, write, progress, rest, reduced]);
}

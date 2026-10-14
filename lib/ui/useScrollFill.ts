import { useEffect, type RefObject } from "react";

/**
 * A progress bar that a page's scroll moves: the fill's transform is written
 * straight from the scroll, once a frame, with no React render and no CSS
 * transition.
 *
 * WHY NOT A VALUE. The reading bars on a saint's work and on a Bible chapter
 * used to put the scroll fraction in React state and hand it to ProgressBar,
 * whose fill eases to a new value over 150 ms. On every frame of a scroll
 * that was a render, a commit, and a transition cancelled and started again
 * (three transition events dispatched each time). Traced on 2026-10-14 at a
 * phone's size with the processor slowed four times, six swipes on a long
 * work cost 1,378 ms of script and 461 ms of style and layout, against 515
 * and 212 on Discover, and the owner's Android phone showed it as a page that
 * stuttered. The fill also trailed the thumb by the length of the easing.
 *
 * The page's height is read again only when it changes (a ResizeObserver on
 * the body: a work's text landing, a section opening), not on every frame.
 *
 * `onFrame` gets the fraction and the scroll position on the same frames, for
 * a reader that also notes where the reader is (the Bible's last-read verse).
 */
export function useScrollFill(
  fillRef: RefObject<HTMLDivElement | null>,
  onFrame?: (fraction: number) => void,
): void {
  useEffect(() => {
    let total = 0;
    let ticking = false;
    let frame = 0;
    const measure = () => {
      total = document.documentElement.scrollHeight - window.innerHeight;
    };
    const draw = () => {
      ticking = false;
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      const fill = fillRef.current;
      if (fill) fill.style.transform = `scaleX(${p})`;
      onFrame?.(p);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = requestAnimationFrame(draw);
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
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      grows?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // Pass a stable onFrame (useCallback), or the listeners are set up again
    // on every render.
  }, [fillRef, onFrame]);
}

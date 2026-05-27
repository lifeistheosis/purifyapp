"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slim 2px gold progress bar at the top of a saint-work reader on
 * mobile. Anchored under the 48px MobileTopBar. Scroll-driven; the
 * gold fill scales from 0→1 as the reader moves through the document.
 *
 * Reuses the requestAnimationFrame throttling pattern from
 * `ReadingProgressBar` (Bible reader) but skips the verse-context
 * strip, saint works don't have verse-locator semantics.
 */
export function MobileWorkProgressBar() {
  const [progress, setProgress] = useState(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    function compute() {
      tickingRef.current = false;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      setProgress(p);
    }
    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      // Sits flush under the 48px MobileTopBar.
      className="md:hidden fixed left-0 right-0 top-12 z-30 h-[2px] bg-white/5"
    >
      <div
        className="h-full bg-gold origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the window has been scrolled past `threshold` pixels.
 * Used by the top nav to fade in its dark background after the hero.
 */
export function useScrolled(threshold = 32) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

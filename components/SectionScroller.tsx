"use client";

import { useEffect } from "react";

export function SectionScroller() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mqReduce.matches) return;

    let isAnimating = false;
    let currentIndex = 0;
    let touchStartY = 0;

    function getSections(): HTMLElement[] {
      return Array.from(
        document.querySelectorAll<HTMLElement>("main > section"),
      );
    }

    // Sync currentIndex with what's actually onscreen (handles refresh, anchor jumps).
    function detectCurrent(): number {
      const sections = getSections();
      const mid = window.scrollY + window.innerHeight / 2;
      for (let i = 0; i < sections.length; i++) {
        if (
          mid >= sections[i].offsetTop &&
          mid < sections[i].offsetTop + sections[i].offsetHeight
        )
          return i;
      }
      return Math.max(
        0,
        Math.min(sections.length - 1, Math.round(window.scrollY / window.innerHeight)),
      );
    }

    function go(dir: 1 | -1) {
      if (isAnimating) return;
      const sections = getSections();
      const next = Math.max(0, Math.min(sections.length - 1, currentIndex + dir));
      if (next === currentIndex) return;
      currentIndex = next;
      isAnimating = true;
      const target = sections[next].offsetTop;
      window.scrollTo({ top: target, behavior: "smooth" });
      // Release the lock when we've effectively reached the target (or after a safety timeout).
      const start = performance.now();
      const tick = () => {
        const dy = Math.abs(window.scrollY - target);
        const elapsed = performance.now() - start;
        if (dy < 2 || elapsed > 1500) {
          isAnimating = false;
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    function onWheel(e: WheelEvent) {
      if (mqMobile.matches) return;
      // Block all native scroll - motion must be section-to-section only.
      e.preventDefault();
      if (isAnimating || e.deltaY === 0) return;
      go(e.deltaY > 0 ? 1 : -1);
    }

    function onKey(e: KeyboardEvent) {
      if (mqMobile.matches) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === " "
      ) {
        e.preventDefault();
        if (!isAnimating) go(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (!isAnimating) go(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        if (isAnimating) return;
        isAnimating = true;
        currentIndex = 0;
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => (isAnimating = false), 900);
      } else if (e.key === "End") {
        e.preventDefault();
        if (isAnimating) return;
        const s = getSections();
        currentIndex = s.length - 1;
        isAnimating = true;
        s[s.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => (isAnimating = false), 1200);
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (mqMobile.matches) return;
      touchStartY = e.touches[0]?.clientY ?? 0;
    }
    function onTouchMove(e: TouchEvent) {
      if (mqMobile.matches) return;
      e.preventDefault();
    }
    function onTouchEnd(e: TouchEvent) {
      if (mqMobile.matches) return;
      const endY = e.changedTouches[0]?.clientY ?? 0;
      const dy = touchStartY - endY;
      if (Math.abs(dy) < 40 || isAnimating) return;
      go(dy > 0 ? 1 : -1);
    }

    currentIndex = detectCurrent();

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}

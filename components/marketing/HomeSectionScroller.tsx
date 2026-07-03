"use client";

import { useEffect, useState } from "react";

/**
 * Desktop-only "one tap, one section" scroll control for the marketing
 * home page. Each home section is a full-viewport panel; this floating
 * button advances to the *next* section's top on every tap, so the page
 * settles cleanly on a section instead of stopping mid-panel the way a
 * fixed-distance scroll would.
 *
 * It reads the live section geometry on each click (rather than caching
 * offsets) so it stays correct after the SeasonBanner appears/disappears
 * or the layout reflows. When the reader reaches the last section the
 * chevron flips to an up-arrow and the same button returns them to the top.
 *
 * Hidden on phones (`hidden md:flex`); the mobile shell owns that space.
 */
export function HomeSectionScroller() {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 64;
      setAtEnd(nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function sectionTops(): number[] {
    // De-duplicate near-identical offsets (nested sections, banners) so a
    // single tap never lands on two stacked boundaries at once.
    const tops = Array.from(
      document.querySelectorAll<HTMLElement>("main section"),
    ).map((el) => el.offsetTop);
    const unique: number[] = [];
    for (const top of tops.sort((a, b) => a - b)) {
      if (unique.length === 0 || top - unique[unique.length - 1] > 8) {
        unique.push(top);
      }
    }
    return unique;
  }

  function onTap() {
    if (atEnd) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // A press must travel a real distance. With a small epsilon the first
    // section's own top (72px down, behind the sticky header) counted as
    // "next", so the first press was a wasted nudge and the walk to the
    // bottom took one press more than the page has sections. 120px is
    // safely below any section's height and safely above the header offset.
    const y = window.scrollY;
    const next = sectionTops().find((top) => top > y + 120);
    window.scrollTo({
      top: next ?? document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }

  // Centered via a full-width flex wrapper rather than `left-1/2 + translate`,
  // so the button lands on the content's true center (the page content centers
  // within the viewport minus the scrollbar; a raw viewport-center left it
  // sitting slightly off). The wrapper is click-through; only the button isn't.
  return (
    <div className="hidden md:flex fixed inset-x-0 bottom-8 z-40 justify-center pointer-events-none">
      <button
        type="button"
        onClick={onTap}
        aria-label={atEnd ? "Back to top" : "Next section"}
        className="pointer-events-auto flex items-center justify-center h-11 w-11 rounded-full border border-paper/20 bg-night/85 backdrop-blur text-paper/70 shadow-lg transition-colors duration-200 hover:text-paper hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2 motion-safe:animate-[scroller-nudge_2.4s_ease-in-out_infinite]"
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={atEnd ? "rotate-180" : ""}
        >
          <path d="M12 5 L12 18" />
          <path d="M6 12 L12 19 L18 12" />
        </svg>
      </button>
    </div>
  );
}

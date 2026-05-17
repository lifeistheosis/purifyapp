"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { nextChapter, getBook } from "@/lib/bible/books";

/**
 * Floating "Next chapter →" pill, mobile-only. Appears once the user
 * has scrolled past ~60% of the chapter. Hidden if there is no next
 * chapter (last chapter of Revelation).
 */
export function MobileNextChapterFab({
  slug,
  chapter,
}: {
  slug: string;
  chapter: number;
}) {
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  const next = nextChapter(slug, chapter);
  const nextBookName = next ? getBook(next.slug)?.name : null;

  useEffect(() => {
    if (!next) return;

    function compute() {
      tickingRef.current = false;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const p = window.scrollY / total;
      setVisible(p > 0.6);
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
  }, [next]);

  if (!next || !nextBookName) return null;

  const sameBook = next.slug === slug;
  const label = sameBook
    ? `Chapter ${next.chapter} →`
    : `${nextBookName} 1 →`;

  return (
    <Link
      href={`/bible/${next.slug}/${next.chapter}`}
      aria-label={`Go to ${nextBookName} ${next.chapter}`}
      className={`md:hidden fixed bottom-5 right-5 z-40 rounded-pill bg-[#d4af37] text-[#161219] font-sans font-semibold text-[14px] px-4 h-[44px] inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-all duration-200 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      {label}
    </Link>
  );
}

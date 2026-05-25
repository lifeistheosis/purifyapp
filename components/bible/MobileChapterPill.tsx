"use client";

import Link from "next/link";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";

/**
 * Hoisted out of the pill body so React (and the new
 * `react-hooks/static-components` rule) sees it as a stable component
 * definition rather than one re-created on every render.
 */
function Arrow({
  target,
  label,
  dir,
}: {
  target: { slug: string; chapter: number } | null;
  label: string;
  dir: "‹" | "›";
}) {
  if (!target) {
    return (
      <span
        aria-hidden
        className="h-10 w-10 inline-flex items-center justify-center text-paper/25 font-sans text-[20px] leading-none"
      >
        {dir}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      className="h-10 w-10 inline-flex items-center justify-center text-paper/85 hover:text-paper font-sans text-[20px] leading-none"
    >
      {dir}
    </Link>
  );
}

/**
 * Mobile-only YouVersion-style chapter pill. Always visible (not scroll-gated)
 * and centered above the bottom tab bar. Shows the current `<Book> <Chapter>`
 * with ‹ › arrows to step backward and forward through the canon.
 *
 * Replaces the older scroll-gated `MobileNextChapterFab` — that affordance
 * only ever advanced; this one is symmetric, and the center label gives
 * orientation at a glance, like the Bible.com reader.
 *
 * The label tap-target also routes to `/bible` so a reader can pop back to
 * the table of contents (no full book-switcher sheet primitive yet — that
 * lives in `BookChapterSidebar` on desktop).
 */
export function MobileChapterPill({
  slug,
  chapter,
}: {
  slug: string;
  chapter: number;
}) {
  const book = getBook(slug);
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  if (!book) return null;

  return (
    <div
      aria-label="Chapter switcher"
      className="md:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
      // Sit clear of the tab bar AND the iOS home indicator, plus a 12px gap.
      style={{
        bottom:
          "calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-pill bg-night/95 backdrop-blur border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.45)] pl-1 pr-1 py-1">
        <Arrow
          target={prev}
          label={
            prev
              ? `Previous: ${getBook(prev.slug)?.name ?? prev.slug} ${prev.chapter}`
              : "No previous chapter"
          }
          dir="‹"
        />
        <Link
          href="/bible"
          className="px-3 h-10 inline-flex items-center font-sans text-[14px] font-semibold text-paper"
        >
          {book.name} {chapter}
        </Link>
        <Arrow
          target={next}
          label={
            next
              ? `Next: ${getBook(next.slug)?.name ?? next.slug} ${next.chapter}`
              : "No next chapter"
          }
          dir="›"
        />
      </div>
    </div>
  );
}

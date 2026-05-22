"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { BibleBook } from "@/lib/bible/books";
import { cn } from "@/lib/cn";

/**
 * Horizontal scroller of chapter-number pills. Mobile-only, desktop
 * has the sidebar. On mount, scrolls the current chapter into view.
 */
export function MobileChapterStrip({
 book,
 current,
}: {
 book: BibleBook;
 current: number;
}) {
 const containerRef = useRef<HTMLDivElement>(null);
 const activeRef = useRef<HTMLAnchorElement>(null);

 useEffect(() => {
 const c = containerRef.current;
 const a = activeRef.current;
 if (!c || !a) return;
 const cRect = c.getBoundingClientRect();
 const aRect = a.getBoundingClientRect();
 const targetLeft =
 a.offsetLeft - cRect.width / 2 + aRect.width / 2;
 c.scrollTo({ left: targetLeft, behavior: "instant" as ScrollBehavior });
 }, [current, book.slug]);

 if (book.chapters <= 1) return null;

 return (
 <div className="md:hidden mb-5 -mx-5">
 <div
 ref={containerRef}
 className="flex gap-1.5 overflow-x-auto snap-x px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
 >
 {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => {
 const active = ch === current;
 return (
 <Link
 key={ch}
 ref={active ? activeRef : undefined}
 href={`/bible/${book.slug}/${ch}`}
 aria-current={active ? "page" : undefined}
 className={cn(
 "shrink-0 snap-start min-w-[42px] h-[36px] rounded-pill border flex items-center justify-center font-sans text-[13px] font-medium transition-colors",
 active
 ? "bg-gold/20 border-gold/55 text-[#f4dc91]"
 : "border-paper/15 bg-paper/[0.04] text-paper/75 hover:bg-paper/10 hover:text-paper",
 )}
 >
 {ch}
 </Link>
 );
 })}
 </div>
 </div>
 );
}

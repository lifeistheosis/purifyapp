"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slim sticky progress bar at the top of a chapter, plus a mobile-only
 * context strip showing "Book Chapter · v12 of 35". Driven by scroll.
 *
 * - 2px gold bar fills left→right as the user scrolls.
 * - Current-verse detection: the topmost <div id="v..."> below the
 * navbar offset is "current".
 * - Throttled with requestAnimationFrame.
 */
export function ReadingProgressBar({
 bookName,
 chapter,
 totalVerses,
}: {
 bookName: string;
 chapter: number;
 totalVerses: number;
}) {
 const [progress, setProgress] = useState(0);
 const [currentVerse, setCurrentVerse] = useState<number>(1);
 const tickingRef = useRef(false);

 useEffect(() => {
 const NAV_OFFSET = 88; // 72 navbar + a little breathing room

 function compute() {
 tickingRef.current = false;
 const doc = document.documentElement;
 const total = doc.scrollHeight - window.innerHeight;
 const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
 setProgress(p);

 // Find the topmost verse anchor still on screen.
 let cur = 1;
 const nodes = document.querySelectorAll<HTMLElement>('[id^="v"]');
 for (const n of nodes) {
 const id = n.id;
 if (!/^v\d+$/.test(id)) continue;
 const top = n.getBoundingClientRect().top;
 if (top <= NAV_OFFSET + 4) {
 cur = parseInt(id.slice(1), 10);
 } else {
 break;
 }
 }
 setCurrentVerse(cur);
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
 <>
 {/* Mobile-only context strip, sits just under the 48px MobileTopBar. */}
 <div className="md:hidden fixed top-12 left-0 right-0 z-30 bg-night/90 backdrop-blur border-b border-white/8 px-4 py-1.5 pointer-events-none">
 <p className="font-sans text-eyebrow text-paper/65 leading-none flex items-center gap-1.5">
 <span className="font-semibold text-paper/85">
 {bookName} {chapter}
 </span>
 <span className="text-paper/35">·</span>
 <span className="tabular-nums">
 v{currentVerse} of {totalVerses}
 </span>
 </p>
 </div>

 {/* Progress bar, slim gold fill. On mobile it sits under the
 context strip (48px top bar + ~32px strip = top-20). On
 desktop it sits flush under the 72px AppNav. */}
 <div
 aria-hidden
 className="fixed left-0 right-0 z-30 h-[2px] bg-white/5 top-[80px] md:top-[72px]"
 >
 <div
 className="h-full bg-gold origin-left transition-transform duration-150 ease-out"
 style={{ transform: `scaleX(${progress})` }}
 />
 </div>
 </>
 );
}

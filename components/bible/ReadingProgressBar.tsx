"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { writeLastRead } from "@/lib/bible/lastRead";

/**
 * Slim sticky progress bar at the top of a chapter, plus a mobile-only
 * context strip showing "Book Chapter · v12 of 35". Driven by scroll.
 *
 * - 2px gold bar fills left→right as the user scrolls.
 * - Current-verse detection: the topmost <div id="v..."> below the
 * navbar offset is "current".
 * - Throttled with requestAnimationFrame.
 * - Persists the live in-view verse to `purify:bible:last` (debounced) so the
 * mobile "Continue reading" card can resume at the verse, not the chapter top.
 * This is the sole writer of that key (it runs `compute()` on mount, so it
 * records the chapter immediately too).
 */
export function ReadingProgressBar({
 slug,
 bookName,
 chapter,
 totalVerses,
}: {
 slug: string;
 bookName: string;
 chapter: number;
 totalVerses: number;
}) {
  const { t } = useTranslate();
 const [progress, setProgress] = useState(0);
 const [currentVerse, setCurrentVerse] = useState<number>(1);
 const tickingRef = useRef(false);

 useEffect(() => {
 const NAV_OFFSET = 88; // 72 navbar + a little breathing room

 let lastWriteTs = 0;
 let pendingVerse = 1;
 let writeTimer: ReturnType<typeof setTimeout> | null = null;

 function write(verse: number) {
 lastWriteTs = Date.now();
 writeLastRead({ book: slug, bookName, chapter, verse, totalVerses, ts: lastWriteTs });
 }

 // Throttle: write at most ~once/750ms so scrolling doesn't thrash
 // localStorage. A trailing timer guarantees the final position lands.
 function persist(verse: number) {
 pendingVerse = verse;
 if (Date.now() - lastWriteTs >= 750) {
 write(verse);
 } else if (!writeTimer) {
 writeTimer = setTimeout(() => {
 writeTimer = null;
 write(pendingVerse);
 }, 750);
 }
 }

 function flush() {
 if (writeTimer) {
 clearTimeout(writeTimer);
 writeTimer = null;
 }
 write(pendingVerse);
 }

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
 persist(cur);
 }

 function onScroll() {
 if (tickingRef.current) return;
 tickingRef.current = true;
 requestAnimationFrame(compute);
 }

 function onHide() {
 if (document.visibilityState === "hidden") flush();
 }

 compute();
 window.addEventListener("scroll", onScroll, { passive: true });
 window.addEventListener("resize", onScroll);
 window.addEventListener("pagehide", flush);
 document.addEventListener("visibilitychange", onHide);
 return () => {
 window.removeEventListener("scroll", onScroll);
 window.removeEventListener("resize", onScroll);
 window.removeEventListener("pagehide", flush);
 document.removeEventListener("visibilitychange", onHide);
 if (writeTimer) clearTimeout(writeTimer);
 };
 }, [slug, bookName, chapter, totalVerses]);

 return (
 <>
 {/* Mobile-only context strip, sits just under the 48px MobileTopBar.
     below-topbar adds the status-bar inset on native so it clears the bar. */}
 <div className="md:hidden fixed top-12 below-topbar left-0 right-0 z-30 bg-night/90 backdrop-blur border-b border-white/8 px-4 py-1.5 pointer-events-none">
 <p className="font-sans text-eyebrow text-paper/65 leading-none flex items-center gap-1.5">
 <span className="font-semibold text-paper/85">
 {bookName} {chapter}
 </span>
 <span className="text-paper/35">·</span>
 <span className="tabular-nums">
 {t("bible.verseOf", { verse: currentVerse, total: totalVerses })}
 </span>
 </p>
 </div>

 {/* Progress bar, slim gold fill. On mobile it sits under the
 context strip (48px top bar + ~32px strip = top-20). On
 desktop it sits flush under the 72px AppNav. */}
 <div
 aria-hidden
 className="fixed left-0 right-0 z-30 h-[2px] bg-white/5 top-[80px] below-topbar-line md:top-[72px]"
 >
 <div
 className="h-full bg-gold origin-left transition-transform duration-150 ease-out"
 style={{ transform: `scaleX(${progress})` }}
 />
 </div>
 </>
 );
}

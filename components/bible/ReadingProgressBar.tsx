"use client";

import { useEffect, useRef, useState } from "react";
import { writeLastRead } from "@/lib/bible/lastRead";
import { ProgressBar } from "@/components/ui/ProgressBar";

/**
 * Slim sticky progress bar at the top of a chapter. Driven by scroll.
 *
 * - 2px gold bar fills left→right as the user scrolls.
 * - Current-verse detection: the topmost <div id="v..."> below the
 * navbar offset is "current".
 * - Throttled with requestAnimationFrame.
 * - Persists the live in-view verse to `purify:bible:last` (debounced) so the
 * mobile "Continue reading" card can resume at the verse, not the chapter top.
 * This is the sole writer of that key (it runs `compute()` on mount, so it
 * records the chapter immediately too), which is why the component survives
 * even though ChapterStickyHeader now draws the only visible bar.
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
 const [progress, setProgress] = useState(0);
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
 // This component used to also render a mobile context strip reading
 // "{book} {chapter} · v {n} of {total}". ChapterStickyHeader says the same
 // thing, at the same coordinates, from the same parent, so the two bars
 // stacked and the header's 85% backdrop ghosted the strip's text through it
 // at a different size and alignment. Worse, each tracked the current verse by
 // its own rule (largest intersection ratio here, topmost anchor there), so the
 // two numbers on screen could disagree. The strip is gone; the header is the
 // one bar. What stays here is the part nothing else does: the scroll effect
 // above is the sole writer of purify:bible:last (lib/bible/lastRead.ts).
 //
 // Progress line, slim gold fill, pinned to the bar's bottom edge on mobile and
 // flush under the 72px AppNav on desktop. z-50 because the sticky header is
 // z-40 and renders after this in the parent: at equal z the header would paint
 // over the line exactly when the reader has scrolled far enough to want it.
 // Sheets are z-[60] and still cover it; the z-50 tab bar is at the far end of
 // the screen.
 <div
 aria-hidden
 className="fixed left-0 right-0 z-50 top-12 below-topbar md:top-[72px]"
 >
 {/* Decorative, and scroll-driven: 150ms so the fill tracks the thumb
     instead of trailing it. */}
 <ProgressBar value={progress} height={2} durationMs={150} />
 </div>
 );
}

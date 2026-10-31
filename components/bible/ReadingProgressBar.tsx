"use client";

import { useEffect, useRef } from "react";
import { arrivalVerse, readLastRead, verseOfHash, writeLastRead } from "@/lib/bible/lastRead";
import { verseAtReadingPlace } from "@/lib/bible/verseInView";
import { watchOwnScroll } from "@/lib/ui/ownScroll";
import { ProgressBar } from "@/components/ui/ProgressBar";

/**
 * Slim progress line along the top of a chapter, and the keeper of the
 * reader's place in it.
 *
 * - The line fills left to right as the page scrolls, on every frame of any
 *   scroll, never through React state.
 * - The place (`purify:bible:last`, lib/bible/lastRead.ts), which the Bible
 *   tab opens on (1.8, the owner's pick A of r3-20, "Straight into the
 *   book") and every Continue reading row offers. This is its one writer.
 *
 * How the place is kept (the owner's note 68 of 2026-10-31). On build 85 a
 * reader who read John 3 down to verse 14 and left by any tap found it kept
 * as verse 1, and a return that landed on verse 16 kept verse 13, the
 * topmost verse on the screen, so every return walked back three verses.
 * Both came from here: every scroll wrote the topmost verse, the jump to the
 * top that comes with leaving among them, and the landing's own glide. Now:
 *
 * - As the chapter opens it is kept at the verse its address lands on (#v16
 *   is 16), or where the reader had it if the place is in it already, or at
 *   its top (arrivalVerse). The landing's glide never moves it.
 * - After that only the reader's own scroll moves it (lib/ui/ownScroll.ts: a
 *   finger, a fling, a wheel, a key, the scroll bar), and it is the verse at
 *   the reading place, not the topmost: the one a return lands on, so leave
 *   at 14 and come back at 14.
 * - A scroll the page makes by itself (leaving, a landing, a place given
 *   back, the verse read aloud kept in view) writes nothing, and nothing is
 *   read from a page the chapter has left.
 *
 * Writes are kept to one each 750ms while the reader scrolls, and the last
 * one is never lost: it lands on a timer, as the page is hidden, or as the
 * chapter goes.
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
 // The scroll moves the fill directly, never through React state: see
 // lib/ui/useScrollFill.ts for what a render and an eased fill on every frame
 // of a scroll cost an Android phone.
 const fill = useRef<HTMLDivElement>(null);

 useEffect(() => {
 let lastWriteTs = 0;
 let written = 0;
 let pending: number | null = null;
 let writeTimer: ReturnType<typeof setTimeout> | null = null;
 let frame = 0;
 let ownSinceFrame = false;

 function write(verse: number) {
 lastWriteTs = Date.now();
 written = verse;
 pending = null;
 writeLastRead({ book: slug, bookName, chapter, verse, totalVerses, ts: lastWriteTs });
 }

 // Throttle: write at most ~once/750ms so scrolling doesn't thrash
 // localStorage. A trailing timer guarantees the final position lands.
 function persist(verse: number) {
 if (verse === written && pending === null) return;
 pending = verse;
 if (Date.now() - lastWriteTs >= 750) {
 write(verse);
 } else if (!writeTimer) {
 writeTimer = setTimeout(() => {
 writeTimer = null;
 if (pending !== null) write(pending);
 }, 750);
 }
 }

 function flush() {
 if (writeTimer) {
 clearTimeout(writeTimer);
 writeTimer = null;
 }
 if (pending !== null) write(pending);
 }

 function onFrame() {
 frame = 0;
 const doc = document.documentElement;
 const total = doc.scrollHeight - window.innerHeight;
 const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
 // Every read of the page comes before the one write below, so a frame
 // never makes the browser work the page out twice.
 const verse = ownSinceFrame ? verseAtReadingPlace() : null;
 ownSinceFrame = false;
 if (fill.current) fill.current.style.transform = `scaleX(${p})`;
 if (verse !== null) persist(verse);
 }

 function onScroll(own: boolean) {
 if (own) ownSinceFrame = true;
 if (!frame) frame = requestAnimationFrame(onFrame);
 }

 // A link inside the chapter to one of its own verses (Daniel 3's Prayer
 // of Azariah): the verse it goes to is the place.
 function onHash() {
 const verse = verseOfHash(window.location.hash);
 if (verse !== null) write(verse);
 }

 function onHide() {
 if (document.visibilityState === "hidden") flush();
 }

 // The chapter as it opens.
 write(arrivalVerse(readLastRead(), { book: slug, chapter }, verseOfHash(window.location.hash)));
 frame = requestAnimationFrame(onFrame);

 const stop = watchOwnScroll(onScroll);
 const onResize = () => onScroll(false);
 window.addEventListener("resize", onResize);
 window.addEventListener("hashchange", onHash);
 window.addEventListener("pagehide", flush);
 document.addEventListener("visibilitychange", onHide);
 return () => {
 stop();
 cancelAnimationFrame(frame);
 window.removeEventListener("resize", onResize);
 window.removeEventListener("hashchange", onHash);
 window.removeEventListener("pagehide", flush);
 document.removeEventListener("visibilitychange", onHide);
 // The reader's last place, if its write was still waiting.
 flush();
 };
 }, [slug, bookName, chapter, totalVerses]);

 return (
 // This component used to also render a mobile context strip reading
 // "{book} {chapter} · v {n} of {total}", and then ChapterStickyHeader drew
 // one of its own; both are gone, and the verse is the pill's second line
 // (ChapterVerseStatus). What stays here is the part nothing else does: the
 // effect above is the sole writer of purify:bible:last
 // (lib/bible/lastRead.ts).
 //
 // Progress line, a slim white fill. On a phone and a tablet it runs along the
 // top of the screen, under the status bar (1.8: the page has no bar for it
 // to sit under, the owner's pick B of round 2; globals.css .reader-progress),
 // and on the computer flush under the 72px AppNav. z-50 because the sticky
 // header is z-40 and renders after this in the parent: at equal z the header
 // would paint over the line exactly when the reader has scrolled far enough
 // to want it. Sheets are z-[60] and still cover it; the z-50 tab bar is at
 // the far end of the screen.
 <div
 aria-hidden
 className="reader-progress fixed left-0 right-0 z-50"
 >
 {/* Decorative, and moved by the scroll itself (onFrame above), with no
     easing: an eased fill trails the thumb. */}
 <ProgressBar value={0} height={2} durationMs={0} fillRef={fill} tone="paper" />
 </div>
 );
}

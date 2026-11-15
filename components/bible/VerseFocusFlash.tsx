"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import { goOnArrival, goToReadingPlace, holdAtReadingPlace } from "@/lib/ui/readingPlace";

// On the server there is no page to read, and useLayoutEffect only warns.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * When a chapter page loads with a `#v123` hash, whether from the
 * BibleSearch result, a shared deep link, or a copy-link click, find
 * the matching verse element, take it to the reading place, and let the rest
 * of the chapter step back for a moment so the eye lands on the right line.
 *
 * The reading place is the standard of lib/ui/readingPlace.ts (1.8, the
 * owner's build 81 note): the middle of what the reader can see between the
 * bars, a short verse centred there. It was the middle of the WINDOW, a
 * quarter of which, at its foot, is the pill, the mini player and the tab
 * bar, so a verse landed on sat low; and it glided there with Purify's
 * motion setting off too.
 *
 * It used to ring the verse in a gold box with a glow. In paragraph view the
 * verses run inline, so that box broke on every line into a stack of outlines
 * with a dark band above (the owner, 2026-10-19, landing on Luke 9:18 from the
 * day's readings), and gold is not Purify's. Now the verses landed on keep
 * their strength and the others go to 0.4, the way read-aloud lights a verse
 * (app/globals.css, data-verse-focus), with no box at all, then all of them
 * come back. The verse element (in VerseRow) is `<div id="v{n}" ...>`; it
 * carries `data-focus="true"` while the moment lasts.
 *
 * Once it has landed, the verse is held at the reading place while the
 * chapter settles (build 90 note 9, the owner: a saved verse of Matthew 1
 * opened at verse 9 of 25 with his Greek on). The chapter is drawn in
 * English first; the Greek, for a reader who keeps it on, is read a moment
 * later and set beside every verse, which about doubles the height above the
 * verse, so the page that had landed on Matthew 5:44 stood at 5:22. Held
 * until the reader moves the page, or for a few seconds at most
 * (lib/ui/readingPlace.ts, holdAtReadingPlace).
 *
 * With motion reduced the chapter a link opens is drawn at its verse from its
 * first frame (Gate 3c rule 3, Updates 89). It was painted at its top, or at
 * the scroll of the page left, and stood at the verse a frame or two later,
 * with the running line a frame behind that: this waited for React's passive
 * effect and then a frame. It goes now while the page is put on screen,
 * before it is painted (lib/ui/readingPlace.ts, goOnArrival). With motion on
 * it glides from the next frame, as it did.
 */
export function VerseFocusFlash() {
 const pathname = usePathname();

 useIsoLayoutEffect(() => {
 let timer: ReturnType<typeof setTimeout> | null = null;
 let letGo: (() => void) | null = null;
 let live = true;

 function focusFromHash(arriving: boolean) {
 const hash = window.location.hash;
 // #v123 -> single verse
 // #v14-26 -> range (search result for "James 2:14-26"); flash all
 const m = hash.match(/^#v(\d+)(?:-(\d+))?$/);
 if (!m) return;
 const from = parseInt(m[1], 10);
 const to = m[2] ? parseInt(m[2], 10) : from;
 if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return;

 const land = () => {
 if (!live) return;
 const head = document.getElementById(`v${from}`);
 if (!head) return;

 const flashed: HTMLElement[] = [];
 const root = document.documentElement;
 for (let n = from; n <= to; n++) {
 const el = document.getElementById(`v${n}`);
 if (el) {
 el.setAttribute("data-focus", "true");
 flashed.push(el);
 }
 }
 // A range stands there together: centred when it is short, its first
 // verse at the reading place when it is not.
 goToReadingPlace(flashed);
 letGo?.();
 letGo = holdAtReadingPlace(flashed);
 root.setAttribute("data-verse-focus", "");
 if (timer) clearTimeout(timer);
 timer = setTimeout(() => {
 for (const el of flashed) el.removeAttribute("data-focus");
 root.removeAttribute("data-verse-focus");
 }, 2000);
 };
 // Arriving, the verse list has mounted and laid out with the page. A
 // change of the hash on the page waits a frame, as it always has.
 if (arriving) goOnArrival(land);
 else requestAnimationFrame(land);
 }

 const onHash = () => focusFromHash(false);
 focusFromHash(true);
 window.addEventListener("hashchange", onHash);
 return () => {
 live = false;
 window.removeEventListener("hashchange", onHash);
 if (timer) clearTimeout(timer);
 letGo?.();
 document.documentElement.removeAttribute("data-verse-focus");
 };
 }, [pathname]);

 return null;
}

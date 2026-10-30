"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { goToReadingPlace } from "@/lib/ui/readingPlace";

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
 */
export function VerseFocusFlash() {
 const pathname = usePathname();

 useEffect(() => {
 let timer: ReturnType<typeof setTimeout> | null = null;

 function focusFromHash() {
 const hash = window.location.hash;
 // #v123 -> single verse
 // #v14-26 -> range (search result for "James 2:14-26"); flash all
 const m = hash.match(/^#v(\d+)(?:-(\d+))?$/);
 if (!m) return;
 const from = parseInt(m[1], 10);
 const to = m[2] ? parseInt(m[2], 10) : from;
 if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return;

 // Defer one frame so the verse list has mounted and laid out.
 requestAnimationFrame(() => {
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
 root.setAttribute("data-verse-focus", "");
 if (timer) clearTimeout(timer);
 timer = setTimeout(() => {
 for (const el of flashed) el.removeAttribute("data-focus");
 root.removeAttribute("data-verse-focus");
 }, 2000);
 });
 }

 focusFromHash();
 window.addEventListener("hashchange", focusFromHash);
 return () => {
 window.removeEventListener("hashchange", focusFromHash);
 if (timer) clearTimeout(timer);
 document.documentElement.removeAttribute("data-verse-focus");
 };
 }, [pathname]);

 return null;
}

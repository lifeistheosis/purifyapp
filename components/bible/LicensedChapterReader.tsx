"use client";

import { useEffect, useRef } from "react";
import { ScriptureAttribution } from "./ScriptureAttribution";
import { Fums } from "./Fums";
import {
 FONT_CLASSES,
 SIZE_CLASSES,
 useReaderPrefs,
} from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";
import type { LicensedChapter } from "@/lib/bible/api-bible";

/**
 * Renders a licensed translation (NKJV/NIV/NLT) exactly as API.Bible delivers
 * it: the chapter HTML is shown verbatim (footnotes included), with no
 * Strong's/interlinear/word-tagging overlay (content integrity), followed by
 * the required attribution and FUMS tracker.
 *
 * The reader's font-family and size preferences DO apply here, they only
 * restyle, never alter, the delivered text, so a licensed chapter honors the
 * same Size/Font controls as the public-domain reader.
 *
 * Footnotes (.f) and cross-references (.x) come back inline in the API HTML.
 * NKJV in particular emits hundreds of cross-refs, which makes the verse line
 * unreadable if shown inline. After hydration we collapse every note to a
 * small superscript marker and relocate the note bodies, verbatim, to a
 * collapsible "Notes & cross-references" section at the foot of the chapter.
 * This is a presentation-only transform (no scripture text is altered, every
 * note is preserved and remains accessible); with JS off, the CSS fallback in
 * globals.css still shows the notes inline.
 */
export function LicensedChapterReader({
 chapter,
 transId,
 translationLabel,
}: {
 chapter: LicensedChapter;
 transId: string;
 translationLabel: string;
}) {
 const { size, font, leadingValue } = useReaderPrefs();
 const contentRef = useRef<HTMLDivElement>(null);
 const notesRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const root = contentRef.current;
 const notesEl = notesRef.current;
 if (!root || !notesEl) return;

 const marks = Array.from(
 root.querySelectorAll<HTMLElement>(".f, .x"),
 );
 notesEl.innerHTML = "";
 if (marks.length === 0) return;

 const items: string[] = [];
 marks.forEach((el, i) => {
 const n = i + 1;
 const isX = el.classList.contains("x");
 const body = el.innerHTML; // verbatim note (fr/ft/fq/fqa or xo/xt)
 items.push(
 `<li id="lic-note-${n}" class="lic-note ${isX ? "lic-note-x" : "lic-note-f"}">` +
 `<a href="#lic-ref-${n}" class="lic-back">${n}</a>` +
 `<span class="lic-note-body">${body}</span></li>`,
 );
 // Collapse the inline note to a compact superscript marker.
 el.className = isX ? "lic-x" : "lic-f";
 el.id = `lic-ref-${n}`;
 el.innerHTML = `<a href="#lic-note-${n}" aria-label="${
 isX ? "Cross reference" : "Footnote"
 } ${n}">${n}</a>`;
 });

 notesEl.innerHTML =
 `<details class="lic-notes"><summary>Notes &amp; cross-references (${marks.length})</summary>` +
 `<ol>${items.join("")}</ol></details>`;

 // Clicking a marker opens the (collapsed) notes section before the
 // browser jumps to the target note.
 function onClick(e: MouseEvent) {
 const a = (e.target as HTMLElement | null)?.closest(
 'a[href^="#lic-note-"]',
 );
 if (!a) return;
 const det = notesEl!.querySelector("details");
 if (det && !det.open) det.open = true;
 }
 root.addEventListener("click", onClick);
 return () => root.removeEventListener("click", onClick);
 }, [chapter.html]);

 return (
 <article>
 <div
 ref={contentRef}
 className={cn(
 // Font-family + size come from the shared reader prefs so the
 // Size/Font pills work identically to the public-domain reader.
 // SIZE_CLASSES sets the base font-size + leading on the container;
 // the API's <p> tags inherit it (they carry no explicit size).
 FONT_CLASSES[font],
 SIZE_CLASSES[size],
 "text-paper/90",
 // `.licensed-scripture` (globals.css) restyles every USX/USFM class
 // the API emits, poetry, red-letter, headings, small-caps, and the
 // inline-note fallback, without altering the delivered text.
 "licensed-scripture",
 )}
 style={leadingValue ? { lineHeight: leadingValue } : undefined}
         dangerouslySetInnerHTML={{ __html: chapter.html }}
 />
 {/* Footnotes & cross-references, relocated here after hydration. */}
 <div ref={notesRef} className={cn(FONT_CLASSES.sans)} />
 <ScriptureAttribution
 transId={transId}
 copyright={chapter.copyright}
 translationLabel={translationLabel}
 />
 <Fums fumsToken={chapter.fumsToken} />
 </article>
 );
}

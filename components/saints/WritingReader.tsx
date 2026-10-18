"use client";

import { useEffect, useRef, useState } from "react";
import type { WritingContent, Section } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import { ParagraphRow } from "./ParagraphRow";
import { VoiceBand } from "./VoiceBand";
import { SectionBookmarkButton } from "./SectionBookmarkButton";
import { MobileWorkPill } from "./MobileWorkPill";
import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import {
  clearPosition,
  loadPosition,
  savePosition,
} from "@/lib/reader/position";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { unitFor } from "@/lib/desktop/presenceModes";
import { inputSince, watchInput } from "@/lib/ui/lastInput";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChaptersList } from "@/components/reading/ChaptersList";
import { recordProgress } from "@/lib/reading/progress";

// Works with this many sections render as an accordion: each section's body
// (and its per-paragraph annotation components) mounts only when the section
// is expanded. This keeps very long works, e.g. Chrysostom's 88 Homilies on
// John, from mounting thousands of paragraph components at once. Shorter
// works render continuously (all sections expanded), unchanged.
const ACCORDION_THRESHOLD = 20;

export function WritingReader({
 saint,
 content,
 openedAt,
}: {
 saint: Saint;
 content: WritingContent;
 /**
  * When the page opened (performance.now()), for a reader whose text
  * arrives after it: LazyWritingReader in the apps. A reader who has
  * touched the page since then is not taken to their saved place.
  */
 openedAt?: number;
}) {
  const { t } = useTranslate();
 const isLong = content.sections.length >= ACCORDION_THRESHOLD;
 const [open, setOpen] = useState<Set<number>>(() => new Set());
 // Shared reader prefs, same provider as the Bible reader, so a font
 // and size chosen in Scripture carry over to the Fathers.
 const { size, font } = useReaderPrefs();

 // Open the place the URL hash names, on load and on change, and scroll it
 // into view: a section (#sN), or one paragraph of it (#p-N-I, 1.8: a
 // passage in a Purify collection opens where it stands,
 // lib/reading/collections.ts). A long work opens the section first. A short
 // one is open already, but in the apps its text lands after the page has
 // opened, so the browser never scrolled to the place: this does.
 useEffect(() => {
 function openFromHash() {
 const m = window.location.hash.match(/^#(?:s(\d+)|p-(\d+)-(\d+))$/);
 if (!m) return;
 const n = Number(m[1] ?? m[2]);
 const target = m[1] ? `s${n}` : `p-${n}-${m[3]}`;
 if (isLong) {
 setOpen((prev) => {
 if (prev.has(n)) return prev;
 const next = new Set(prev);
 next.add(n);
 return next;
 });
 }
 // Defer the scroll until the section body has mounted: a paragraph of a
 // section just opened is in the page a frame or two later.
 const scrollTo = (tries: number) => {
 const el = document.getElementById(target);
 if (el) el.scrollIntoView({ block: "start" });
 else if (tries > 0) requestAnimationFrame(() => scrollTo(tries - 1));
 };
 requestAnimationFrame(() => scrollTo(8));
 }
 openFromHash();
 window.addEventListener("hashchange", openFromHash);
 return () => window.removeEventListener("hashchange", openFromHash);
 }, [isLong]);

 // ── Save / restore reading position ──────────────────────────────────────
 // On mount, if a saved position exists for this saint+work AND the URL
 // doesn't already specify a section, open + scroll to the saved section.
 // The user gets a silent resume; no toast, no modal. If the URL has a
 // hash, that wins (the reader navigated here deliberately).
 //
 // The setOpen call is deferred via a 0-delay timer so it happens outside
 // the effect body proper, matching the project's set-state-in-effect
 // discipline (see InstallPrompt.tsx for the same pattern).
 const lastSectionN = content.sections[content.sections.length - 1]?.n ?? 0;
 const positionRestoredRef = useRef(false);
 useEffect(() => {
 if (positionRestoredRef.current) return;
 positionRestoredRef.current = true;
 if (typeof window === "undefined") return;
 if (window.location.hash) return; // hash overrides resume
 // A reader who has already started on their own is left where they are:
 // in the apps the text lands a moment after the page opens, and taking
 // them to the saved place then was a jump in the middle of their swipe
 // (lib/ui/lastInput.ts).
 watchInput();
 const opened = openedAt ?? performance.now();
 if (inputSince(opened)) return;
 const pos = loadPosition(saint.slug, content.slug);
 if (!pos) return;
 // If they reached the last section, the next visit shouldn't dump
 // them at the end again — treat as completion.
 if (pos.sectionN >= lastSectionN) {
 clearPosition(saint.slug, content.slug);
 return;
 }
 const openTimer = isLong
 ? setTimeout(() => {
 if (inputSince(opened)) return;
 setOpen((prev) => {
 const next = new Set(prev);
 next.add(pos.sectionN);
 return next;
 });
 }, 0)
 : null;
 // Defer scroll so the section body has time to mount in long-work mode.
 const r1 = requestAnimationFrame(() => {
 requestAnimationFrame(() => {
 // And again at the last moment: a thumb that lands between the text
 // arriving and this frame wins.
 if (inputSince(opened)) return;
 document.getElementById(`s${pos.sectionN}`)?.scrollIntoView({ block: "start" });
 });
 });
 return () => {
 if (openTimer) clearTimeout(openTimer);
 cancelAnimationFrame(r1);
 };
 }, [saint.slug, content.slug, isLong, lastSectionN, openedAt]);

 // Observe section visibility and debounce-save the most visible section.
 // We use IntersectionObserver instead of scroll position because section
 // heights vary wildly (one homily might be 50 lines, another 500), so a
 // scroll-percent would lie about where the reader actually is.
 useEffect(() => {
 if (typeof window === "undefined") return;
 const visibleRatios = new Map<number, number>();
 const observer = new IntersectionObserver(
 (entries) => {
 for (const e of entries) {
 const id = e.target.id;
 const m = id.match(/^s(\d+)$/);
 if (!m) continue;
 visibleRatios.set(Number(m[1]), e.intersectionRatio);
 }
 },
 { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-20% 0px -40% 0px" },
 );
 for (const sec of content.sections) {
 const el = document.getElementById(`s${sec.n}`);
 if (el) observer.observe(el);
 }
 let saveTimer: ReturnType<typeof setTimeout> | null = null;
 function scheduleSave() {
 if (saveTimer) clearTimeout(saveTimer);
 saveTimer = setTimeout(() => {
 let bestN = 0;
 let bestR = 0;
 for (const [n, r] of visibleRatios) {
 if (r > bestR) {
 bestR = r;
 bestN = n;
 }
 }
 if (bestN > 0 && bestR > 0) {
 // How far in, for the reading room's Continue row and the book's
 // Continue button (lib/reading/progress.ts). It keeps a finished book
 // finished, where the resume position below is let go.
 const i = content.sections.findIndex((x) => x.n === bestN);
 if (i >= 0) recordProgress(`${saint.slug}/${content.slug}`, { n: bestN, i, of: content.sections.length });
 if (bestN >= lastSectionN) {
 // Completion: drop the saved position so a return visit
 // doesn't put the reader back at the end.
 clearPosition(saint.slug, content.slug);
 } else {
 savePosition(saint.slug, content.slug, bestN);
 }
 }
 }, 800);
 }
 const onScroll = () => scheduleSave();
 window.addEventListener("scroll", onScroll, { passive: true });
 return () => {
 if (saveTimer) clearTimeout(saveTimer);
 window.removeEventListener("scroll", onScroll);
 observer.disconnect();
 };
 }, [saint.slug, content.slug, content.sections, lastSectionN]);

 function toggle(n: number) {
 setOpen((prev) => {
 const next = new Set(prev);
 if (next.has(n)) next.delete(n);
 else next.add(n);
 return next;
 });
 }

 return (
 <article
 // What the desktop app's Discord status reads to say where the reader
 // is (lib/desktop/presenceAssemble.ts, readPlace). Plain page facts.
 data-presence-work={content.title}
 data-presence-author={saint.name}
 data-presence-sections={content.sections.length}
 data-presence-unit={unitFor(content.sections[0]?.title)}
 className={`pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}
 >
 {/* The title, the author, the way back and Start reading are the book's
 header, above the reader (components/reading/BookHeader.tsx), written with
 the page so the apps show it before this text has been read. Here are the
 chapters, on every screen, then the text. */}
 <ChaptersList
 sections={content.sections.map((s) => ({ n: s.n, title: s.title }))}
 accordion={isLong}
 />

 <div className={isLong ? "py-6 space-y-3" : "py-10 space-y-16"}>
 {content.sections.map((sec) => {
 const expanded = !isLong || open.has(sec.n);
 if (isLong) {
 return (
 <section
 key={sec.n}
 id={`s${sec.n}`}
 className="scroll-mt-24 rounded-md border border-paper/10 bg-paper/[0.02] overflow-hidden"
 >
 <button
 type="button"
 onClick={() => toggle(sec.n)}
 aria-expanded={expanded}
 className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/[0.04] motion-safe:transition-colors"
 >
 <span className="font-sans text-caption font-semibold text-paper/40 tabular-nums">
 {String(sec.n).padStart(2, "0")}
 </span>
 <span className="flex-1 min-w-0 font-sans text-body md:text-lede font-semibold text-paper tracking-[-0.01em]">
 {sec.title}
 </span>
 <span
 aria-hidden
 className={
 "shrink-0 text-paper/40 text-caption motion-safe:transition-transform motion-safe:duration-200 " +
 (expanded ? "rotate-180" : "")
 }
 >
 <ChevronDown size={14} className="block" />
 </span>
 </button>
 {expanded && (
 <div className="px-5 pb-7 pt-1">
 <SectionBody saint={saint} content={content} sec={sec} />
 </div>
 )}
 </section>
 );
 }
 return (
 <section
 key={sec.n}
 id={`s${sec.n}`}
 aria-labelledby={`s-${sec.n}`}
 className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] gap-x-12 gap-y-8"
 >
 <div className="min-w-0">
 <div className="mb-6 flex items-baseline gap-4">
 <span className="font-sans text-caption font-semibold text-paper/40 tabular-nums">
 {String(sec.n).padStart(2, "0")}
 </span>
 <h2
 id={`s-${sec.n}`}
 className="font-sans text-title-sm md:text-title font-semibold text-paper tracking-[-0.01em] flex-1 min-w-0"
 >
 {sec.title}
 </h2>
 <SectionBookmarkButton
 saintSlug={saint.slug}
 saintName={saint.name}
 workSlug={content.slug}
 workTitle={content.title}
 sectionN={sec.n}
 sectionTitle={sec.title}
 />
 </div>
 <SectionParagraphs saint={saint} content={content} sec={sec} />
 </div>

 {sec.notes?.length ? (
 <aside
 aria-label={t("saints.notesOn", { title: sec.title })}
 className="lg:pt-1 lg:border-l lg:border-paper/10 lg:pl-8"
 >
 <p className="font-sans text-caption font-semibold text-paper/45 mb-4">
 {t("saints.notes")}
 </p>
 <ul className="space-y-4">
 {sec.notes.map((note, i) => (
 <li
 key={i}
 className="font-sans text-ui text-paper/70 leading-[1.55]"
 >
 {note}
 </li>
 ))}
 </ul>
 </aside>
 ) : null}
 </section>
 );
 })}
 </div>

 <footer className="max-w-[680px] pt-8 border-t border-paper/8">
 <p className="font-sans text-caption text-paper/40">
 {t("prayers.reader.sourceLabel")} {content.source}
 </p>
 </footer>

 {/* Mobile floating section switcher, sits above the bottom tab
 bar and exposes the full TOC behind a tap. Hidden on md+. */}
 <MobileWorkPill
 sections={content.sections.map((s) => ({ n: s.n, title: s.title }))}
 />
 </article>
 );
}

// Section body for the accordion (long-work) layout: framing, citation,
// paragraphs, and notes stacked. Only mounted when the section is expanded.
function SectionBody({
 saint,
 content,
 sec,
}: {
 saint: Saint;
 content: WritingContent;
 sec: Section;
}) {
  const { t } = useTranslate();
 return (
 <>
 <div className="flex items-center justify-end mb-2">
 <SectionBookmarkButton
 saintSlug={saint.slug}
 saintName={saint.name}
 workSlug={content.slug}
 workTitle={content.title}
 sectionN={sec.n}
 sectionTitle={sec.title}
 />
 </div>
 <SectionParagraphs saint={saint} content={content} sec={sec} />
 {sec.notes?.length ? (
 <div className="mt-6 pt-5 border-t border-paper/10">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-3">
 {t("saints.notes")}
 </p>
 <ul className="space-y-3">
 {sec.notes.map((note, i) => (
 <li
 key={i}
 className="font-sans text-ui text-paper/70 leading-[1.55]"
 >
 {note}
 </li>
 ))}
 </ul>
 </div>
 ) : null}
 </>
 );
}

// Shared framing + citation + paragraph stack.
function SectionParagraphs({
 saint,
 content,
 sec,
}: {
 saint: Saint;
 content: WritingContent;
 sec: Section;
}) {
  const { t } = useTranslate();
 return (
 <>
 {sec.framing && (
 <div className="mb-8">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-2">
 {t("saints.editorsNote")}
 </p>
 <p className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">
 {sec.framing}
 </p>
 </div>
 )}

 {sec.citation && (
 <p className="font-sans text-caption font-semibold text-paper/70 mb-4">
 {sec.citation}
 </p>
 )}

 {/* Whose words these are, when they are not the saint's. Sits directly
 above the text it qualifies, so a reader who skipped the editor's
 note above still cannot mistake a retelling or a hymn for a Father
 speaking. Renders nothing for `voice: "saint"` and for the sections
 not yet classified. */}
 <VoiceBand voice={sec.voice} voiceAuthor={sec.voiceAuthor} saint={saint} />

 {/* Editorial prose drops out of the reading serif into sans, so the
 register is legible at a glance and not only from the band. */}
 <div className={sec.voice === "editorial" ? "space-y-5 font-sans" : "space-y-5"}>
 {sec.paragraphs.map((p, i) => (
 <ParagraphRow
 key={i}
 saintSlug={saint.slug}
 saintName={saint.name}
 workSlug={content.slug}
 workTitle={content.title}
 sectionN={sec.n}
 sectionTitle={sec.title}
 paragraphIdx={i}
 text={p}
 />
 ))}
 </div>
 </>
 );
}

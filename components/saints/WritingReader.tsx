"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WritingContent, Section } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import { ParagraphRow } from "./ParagraphRow";
import { SectionBookmarkButton } from "./SectionBookmarkButton";
import { MobileWorkPill } from "./MobileWorkPill";
import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";

// Works with this many sections render as an accordion: each section's body
// (and its per-paragraph annotation components) mounts only when the section
// is expanded. This keeps very long works, e.g. Chrysostom's 88 Homilies on
// John, from mounting thousands of paragraph components at once. Shorter
// works render continuously (all sections expanded), unchanged.
const ACCORDION_THRESHOLD = 20;

export function WritingReader({
 saint,
 content,
}: {
 saint: Saint;
 content: WritingContent;
}) {
 const isLong = content.sections.length >= ACCORDION_THRESHOLD;
 const [open, setOpen] = useState<Set<number>>(() => new Set());
 // Shared reader prefs, same provider as the Bible reader, so a font
 // and size chosen in Scripture carry over to the Fathers.
 const { size, font } = useReaderPrefs();

 // Open the section targeted by the URL hash (#sN) on load and on change,
 // and scroll it into view. Continuous (short) works don't need this.
 useEffect(() => {
 if (!isLong) return;
 function openFromHash() {
 const m = window.location.hash.match(/^#s(\d+)$/);
 if (!m) return;
 const n = Number(m[1]);
 setOpen((prev) => {
 if (prev.has(n)) return prev;
 const next = new Set(prev);
 next.add(n);
 return next;
 });
 // Defer the scroll until the section body has mounted.
 requestAnimationFrame(() => {
 document.getElementById(`s${n}`)?.scrollIntoView({ block: "start" });
 });
 }
 openFromHash();
 window.addEventListener("hashchange", openFromHash);
 return () => window.removeEventListener("hashchange", openFromHash);
 }, [isLong]);

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
 className={`pt-12 md:pt-16 pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}
 >
 <nav className="mb-10 flex items-center gap-2 font-sans text-detail text-paper/55">
 <Link
 href="/saints"
 className="hover:text-paper transition-colors duration-150"
 >
 Saints
 </Link>
 <span className="text-paper/30">›</span>
 <Link
 href={`/saints/${saint.slug}`}
 className="hover:text-paper transition-colors duration-150 truncate"
 >
 {saint.name}
 </Link>
 <span className="text-paper/30">›</span>
 <span className="text-paper truncate">{content.title}</span>
 </nav>

 <header className="pb-10 border-b border-paper/8">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {saint.name}
 </p>
 <h1 className="font-serif text-display-sm md:text-display text-paper leading-[1.1] tracking-[-0.01em]">
 {content.title}
 </h1>
 {content.subtitle && (
 <p className="mt-4 font-sans text-body text-paper/65 italic">
 {content.subtitle}
 </p>
 )}
 </header>

 {/* Table of contents, only for longer works (4+ sections). */}
 {content.sections.length >= 4 && (
 <details
 className="mt-8 group rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors"
 open={!isLong}
 >
 <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between">
 <span className="flex items-baseline gap-3">
 <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
 Contents
 </span>
 <span className="font-sans text-caption text-paper/40">
 {content.sections.length} sections
 </span>
 </span>
 <span
 aria-hidden
 className="text-paper/40 group-open:rotate-180 transition-transform duration-200 text-caption"
 >
 ▾
 </span>
 </summary>
 <ol className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 font-sans text-detail">
 {content.sections.map((sec) => (
 <li key={sec.n}>
 <a
 href={`#s${sec.n}`}
 onClick={
 isLong
 ? () =>
 setOpen((prev) => {
 const next = new Set(prev);
 next.add(sec.n);
 return next;
 })
 : undefined
 }
 className="group/toc inline-flex items-baseline gap-2.5 py-1 text-paper/70 hover:text-paper transition-colors"
 >
 <span className="font-semibold tabular-nums text-paper/40 group-hover/toc:text-paper/65 w-6 text-right">
 {sec.n}
 </span>
 <span className="truncate">{sec.title}</span>
 </a>
 </li>
 ))}
 </ol>
 </details>
 )}

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
 className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/[0.04] transition-colors"
 >
 <span className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/40 tabular-nums">
 {String(sec.n).padStart(2, "0")}
 </span>
 <span className="flex-1 min-w-0 font-sans text-body md:text-lede font-semibold text-paper tracking-[-0.01em]">
 {sec.title}
 </span>
 <span
 aria-hidden
 className={
 "shrink-0 text-paper/40 text-caption transition-transform duration-200 " +
 (expanded ? "rotate-180" : "")
 }
 >
 ▾
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
 <span className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/40 tabular-nums">
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
 aria-label={`Notes on ${sec.title}`}
 className="lg:pt-1 lg:border-l lg:border-paper/10 lg:pl-8"
 >
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-4">
 Notes
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
 Source: {content.source}
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
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
 Notes
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
 return (
 <>
 {sec.framing && (
 <div className="mb-8 pl-4 border-l-2 border-paper/15">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-2">
 Editor&rsquo;s note
 </p>
 <p className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">
 {sec.framing}
 </p>
 </div>
 )}

 {sec.citation && (
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/85 mb-4">
 {sec.citation}
 </p>
 )}

 <div className="space-y-5">
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

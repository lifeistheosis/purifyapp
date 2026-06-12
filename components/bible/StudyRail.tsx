"use client";

import { useState } from "react";
import type { ChapterCommentary } from "@/lib/bible/load";
import { SaintIcon } from "./SaintIcon";

/** A single collapsible commentary card.
 * - Standalone (one note by an author): pass `iconAuthor` + `title`=author +
 * `subtitle`=work, so it shows the icon, the Father, and the work.
 * - Nested (inside a FatherGroup): omit `iconAuthor`, pass `title`=work, so it
 * reads as one of the Father's distinct commentaries with no repeated icon. */
function CommentaryCard({
 title,
 subtitle,
 iconAuthor,
 text,
}: {
 title: string;
 subtitle?: string;
 iconAuthor?: string;
 text: string;
}) {
 const [open, setOpen] = useState(false);
 return (
 <div className="rounded-md border border-paper/10 bg-paper/[0.03] overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen((v) => !v)}
 aria-expanded={open}
 className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-paper/[0.05] transition-colors"
 >
 {iconAuthor && <SaintIcon author={iconAuthor} size="sm" />}
 <div className="min-w-0 flex-1 leading-tight">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/70 truncate">
 {title}
 </p>
 {subtitle && (
 <p className="font-sans text-eyebrow italic text-paper/55 truncate">
 {subtitle}
 </p>
 )}
 </div>
 <span
 aria-hidden
 className={
 "text-eyebrow text-paper/40 transition-transform duration-200 " +
 (open ? "rotate-180" : "")
 }
 >
 ▾
 </span>
 </button>
 {open && (
 <div className="px-3 pb-3 pt-2 border-t border-paper/8 space-y-2.5">
 {text.split(/\n\n+/).map((para, i) => (
 <p
 key={i}
 className="font-serif text-detail leading-[1.55] text-paper/80"
 >
 {para}
 </p>
 ))}
 </div>
 )}
 </div>
 );
}

type Note = { author: string; work: string; text: string };

/** Group a verse's notes by author, preserving first-appearance order.
 * Keeps each distinct commentary intact, only the author header is shared. */
function groupByAuthor(notes: Note[]): { author: string; items: Note[] }[] {
 const order: string[] = [];
 const map = new Map<string, Note[]>();
 for (const n of notes) {
 const arr = map.get(n.author);
 if (arr) arr.push(n);
 else {
 map.set(n.author, [n]);
 order.push(n.author);
 }
 }
 return order.map((author) => ({ author, items: map.get(author)! }));
}

/** A Father with multiple commentaries on one verse. The Father is a plain
 * category label; each distinct commentary stays its own collapsible card
 * (titled by its work) beneath it. Nothing is merged. */
function FatherGroup({ author, items }: { author: string; items: Note[] }) {
 return (
 <div>
 <div className="flex items-center gap-2 px-0.5 mb-1.5">
 <SaintIcon author={author} size="sm" />
 <div className="min-w-0 flex-1 leading-tight">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/70 truncate">
 {author}
 </p>
 <p className="font-sans text-eyebrow italic text-paper/55 truncate">
 {items.length} commentaries
 </p>
 </div>
 </div>
 <div className="pl-2 ml-2 border-l border-paper/10 space-y-2">
 {items.map((it, i) => (
 <CommentaryCard key={i} title={it.work} text={it.text} />
 ))}
 </div>
 </div>
 );
}

function VerseSection({
 verse,
 notes,
 anchorIds,
}: {
 verse: number;
 notes: Note[];
 anchorIds: boolean;
}) {
 const [open, setOpen] = useState(true);
 return (
 <section
 {...(anchorIds ? { id: `rail-v${verse}` } : {})}
 className="rail-section -mx-2 px-2 py-1 rounded-md scroll-mt-24"
 >
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setOpen((v) => !v)}
 aria-expanded={open}
 className="group/vs flex flex-1 items-center gap-2 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 hover:text-paper transition-colors"
 >
 <span
 aria-hidden
 className={
 "text-eyebrow text-paper/40 transition-transform duration-200 " +
 (open ? "" : "-rotate-90")
 }
 >
 ▾
 </span>
 <span>Verse {verse}</span>
 <span className="rounded-full bg-paper/10 px-1.5 py-0.5 text-eyebrow font-semibold tabular-nums text-paper/55 group-hover/vs:bg-paper/15 group-hover/vs:text-paper/75 transition-colors">
 {notes.length}
 </span>
 </button>
 <a
 href={`#v${verse}`}
 aria-label={`Jump to verse ${verse} in the text`}
 className="shrink-0 text-paper/30 hover:text-paper/70 transition-colors text-eyebrow px-1"
 >
 ↑
 </a>
 </div>
 {open && (
 <div className="mt-2.5 space-y-2">
 {groupByAuthor(notes).map((g, i) =>
 g.items.length === 1 ? (
 <CommentaryCard
 key={i}
 iconAuthor={g.author}
 title={g.author}
 subtitle={g.items[0].work}
 text={g.items[0].text}
 />
 ) : (
 <FatherGroup key={i} author={g.author} items={g.items} />
 ),
 )}
 </div>
 )}
 </section>
 );
}

export function StudyRail({
 commentary,
 anchorIds = true,
}: {
 commentary: ChapterCommentary;
 /** When false, omit the per-verse section ids so duplicate copies of the rail
 * (e.g. mobile + desktop) don't collide on `#rail-vN` URL fragments. */
 anchorIds?: boolean;
}) {
 const verses = Object.keys(commentary)
 .map(Number)
 .filter((n) => (commentary[String(n)]?.length ?? 0) > 0)
 .sort((a, b) => a - b);

 if (verses.length === 0) {
 return (
 <div className="px-2 py-6 text-center font-sans text-caption text-paper/40">
 No patristic commentary for this chapter yet.
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {verses.map((vn) => (
 <VerseSection
 key={vn}
 verse={vn}
 notes={commentary[String(vn)] ?? []}
 anchorIds={anchorIds}
 />
 ))}
 </div>
 );
}

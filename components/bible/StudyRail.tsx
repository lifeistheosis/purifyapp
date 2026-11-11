"use client";

import { useId, useState } from "react";
import type { ChapterCommentary } from "@/lib/bible/load";
import { SaintIcon } from "./SaintIcon";
import { GlossedText } from "./GlossedText";
import {
  paragraphsOf,
  previewParagraphs,
  readingMinutes,
} from "@/lib/bible/readability";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { SourceLine } from "@/components/citations/SourceLine";
import type { ShownCite } from "@/lib/citations/cite";
import { noteCite, type CommentaryAt } from "@/lib/bible/commentaryWorks";

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
 digest,
 cite,
}: {
 title: string;
 subtitle?: string;
 iconAuthor?: string;
 text: string;
 digest?: string;
 /** Where the words stand (1.8): the place in the library's copy, which it opens, or the note's own edition. */
 cite: ShownCite;
}) {
 const { t } = useTranslate();
 const [open, setOpen] = useState(false);
 const [full, setFull] = useState(false);
 // What each of the card's two controls opens, named for it (lib/ui/showOpened.ts).
 const noteId = useId();
 const wordsId = useId();

 const paragraphs = paragraphsOf(text);
 const minutes = readingMinutes(text);
 const { shown, hidden } = previewParagraphs(paragraphs);
 const paras = full ? paragraphs : shown;

 return (
 <div className="rounded-md border border-paper/10 bg-paper/[0.03] overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen((v) => !v)}
 aria-expanded={open}
 aria-controls={noteId}
 className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-paper/[0.05] transition-colors"
 >
 {iconAuthor && <SaintIcon author={iconAuthor} size="sm" />}
 <div className="min-w-0 flex-1 leading-tight">
 <p lang="en" dir="ltr" className="font-sans text-caption font-semibold text-paper/70 truncate">
 {title}
 </p>
 {subtitle && (
 <p lang="en" dir="ltr" className="font-sans text-eyebrow italic text-paper/55 truncate">
 {subtitle}
 </p>
 )}
 </div>
 {/* Length before the tap, not after. Someone deciding whether to open a
     40 minute homily on a phone deserves to know it is one. */}
 <span className="shrink-0 font-sans text-eyebrow tabular-nums text-paper/55">
 {t("bible.minRead", { minutes })}
 </span>
 <span
 aria-hidden
 className={
 "text-eyebrow text-paper/40 transition-transform duration-200 " +
 (open ? "rotate-180" : "")
 }
 >
 <ChevronDown size={12} className="block" />
 </span>
 </button>
 {open && (
 <div id={noteId} className="px-3 pb-3 pt-2 border-t border-paper/8 space-y-2.5">
 {/* Editorial digest, when one has been written. A summary ABOUT the
     passage, never a paraphrase wearing the Father's quotation marks.
     Absent on most notes, and absent renders nothing at all. */}
 {/* It stands on its own type, sans against the Father's serif, with
     no rule beside it (build 89 note 1: a side stripe is AI slop). */}
 {/* The digest and the Father's words are English (build 90 note 4: left to right under
     Arabic and Urdu); the source line below speaks the reader's words and keeps the page's. */}
 {digest && (
 <p lang="en" dir="ltr" className="font-sans text-caption leading-[1.6] text-paper/60">
 {digest}
 </p>
 )}
 {/* The edition's dashes stay in his words (checkMock allows them here by name; never in the app's own). */}
 <div id={wordsId} lang="en" dir="ltr" data-mock-allow="emdash" data-mock-why="a Father's own words, as his edition prints them" className="space-y-2.5">
 {paras.map((para, i) => (
 <GlossedText
 key={i}
 text={para}
 className="font-serif text-detail leading-[1.55] text-paper/80"
 />
 ))}
 </div>
 {hidden > 0 && (
 <button
 type="button"
 onClick={() => setFull((v) => !v)}
 aria-expanded={full}
 aria-controls={wordsId}
 className="min-h-11 w-full rounded-md border border-paper/12 px-3 py-1.5 font-sans text-caption font-semibold text-paper/60 hover:border-paper/25 hover:text-paper/85 transition-colors"
 >
 {full ? t("bible.showLess") : t("bible.continueReading")}
 </button>
 )}
 <SourceLine cite={cite} className="pt-1" />
 </div>
 )}
 </div>
 );
}

type Note = { author: string; work: string; citation: string; at?: CommentaryAt; text: string; digest?: string };

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
  const { tn } = useTranslate();
 return (
 <div>
 <div className="flex items-center gap-2 px-0.5 mb-1.5">
 <SaintIcon author={author} size="sm" />
 <div className="min-w-0 flex-1 leading-tight">
 <p lang="en" dir="ltr" className="font-sans text-caption font-semibold text-paper/70 truncate">
 {author}
 </p>
 <p className="font-sans text-eyebrow italic text-paper/55 truncate">
 {tn("bible.commentariesCount", items.length)}
 </p>
 </div>
 </div>
 <div className="ps-4 space-y-2">
 {items.map((it, i) => (
 <CommentaryCard key={i} title={it.work} text={it.text} digest={it.digest} cite={noteCite(it)} />
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
  const { t } = useTranslate();
 const [open, setOpen] = useState(true);
 const notesId = useId();
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
 aria-controls={notesId}
 className="group/vs flex flex-1 items-center gap-2 font-sans text-caption font-semibold text-paper/55 hover:text-paper transition-colors"
 >
 <span
 aria-hidden
 className={
 "text-eyebrow text-paper/40 transition-transform duration-200 " +
 (open ? "" : "-rotate-90")
 }
 >
 <ChevronDown size={12} className="block" />
 </span>
 <span>{t("bible.verseN", { verse })}</span>
 <span className="rounded-full bg-paper/10 px-1.5 py-0.5 text-eyebrow font-semibold tabular-nums text-paper/55 group-hover/vs:bg-paper/15 group-hover/vs:text-paper/75 transition-colors">
 {notes.length}
 </span>
 </button>
 <a
 href={`#v${verse}`}
 aria-label={t("bible.jumpToVerse", { verse })}
 className="shrink-0 text-paper/30 hover:text-paper/70 transition-colors text-eyebrow px-1"
 >
 ↑
 </a>
 </div>
 {open && (
 <div id={notesId} className="mt-2.5 space-y-2">
 {groupByAuthor(notes).map((g, i) =>
 g.items.length === 1 ? (
 <CommentaryCard
 key={i}
 iconAuthor={g.author}
 title={g.author}
 subtitle={g.items[0].work}
 text={g.items[0].text}
 digest={g.items[0].digest}
 cite={noteCite(g.items[0])}
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
  const { t } = useTranslate();
 const verses = Object.keys(commentary)
 .map(Number)
 .filter((n) => (commentary[String(n)]?.length ?? 0) > 0)
 .sort((a, b) => a - b);

 if (verses.length === 0) {
 return (
 <div className="px-2 py-6 text-center font-sans text-caption text-paper/45">
 {t("bible.noCommentaryChapter")}
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

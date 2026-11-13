"use client";

import { ListenHere } from "@/components/reading/ListenHere";
import { SelectionToolsLazy } from "@/components/reading/SelectionToolsLazy";
import { listenId } from "@/lib/listen/texts";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { WritingContent, Section, SectionLine } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import {
  atOf,
  divisionsOf,
  findAt,
  parseAt,
  shownMarks,
  placeWords,
  synopsisChapter,
  synopsisWords,
  type ParagraphPlace,
  type WorkDivisions,
} from "@/lib/saints/divisions";
import { moveLegacyAnnotations } from "@/lib/saints/layoutMoves";
import { carryMovedPlaces } from "@/lib/saints/carryMoves";
import { movesInto, movesOutOf } from "@/lib/saints/workMoves";
import { partsOf, neighbours, type SectionHead } from "@/lib/saints/parts";
import { placeOf } from "@/lib/citations/cite";
import { ParagraphRow } from "./ParagraphRow";
import { VoiceBand } from "./VoiceBand";
import { MobileWorkPill } from "./MobileWorkPill";
import { WorkHead } from "./WorkHead";
import { WorkContents } from "./WorkContents";
import { KeepReading } from "./KeepReading";
import { usePartWords } from "./partWords";
import { chapterOf, useChapterTarget, useGoToChapter, useKeepPlace, useLanding } from "./useWorkPlace";
import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { BookHeader } from "@/components/reading/BookHeader";
import { MoreLikeThis } from "@/components/reading/MoreLikeThis";
import { Sheet } from "@/components/ui/Sheet";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { WORK_ABOUT_EVENT, WORK_CONTENTS_EVENT, answerWorkAbout, hearWaitingWorkAbout, setWorkNow } from "@/lib/saints/workNow";
import { useScrollAway } from "@/lib/ui/scrollAway";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { unitFor } from "@/lib/desktop/presenceModes";
import type { TileCard } from "@/lib/reading/select";
import { EarnedMoment } from "@/components/reader/EarnedMoment";
import { ReadToEndMark } from "@/components/reading/ReadToEndMark";
import { UndoBar } from "@/components/ui/UndoBar";
import { useUndo } from "@/lib/ui/useUndo";

/** What About this book shows: the book's page, as the page draws it on a computer. */
export type AboutBook = { header: React.ComponentProps<typeof BookHeader>; key: string; like: TileCard[] };

/**
 * The reader of a Father's work (1.8, round 6, the owner's pick A of r3-29,
 * "As the Bible reads", his note 79): each chapter as the Bible's page.
 *
 * Build 86 drew a long work as an accordion, every chapter a box with its
 * number, its title in bold sans, a chevron and a star in a ring, the words
 * inside it; "All 603 chapters" at the top, "Section 1 of 603" on a pill
 * over the words. Now one chapter is drawn at a time, as its own page, in
 * the work's own page: the head as the Bible's (WorkHead: "Conference 1",
 * "Chapter 1" and its chevron, the chapter's own title in italic, the rule),
 * the words with no box round them, and the next chapter waiting under the
 * last line (KeepReading). The Bible's pill turns the chapters (MobileWorkPill),
 * its books sheet is the contents (WorkContents), and ••• holds the settings,
 * the bookmark, About this book and the search (MobileWorkActions). The round
 * buttons, the pill and the tab bar step away while the reader reads on
 * (lib/ui/scrollAway.ts). The parts have one name everywhere, the work's own
 * (lib/saints/parts.ts). Chapters stay inside the work's page: the works'
 * 4,739 parts as pages would not fit the apps' 240 MB.
 *
 * Which chapter: the address's (#sN, #p-N-I, #at-1.1.1), else the kept place
 * (lib/reader/position.ts), else the first. A return lands on the paragraph
 * the reader stopped at and the rest of the chapter steps back for a moment,
 * as a verse lands (globals.css, data-place-focus), on the motion switch.
 */
export function WritingReader({
 saint,
 content,
 openedAt,
 author,
 about,
}: {
 saint: Saint;
 content: WritingContent;
 /**
  * When the page opened (performance.now()), for a reader whose text
  * arrives after it: LazyWritingReader in the apps. A reader who has
  * touched the page since then is not taken to their saved place.
  */
 openedAt?: number;
 /**
  * Who wrote the work, as its cover says him (1.8): a citation names the
  * author, who is not always the saint whose page the work is on (the Life
  * of Antony is St Athanasius's). Null for a work no one signed, which is
  * cited by its title alone; the saint's name when it is not given.
  */
 author?: string | null;
 /** The book's page, for About this book; none where the work has none. */
 about?: AboutBook | null;
}) {
 const { t } = useTranslate();
 const { size, font } = useReaderPrefs();
 const { pill } = usePartWords();
 const key = `${saint.slug}/${content.slug}`;
 // The round buttons over the page, the pill and the tab bar step away while
 // the reader reads on, and come back on a scroll up.
 useScrollAway();

 // The edition's own divisions laid over the text (1.8, lib/saints/
 // divisions.ts), and the parts' names read from them (lib/saints/parts.ts).
 const divisions = useMemo(() => divisionsOf(key, content), [key, content]);
 const { heads, contents } = useMemo(() => partsOf(content.sections, divisions, content.title), [content.sections, divisions, content.title]);

 // Highlights and notes kept under a work's old layout follow their
 // paragraphs to where they stand now (lib/saints/layoutMoves.ts), and what
 // was kept under the address of a part that has left this work, or come
 // into it, follows it there (lib/saints/workMoves.ts).
 useEffect(() => {
 moveLegacyAnnotations(saint.slug, content.slug);
 if (movesOutOf(saint.slug, content.slug).length || movesInto(saint.slug, content.slug).length) carryMovedPlaces();
 }, [saint.slug, content.slug]);

 // ── Which chapter (components/saints/useWorkPlace.ts) ─────────────────────
 const target = useChapterTarget(saint.slug, content.slug);
 const at = useMemo(
 () =>
 chapterOf(target, content.sections, (place) => {
 const path = parseAt(place);
 return divisions && path ? findAt(divisions, content, path) : null;
 }),
 [target, content, divisions],
 );
 const sec = content.sections.find((s) => s.n === at.n) ?? content.sections[0];
 const head = heads.find((h) => h.n === sec.n) ?? heads[0];
 const { prev, next } = neighbours(heads, sec.n);
 const words = useMemo(() => sec.paragraphs.map((p) => (p.trim() ? p.trim().split(/\s+/).length : 0)), [sec]);

 const go = useGoToChapter();

 // The chapter on the screen, for the ••• sheet over the page (lib/saints/workNow.ts).
 useEffect(() => {
 setWorkNow({ saintSlug: saint.slug, saintName: saint.name, workSlug: content.slug, workTitle: content.title, sectionN: sec.n, sectionTitle: sec.title, label: pill(head) });
 }, [saint.slug, saint.name, content.slug, content.title, sec.n, sec.title, head, pill]);
 useEffect(() => () => setWorkNow(null), []);

 // ── The sheets ─────────────────────────────────────────────────────────
 const [sheet, setSheet] = useState<"contents" | "about" | null>(null);
 useEffect(() => {
 const contentsOpen = () => setSheet("contents");
 const aboutOpen = () => {
  answerWorkAbout();
  setSheet("about");
 };
 window.addEventListener(WORK_CONTENTS_EVENT, contentsOpen);
 window.addEventListener(WORK_ABOUT_EVENT, aboutOpen);
 // A tap on the cover before this reader was here (the apps read a work's text a moment after its page opens): heard now.
 hearWaitingWorkAbout();
 return () => {
 window.removeEventListener(WORK_CONTENTS_EVENT, contentsOpen);
 window.removeEventListener(WORK_ABOUT_EVENT, aboutOpen);
 };
 }, []);
 // A chapter opened from inside a sheet (the book's Continue) closes it.
 const [sheetFor, setSheetFor] = useState(target);
 if (sheetFor !== target) {
 setSheetFor(target);
 if (sheet) setSheet(null);
 }

 // ── Landing, and the place kept (components/saints/useWorkPlace.ts) ─────
 // A return lands on the paragraph the reader stopped at, the rest of the
 // chapter stepping back for a moment; the reader's own scroll keeps it,
 // with the reading room's progress.
 useLanding(saint.slug, content.slug, target, at, openedAt);
 const pillOf = useCallback((n: number) => heads.find((h) => h.n === n)?.pill, [heads]);
 useKeepPlace(saint.slug, content.slug, content.sections, key, pillOf);

 const cites: Cites = { divisions, author: author === undefined ? saint.name : author };
 const many = content.sections.length > 1;

 return (
 <article
 // What the desktop app's Discord status reads to say where the reader
 // is (lib/desktop/presenceAssemble.ts, readPlace). Plain page facts.
 data-presence-work={content.title}
 data-presence-author={saint.name}
 data-presence-sections={content.sections.length}
 data-presence-unit={unitFor(content.sections[0]?.title)}
 data-work-reader=""
 className={`pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}
 >
 {/* Any words of the work, selected and marked (build 93 note 13). */}
 <SelectionToolsLazy />
 {/* One chapter, as its own page: keyed by its number, so the page opens
 again as the Bible's chapter does (globals.css, "The page"). */}
 <section key={sec.n} id={`s${sec.n}`} data-chapter={sec.n} className="mx-auto w-full max-w-[680px] scroll-mt-24">
 <WorkHead head={head} />
 <div className="page-open-after">
 <SectionParagraphs saint={saint} content={content} sec={sec} cites={cites} />
 </div>
 {sec.notes?.length ? (
 <aside aria-label={t("saints.notesOn", { title: sec.title })} className="mt-10 border-t border-paper/10 pt-6">
 <p className="mb-4 font-sans text-caption font-semibold text-paper/45">{t("saints.notes")}</p>
 <ul className="space-y-4">
 {sec.notes.map((note, i) => (
 <li key={i} className="font-sans text-ui leading-[1.55] text-paper/70">
 {note}
 </li>
 ))}
 </ul>
 </aside>
 ) : null}

 {/* The last chapter's foot: the work read to its end once it comes
     into view, towards the Cappadocian palette (1.9, rec 79,
     lib/reader/earned.ts). */}
 {next ? null : <ReadToEndMark kind="work" id={key} />}

 {/* A computer turns the chapter here; a phone has the pill. */}
 {many ? <Pager prev={prev} next={next} onGo={go} /> : null}

 <KeepReading next={next} onGo={go} />
 </section>

 <footer id="source" className="mx-auto max-w-[680px] scroll-mt-24 border-t border-paper/8 pt-8">
 <p className="font-sans text-caption text-paper/45">
 {t("prayers.reader.sourceLabel")} {content.source}
 </p>
 </footer>

 {/* The moment the Cappadocian palette is earned: after the work's last
     words and their source, the last thing on the page (build 95 note 27). */}
 {next ? null : <EarnedMoment palette="cappadocian" />}

 <MobileWorkPill head={head} prev={prev} next={next} heads={heads} onGo={go} words={words} />
 <WorkContents
 open={sheet === "contents"}
 onClose={() => setSheet(null)}
 title={content.title}
 entries={contents}
 heads={heads}
 current={sec.n}
 onGo={go}
 onAbout={about ? () => setSheet("about") : undefined}
 />
 {about ? (
 <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title={t("bible.aboutThisBook")} openFull desktop>
 <div data-about-sheet="">
 <BookHeader {...about.header} heading="h2" />
 <MoreLikeThis workKey={about.key} cards={about.like} />
 </div>
 </Sheet>
 ) : null}
 </article>
 );
}

/** The chapter before and after, at the foot of the words on a computer. */
function Pager({ prev, next, onGo }: { prev: SectionHead | null; next: SectionHead | null; onGo: (n: number) => void }) {
 const { t } = useTranslate();
 const { pill } = usePartWords();
 const side = "inline-flex min-h-11 max-w-[48%] items-center gap-1.5 rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/80 hover:border-paper/35 hover:text-paper";
 return (
 <nav aria-label={t("bible.chapterSwitcher")} data-work-pager="" className="mt-12 hidden items-center justify-between gap-3 md:flex native-md-hidden" data-reader-chrome>
 {prev ? (
 <button type="button" onClick={() => onGo(prev.n)} className={side}>
 <ChevronLeft size={16} className="shrink-0 rtl:-scale-x-100" />
 <span className="truncate">{pill(prev)}</span>
 </button>
 ) : (
 <span />
 )}
 {next ? (
 <button type="button" onClick={() => onGo(next.n)} className={side}>
 <span className="truncate">{pill(next)}</span>
 <ChevronLeft size={16} className="shrink-0 -scale-x-100 rtl:scale-x-100" />
 </button>
 ) : null}
 </nav>
 );
}

/**
 * How the paragraphs of a work are cited (1.8): its divisions, if it keeps
 * them, and who wrote it.
 */
type Cites = { divisions: WorkDivisions | null; author: string | null };

/**
 * A short line the edition sets between paragraphs (lib/saints/load.ts,
 * SectionLine), laid over the text: the Gospel's words in the text's own
 * type, as the lemmas that open a paragraph are; the edition's headings, the
 * editor's notes of where a fragment comes from and a gap's stars in the
 * quiet sans of the edition's headings, never as the author's words. Not a
 * paragraph: nothing on it is highlighted, noted or cited.
 */
function EditionLine({ line }: { line: SectionLine }) {
 if (line.kind === "lemma") {
 return (
 <p lang="en" dir="ltr" data-edition-line="lemma" className="py-0.5 text-paper/90 leading-[1.7]">
 {line.text}
 </p>
 );
 }
 if (line.kind === "heading") {
 return (
 <p lang="en" dir="ltr" data-edition-line="heading" className="pt-4 first:pt-0 font-sans text-caption font-semibold text-paper/45">
 {line.text}
 </p>
 );
 }
 return (
 <p lang="en" dir="ltr" data-edition-line={line.kind} className={line.kind === "break" ? "font-sans text-caption text-paper/55 text-center" : "font-sans text-caption text-paper/55"}>
 {line.text}
 </p>
 );
}

// Shared framing + citation + paragraph stack.
function SectionParagraphs({
 saint,
 content,
 sec,
 cites,
}: {
 saint: Saint;
 content: WritingContent;
 sec: Section;
 cites: Cites;
}) {
  const { t } = useTranslate();
 // A paragraph marked or unmarked by a double tap is offered back for a
 // moment, as a verse is (build 90 note 10).
 const quick = useUndo();
 const { divisions } = cites;
 const index = content.sections.indexOf(sec);
 const places = divisions && index >= 0 ? divisions.places[index] ?? [] : [];
 // The work's last words: read past them and the reader's place is let go.
 let lastWords = -1;
 if (index === content.sections.length - 1) {
 for (let i = 0; i < sec.paragraphs.length; i++) if (sec.paragraphs[i].trim()) lastWords = i;
 }
 // Only a work whose file prints no numbers of its own (the Confessions)
 // shows them beside the text; elsewhere the edition's numbers are in the
 // text already ("2. Whence then") or in the section's title.
 const quiet = Boolean(divisions?.scheme.table);
 /**
  * The paragraph's citation, the words a copy carries and the line every
  * quotation in the app has (lib/citations/cite.ts): "St. Augustine of
  * Hippo, Confessions, Book I, Chapter 1, §1, tr. Pusey".
  */
 // The edition's short lines, each before the paragraph it stood over.
 const linesAt = new Map<number, SectionLine[]>();
 for (const line of sec.lines ?? []) linesAt.set(line.before, [...(linesAt.get(line.before) ?? []), line]);
 function citeOf(place: ParagraphPlace | null): string | undefined {
 if (!divisions || !place) return undefined;
 const { place: where, mark } = placeWords(divisions, place.path, sec.title, placeOf);
 return [cites.author, content.title, where, mark, divisions.edition].filter(Boolean).join(", ");
 }
 return (
 <>
 {/* The section read aloud, where it has a recording (1.9, lib/listen/recordings.ts):
 first the Lives that are a witness's own words. Whose words: the witness the
 section names, else the saint whose page it is. */}
 <ListenHere
 id={listenId("work", saint.slug, content.slug, sec.n)}
 title={sec.title && sec.title !== content.title ? `${content.title}. ${sec.title}` : content.title}
 by={sec.voiceAuthor ?? saint.name}
 className="mb-6"
 />
 {sec.framing && (
 <div className="mb-8">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-2">
 {t("saints.editorsNote")}
 </p>
 <p lang="en" dir="ltr" className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">
 {sec.framing}
 </p>
 </div>
 )}

 {sec.citation && (
 <p lang="en" dir="ltr" className="font-sans text-caption font-semibold text-paper/70 mb-4">
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
 {/* The work's words keep their edition's dashes, and say so to checkMock;
 an editorial section's prose is the house's own, and never does. */}
 <div
 className={sec.voice === "editorial" ? "space-y-5 font-sans" : "space-y-5"}
 data-mock-allow={sec.voice === "editorial" ? undefined : "emdash"}
 data-mock-why={sec.voice === "editorial" ? undefined : "the work's own words, as its edition prints them"}
 >
 {sec.paragraphs.map((p, i) => {
 const lines = linesAt.get(i);
 const body = paragraph(p, i);
 if (!lines) return body;
 return (
 <Fragment key={`lines-${i}`}>
 {lines.map((line, k) => (
 <EditionLine key={k} line={line} />
 ))}
 {body}
 </Fragment>
 );
 })}
 {(linesAt.get(sec.paragraphs.length) ?? []).map((line, k) => (
 <EditionLine key={`end-${k}`} line={line} />
 ))}
 </div>
 <UndoBar entry={quick.entry} onUndo={quick.undo} />
 </>
 );

 function paragraph(p: string, i: number) {
 // An empty paragraph is a slot kept where an edition's footnote had
 // been read in as the text: nothing to show, but the paragraphs after
 // it keep their numbers, which readers' highlights and notes are kept by.
 if (!p.trim()) return null;
 const place = places[i] ?? null;
 // The edition's own heading for a chapter ("§54. ...", "Chapter
 // I.--..."): the chapter's number and its summary, set apart from the
 // author's words as the edition sets it, never cited as them.
 if (place?.synopsis && divisions) {
 const chapter = synopsisChapter(divisions, p);
 return (
 <div key={i} id={`p-${sec.n}-${i}`} data-division="heading" data-place={`${sec.n}:${i}`} className="scroll-mt-24 pt-6 first:pt-0">
 {chapter !== null ? (
 <p className="font-sans text-caption font-semibold text-paper/45 mb-1.5">
 {t("saints.division.chapter", { n: chapter })}
 </p>
 ) : null}
 {/* A chapter's heading without its number, which stands over it; a summary that opens no chapter, whole. */}
 <p lang="en" dir="ltr" className="font-sans text-ui text-paper/55 leading-[1.55]">{chapter !== null ? synopsisWords(p) : p}</p>
 </div>
 );
 }
 const marks = quiet && divisions ? shownMarks(divisions, place) : [];
 const inner = marks[marks.length - 1];
 const heads = marks.slice(0, -1).filter((m) => m.level === "chapter");
 const row = (
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
 cite={citeOf(place)}
 at={place && place.begins > 0 ? atOf(place.path) : undefined}
 mark={inner ? String(inner.n) : undefined}
 workEnd={i === lastWords}
 onQuickHighlight={quick.offer}
 />
 );
 if (!heads.length) return row;
 return (
 <div key={i} data-division="chapter" className="pt-4 first:pt-0">
 {heads.map((h) => (
 <p key={h.level} className="font-sans text-caption font-semibold text-paper/45 mb-2">
 {t("saints.division.chapter", { n: h.n })}
 </p>
 ))}
 {row}
 </div>
 );
 }
}

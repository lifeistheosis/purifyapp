"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WritingContent, Section } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";
import {
  atOf,
  divisionsOf,
  findAt,
  parseAt,
  sectionLabel,
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
import { placeOf } from "@/lib/citations/cite";
import { ParagraphRow } from "./ParagraphRow";
import { VoiceBand } from "./VoiceBand";
import { SectionBookmarkButton } from "./SectionBookmarkButton";
import { MobileWorkPill } from "./MobileWorkPill";
import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import {
  arrivalPlace,
  clearPosition,
  loadPosition,
  placeOfHash,
  savePosition,
  type WorkPlace,
} from "@/lib/reader/position";
import { elementOfPlace, paragraphAtReadingPlace } from "@/lib/saints/paragraphInView";
import { goToReadingPlace } from "@/lib/ui/readingPlace";
import { watchOwnScroll } from "@/lib/ui/ownScroll";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { unitFor } from "@/lib/desktop/presenceModes";
import { inputSince, watchInput } from "@/lib/ui/lastInput";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChaptersList } from "@/components/reading/ChaptersList";
import { recordProgress } from "@/lib/reading/progress";
import { readsAsChapters } from "@/lib/saints/readsAsChapters";

// Long works render as an accordion: each section's body (and its
// per-paragraph annotation components) mounts only when the section is
// expanded. This keeps very long works, e.g. Chrysostom's 88 Homilies on
// John or the Confessions' thirteen books, from mounting thousands of
// paragraph components at once (lib/saints/readsAsChapters.ts says which).
// Shorter works render continuously (all sections expanded), unchanged.

export function WritingReader({
 saint,
 content,
 openedAt,
 author,
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
}) {
  const { t } = useTranslate();
 const isLong = readsAsChapters(content.sections);
 const [open, setOpen] = useState<Set<number>>(() => new Set());
 // Shared reader prefs, same provider as the Bible reader, so a font
 // and size chosen in Scripture carry over to the Fathers.
 const { size, font } = useReaderPrefs();

 // The edition's own divisions laid over the text (1.8,
 // lib/saints/divisions.ts): how each paragraph is cited and opened, the
 // numbers shown quietly where the text prints none, and the section's
 // number as the edition prints it.
 const divisions = useMemo(() => divisionsOf(`${saint.slug}/${content.slug}`, content), [saint.slug, content]);

 // Highlights and notes kept under a work's old layout follow their
 // paragraphs to where they stand now (lib/saints/layoutMoves.ts).
 useEffect(() => {
 moveLegacyAnnotations(saint.slug, content.slug);
 // And what was kept under the address of a part that has left this work,
 // or come into it, follows it there (lib/saints/workMoves.ts).
 if (movesOutOf(saint.slug, content.slug).length || movesInto(saint.slug, content.slug).length) carryMovedPlaces();
 }, [saint.slug, content.slug]);

 // ── The reader's place (1.8, round 6, the owner's note 79) ────────────────
 // Kept to the paragraph, with no expiry, the way the Bible keeps its verse
 // since note 68 (lib/reader/position.ts, arrivalPlace): as the work opens,
 // at the place its address lands on, or where the reader had it, or at its
 // beginning; after that only the reader's own scroll moves it (lib/ui/
 // ownScroll.ts), and it is the paragraph over the reading line
 // (lib/saints/paragraphInView.ts). Until then only the chapter was kept,
 // for seven days, and every scroll wrote it, a landing's own among them.
 //
 // `saved` is the place as the work opened, read once, before the arrival is
 // written over it: an address naming the chapter the reader is in (the
 // book's Continue, the reading room's row) lands on their paragraph.
 const saved = useRef<WorkPlace | null | undefined>(undefined);
 // Read once, by the first effect that asks (never while rendering).
 function savedPlace(): WorkPlace | null {
 if (saved.current === undefined) {
 const pos = loadPosition(saint.slug, content.slug);
 saved.current = pos ? { sectionN: pos.sectionN, paragraph: pos.paragraph } : null;
 }
 return saved.current;
 }

 // A section a place stands in, opened when the work reads as chapters.
 function openSection(n: number) {
 if (!isLong) return;
 setOpen((prev) => {
 if (prev.has(n)) return prev;
 const next = new Set(prev);
 next.add(n);
 return next;
 });
 }

 // Open the place the URL hash names, on load and on change, and stand it at
 // the reading place: a section (#sN, at the reader's paragraph if their
 // place is in it), or one paragraph of it (#p-N-I, 1.8: a passage in a
 // Purify collection opens where it stands, lib/reading/collections.ts), or a
 // place by the edition's own numbers (#at-1.1.1, 1.8: the Confessions, Book
 // I, chapter 1, section 1). A long work opens the section first. A short one
 // is open already, but in the apps its text lands after the page has
 // opened, so the browser never scrolled to the place: this does.
 useEffect(() => {
 function openFromHash() {
 const m = window.location.hash.match(/^#(?:s(\d+)|p-(\d+)-(\d+)|at-(\d+(?:\.\d+)*))$/);
 if (!m) return;
 let place: WorkPlace;
 if (m[4]) {
 const path = parseAt(m[4]);
 const found = divisions && path ? findAt(divisions, content, path) : null;
 if (!found) return;
 place = { sectionN: found.n, paragraph: found.i };
 } else {
 const landing = placeOfHash(window.location.hash);
 const arrival = landing ? arrivalPlace(savedPlace(), landing) : null;
 if (!arrival) return;
 place = arrival;
 }
 openSection(place.sectionN);
 // Kept at once: the glide to it is not the reader's scroll.
 savePosition(saint.slug, content.slug, place.sectionN, place.paragraph);
 saved.current = place;
 // Defer the scroll until the section body has mounted: a paragraph of a
 // section just opened is in the page a frame or two later.
 const land = (tries: number) => {
 const el = elementOfPlace(place);
 if (el && (place.paragraph === 0 || el.id !== `s${place.sectionN}` || tries === 0)) goToReadingPlace(el, { smooth: false });
 else if (tries > 0) requestAnimationFrame(() => land(tries - 1));
 };
 requestAnimationFrame(() => land(8));
 }
 openFromHash();
 window.addEventListener("hashchange", openFromHash);
 return () => window.removeEventListener("hashchange", openFromHash);
 // `saved` is a ref, and `openSection` reads only `isLong`.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [isLong, divisions, content, saint.slug]);

 // Back where the reader stopped: on opening the work with no address, its
 // section is opened and the paragraph stood at the reading place, silently,
 // no toast, no modal. If the URL has a hash, that wins (above).
 //
 // The setOpen call is deferred via a 0-delay timer so it happens outside
 // the effect body proper, matching the project's set-state-in-effect
 // discipline (see InstallPrompt.tsx for the same pattern).
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
 const pos = savedPlace();
 if (!pos || !content.sections.some((x) => x.n === pos.sectionN)) return;
 const openTimer = isLong
 ? setTimeout(() => {
 if (inputSince(opened)) return;
 openSection(pos.sectionN);
 }, 0)
 : null;
 // Defer the landing so the section body has time to mount in long-work mode.
 const r1 = requestAnimationFrame(() => {
 requestAnimationFrame(() => {
 // And again at the last moment: a thumb that lands between the text
 // arriving and this frame wins.
 if (inputSince(opened)) return;
 const el = elementOfPlace(pos);
 if (el) goToReadingPlace(el, { smooth: false });
 });
 });
 return () => {
 if (openTimer) clearTimeout(openTimer);
 cancelAnimationFrame(r1);
 };
 // `saved` is a ref, read once; `openSection` reads only `isLong`.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [saint.slug, content.slug, content.sections, isLong, openedAt]);

 // Keep the place as the reader reads: the paragraph over the reading line,
 // written only for the reader's own scroll (a finger and its fling, a
 // wheel, a key, the scroll bar), at most once each 750ms, and the last one
 // never lost (it lands on a timer, as the page is hidden, or as the work
 // goes). Read past the end of the work's last paragraph and the place is let
 // go, so the next visit starts at the beginning. The reading room's
 // progress (lib/reading/progress.ts) is written with it: the chapter, its
 // place among the work's, and a finished book kept finished.
 useEffect(() => {
 if (typeof window === "undefined") return;
 const key = `${saint.slug}/${content.slug}`;
 const of = content.sections.length;
 let lastWrite = 0;
 let pending: WorkPlace | null = null;
 let timer: ReturnType<typeof setTimeout> | null = null;
 let frame = 0;
 let own = false;
 let written = "";

 function write(p: WorkPlace) {
 lastWrite = Date.now();
 pending = null;
 written = `${p.sectionN}:${p.paragraph}`;
 savePosition(saint.slug, content.slug, p.sectionN, p.paragraph);
 saved.current = p;
 const i = content.sections.findIndex((x) => x.n === p.sectionN);
 if (i >= 0) recordProgress(key, { n: p.sectionN, i, of });
 }
 function persist(p: WorkPlace) {
 if (`${p.sectionN}:${p.paragraph}` === written && pending === null) return;
 pending = p;
 if (Date.now() - lastWrite >= 750) write(p);
 else if (!timer) {
 timer = setTimeout(() => {
 timer = null;
 if (pending) write(pending);
 }, 750);
 }
 }
 function flush() {
 if (timer) {
 clearTimeout(timer);
 timer = null;
 }
 if (pending) write(pending);
 }
 function onFrame() {
 frame = 0;
 if (!own) return;
 own = false;
 const at = paragraphAtReadingPlace();
 if (!at) return;
 if (at.past) {
 // Finished: the next visit starts at the beginning, and the book is read.
 if (timer) clearTimeout(timer);
 timer = null;
 pending = null;
 written = "past";
 clearPosition(saint.slug, content.slug);
 saved.current = null;
 const last = content.sections[of - 1];
 if (last) recordProgress(key, { n: last.n, i: of - 1, of });
 return;
 }
 persist({ sectionN: at.sectionN, paragraph: at.paragraph });
 }
 function onScroll(isOwn: boolean) {
 if (isOwn) own = true;
 if (!frame) frame = requestAnimationFrame(onFrame);
 }
 function onHide() {
 if (document.visibilityState === "hidden") flush();
 }
 const stop = watchOwnScroll(onScroll);
 window.addEventListener("pagehide", flush);
 document.addEventListener("visibilitychange", onHide);
 return () => {
 stop();
 cancelAnimationFrame(frame);
 window.removeEventListener("pagehide", flush);
 document.removeEventListener("visibilitychange", onHide);
 // The reader's last place, if its write was still waiting.
 flush();
 };
 }, [saint.slug, content.slug, content.sections]);

 // The section's number as the edition prints it ("8.21", "I"), where the
 // work keeps its divisions; nothing for a section it does not number (a
 // salutation, an editor's note); else the file's own count, as before.
 function numberOf(n: number): string {
 if (!divisions) return String(n).padStart(2, "0");
 return sectionLabel(divisions, content, n) ?? "";
 }
 // The sections as the chapters, the pill and the contents list them, each
 // with its number as the edition prints it, not the file's own (the
 // Confessions' Book II is its section 102; lib/reading/contentsNumbers.ts).
 const navSections = content.sections.map((s) => ({
 n: s.n,
 title: s.title,
 label: divisions ? (sectionLabel(divisions, content, s.n) ?? "") : String(s.n),
 }));
 const cites: Cites = { divisions, author: author === undefined ? saint.name : author };

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
 sections={navSections}
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
 // A closed section is a place by its top (lib/saints/paragraphInView.ts).
 data-place={expanded ? undefined : `${sec.n}:0`}
 className="scroll-mt-24 rounded-md border border-paper/10 bg-paper/[0.02] overflow-hidden"
 >
 <button
 type="button"
 onClick={() => toggle(sec.n)}
 aria-expanded={expanded}
 className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/[0.04] motion-safe:transition-colors"
 >
 <span className="font-sans text-caption font-semibold text-paper/40 tabular-nums">
 {numberOf(sec.n)}
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
 <SectionBody saint={saint} content={content} sec={sec} cites={cites} />
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
 {numberOf(sec.n)}
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
 <SectionParagraphs saint={saint} content={content} sec={sec} cites={cites} />
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

 <footer id="source" className="max-w-[680px] scroll-mt-24 pt-8 border-t border-paper/8">
 <p className="font-sans text-caption text-paper/40">
 {t("prayers.reader.sourceLabel")} {content.source}
 </p>
 </footer>

 {/* Mobile floating section switcher, sits above the bottom tab
 bar and exposes the full TOC behind a tap. Hidden on md+. */}
 <MobileWorkPill
 sections={navSections}
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
 cites,
}: {
 saint: Saint;
 content: WritingContent;
 sec: Section;
 cites: Cites;
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
 <SectionParagraphs saint={saint} content={content} sec={sec} cites={cites} />
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

/**
 * How the paragraphs of a work are cited (1.8): its divisions, if it keeps
 * them, and who wrote it.
 */
type Cites = { divisions: WorkDivisions | null; author: string | null };

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
 function citeOf(place: ParagraphPlace | null): string | undefined {
 if (!divisions || !place) return undefined;
 const { place: where, mark } = placeWords(divisions, place.path, sec.title, placeOf);
 return [cites.author, content.title, where, mark, divisions.edition].filter(Boolean).join(", ");
 }
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
 {sec.paragraphs.map((p, i) => {
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
 <p className="font-sans text-ui text-paper/55 leading-[1.55]">{synopsisWords(p)}</p>
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
 })}
 </div>
 </>
 );
}

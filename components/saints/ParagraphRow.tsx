"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { readParagraphAnnotation, useParagraphAnnotation, writeParagraphAnnotation } from "@/lib/saints/annotations";
import {
 HIGHLIGHT_COLORS,
 colorById,
 highlightLabelNow,
 highlightVars,
 lastHighlightColor,
 rememberHighlightColor,
} from "@/lib/bible/highlightColors";
import { isSecondTap, isTap, isTouchContextMenu, type TapAt } from "@/lib/bible/verseGesture";
import { placeMarks } from "@/lib/marks/anchor";
import { placeAttr } from "@/lib/marks/place";
import { lastPageScrollAt, watchPageScroll } from "@/lib/ui/pageScroll";
import { softTick } from "@/lib/ui/softTick";
import type { UndoEntry } from "@/lib/ui/useUndo";
import { useBookmarks } from "@/lib/bookmarks";
import {
 VerseContextMenu,
 type ContextMenuGroup,
} from "@/components/bible/VerseContextMenu";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Highlighter } from "@/components/ui/icons/Highlighter";
import { copyText } from "@/lib/ui/copyText";
import { cn } from "@/lib/cn";
import { shareLink } from "@/lib/site";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MarkedText } from "@/components/reading/MarkedText";


// Asked for when a note is first opened: no paragraph carries the sheet until then.
const WordsNoteSheet = dynamic(() => import("@/components/reading/WordsNoteSheet").then((m) => m.WordsNoteSheet), { ssr: false });

/**
 * One paragraph inside a saint's writing. Mirrors the affordances of the
 * Bible VerseRow at paragraph scale: a highlight washed behind the words, an
 * inline note editor, a hover-revealed toolbar (highlight / copy-link /
 * note), and a right-click context menu. The section-level Bookmark item is
 * added via the menu (paragraphs are too granular to save individually;
 * readers want to come back to "the third section of Augustine's Confessions
 * Book I," not a single paragraph in it).
 *
 * The highlight has the Bible's colours since 1.7.1, chosen the same way (a
 * phone's tools, the computer's popover and menu): until then a paragraph
 * had one, a gold wash, and gold is one of the two colours the owner keeps
 * out of the app.
 *
 * Any of its words can be marked too (build 93 note 13): a hold on a word
 * selects it, and the page's one selection tool
 * (components/reading/SelectionTools.tsx) highlights, copies, keeps, pictures
 * or notes the words chosen, with the whole paragraph one tap away. So the
 * hold is no longer this row's: it says where its marks are kept (`data-mk`)
 * and draws them (components/reading/MarkedText.tsx). The double tap, which
 * highlights the whole paragraph, is still its own.
 */
export function ParagraphRow({
 saintSlug,
 saintName,
 workSlug,
 workTitle,
 sectionN,
 sectionTitle,
 paragraphIdx,
 text,
 cite,
 at,
 mark,
 workEnd,
 onQuickHighlight,
}: {
 saintSlug: string;
 saintName: string;
 workSlug: string;
 workTitle: string;
 sectionN: number;
 sectionTitle: string;
 paragraphIdx: number;
 text: string;
 /**
  * The paragraph's citation by the work's own divisions (1.8,
  * lib/saints/divisions.ts): "St. Augustine of Hippo, Confessions, Book I,
  * Chapter 1, §1, tr. Pusey". What a copy carries under the words. Without
  * it, the work and the section's title, as before.
  */
 cite?: string;
 /** The division this paragraph begins, by the edition's numbers ("1.1.1"): its link opens there. */
 at?: string;
 /** The number shown quietly before the words, where the text prints none of its own. */
 mark?: string;
 /** The work's last paragraph: read past its foot, and the reader's place is let go (lib/saints/paragraphInView.ts). */
 workEnd?: boolean;
 /** The section's Undo, offered when a double tap marks or unmarks the paragraph (build 90 note 10). */
 onQuickHighlight?: (entry: UndoEntry) => void;
}) {
  const { t } = useTranslate();
 const ann = useParagraphAnnotation(
 saintSlug,
 workSlug,
 sectionN,
 paragraphIdx,
 );
 const hl = colorById(ann.color);
 // The marks that carry a note and still stand in the text, in reading order.
 const noted = placeMarks(text, ann.marks).filter((p) => p.mark.note);
 const [showSwatches, setShowSwatches] = useState(false);
 // The names of the colours, opened from the computer's popover or menu: the
 // colour it opens at, or undefined while shut.
 const [naming, setNaming] = useState<string | null | undefined>(undefined);
 // Highlight in a colour, or change to it; remembered for the next one-tap
 // highlight, here and in the Bible.
 function applyColor(id: string) {
 ann.setHighlight(id);
 rememberHighlightColor(id);
 }
 const swatchesRef = useRef<HTMLDivElement>(null);
 useEffect(() => {
 if (!showSwatches) return;
 function onDown(e: PointerEvent) {
 if (!swatchesRef.current?.contains(e.target as Node)) setShowSwatches(false);
 }
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") setShowSwatches(false);
 }
 document.addEventListener("pointerdown", onDown);
 document.addEventListener("keydown", onKey);
 return () => {
 document.removeEventListener("pointerdown", onDown);
 document.removeEventListener("keydown", onKey);
 };
 }, [showSwatches]);
 const bookmarks = useBookmarks();
 const sectionLocator = {
 kind: "writing-section" as const,
 saintSlug,
 workSlug,
 sectionN,
 };
 const sectionBookmarked = bookmarks.isBookmarked(sectionLocator);

 const [editing, setEditing] = useState(false);
 const [copied, setCopied] = useState(false);
 const [ctxAnchor, setCtxAnchor] = useState<{ x: number; y: number } | null>(
 null,
 );

 // A finger on the paragraph: where it came down and when, to tell a tap
 // from a hold (the selection tool's) and from a scroll.
 const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
 const LONG_PRESS_MS = 400;
 const SCROLL_SLOP_PX = 8;
 function cancelPress() {
 pressOriginRef.current = null;
 }
 // A double tap highlights the paragraph in the colour picked last, the
 // Bible's and the Fathers' one colour, and a second takes it off, felt in
 // the hand and offered back with Undo: the Bible's verse does the same
 // (build 90 note 10, his word: "when you double tap, it automatically
 // highlights the last color you picked"). A lone tap does nothing; a hold
 // selects the word under it. The same rules decide what a tap is
 // (lib/bible/verseGesture.ts): not the touch that stops a glide, not a
 // finger the page moved under, not a tap on the paragraph's own buttons.
 const lastTapRef = useRef<TapAt | null>(null);
 const touchStartRef = useRef<{ at: number; scrollY: number; lastScrollAt: number } | null>(null);
 const touchedAtRef = useRef(0);
 useEffect(() => watchPageScroll(), []);
 function quickHighlight() {
 const before = readParagraphAnnotation(saintSlug, workSlug, sectionN, paragraphIdx);
 const removing = !!ann.highlighted;
 if (removing) ann.toggleHighlight();
 else {
 const id = lastHighlightColor();
 ann.setHighlight(id);
 rememberHighlightColor(id);
 }
 softTick();
 onQuickHighlight?.({
 label: t(removing ? "bible.highlightRemoved" : "bible.highlightAdded"),
 restore: () => writeParagraphAnnotation(saintSlug, workSlug, sectionN, paragraphIdx, before),
 });
 }
 function onTouchEnd(e: React.TouchEvent) {
 const start = touchStartRef.current;
 const quick = pressOriginRef.current !== null && !!start && performance.now() - start.at < LONG_PRESS_MS;
 touchStartRef.current = null;
 cancelPress();
 const p = e.changedTouches[0];
 const tapped =
 !!p &&
 !!start &&
 isTap({
 quick,
 startedAt: start.at,
 lastScrollAt: start.lastScrollAt,
 startScrollY: start.scrollY,
 endScrollY: window.scrollY,
 // A tap on words already marked opens that mark's tools.
 onControl: !!(e.target as Element | null)?.closest("button, a, textarea, [data-mk-id]"),
 });
 if (!tapped || !p) {
 lastTapRef.current = null;
 return;
 }
 const here: TapAt = { t: performance.now(), x: p.clientX, y: p.clientY };
 if (isSecondTap(lastTapRef.current, here)) {
 lastTapRef.current = null;
 // No click and no mouse events after the second tap: it was the highlight.
 e.preventDefault();
 quickHighlight();
 return;
 }
 lastTapRef.current = here;
 }
 function onTouchStart(e: React.TouchEvent) {
 const t = e.touches[0];
 if (!t) return;
 touchedAtRef.current = performance.now();
 touchStartRef.current = { at: performance.now(), scrollY: window.scrollY, lastScrollAt: lastPageScrollAt() };
 pressOriginRef.current = { x: t.clientX, y: t.clientY };
 }
 function onTouchMove(e: React.TouchEvent) {
 const t = e.touches[0];
 const origin = pressOriginRef.current;
 if (!t || !origin) return;
 const dx = Math.abs(t.clientX - origin.x);
 const dy = Math.abs(t.clientY - origin.y);
 if (dy > SCROLL_SLOP_PX || dx > SCROLL_SLOP_PX * 2) cancelPress();
 }


 async function copyToClipboard(value: string) {
 try {
 // copyText, not navigator.clipboard bare (lib/ui/copyText.ts).
 if (!(await copyText(value))) return;
 setCopied(true);
 setTimeout(() => setCopied(false), 1400);
 } catch {
 /* clipboard unavailable */
 }
 }
 function reference() {
 return cite ?? `${saintName}, ${workTitle}, ${sectionTitle}`;
 }
 // The paragraph's own address. A paragraph that begins one of the edition's
 // divisions is linked by its number (#at-1.1.1), which outlives any change
 // to the file's own layout; any other by its place in the file.
 function paragraphPath() {
 return at ? `/saints/${saintSlug}/${workSlug}#at-${at}` : `/saints/${saintSlug}/${workSlug}#p-${sectionN}-${paragraphIdx}`;
 }
 // The citation without the name it opens with: the line under the name on a picture.
 function workLine() {
 const whole = reference();
 return whole.startsWith(`${saintName}, `) ? whole.slice(saintName.length + 2) : `${workTitle}, ${sectionTitle}`;
 }
 function copyParagraphLink() {
 // shareLink(), never window.location.origin: the Capacitor shell serves
 // the export from https://localhost, so a copied link built from the
 // origin is dead the moment it leaves the device (lib/site.ts).
 // A paragraph that begins one of the edition's divisions is linked by
 // its number (#at-1.1.1), which outlives any change to the file's own
 // layout; any other by its place in the file.
 return copyToClipboard(shareLink(paragraphPath()));
 }
 function copyParagraphText() {
 return copyToClipboard(text);
 }
 function copyAsQuote() {
 return copyToClipboard(`"${text}", ${reference()}`);
 }
 function copyReference() {
 return copyToClipboard(reference());
 }

 function openContextMenu(e: React.MouseEvent) {
 // A hold on a phone sends a contextmenu too: that hold is the selection's,
 // so the computer's menu stays shut and so does the system's (as on a verse).
 const pointerType = (e.nativeEvent as Partial<PointerEvent>).pointerType;
 const sinceTouch = touchedAtRef.current ? performance.now() - touchedAtRef.current : Infinity;
 if (isTouchContextMenu(typeof pointerType === "string" && pointerType ? pointerType : undefined, sinceTouch)) {
 e.preventDefault();
 return;
 }
 // Let the browser handle a right-click on a non-empty selection so the
 // native "Copy" works for selected text.
 const sel = window.getSelection();
 if (sel && !sel.isCollapsed) return;
 e.preventDefault();
 setCtxAnchor({ x: e.clientX, y: e.clientY });
 }
 function closeContextMenu() {
 setCtxAnchor(null);
 }

 function toggleSectionBookmark() {
 bookmarks.toggle({
 kind: "writing-section",
 saintSlug,
 saintName,
 workSlug,
 workTitle,
 sectionN,
 sectionTitle,
 label: `${saintName}, ${workTitle}, ${sectionTitle}`,
 });
 }

 return (
 <div
 id={`p-${sectionN}-${paragraphIdx}`}
 data-paragraph-idx={paragraphIdx}
 // The reader's place (lib/saints/paragraphInView.ts).
 data-place={`${sectionN}:${paragraphIdx}`}
 data-work-end={workEnd ? "" : undefined}
 data-hl={ann.highlighted ? "true" : undefined}
 // The highlight's colour in both themes (lib/bible/highlightPalette.ts).
 data-hl-color={hl.id}
 style={highlightVars(hl.id) as React.CSSProperties}
 className="scroll-mt-24 group relative -mx-2 px-2 py-0.5 rounded transition-[background-color,box-shadow] duration-500 ease-out"
 >
 <div className="flex items-start gap-2">
 {/* A work of the Fathers is English in every language the app speaks
     (no work has another yet), and says so (build 90 note 4). */}
 <p
 lang="en"
 dir="ltr"
 className={cn(
 // Font family + size are inherited from the reader container
				// (FONT_CLASSES/SIZE_CLASSES on the WritingReader <article>) so the
				// Size and Font controls actually change the body text — mirrors the
				// Bible VerseRow, which sets no font/size here either.
				"text-paper/90 leading-[1.7] flex-1 min-w-0 transition-colors duration-150",
 )}
 // The app-wide hold-to-copy stands aside here: a hold selects the word under it.
 data-own-press=""
 // Where its marks are kept, and what a copy, a link and a picture of its words carry.
 data-mk={placeAttr({ kind: "saint", saintSlug, workSlug, sectionN, paragraphIdx })}
 data-mk-cite={reference()}
 data-mk-link={paragraphPath()}
 data-mk-name={saintName}
 data-mk-work={workLine()}
 style={{ touchAction: "pan-y" }}
 onContextMenu={openContextMenu}
 onTouchStart={onTouchStart}
 onTouchMove={onTouchMove}
 onTouchEnd={onTouchEnd}
 onTouchCancel={cancelPress}
 >
 {/* Highlighted paragraphs get a per-line wash over the text in their
   colour (box-decoration-break: clone rounds each wrapped line),
   matching the Bible reader, not a left margin bar. */}
 {mark ? (
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] me-1.5 align-super select-none">
 {mark}
 </sup>
 ) : null}
 <span
 data-mk-text=""
 className={cn(
 ann.highlighted &&
 "box-decoration-clone rounded-[4px] px-[3px] -mx-[3px] py-[0.1em] bg-[var(--hl-verse)] motion-safe:transition-[background-color] motion-safe:duration-200",
 )}
 >
 <MarkedText text={text} marks={ann.marks} skip={saintSlug} />
 </span>
 </p>

 {/* A computer's inline toolbar, hover-revealed at md+, for a mouse
 only (pointer-fine, 1.9). A finger at any width holds a word, and the
 selection's card (components/reading/SelectionTools.tsx) carries the
 same tools, so the text gets the full column width. Mirrors the Bible
 VerseRow, and like it is never laid out on a tablet in the apps
 (native-md-hidden, 1.7.1): unseen there, it still took its width
 beside every paragraph and held the words to the left of the column.
 Each states a finger's 44 and a mouse's 28, as VerseRow's. */}
 <div
 className={cn(
 "hidden md:pointer-fine:flex native-md-hidden items-center gap-1 shrink-0 transition-opacity duration-150",
 ann.highlighted || ann.note || editing || showSwatches
 ? "md:opacity-100"
 : "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
 )}
 >
 <button
 type="button"
 onClick={() => ann.toggleHighlight()}
 aria-label={
 ann.highlighted
 ? t("bible.removeHighlight")
 : t("saints.highlightParagraph")
 }
 aria-pressed={!!ann.highlighted}
 title={
 ann.highlighted
 ? t("bible.removeHighlight")
 : t("saints.highlightParagraph")
 }
 className={cn(
 "h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 ann.highlighted
 ? "border-[var(--hl-swatch)] bg-[var(--hl-verse)] text-[var(--hl-swatch)]"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 <Highlighter size={16} filled={!!ann.highlighted} />
 </button>
 {/* The colours, as on a verse: the picker under a caret. */}
 <div ref={swatchesRef} className="relative flex items-center">
 <button
 type="button"
 onClick={() => setShowSwatches((v) => !v)}
 aria-label={t("bible.chooseHighlightColor")}
 aria-expanded={showSwatches}
 aria-haspopup="true"
 title={t("bible.chooseHighlightColor")}
 className="h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full border border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper flex items-center justify-center transition-colors duration-150"
 >
 <ChevronDown size={14} className={cn("motion-safe:transition-transform", showSwatches && "rotate-180")} />
 </button>
 {showSwatches && (
 <div className="absolute top-full right-0 mt-1.5 z-20 w-[18.5rem] rounded-2xl border border-paper/15 bg-night/95 backdrop-blur p-1.5 shadow-pop">
 <HighlightPicker
 active={ann.highlighted ? hl.id : null}
 onPick={(id) => {
 applyColor(id);
 setShowSwatches(false);
 }}
 onRemove={() => {
 ann.clearHighlight();
 setShowSwatches(false);
 }}
 onNames={(id) => {
 setShowSwatches(false);
 setNaming(id);
 }}
 hint={t("saints.highlightParagraph")}
 />
 </div>
 )}
 </div>
 <button
 type="button"
 onClick={copyParagraphLink}
 aria-label={
 copied ? t("common.linkCopied") : t("saints.copyParagraphLink")
 }
 title={copied ? t("common.copied") : t("saints.copyParagraphLink")}
 className={cn(
 "h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 copied
 ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 {copied ? <Check size={16} /> : <LinkChain size={16} />}
 </button>
 <button
 type="button"
 onClick={() => setEditing(true)}
 aria-label={ann.note ? t("bible.editNote") : t("bible.addNote")}
 aria-pressed={editing}
 title={ann.note ? t("bible.editNote") : t("bible.addNote")}
 className={cn(
 "h-11 w-11 pointer-fine:h-7 pointer-fine:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 ann.note
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 <Pen size={16} />
 </button>
 </div>
 </div>

 {/* Saved user note */}
 {ann.note && !editing && (
 <div className="mt-2 rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
 <p className="font-sans text-caption text-paper/45 mb-1">
 {t("bible.yourNote")}
 </p>
 <p className="font-sans text-detail text-paper/85 leading-[1.55] whitespace-pre-wrap">
 {ann.note}
 </p>
 </div>
 )}

 {/* The notes on some of its words, each under the words it is on. */}
 {noted.map(({ mark }) => (
 <div key={mark.id} className="mt-2 rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
 <p lang="en" dir="ltr" className="font-serif text-caption italic text-paper/55 mb-1 line-clamp-2">
 {mark.q}
 </p>
 <p className="font-sans text-detail text-paper/85 leading-[1.55] whitespace-pre-wrap">
 {mark.note}
 </p>
 </div>
 ))}

 {/* The note is written in the house's own sheet, as a verse's is (build 93
 note 17): not a boxed field in the text, and no keyboard's hints. */}
 {editing ? (
 <WordsNoteSheet
 open
 words={text}
 note={ann.note}
 draftKey={`saint:${saintSlug}:${workSlug}:${sectionN}:${paragraphIdx}`}
 onSave={(body) => ann.setNote(body)}
 onClose={() => setEditing(false)}
 />
 ) : null}

 {ctxAnchor && (
 <VerseContextMenu
 x={ctxAnchor.x}
 y={ctxAnchor.y}
 onClose={closeContextMenu}
 groups={
 [
 [
 { label: t("saints.copyParagraph"), onClick: copyParagraphText },
 { label: t("bible.copyAsQuote"), onClick: copyAsQuote },
 { label: t("bible.copyReference"), onClick: copyReference },
 { label: t("today.verse.copyLink"), onClick: copyParagraphLink },
 ],
 [
 {
 label: ann.highlighted
 ? t("bible.removeHighlight")
 : t("saints.highlightParagraph"),
 onClick: () => ann.toggleHighlight(),
 destructive: !!ann.highlighted,
 },
 {
 label: ann.note ? t("bible.editNote") : t("bible.addNote"),
 onClick: () => setEditing(true),
 },
 ],
 // The colours, as on a verse: each by what it means, a check by
 // the paragraph's, then the way to the names.
 [
 ...HIGHLIGHT_COLORS.map((c) => ({
 label: highlightLabelNow(c.id, t),
 onClick: () => applyColor(c.id),
 lead: (
 <span
 aria-hidden
 data-hl-color={c.id}
 style={highlightVars(c.id) as React.CSSProperties}
 className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--hl-swatch)]"
 />
 ),
 checked: !!ann.highlighted && hl.id === c.id,
 })),
 {
 label: t("bible.highlightNames.open"),
 onClick: () => setNaming(ann.highlighted ? hl.id : null),
 },
 ],
 [
 {
 label: sectionBookmarked
 ? t("saints.removeSectionBookmark")
 : t("saints.bookmarkThisSection"),
 onClick: toggleSectionBookmark,
 destructive: sectionBookmarked,
 },
 ],
 ] as ContextMenuGroup[]
 }
 />
 )}

 <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />

 {/* A phone's tools are the selection's (components/reading/SelectionTools.tsx):
 a hold on any word opens them, the whole paragraph one tap away. */}
 </div>
 );
}

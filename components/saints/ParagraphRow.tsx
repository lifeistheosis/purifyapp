"use client";

import { useEffect, useRef, useState } from "react";
import { useParagraphAnnotation } from "@/lib/saints/annotations";
import {
 HIGHLIGHT_COLORS,
 colorById,
 highlightLabelNow,
 highlightVars,
 rememberHighlightColor,
} from "@/lib/bible/highlightColors";
import { useBookmarks } from "@/lib/bookmarks";
import {
 VerseContextMenu,
 type ContextMenuGroup,
} from "@/components/bible/VerseContextMenu";
import {
 MobileVerseToolbar,
 type MobileVerseAction,
} from "@/components/bible/MobileVerseToolbar";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { copyText } from "@/lib/ui/copyText";
import { cn } from "@/lib/cn";
import { shareLink } from "@/lib/site";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintNames } from "@/components/saints/SaintNames";

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
}) {
  const { t } = useTranslate();
 const ann = useParagraphAnnotation(
 saintSlug,
 workSlug,
 sectionN,
 paragraphIdx,
 );
 const hl = colorById(ann.color);
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
 const [draft, setDraft] = useState(ann.note ?? "");
 const [copied, setCopied] = useState(false);
 const [ctxAnchor, setCtxAnchor] = useState<{ x: number; y: number } | null>(
 null,
 );
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 // Mobile gesture state. A long-press opens the floating action toolbar;
 // a bare tap (or a tap that turns into a scroll) leaves the UI untouched.
 // Mirrors the Bible VerseRow so the two readers feel identical on touch.
 const [showTools, setShowTools] = useState(false);
 const pressTimerRef = useRef<number | null>(null);
 const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
 const LONG_PRESS_MS = 400;
 const SCROLL_SLOP_PX = 8;

 function clearPressTimer() {
 if (pressTimerRef.current !== null) {
 window.clearTimeout(pressTimerRef.current);
 pressTimerRef.current = null;
 }
 }
 function cancelPress() {
 clearPressTimer();
 pressOriginRef.current = null;
 }
 function onTouchStart(e: React.TouchEvent) {
 const t = e.touches[0];
 if (!t) return;
 pressOriginRef.current = { x: t.clientX, y: t.clientY };
 clearPressTimer();
 pressTimerRef.current = window.setTimeout(() => {
 pressTimerRef.current = null;
 setShowTools(true);
 try {
 navigator.vibrate?.(15);
 } catch {
 /* no-op */
 }
 }, LONG_PRESS_MS);
 }
 function onTouchMove(e: React.TouchEvent) {
 const t = e.touches[0];
 const origin = pressOriginRef.current;
 if (!t || !origin) return;
 const dx = Math.abs(t.clientX - origin.x);
 const dy = Math.abs(t.clientY - origin.y);
 if (dy > SCROLL_SLOP_PX || dx > SCROLL_SLOP_PX * 2) cancelPress();
 }

 useEffect(() => {
 if (!editing) return;
 const el = textareaRef.current;
 if (!el) return;
 el.focus();
 el.setSelectionRange(el.value.length, el.value.length);
 }, [editing]);

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
 function copyParagraphLink() {
 // shareLink(), never window.location.origin: the Capacitor shell serves
 // the export from https://localhost, so a copied link built from the
 // origin is dead the moment it leaves the device (lib/site.ts).
 // A paragraph that begins one of the edition's divisions is linked by
 // its number (#at-1.1.1), which outlives any change to the file's own
 // layout; any other by its place in the file.
 return copyToClipboard(
 shareLink(
 at
 ? `/saints/${saintSlug}/${workSlug}#at-${at}`
 : `/saints/${saintSlug}/${workSlug}#p-${sectionN}-${paragraphIdx}`,
 ),
 );
 }
 function copyParagraphText() {
 return copyToClipboard(text);
 }
 // The hold pill's Copy: the paragraph, and under it whose it is.
 function copyParagraphForPaste() {
 return copyToClipboard(`${text}\n${reference()}`);
 }
 function copyAsQuote() {
 return copyToClipboard(`"${text}", ${reference()}`);
 }
 function copyReference() {
 return copyToClipboard(reference());
 }

 function openContextMenu(e: React.MouseEvent) {
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

 function saveNote() {
 ann.setNote(draft);
 setEditing(false);
 }
 function cancelEdit() {
 setDraft(ann.note ?? "");
 setEditing(false);
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
 data-hl={ann.highlighted ? "true" : undefined}
 // The highlight's colour in both themes (lib/bible/highlightPalette.ts).
 data-hl-color={hl.id}
 style={highlightVars(hl.id) as React.CSSProperties}
 className="scroll-mt-24 group relative -mx-2 px-2 py-0.5 rounded transition-[background-color,box-shadow] duration-500 ease-out"
 >
 <div className="flex items-start gap-2">
 <p
 className={cn(
 // Font family + size are inherited from the reader container
				// (FONT_CLASSES/SIZE_CLASSES on the WritingReader <article>) so the
				// Size and Font controls actually change the body text — mirrors the
				// Bible VerseRow, which sets no font/size here either.
				"text-paper/90 leading-[1.7] flex-1 min-w-0 transition-colors duration-150",
 showTools &&
 "bg-gold/[0.05] rounded-sm shadow-[inset_0_0_0_1px_rgba(183,176,163,0.35)]",
 )}
 // The app-wide hold-to-copy stands aside here: a paragraph has its own pill.
 data-own-press=""
 style={{ touchAction: "pan-y" }}
 onContextMenu={openContextMenu}
 onTouchStart={onTouchStart}
 onTouchMove={onTouchMove}
 onTouchEnd={cancelPress}
 onTouchCancel={cancelPress}
 >
 {/* Highlighted paragraphs get a per-line wash over the text in their
   colour (box-decoration-break: clone rounds each wrapped line),
   matching the Bible reader, not a left margin bar. */}
 {mark ? (
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] mr-1.5 align-super select-none">
 {mark}
 </sup>
 ) : null}
 <span
 className={cn(
 ann.highlighted &&
 "box-decoration-clone rounded-[4px] px-[3px] -mx-[3px] py-[0.1em] bg-[var(--hl-verse)] motion-safe:transition-[background-color] motion-safe:duration-200",
 )}
 >
 <SaintNames text={text} skip={saintSlug} />
 </span>
 </p>

 {/* Desktop-only inline toolbar, hover-revealed at md+. On mobile the
 same actions live in the MobileVerseToolbar popup opened by a
 long-press (see below), so the text gets the full column width.
 Mirrors the Bible VerseRow, and like it is never laid out on a
 tablet in the apps (native-md-hidden, 1.7.1): unseen there, it still
 took its width beside every paragraph and held the words to the left
 of the column. A tablet uses the long-press, as a phone does. */}
 <div
 className={cn(
 "hidden md:flex native-md-hidden items-center gap-1 shrink-0 transition-opacity duration-150",
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
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 ann.highlighted
 ? "border-[var(--hl-swatch)] bg-[var(--hl-verse)] text-[var(--hl-swatch)]"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 <Sparkle size={16} filled={!!ann.highlighted} />
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
 className="h-9 w-9 md:h-7 md:w-7 rounded-full border border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper flex items-center justify-center transition-colors duration-150"
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
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 copied
 ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 {copied ? <Check size={16} /> : <LinkChain size={16} />}
 </button>
 <button
 type="button"
 onClick={() => {
 setDraft(ann.note ?? "");
 setEditing((v) => !v);
 }}
 aria-label={ann.note ? t("bible.editNote") : t("bible.addNote")}
 aria-pressed={editing}
 title={ann.note ? t("bible.editNote") : t("bible.addNote")}
 className={cn(
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
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

 {/* Note editor */}
 {editing && (
 <div className="mt-2 rounded-md border border-paper/25 bg-paper/[0.05] p-3">
 <textarea
 ref={textareaRef}
 value={draft}
 onChange={(e) => setDraft(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
 e.preventDefault();
 saveNote();
 } else if (e.key === "Escape") {
 e.preventDefault();
 cancelEdit();
 }
 }}
 placeholder={t("saints.paragraphNotePlaceholder")}
 rows={3}
 className="w-full bg-transparent border-0 outline-none resize-y font-sans text-ui text-paper placeholder:text-paper/40 leading-[1.55]"
 />
 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="font-sans text-eyebrow text-paper/40">
 {draft.length > 0
 ? t("bible.noteSaveHint")
 : t("bible.escToClose")}
 </span>
 <div className="flex items-center gap-2">
 {ann.note && (
 <button
 type="button"
 onClick={() => {
 ann.setNote("");
 setDraft("");
 setEditing(false);
 }}
 className="font-sans text-caption text-paper/55 hover:text-paper transition-colors px-2 py-1"
 >
 {t("common.delete")}
 </button>
 )}
 <button
 type="button"
 onClick={cancelEdit}
 className="font-sans text-caption text-paper/55 hover:text-paper transition-colors px-2 py-1"
 >
 {t("common.cancel")}
 </button>
 <button
 type="button"
 onClick={saveNote}
 className="font-sans text-caption font-medium bg-paper text-night rounded-pill px-3 py-1 hover:bg-paper/90 transition-colors"
 >
 {t("common.save")}
 </button>
 </div>
 </div>
 </div>
 )}

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
 onClick: () => {
 setDraft(ann.note ?? "");
 setEditing(true);
 },
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

 {/* Mobile long-press action bar. Same floating component the Bible
 reader uses; bookmark maps to the section-level bookmark (paragraphs
 are too granular to save individually). No Florilegium button: a
 paragraph has no gathering wired, and the button did nothing. */}
 {showTools && (
 <MobileVerseToolbar
 reference={reference()}
 itemNoun="paragraph"
 bookmarkNoun="section"
 gather={false}
 highlight={{
 color: ann.highlighted ? hl.id : null,
 onPick: applyColor,
 onRemove: () => ann.clearHighlight(),
 }}
 state={{
 bookmarked: sectionBookmarked,
 hasNote: !!ann.note,
 copied,
 }}
 onAction={(a: MobileVerseAction) => {
 switch (a) {
 case "bookmark":
 toggleSectionBookmark();
 break;
 case "copyText":
 copyParagraphForPaste();
 break;
 case "copyLink":
 copyParagraphLink();
 break;
 case "note":
 setDraft(ann.note ?? "");
 setEditing(true);
 break;
 }
 }}
 onClose={() => setShowTools(false)}
 />
 )}
 </div>
 );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParagraphAnnotation } from "@/lib/saints/annotations";
import { useBookmarks } from "@/lib/bookmarks";
import {
 VerseContextMenu,
 type ContextMenuGroup,
} from "@/components/bible/VerseContextMenu";
import {
 MobileVerseToolbar,
 type MobileVerseAction,
} from "@/components/bible/MobileVerseToolbar";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * One paragraph inside a saint's writing. Mirrors the affordances of the
 * Bible VerseRow at paragraph scale: a gold left-bar highlight, an inline
 * note editor, a hover-revealed toolbar (highlight / copy-link / note), and
 * a right-click context menu. The section-level Bookmark item is added via
 * the menu (paragraphs are too granular to save individually; readers want
 * to come back to "the third section of Augustine's Confessions Book I,"
 * not a single paragraph in it).
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
}: {
 saintSlug: string;
 saintName: string;
 workSlug: string;
 workTitle: string;
 sectionN: number;
 sectionTitle: string;
 paragraphIdx: number;
 text: string;
}) {
  const { t } = useTranslate();
 const ann = useParagraphAnnotation(
 saintSlug,
 workSlug,
 sectionN,
 paragraphIdx,
 );
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
 await navigator.clipboard.writeText(value);
 setCopied(true);
 setTimeout(() => setCopied(false), 1400);
 } catch {
 /* clipboard unavailable */
 }
 }
 function reference() {
 return `${saintName}, ${workTitle}, ${sectionTitle}`;
 }
 function copyParagraphLink() {
 return copyToClipboard(
 `${window.location.origin}/saints/${saintSlug}/${workSlug}#p-${sectionN}-${paragraphIdx}`,
 );
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
 style={{ touchAction: "pan-y" }}
 onContextMenu={openContextMenu}
 onTouchStart={onTouchStart}
 onTouchMove={onTouchMove}
 onTouchEnd={cancelPress}
 onTouchCancel={cancelPress}
 >
 {/* Highlighted paragraphs get a per-line gold wash over the text
   (box-decoration-break: clone rounds each wrapped line), matching
   the Bible reader — not a left margin bar. */}
 <span
 className={cn(
 ann.highlighted &&
 "box-decoration-clone rounded-[3px] px-[3px] -mx-[3px] py-[1px] bg-gold/[0.15]",
 )}
 >
 {text}
 </span>
 </p>

 {/* Desktop-only inline toolbar, hover-revealed at md+. On mobile the
 same actions live in the MobileVerseToolbar popup opened by a
 long-press (see below), so the text gets the full column width.
 Mirrors the Bible VerseRow. */}
 <div
 className={cn(
 "hidden md:flex items-center gap-1 shrink-0 transition-opacity duration-150",
 ann.highlighted || ann.note || editing
 ? "md:opacity-100"
 : "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
 )}
 >
 <button
 type="button"
 onClick={ann.toggleHighlight}
 aria-label={
 ann.highlighted ? "Remove highlight" : "Highlight paragraph"
 }
 aria-pressed={!!ann.highlighted}
 title={ann.highlighted ? "Remove highlight" : "Highlight paragraph"}
 className={cn(
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 ann.highlighted
 ? "bg-gold/30 border-gold/60 text-gold"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 ✦
 </button>
 <button
 type="button"
 onClick={copyParagraphLink}
 aria-label={copied ? "Link copied" : "Copy paragraph link"}
 title={copied ? "Copied" : "Copy paragraph link"}
 className={cn(
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 copied
 ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 {copied ? "✓" : "🔗"}
 </button>
 <button
 type="button"
 onClick={() => {
 setDraft(ann.note ?? "");
 setEditing((v) => !v);
 }}
 aria-label={ann.note ? "Edit note" : "Add note"}
 aria-pressed={editing}
 title={ann.note ? "Edit note" : "Add note"}
 className={cn(
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 ann.note
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 ✎
 </button>
 </div>
 </div>

 {/* Saved user note */}
 {ann.note && !editing && (
 <div className="mt-2 rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
 <p className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/45 mb-1">
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
 ? "⌘+Enter to save · Esc to cancel"
 : "Esc to close"}
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
 { label: "Copy paragraph", onClick: copyParagraphText },
 { label: "Copy as quote", onClick: copyAsQuote },
 { label: "Copy reference", onClick: copyReference },
 { label: "Copy link", onClick: copyParagraphLink },
 ],
 [
 {
 label: ann.highlighted
 ? "Remove highlight"
 : "Highlight paragraph",
 onClick: ann.toggleHighlight,
 destructive: !!ann.highlighted,
 },
 {
 label: ann.note ? "Edit note" : "Add note",
 onClick: () => {
 setDraft(ann.note ?? "");
 setEditing(true);
 },
 },
 ],
 [
 {
 label: sectionBookmarked
 ? "Remove section bookmark"
 : "Bookmark this section",
 onClick: toggleSectionBookmark,
 destructive: sectionBookmarked,
 },
 ],
 ] as ContextMenuGroup[]
 }
 />
 )}

 {/* Mobile long-press action bar. Same floating component the Bible
 reader uses; bookmark maps to the section-level bookmark (paragraphs
 are too granular to save individually). */}
 {showTools && (
 <MobileVerseToolbar
 reference={reference()}
 itemNoun="paragraph"
 bookmarkNoun="section"
 state={{
 highlighted: !!ann.highlighted,
 bookmarked: sectionBookmarked,
 hasNote: !!ann.note,
 hasWordHighlights: false,
 copied,
 }}
 onAction={(a: MobileVerseAction) => {
 switch (a) {
 case "highlight":
 ann.toggleHighlight();
 break;
 case "bookmark":
 toggleSectionBookmark();
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

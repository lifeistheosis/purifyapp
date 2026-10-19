"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { getBook } from "@/lib/bible/books";
import type { Verse, Token } from "@/lib/bible/load";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { useVerseAnnotation } from "@/lib/bible/annotations";
import {
 HIGHLIGHT_COLORS,
 colorById,
 highlightLabelNow,
 highlightVars,
 lastHighlightColor,
 rememberHighlightColor,
} from "@/lib/bible/highlightColors";
import { copyText } from "@/lib/ui/copyText";
import { softTick } from "@/lib/ui/softTick";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useBookmarks } from "@/lib/bookmarks";
import { shareLink } from "@/lib/site";
import { WordPopover } from "./WordPopover";
import {
 VerseContextMenu,
 type ContextMenuGroup,
} from "./VerseContextMenu";
import {
 MobileVerseToolbar,
 type MobileVerseAction,
} from "./MobileVerseToolbar";
import { FlorilegiumPickerSheet } from "@/components/florilegium/FlorilegiumPickerSheet";
import { HighlightPicker } from "./HighlightPicker";
import { HighlightNamesSheet } from "./HighlightNamesSheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { CrossRefs } from "@/components/ui/icons/CrossRefs";
import { Erase } from "@/components/ui/icons/Erase";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { Star } from "@/components/ui/icons/Star";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { cn } from "@/lib/cn";
import { plusFeaturesNow, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { wroteWhen } from "@/lib/bible/noteAge";
import { keepText, verseKey } from "@/lib/remember/schedule";

/**
 * The mobile commentary marker is a superscript verse number plus a 5px dot,
 * sized for the page, not for a thumb: as laid out its button box measures
 * about 19x5, well under the 24x24 WCAG 2.5.8 asks for, and a real tap on it
 * misses more often than it lands. This grows the touch region only, with an
 * out-of-flow pseudo-element centred on the marker, so the superscript keeps
 * its deliberate size and the verse line box is untouched.
 */
const TAP_TARGET =
 "relative touch-manipulation after:absolute after:content-[''] after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-6 after:w-full after:min-w-6";

function tokenize(text: string): string[] {
 return text.trim().split(/\s+/);
}

function wordIndexFromElement(el: Element | null): number | null {
 const node = el?.closest("[data-word-idx]") as HTMLElement | null;
 if (!node) return null;
 const idx = Number(node.dataset.wordIdx);
 return Number.isFinite(idx) ? idx : null;
}

export function VerseRow({
 book,
 bookName,
 chapter,
 verse,
 dropCap = false,
 hasCommentary = false,
 onOpenCommentary,
 originalText,
 originalTokens,
 englishTokens,
 strongs,
 onOpenCrossRefs,
 onWordStudy,
 paraStart = false,
}: {
 /** Paragraph view (1.7): this verse begins a paragraph. */
 paraStart?: boolean;
 book: string;
 /** Display name of the book (e.g. "Matthew"). Used in citation copy
 * formats: "Matthew 3:16", "...as a quote, Matthew 3:16 (KJV)". */
 bookName: string;
 chapter: number;
 verse: Verse;
 /** When true, render this verse as the chapter opening: suppress the
  *  leading verse number and set the first letter as an illuminated
  *  gold drop cap. Only takes effect outside interlinear mode. */
 dropCap?: boolean;
 hasCommentary?: boolean;
 /** Mobile callback: when set, the verse-number badge opens a bottom-sheet
 * with this verse's commentary on tap instead of routing to `#rail-vN`
 * (which doesn't exist on mobile any more). Only wired when
 * `hasCommentary` is true. */
 onOpenCommentary?: () => void;
 /** Greek NT / Greek LXX text for this verse, when Interlinear is on. */
 originalText?: string;
 /** Word-by-word Greek tokens with Strong's. */
 originalTokens?: Token[];
 /** Word-by-word KJV English tokens with Strong's (NT only). When provided
 * and Interlinear is on, the English column re-renders as tokens so
 * hovering a Greek word can highlight the matching English word(s). */
 englishTokens?: { w: string; s?: string }[];
 /** Chapter-scoped Strong's lexicon, only entries for this chapter's tokens. */
 strongs?: Record<string, StrongsEntry>;
 /** Opens the passages this verse echoes (ChapterReader decides Plus). Set
  * only when the verse has any, so no verse offers an empty list. */
 onOpenCrossRefs?: () => void;
 /** Opens the Greek word study for a Strong's number (ChapterReader decides
  * Plus). */
 onWordStudy?: (strongs: string, lemma?: string) => void;
}) {
  const { t, locale } = useTranslate();
 const ann = useVerseAnnotation(book, chapter, verse.n);
 // Anything on the verse highlighted: the whole of it, or some of its words.
 const marked = !!ann.highlighted || (ann.highlightedWords?.length ?? 0) > 0;
 const hl = colorById(ann.color);
 const [showSwatches, setShowSwatches] = useState(false);
 // The names of the colours, opened from the computer's popover or menu
 // (a phone opens them from its own tools): the colour it opens at, or
 // undefined while shut.
 const [naming, setNaming] = useState<string | null | undefined>(undefined);
 // Apply a colour: an unmarked verse is highlighted in it, whole; a marked
 // one changes colour, its words' tints with it (they share `ann.color`).
 // Remembered, for the next highlight made in one tap.
 function applyColor(id: string) {
 if (marked) ann.setColor(id);
 else {
 keepWords();
 ann.setHighlight(id);
 }
 rememberHighlightColor(id);
 }
 // The picker's Remove: every highlight on the verse, its words' too. A note
 // stays.
 function removeHighlight() {
 ann.clearHighlight();
 }
 // The computer's colour popover goes on a click outside it or Escape.
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
 // A highlighted verse keeps its words on the device, as a starred one does,
 // so Saved can show them offline and in the apps (lib/saved/verseWords.ts).
 function keepWords() {
 keepText(verseKey(book, chapter, verse.n), verse.text);
 }
 function toggleHighlight() {
 if (!ann.highlighted) keepWords();
 ann.toggleHighlight();
 }
 const bookmarks = useBookmarks();
 const verseLocator = {
 kind: "bible-verse" as const,
 book,
 chapter,
 verse: verse.n,
 };
 const isVerseBookmarked = bookmarks.isBookmarked(verseLocator);
 function toggleVerseBookmark() {
 // Its words, kept for Remember a verse (1.7), so its card works offline.
 if (!isVerseBookmarked) keepText(verseKey(book, chapter, verse.n), verse.text);
 bookmarks.toggle({
 kind: "bible-verse",
 book,
 bookName,
 chapter,
 verse: verse.n,
 label: `${bookName} ${chapter}:${verse.n}`,
 });
 // A verse saved is felt in the phone apps. Taking it back is not.
 if (!isVerseBookmarked) softTick();
 }
 // Florilegium: gather this verse into a collection. The picker sheet is
 // opened from the context menu / mobile toolbar; it owns its own UI so
 // none of the verse gesture handling is touched.
 const [gatherOpen, setGatherOpen] = useState(false);
 // The Florilegium is Plus. Shown to every reader, marked Plus where it is
 // locked, and a reader without Plus who chooses it meets the upgrade sheet
 // named for it instead of a picker that gathers into a page they cannot
 // open (lib/entitlements/usePlusFeatures.ts). One shared request per page.
 const upgrade = useUpgradeModal();
 const plusAllowed = usePlusFeatures();
 const gather = () => {
 void plusFeaturesNow().then((ok) => {
 if (ok === false) upgrade.open("florilegium");
 else setGatherOpen(true);
 });
 };
 const { on: showInterlinear } = useInterlinear();
 const hasInterlinear =
 showInterlinear && (!!originalText || (originalTokens?.length ?? 0) > 0);
 const hasTokens = (originalTokens?.length ?? 0) > 0;
 // Drop cap only on the plain reading view, never inside the 2-column
 // interlinear layout (where a floated initial would break the grid).
 const showDropCap = dropCap && !hasInterlinear;
 const hasEnglishTokens =
 hasInterlinear && (englishTokens?.length ?? 0) > 0;

 // Open popover state: which token index in this verse is selected, plus
 // the anchor rect so the popover knows where to render.
 const [popoverIdx, setPopoverIdx] = useState<number | null>(null);
 const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
 function openPopover(idx: number, el: HTMLElement) {
 setPopoverIdx(idx);
 setAnchorRect(el.getBoundingClientRect());
 }
 function closePopover() {
 setPopoverIdx(null);
 setAnchorRect(null);
 }

 // Greek-hover -> highlight the matching English word.
 // We track both the Strong's number AND the occurrence index within
 // the verse, so e.g. the 2nd ἐγέννησεν lights only the 2nd "begat"
 //, not all three.
 const [hoverStrong, setHoverStrong] = useState<{
 s: string;
 occ: number;
 } | null>(null);
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(ann.note ?? "");
 const [copied, setCopied] = useState(false);
 const textareaRef = useRef<HTMLTextAreaElement>(null);

 async function copyToClipboard(text: string) {
 try {
 // copyText, not navigator.clipboard bare: the iPhone app is not a secure
 // context, and there the bare call failed without a word (lib/ui/copyText.ts).
 if (!(await copyText(text))) return;
 setCopied(true);
 setTimeout(() => setCopied(false), 1400);
 } catch {
 /* clipboard unavailable; silently ignore */
 }
 }
 function reference() {
 return `${bookName} ${chapter}:${verse.n}`;
 }
 function copyVerseLink() {
 // shareLink(), never window.location.origin: the Capacitor shell serves
 // the export from https://localhost, so a copied link built from the
 // origin is dead the moment it leaves the device (lib/site.ts).
 return copyToClipboard(
 shareLink(`/bible/${book}/${chapter}#v${verse.n}`),
 );
 }
 function copyVerseText() {
 return copyToClipboard(verse.text);
 }
 // What the hold pill's Copy puts on the clipboard: the words, and under
 // them where they are from, which is what a pasted verse is asked for next.
 function copyVerseForPaste() {
 return copyToClipboard(`${verse.text}\n${reference()}`);
 }
 function copyAsQuote() {
 // The edition the reader shows (1.8): Brenton's Septuagint for the Old
 // Testament, the King James for the rest. It said "(KJV)" under every
 // verse, Brenton's too.
 const edition = getBook(book)?.source === "brenton-lxx-pd" ? "Brenton" : "KJV";
 return copyToClipboard(`"${verse.text}", ${reference()} (${edition})`);
 }
 function copyReference() {
 return copyToClipboard(reference());
 }

 // Custom right-click context menu. Anchored to cursor; closes on outside
 // click, Esc, scroll, or a second right-click outside.
 const [ctxAnchor, setCtxAnchor] = useState<{ x: number; y: number } | null>(
 null,
 );
 function openContextMenu(e: React.MouseEvent) {
 // Don't suppress the native menu when the user has selected text, let
 // the browser handle "Copy" for the active selection. Custom menu fires
 // only when the right-click is a plain click (no selection).
 const sel = window.getSelection();
 if (sel && !sel.isCollapsed) return;
 e.preventDefault();
 setCtxAnchor({ x: e.clientX, y: e.clientY });
 }
 function closeContextMenu() {
 setCtxAnchor(null);
 }

 // Drag selection state for word-level highlighting.
 const [dragStart, setDragStart] = useState<number | null>(null);
 const [dragEnd, setDragEnd] = useState<number | null>(null);
 const dragStartRef = useRef<number | null>(null);
 // The colour a drag shows before it lands: the verse's own, else the one
 // chosen last, which is what the words take when it lands.
 const [dragColor, setDragColor] = useState<string | null>(null);

 // Mobile gesture state, long-press opens the floating tool popup. A
 // tap or tap-then-scroll never opens the popup (only an explicit hold
 // does). The v3.7 invariant survives: no annotation writes from a tap.
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

 // Autofocus when entering edit mode.
 useEffect(() => {
 if (!editing) return;
 const el = textareaRef.current;
 if (!el) return;
 el.focus();
 el.setSelectionRange(el.value.length, el.value.length);
 }, [editing]);

 // Global mouseup so we still commit even if the user releases outside the verse.
 useEffect(() => {
 if (dragStart === null) return;
 function onUp() {
 const start = dragStartRef.current;
 const end = dragEnd ?? start;
 if (start !== null && end !== null) {
 keepText(verseKey(book, chapter, verse.n), verse.text);
 ann.toggleWordRange(start, end);
 }
 setDragStart(null);
 setDragEnd(null);
 setDragColor(null);
 dragStartRef.current = null;
 }
 function onMove(e: MouseEvent) {
 const idx = wordIndexFromElement(
 document.elementFromPoint(e.clientX, e.clientY),
 );
 if (idx !== null) setDragEnd(idx);
 }
 window.addEventListener("mouseup", onUp);
 window.addEventListener("mousemove", onMove);
 return () => {
 window.removeEventListener("mouseup", onUp);
 window.removeEventListener("mousemove", onMove);
 };
 }, [dragStart, dragEnd, ann, book, chapter, verse.n, verse.text]);

 function saveNote() {
 ann.setNote(draft);
 setEditing(false);
 }

 function cancelEdit() {
 setDraft(ann.note ?? "");
 setEditing(false);
 }

 function startDrag(idx: number) {
 setDragStart(idx);
 setDragEnd(idx);
 setDragColor(marked ? hl.id : lastHighlightColor());
 dragStartRef.current = idx;
 }

 function onWordsMouseDown(e: React.MouseEvent<HTMLParagraphElement>) {
 if (e.button !== 0) return;
 const idx = wordIndexFromElement(e.target as Element);
 if (idx === null) return;
 e.preventDefault(); // suppress native text selection
 startDrag(idx);
 }

 function onWordsTouchStart(e: React.TouchEvent<HTMLParagraphElement>) {
 const t = e.touches[0];
 if (!t) return;
 // Stash the origin and arm a long-press timer. Do NOT open the popup
 // yet, only an explicit long-press should. A pure tap (and the
 // touchstart of a scroll) must leave the UI untouched.
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

 function onWordsTouchMove(e: React.TouchEvent<HTMLParagraphElement>) {
 const t = e.touches[0];
 if (!t) return;
 // If the finger drifts enough to look like a scroll, cancel the
 // pending long-press and let the browser scroll naturally.
 const origin = pressOriginRef.current;
 if (!origin) return;
 const dx = Math.abs(t.clientX - origin.x);
 const dy = Math.abs(t.clientY - origin.y);
 if (dy > SCROLL_SLOP_PX || dx > SCROLL_SLOP_PX * 2) {
 cancelPress();
 }
 }

 function onWordsTouchEnd() {
 // A bare tap (or tap-then-scroll) is always a no-op. The popup is
 // opened by the long-press timer itself, not by touchend.
 cancelPress();
 }

 // Build the highlight set: persisted ∪ in-flight drag range.
 const baseHL = new Set(ann.highlightedWords ?? []);
 let previewHL: Set<number> | null = null;
 if (dragStart !== null && dragEnd !== null) {
 previewHL = new Set<number>();
 const lo = Math.min(dragStart, dragEnd);
 const hi = Math.max(dragStart, dragEnd);
 const rangeAllOn = (() => {
 for (let i = lo; i <= hi; i++) if (!baseHL.has(i)) return false;
 return true;
 })();
 if (rangeAllOn) {
 // Visual feedback for removal: drop those words from the preview set.
 baseHL.forEach((i) => {
 if (i < lo || i > hi) previewHL!.add(i);
 });
 } else {
 baseHL.forEach((i) => previewHL!.add(i));
 for (let i = lo; i <= hi; i++) previewHL.add(i);
 }
 }
 const renderedHL = previewHL ?? baseHL;

 const words = tokenize(verse.text);
 const dragging = dragStart !== null;

 // Precompute occurrence indices per Strong's number for both sides of
 // the interlinear. Used to align "Nth Greek with this Strong's" to
 // "Nth English with this Strong's", so repeated words (begat / ἐγέννησεν)
 // don't all light up at once when one is hovered.
 const greekOccByIdx: number[] = [];
 if (originalTokens) {
 const counts = new Map<string, number>();
 for (let i = 0; i < originalTokens.length; i++) {
 const s = originalTokens[i].s;
 if (!s) {
 greekOccByIdx.push(-1);
 continue;
 }
 const n = counts.get(s) ?? 0;
 greekOccByIdx.push(n);
 counts.set(s, n + 1);
 }
 }
 // English occurrence indexing is span-aware: consecutive English tokens that
 // share a Strong's number form one "translation span" of a single Greek
 // word and therefore share the same occurrence index. The data tags an
 // English phrase like "the book" with the head Greek word's number on
 // every token; without this, the Nth Greek υἱοῦ would map to the Nth
 // *token* tagged 5207 instead of the Nth *phrase*, which mis-aligns when
 // articles or prepositions are tagged with their following content word.
 const englishOccByIdx: number[] = [];
 if (englishTokens) {
 const counts = new Map<string, number>();
 let prevS: string | undefined;
 for (let i = 0; i < englishTokens.length; i++) {
 const s = englishTokens[i].s;
 if (!s) {
 englishOccByIdx.push(-1);
 prevS = undefined;
 continue;
 }
 if (s === prevS) {
 // Continuation of the current span, reuse the most recent occ.
 englishOccByIdx.push((counts.get(s) ?? 1) - 1);
 } else {
 const n = counts.get(s) ?? 0;
 englishOccByIdx.push(n);
 counts.set(s, n + 1);
 }
 prevS = s;
 }
 }

 return (
 <div
 id={`v${verse.n}`}
 className="scroll-mt-24 group relative -mx-2 px-2 py-0.5"
 data-hl={ann.highlighted ? "true" : undefined}
 // The highlight's colour in both themes (lib/bible/highlightPalette.ts);
 // app/globals.css gives --hl-verse, --hl-word and --hl-swatch the reading
 // mode's.
 data-hl-color={dragColor ?? hl.id}
 data-para-start={paraStart ? "" : undefined}
 data-verse=""
 style={highlightVars(dragColor ?? hl.id) as React.CSSProperties}
 >
 <div className="flex items-start gap-2">
 <div
 className={cn(
 "flex-1 min-w-0",
 // Side-by-side English | Greek even on mobile. With the per-verse
 // toolbar no longer occupying the right column on mobile, the
 // Greek column takes its place (gap is tighter on small screens).
 hasInterlinear &&
 "grid grid-cols-2 gap-x-3 md:gap-x-6 gap-y-2",
 )}
 >
 {/*
  * Drag/long-press gestures are a progressive enhancement for verse
  * selection. The same actions are reachable via keyboard through the
  * verse anchor links + the toolbar that appears on selection, so the
  * gesture handlers on this paragraph do not introduce a
  * keyboard-only-user gap.
  */}
 {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
 <p
 className={cn(
 "indent-0 min-w-0 transition-colors duration-150",
 showDropCap &&
 "overflow-hidden first-letter:float-left first-letter:mr-2.5 first-letter:mt-[0.06em] first-letter:font-serif first-letter:font-normal first-letter:not-italic first-letter:text-[2.6em] first-letter:leading-[0.78]",
 dragging && "select-none",
 showTools &&
 "bg-gold/[0.05] rounded-sm shadow-[inset_0_0_0_1px_rgba(183,176,163,0.35)]",
 )}
 // The app-wide hold-to-copy stands aside here: a verse has its own pill.
 data-own-press=""
 style={{ touchAction: "pan-y" }}
 onMouseDown={onWordsMouseDown}
 onTouchStart={onWordsTouchStart}
 onTouchMove={onWordsTouchMove}
 onTouchEnd={onWordsTouchEnd}
 onTouchCancel={onWordsTouchEnd}
 onContextMenu={openContextMenu}
 >
 {showDropCap ? null : hasCommentary ? (
 // Desktop: anchor link to the sticky right-rail section.
 // Mobile (`lg:hidden`), and a tablet in the apps, which has no rail
 // (native-md-*, 1.7): a button that opens the bottom sheet.
 // The marker red is brighter than the accent token on purpose: the
 // token at this size fails WCAG AA contrast on the night surface.
 <span className="inline-flex items-baseline mr-1.5 align-super">
 <a
 href={`#rail-v${verse.n}`}
 className="hidden lg:inline-flex native-md-hidden group/cmt items-baseline text-comment hover:text-comment-hover transition-colors"
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 title={t("bible.openCommentary")}
 >
 <sup className="font-sans text-eyebrow font-semibold tracking-[0.05em] group-hover/cmt:underline underline-offset-2">
 {verse.n}
 </sup>
 <span
 aria-hidden
 className="ml-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/75 group-hover/cmt:bg-accent transition-colors"
 />
 </a>
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 onOpenCommentary?.();
 }}
 className={cn(
 "lg:hidden native-md-inline-flex group/cmt inline-flex items-baseline text-comment active:text-comment-hover transition-colors",
 TAP_TARGET,
 )}
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 >
 <sup className="font-sans text-eyebrow font-semibold tracking-[0.05em]">
 {verse.n}
 </sup>
 <span
 aria-hidden
 className="ml-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/75"
 />
 </button>
 </span>
 ) : (
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] mr-1.5 align-super">
 {verse.n}
 </sup>
 )}
 {/* Whole-verse highlight: a quiet pigment wash over the words
   themselves, breaking line by line (box-decoration-break: clone
   gives every wrapped line its own rounded marker stroke). This
   replaced the full-height left margin bar: a highlight should
   look like ink on the text, not a callout border. Word-level
   highlights (the colour's `mark`, a step stronger) still read
   inside the wash. A change of colour fades across. */}
 <span
 className={cn(
 ann.highlighted &&
 "box-decoration-clone rounded-[4px] px-[3px] -mx-[3px] py-[0.1em] bg-[var(--hl-verse)] motion-safe:transition-[background-color] motion-safe:duration-200",
 )}
 >
 {hasEnglishTokens
 ? englishTokens!.map((tk, i) => {
 const matched =
 !!hoverStrong &&
 !!tk.s &&
 tk.s === hoverStrong.s &&
 englishOccByIdx[i] === hoverStrong.occ;
 const prevTk = i > 0 ? englishTokens![i - 1] : null;
 const nextTk =
 i < englishTokens!.length - 1 ? englishTokens![i + 1] : null;
 const matchedPrev =
 !!hoverStrong &&
 !!prevTk?.s &&
 prevTk.s === hoverStrong.s &&
 englishOccByIdx[i - 1] === hoverStrong.occ;
 const matchedNext =
 !!hoverStrong &&
 !!nextTk?.s &&
 nextTk.s === hoverStrong.s &&
 englishOccByIdx[i + 1] === hoverStrong.occ;
 const me = renderedHL.has(i);
 const mePrev = i > 0 && renderedHL.has(i - 1);
 const meNext =
 i < englishTokens!.length - 1 && renderedHL.has(i + 1);
 // Bridge the inter-word space when current AND next word
 // share the same kind of highlight. matched (Greek-hover)
 // takes precedence over me (user drag), its tint is
 // brighter, so a word that's both matched and me lets the
 // matched bridge through.
 const bridgeMatched = matched && matchedNext;
 const bridgeMe = me && meNext;
 return (
 <Fragment key={i}>
 <span
 data-word-idx={i}
 data-s={tk.s}
 onMouseEnter={() => {
 // Hovering an English word lights the matching Greek
 // word (bidirectional link). Suppressed mid-drag so
 // word-highlighting isn't disturbed.
 if (!dragging && tk.s)
 setHoverStrong({ s: tk.s, occ: englishOccByIdx[i] });
 }}
 onMouseLeave={() => {
 if (!dragging) setHoverStrong(null);
 }}
 className={cn(
 "cursor-pointer transition-colors duration-100",
 // Round + extend only on the outer ends of a run, so
 // adjacent highlighted words look like one bar.
 me && !mePrev && "rounded-l-[3px] pl-[1px] -ml-[1px]",
 me && !meNext && "rounded-r-[3px] pr-[1px] -mr-[1px]",
 // Same outer-edge rounding for the Greek-hover match
 // span, so a multi-word match reads as one gold pill.
 matched &&
 !matchedPrev &&
 "rounded-l-[3px] pl-[1px] -ml-[1px]",
 matched &&
 !matchedNext &&
 "rounded-r-[3px] pr-[1px] -mr-[1px]",
 )}
 style={
 matched
 ? {
 // Flat, continuous pill: the background bridges between adjacent
 // matched words. No per-word glow: it stacked halos across a
 // wrapped run and bled vertically onto the next line.
 backgroundColor: "rgba(183,176,163,0.45)",
 // The token, not #fff: --color-paper flips to dark ink in light
 // mode, where white on this warm grey pill is unreadable.
 color: "var(--color-paper)",
 }
 : me
 ? { backgroundColor: "var(--hl-word)" }
 : undefined
 }
 >
 {tk.w}
 </span>
 {i < englishTokens!.length - 1 && (
 <span
 style={
 bridgeMatched
 ? { backgroundColor: "rgba(183,176,163,0.45)" }
 : bridgeMe
 ? { backgroundColor: "var(--hl-word)" }
 : undefined
 }
 >
 {" "}
 </span>
 )}
 </Fragment>
 );
 })
 : words.map((w, i) => {
 const me = renderedHL.has(i);
 const prev = i > 0 && renderedHL.has(i - 1);
 const next = i < words.length - 1 && renderedHL.has(i + 1);
 return (
 <Fragment key={i}>
 <span
 data-word-idx={i}
 className={cn(
 "cursor-pointer transition-colors",
 me && !prev && "rounded-l-[3px] pl-[1px] -ml-[1px]",
 me && !next && "rounded-r-[3px] pr-[1px] -mr-[1px]",
 )}
 style={me ? { backgroundColor: "var(--hl-word)" } : undefined}
 >
 {w}
 </span>
 {i < words.length - 1 && (
 <span
 style={
 me && next ? { backgroundColor: "var(--hl-word)" } : undefined
 }
 >
 {" "}
 </span>
 )}
 </Fragment>
 );
 })}
 </span>
 {showDropCap && hasCommentary ? (
 // The chapter-opening verse suppresses the leading marker (a
 // superscript before the first letter would break the illuminated
 // drop cap), so its commentary marker hangs AFTER the text instead.
 // Matters now that whole works anchor at verse 1: the Hexaemeron on
 // Genesis 1:1, the psalm openings, the first tractates on John 1:1.
 <span className="inline-flex items-baseline ml-1.5 align-super">
 <a
 href={`#rail-v${verse.n}`}
 className="hidden lg:inline-flex native-md-hidden text-comment hover:text-comment-hover transition-colors"
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 title={t("bible.openCommentary")}
 >
 <span
 aria-hidden
 className="inline-block h-[5px] w-[5px] rounded-full bg-accent/75 hover:bg-accent transition-colors"
 />
 </a>
 <button
 type="button"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 onOpenCommentary?.();
 }}
 className={cn(
 "lg:hidden native-md-inline-flex inline-flex items-baseline text-comment active:text-comment-hover transition-colors",
 TAP_TARGET,
 )}
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 >
 <span
 aria-hidden
 className="inline-block h-[5px] w-[5px] rounded-full bg-accent/75"
 />
 </button>
 </span>
 ) : null}
 </p>

 {hasInterlinear && (
 <p
 lang="grc"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="indent-0 min-w-0 text-paper/85"
 >
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] mr-1.5 align-super">
 {verse.n}
 </sup>
 {hasTokens
 ? originalTokens!.map((tk, i) => {
 // Tokens with a Strong's number become clickable buttons.
 // Plain punctuation / unmatched LXX words render as text.
 const clickable = !!tk.s;
 const isWord = /\p{L}/u.test(tk.w);
 const needsSpaceBefore = i > 0 && isWord;
 // This Greek token is "matched" when it shares the hovered
 // Strong's number AND occurrence index, set either by its
 // own hover or by hovering the corresponding English word
 // (bidirectional link). Repeated words (e.g. ἐγέννησεν)
 // light only the matching occurrence, never all at once.
 const gMatched =
 !!hoverStrong &&
 !!tk.s &&
 tk.s === hoverStrong.s &&
 (greekOccByIdx[i] ?? 0) === hoverStrong.occ;
 return (
 <Fragment key={i}>
 {needsSpaceBefore ? " " : ""}
 {clickable ? (
 <button
 type="button"
 onClick={(e) => openPopover(i, e.currentTarget)}
 onMouseEnter={() =>
 setHoverStrong(
 tk.s
 ? { s: tk.s, occ: greekOccByIdx[i] ?? 0 }
 : null,
 )
 }
 onMouseLeave={() => setHoverStrong(null)}
 onFocus={() =>
 setHoverStrong(
 tk.s
 ? { s: tk.s, occ: greekOccByIdx[i] ?? 0 }
 : null,
 )
 }
 onBlur={() => setHoverStrong(null)}
 className={cn(
 "font-[inherit] inline border-b border-dotted transition-colors duration-150 cursor-pointer text-left rounded-[3px]",
 gMatched
 // text-paper, not text-white: the token follows the palette, so the
 // matched word stays legible on the light ground too.
 ? "border-transparent text-paper px-[1px]"
 : "border-paper/25 hover:border-paper/70 hover:text-paper",
 )}
 style={
 gMatched
 ? {
 backgroundColor: "rgba(183,176,163,0.45)",
 boxShadow: "0 0 10px rgba(183,176,163,0.55)",
 }
 : undefined
 }
 aria-label={t("bible.lookUpWord", { word: tk.w })}
 >
 {tk.w}
 </button>
 ) : (
 <span className="text-paper/70">{tk.w}</span>
 )}
 </Fragment>
 );
 })
 : originalText}
 </p>
 )}

 {popoverIdx !== null && anchorRect && originalTokens && (
 <WordPopover
 token={originalTokens[popoverIdx]}
 entry={
 (() => {
 const s = originalTokens[popoverIdx].s;
 return s ? (strongs?.[s] ?? null) : null;
 })()
 }
 anchorRect={anchorRect}
 onClose={closePopover}
 onWordStudy={
 onWordStudy && originalTokens[popoverIdx].s
 ? () => {
 const s = originalTokens[popoverIdx].s!;
 const lemma = strongs?.[s]?.l;
 closePopover();
 onWordStudy(s, lemma);
 }
 : undefined
 }
 />
 )}

 {ctxAnchor && (
 <VerseContextMenu
 x={ctxAnchor.x}
 y={ctxAnchor.y}
 onClose={closeContextMenu}
 groups={(() => {
 const copyGroup: ContextMenuGroup = [
 {
 label: copied ? t("common.copied") : t("bible.copyVerse"),
 onClick: copyVerseText,
 },
 { label: t("bible.copyAsQuote"), onClick: copyAsQuote },
 { label: t("bible.copyReference"), onClick: copyReference },
 { label: t("today.verse.copyLink"), onClick: copyVerseLink },
 ];
 const annotateGroup: ContextMenuGroup = [
 {
 label: ann.highlighted
 ? t("bible.removeHighlight")
 : t("bible.highlightVerse"),
 onClick: toggleHighlight,
 destructive: !!ann.highlighted,
 },
 {
 label: ann.note ? t("bible.editNote") : t("bible.addNote"),
 onClick: () => {
 setDraft(ann.note ?? "");
 setEditing(true);
 },
 },
 ];
 // Each colour by what it means to the reader, its disc before it and
 // a check by the one the verse wears; then the way to the names.
 const colorGroup: ContextMenuGroup = HIGHLIGHT_COLORS.map((c) => ({
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
 checked: marked && hl.id === c.id,
 }));
 colorGroup.push({
 label: t("bible.highlightNames.open"),
 onClick: () => setNaming(marked ? hl.id : null),
 });
 const bookmarkGroup: ContextMenuGroup = [
 {
 label: isVerseBookmarked
 ? t("study.saved.removeBookmark")
 : t("bible.bookmarkVerse"),
 onClick: toggleVerseBookmark,
 destructive: isVerseBookmarked,
 },
 {
 label:
 plusAllowed === false
 ? `${t("bible.gatherToFlorilegium")} · ${t("study.purifyPlus")}`
 : t("bible.gatherToFlorilegium"),
 onClick: gather,
 },
 ];
 const groups: ContextMenuGroup[] = [
 copyGroup,
 annotateGroup,
 colorGroup,
 bookmarkGroup,
 ];
 if (onOpenCrossRefs) {
 groups.push([
 {
 label:
 plusAllowed === false
 ? `${t("bible.crossRefs")} · ${t("study.purifyPlus")}`
 : t("bible.crossRefs"),
 onClick: onOpenCrossRefs,
 },
 ]);
 }
 if (hasCommentary) {
 groups.push([
 {
 label: t("bible.openCommentary"),
 onClick: () => {
 // Mobile wires the bottom sheet; the #rail anchor only
 // exists in the desktop study rail.
 if (onOpenCommentary) onOpenCommentary();
 else window.location.hash = `rail-v${verse.n}`;
 },
 },
 ]);
 }
 return groups;
 })()}
 />
 )}

 <FlorilegiumPickerSheet
 open={gatherOpen}
 onClose={() => setGatherOpen(false)}
 item={{
 kind: "scripture",
 text: verse.text,
 reference: `${bookName} ${chapter}:${verse.n}`,
 book,
 chapter,
 verse: verse.n,
 }}
 />
 <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
 </div>

 {/* Desktop-only inline toolbar, hover-revealed at md+. On mobile
 the same actions are presented in the MobileVerseToolbar popup
 triggered by long-press; see below. Never on a tablet in the apps
 (native-md-hidden, 1.7.1): there is no hover there, and the toolbar,
 unseen at opacity 0, still took about 170px beside every verse, so
 the words filled only the left of the centred column on the owner's
 iPad. A tablet uses the long-press, as a phone does. */}
 <div
 className={
 "hidden md:flex native-md-hidden items-center gap-1 shrink-0 -mt-1 transition-opacity duration-150 " +
 (ann.highlighted ||
 ann.note ||
 editing ||
 showSwatches ||
 isVerseBookmarked ||
 (ann.highlightedWords && ann.highlightedWords.length > 0)
 ? "md:opacity-100"
 : "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100")
 }
 >
 <button
 type="button"
 onClick={toggleHighlight}
 aria-label={
 ann.highlighted ? t("bible.removeHighlight") : t("bible.highlightVerse")
 }
 aria-pressed={!!ann.highlighted}
 title={
 ann.highlighted ? t("bible.removeHighlight") : t("bible.highlightVerse")
 }
 className={
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150 " +
 (ann.highlighted
 ? "border-[var(--hl-swatch)] bg-[var(--hl-verse)] text-[var(--hl-swatch)]"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper")
 }
 >
 <Sparkle size={16} filled={!!ann.highlighted} />
 </button>
 {/* The colours (1.7.1): a caret beside the spark opens the same
 picker a phone's tools carry, the verse's colour checked, Remove and
 the names with it. It was a disc with a dot of the colour inside. */}
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
 active={marked ? hl.id : null}
 onPick={(id) => {
 applyColor(id);
 setShowSwatches(false);
 }}
 onRemove={() => {
 removeHighlight();
 setShowSwatches(false);
 }}
 onNames={(id) => {
 setShowSwatches(false);
 setNaming(id);
 }}
 hint={t("bible.highlightVerse")}
 />
 </div>
 )}
 </div>
 {(ann.highlightedWords?.length ?? 0) > 0 && (
 <button
 type="button"
 onClick={ann.clearWords}
 aria-label={t("bible.clearWordHighlights")}
 title={t("bible.clearWordHighlights")}
 className="h-9 w-9 md:h-7 md:w-7 rounded-full border border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper flex items-center justify-center text-ui md:text-caption transition-colors duration-150"
 >
 <Erase size={16} />
 </button>
 )}
 {onOpenCrossRefs ? (
 <button
 type="button"
 onClick={onOpenCrossRefs}
 aria-label={t("bible.crossRefs")}
 title={t("bible.crossRefs")}
 className="hit-44 h-9 w-9 md:h-7 md:w-7 rounded-full border border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper flex items-center justify-center text-ui md:text-caption transition-colors duration-150"
 >
 <CrossRefs size={16} />
 </button>
 ) : null}
 <button
 type="button"
 onClick={copyVerseLink}
 aria-label={
 copied ? t("bible.verseLinkCopied") : t("bible.copyVerseLink")
 }
 title={copied ? t("common.copied") : t("bible.copyVerseLink")}
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
 onClick={toggleVerseBookmark}
 aria-label={
 isVerseBookmarked
 ? t("study.saved.removeBookmark")
 : t("bible.bookmarkVerse")
 }
 aria-pressed={isVerseBookmarked}
 title={
 isVerseBookmarked
 ? t("study.saved.removeBookmark")
 : t("bible.bookmarkVerse")
 }
 className={cn(
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150",
 isVerseBookmarked
 ? "bg-gold/25 border-gold/55 text-gold"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
 )}
 >
 <Star size={16} filled={isVerseBookmarked} />
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
 className={
 "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150 " +
 (ann.note
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper")
 }
 >
 <Pen size={16} />
 </button>
 </div>
 </div>

 {/* User note (saved) */}
 {ann.note && !editing && (
 <div className="mt-2 rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
 <p className="font-sans text-caption text-paper/45 mb-1">
 {t("bible.yourNote")}
 </p>
 <p className="font-sans text-detail text-paper/85 leading-[1.55] whitespace-pre-wrap">
 {ann.note}
 </p>
 {/* When it was written, in the reader's own words for time: the
     journal's reminder, on the verse itself (lib/bible/noteAge.ts). */}
 {ann.noteAt ? (
 <p className="mt-1.5 font-sans text-caption text-paper/45">
 {t("bible.noteWrittenWhen", { when: wroteWhen(ann.noteAt, locale) })}
 </p>
 ) : null}
 </div>
 )}

 {/* User note (editor) */}
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
 placeholder={t("bible.notePlaceholder")}
 rows={3}
 className="w-full bg-transparent border-0 outline-none resize-y font-sans text-ui text-paper placeholder:text-paper/40 leading-[1.55]"
 />
 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="font-sans text-eyebrow text-paper/40">
 {draft.length > 0 ? t("bible.noteSaveHint") : t("bible.escToClose")}
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

 {showTools && (
 <MobileVerseToolbar
 reference={reference()}
 highlight={{
 color: marked ? hl.id : null,
 onPick: applyColor,
 onRemove: removeHighlight,
 }}
 state={{
 bookmarked: isVerseBookmarked,
 hasNote: !!ann.note,
 copied,
 hasCrossRefs: !!onOpenCrossRefs,
 }}
 onAction={(a: MobileVerseAction) => {
 switch (a) {
 case "bookmark":
 toggleVerseBookmark();
 break;
 case "copyText":
 copyVerseForPaste();
 break;
 case "copyLink":
 copyVerseLink();
 break;
 case "note":
 setDraft(ann.note ?? "");
 setEditing(true);
 break;
 case "gather":
 setShowTools(false);
 setGatherOpen(true);
 break;
 case "crossRefs":
 onOpenCrossRefs?.();
 break;
 }
 }}
 onClose={() => setShowTools(false)}
 />
 )}
 </div>
 );
}

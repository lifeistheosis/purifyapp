"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { getBook } from "@/lib/bible/books";
import { verseBlock } from "@/lib/journal/page";
import { quoteInJournal } from "@/lib/journal/quoteInJournal";
import type { Verse, Token } from "@/lib/bible/load";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { loadInterlinear, loadStrongs } from "@/lib/bible/chapterData";
import { greekFor, taggedIndex } from "@/lib/bible/wordAlign";
import { readVerseAnnotation, useVerseAnnotation, writeVerseAnnotation } from "@/lib/bible/annotations";
import type { UndoEntry } from "@/lib/ui/useUndo";
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
import { VerseFocus, type StudyRow } from "./VerseFocus";
import { VerseNoteSheet } from "./VerseNoteSheet";
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
import { textDir } from "@/lib/i18n/textDir";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { CompareSheet } from "@/components/bible/CompareSheet";
import { cn } from "@/lib/cn";
import { plusFeaturesNow, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { keepText, verseKey } from "@/lib/remember/schedule";
import {
 LONG_PRESS_MS,
 SCROLL_SLOP_PX,
 TOUCH_ECHO_MS,
 isSecondTap,
 isTap,
 isTouchContextMenu,
 type TapAt,
} from "@/lib/bible/verseGesture";
import { lastPageScrollAt, watchPageScroll } from "@/lib/ui/pageScroll";

/**
 * The mobile commentary marker is a superscript verse number plus a 5px dot,
 * sized for the page, not for a thumb: as laid out its button box measures
 * about 14x5, and a real tap on it misses more often than it lands. The
 * house's touch floor (`.hit-44`, app/globals.css) grows the touch region
 * only, a 44px square, so the superscript keeps its deliberate size and the
 * verse line box is untouched. It was 24px, WCAG 2.5.8's floor, until the
 * guardrail list of 2026-11-10 held it to the app's 44 like every other
 * control. Centred on the marker, the square lay over a short first word
 * ("In" of John 1:1, measured on the export), so it stands beside the
 * marker instead: before a verse it ends where the words begin and reaches
 * back into the margin (-lead); after a drop-capped first verse it starts
 * where the words end (-trail).
 */
const TAP_TARGET = "touch-manipulation hit-44 hit-44-lead";
const TAP_TARGET_AFTER = "touch-manipulation hit-44 hit-44-trail";

/**
 * The commentary mark's dot is the same red on every palette, Light too: his
 * pick, "keep red" (late 2026-11-09, docs/1.9-build/BRAINSTORM.md, the photo
 * page's 11). The mock check (scripts/mock-check.mjs) reads a colour that
 * does not change with the palette as one typed in, so it is told why here,
 * by name.
 */
const KEEP_RED = {
 "data-mock-allow": "palette",
 "data-mock-why": "the commentary mark stays red on every palette: his pick, keep red (2026-11-09, the photo page's 11)",
} as const;

function tokenize(text: string): string[] {
 return text.trim().split(/\s+/);
}

/** When a gesture happened. Read in the gesture's handler, never in render. */
function gestureTime(): number {
 return typeof performance !== "undefined" ? performance.now() : Date.now();
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
 greekAvailable = false,
 onOpenCommentary,
 originalText,
 originalTokens,
 englishTokens,
 strongs,
 onOpenCrossRefs,
 onWordStudy,
 paraStart = false,
 onQuickHighlight,
}: {
 /** Paragraph view (1.7): this verse begins a paragraph. */
 paraStart?: boolean;
 /** The chapter's Undo, offered when a double tap marks or unmarks the verse (1.8). */
 onQuickHighlight?: (entry: UndoEntry) => void;
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
 /** The chapter has its Greek to show beside the English (the verse strip's Study, 1.9). */
 greekAvailable?: boolean;
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
  const router = useRouter();
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
 // A double tap highlights the whole verse in the colour used last (or the
 // colour its marked words already wear), and a second takes it off (1.8;
 // the owner: "double tapping a verse should highlight the verse"). Felt in
 // the hand, and offered back for a moment with Undo, which puts the verse
 // exactly as it was.
 function quickHighlight() {
 const before = readVerseAnnotation(book, chapter, verse.n);
 const removing = !!ann.highlighted;
 if (removing) ann.toggleHighlight();
 else {
 keepWords();
 const id = marked ? hl.id : lastHighlightColor();
 ann.setHighlight(id);
 rememberHighlightColor(id);
 }
 softTick();
 onQuickHighlight?.({
 label: t(removing ? "bible.highlightRemoved" : "bible.highlightAdded"),
 restore: () => writeVerseAnnotation(book, chapter, verse.n, before),
 });
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
 const { on: showInterlinear, toggle: toggleInterlinear } = useInterlinear();
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
 // The Greek read for a word tapped in the English (1.9), when the chapter's
 // Greek is not already here for the interlinear: read once, on that tap.
 const [lazyGreek, setLazyGreek] = useState<{
 tokens: Token[];
 strongs: Record<string, StrongsEntry>;
 } | null>(null);
 /** The English word the card was opened from, for its line over the Greek. */
 const [askedWord, setAskedWord] = useState<string | null>(null);
 const greekTokens = originalTokens ?? lazyGreek?.tokens;
 const strongsMap = strongs ?? lazyGreek?.strongs;
 function openPopover(idx: number, el: HTMLElement) {
 setPopoverIdx(idx);
 setAnchorRect(el.getBoundingClientRect());
 }
 function closePopover() {
 setPopoverIdx(null);
 setAnchorRect(null);
 setAskedWord(null);
 }

 // A word tapped in a selected verse (1.9, the owner's "tap the English
 // word"): its Greek, in the same card a Greek word opens, and from there
 // every place it stands (Plus). Where the chapter has no Greek beside its
 // English, or the word renders none, nothing opens.
 async function openEnglishWord(idx: number, el: HTMLElement) {
 if (!greekAvailable) return;
 const words = tokenize(verse.text);
 let tags = englishTokens;
 let tokens = originalTokens;
 if (!tags || !tokens) {
 const [lines, all] = await Promise.all([loadInterlinear(book, chapter), loadStrongs()]);
 tags = lines?.english[verse.n];
 tokens = lines?.tokens[verse.n];
 if (!tags || !tokens) return;
 setLazyGreek({ tokens, strongs: all ?? {} });
 }
 const k = taggedIndex(words, tags, idx);
 const g = k === null ? null : greekFor(tags, tokens, k);
 if (g === null) return;
 setAskedWord(words[idx].replace(/[^\p{L}\p{N}'’-]/gu, ""));
 openPopover(g, el);
 }

 // Greek-hover -> highlight the matching English word.
 // We track both the Strong's number AND the occurrence index within
 // the verse, so e.g. the 2nd ἐγέννησεν lights only the 2nd "begat"
 //, not all three.
 const [hoverStrong, setHoverStrong] = useState<{
 s: string;
 occ: number;
 } | null>(null);
 // The verse's note, written in the journal's sheet (VerseNoteSheet, 1.9).
 const [noteOpen, setNoteOpen] = useState(false);
 const [copied, setCopied] = useState(false);
 // The verse's words on the page: the focus's card rises from them.
 const wordsRef = useRef<HTMLParagraphElement | null>(null);

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
 // A hold on a phone sends a contextmenu too (Android's WebView, as Chrome
 // on a phone): that is the hold's, and the hold opens the verse's own
 // tools, so the computer's menu stays shut and so does the system's (build
 // 88 note 1, lib/bible/verseGesture.ts). The right-click menu is a mouse's.
 const pointerType = (e.nativeEvent as Partial<PointerEvent>).pointerType;
 if (isTouchContextMenu(typeof pointerType === "string" && pointerType ? pointerType : undefined, gestureTime() - touchAtRef.current)) {
 e.preventDefault();
 return;
 }
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
 // does). The v3.7 invariant survives for a single tap, which writes
 // nothing; a double tap is the one tap that does (1.8, quickHighlight).
 const [showTools, setShowTools] = useState(false);
 // Compare's sheet (1.9), mounted only while open: no verse loads anything until asked.
 const [compareOpen, setCompareOpen] = useState(false);
 const pressTimerRef = useRef<number | null>(null);
 const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

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

 function startDrag(idx: number) {
 setDragStart(idx);
 setDragEnd(idx);
 setDragColor(marked ? hl.id : lastHighlightColor());
 dragStartRef.current = idx;
 }

 // A phone's tap is followed by the mouse's own events, and the mouse's
 // mousedown starts a word drag: one tap on a word marked it (found on the
 // live site on 2026-10-19, there since the drag came in May). A mousedown
 // this soon after a touch is the tap's, not a mouse's.
 const touchAtRef = useRef(-Infinity);
 const TAP_MOUSE_MS = TOUCH_ECHO_MS;
 // Where the page stood when the touch began, and when it last scrolled
 // before it: a touch that stops a glide, or one the page moved under, is
 // the scroll's (build 88 note 2).
 const touchStartRef = useRef<{ at: number; scrollY: number; lastScrollAt: number } | null>(null);
 useEffect(() => watchPageScroll(), []);

 function onWordsMouseDown(e: React.MouseEvent<HTMLParagraphElement>) {
 if (e.button !== 0) return;
 if (performance.now() - touchAtRef.current < TAP_MOUSE_MS) return;
 const idx = wordIndexFromElement(e.target as Element);
 if (idx === null) return;
 e.preventDefault(); // suppress native text selection
 startDrag(idx);
 }

 function onWordsTouchStart(e: React.TouchEvent<HTMLParagraphElement>) {
 touchAtRef.current = gestureTime();
 touchStartRef.current = { at: touchAtRef.current, scrollY: window.scrollY, lastScrollAt: lastPageScrollAt() };
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

 // A double tap is two taps on the same verse within DOUBLE_TAP_MS, the
 // second within DOUBLE_TAP_SLOP_PX of the first.
 const lastTapRef = useRef<TapAt | null>(null);

 function onWordsTouchEnd(e?: React.TouchEvent<HTMLParagraphElement>) {
 // A tap: the finger came up before the hold fired and without a scroll,
 // the page still under it, and not the touch that stopped a glide
 // (lib/bible/verseGesture.ts, isTap).
 const quick = pressOriginRef.current !== null && pressTimerRef.current !== null;
 const start = touchStartRef.current;
 touchStartRef.current = null;
 // Build 90 note 10, his word: "when you double tap, it automatically
 // highlights the last color you picked ... when you hold it down, then
 // that window pops up." A lone tap opens nothing and waits for nothing; a
 // second tap in time is the highlight; the hold (onWordsTouchStart) is the
 // window. From 1.9's pick B until then a lone tap opened the window
 // (components/bible/VerseFocus.tsx), which then lay over the verse, so the
 // second tap of a double tap landed on the window and never highlighted.
 cancelPress();
 const p = e?.changedTouches[0];
 const tapped =
 !!p &&
 !!start &&
 isTap({
 quick,
 startedAt: start.at,
 lastScrollAt: start.lastScrollAt,
 startScrollY: start.scrollY,
 endScrollY: window.scrollY,
 // A tap on the verse's own buttons (the commentary mark) is theirs.
 onControl: !!(e?.target as Element | null)?.closest("button, a"),
 });
 // Nothing that is not a tap counts towards a double tap either.
 if (!tapped || !p) {
 lastTapRef.current = null;
 return;
 }
 const now = gestureTime();
 const here: TapAt = { t: now, x: p.clientX, y: p.clientY };
 if (isSecondTap(lastTapRef.current, here)) {
 lastTapRef.current = null;
 // No click and no mouse events after the second tap: it was the
 // highlight, and nothing else.
 e?.preventDefault();
 quickHighlight();
 return;
 }
 lastTapRef.current = here;
 // A lone tap: nothing, at once.
 if (!showTools) return;
 // The window is open already: a tap on one of the verse's words is that word.
 const target = e?.target as HTMLElement | null;
 const idx = target ? wordIndexFromElement(target) : null;
 if (idx !== null && target) void openEnglishWord(idx, target);
 }

 // A computer's double click does the same. Its two clicks each mark and
 // unmark the word under them (the drag), so the words end as they were. A
 // double click that follows a touch is the phone's echo of a double tap,
 // which touchend has already taken.
 function onWordsDoubleClick(e: React.MouseEvent<HTMLParagraphElement>) {
 if ((e.target as Element).closest("button, a")) return;
 if (gestureTime() - touchAtRef.current < TAP_MOUSE_MS) return;
 quickHighlight();
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

 // The strip's Study (1.9): what studies the verse, then what the old hold
 // menu held besides. A Plus row wears its mark and opens the upgrade sheet.
 function studyRows(): StudyRow[] {
 const rows: StudyRow[] = [];
 if (greekAvailable && !showInterlinear) {
 rows.push({ key: "greek", label: t("bible.strip.greek"), onSelect: toggleInterlinear });
 }
 if (onOpenCrossRefs) {
 rows.push({ key: "crossrefs", label: t("bible.crossRefs"), onSelect: onOpenCrossRefs, locked: plusAllowed === false });
 }
 // Compare (1.9, the sheet's 14): the verse in each Bible the app may show, a Plus tool.
 // Without Plus it opens the sheet on Compare's own row (rec 85).
 rows.push({
 key: "compare",
 label: t("bible.compare"),
 onSelect: () => {
 setShowTools(false);
 if (plusAllowed === false) upgrade.open("compare");
 else setCompareOpen(true);
 },
 locked: plusAllowed === false,
 });
 if (hasCommentary) {
 rows.push({
 key: "commentary",
 label: t("bible.openCommentary"),
 onSelect: () => {
 if (onOpenCommentary) onOpenCommentary();
 else window.location.hash = `rail-v${verse.n}`;
 },
 });
 }
 rows.push({
 key: "bookmark",
 label: isVerseBookmarked ? t("study.saved.removeBookmark") : t("bible.bookmarkVerse"),
 onSelect: toggleVerseBookmark,
 });
 rows.push({
 key: "gather",
 label: t("bible.gatherToFlorilegium"),
 onSelect: () => {
 setShowTools(false);
 gather();
 },
 locked: plusAllowed === false,
 });
 rows.push({ key: "quote", label: t("bible.copyAsQuote"), onSelect: () => void copyAsQuote() });
 // Quote in journal (1.9, docs/1.9-build/JOURNAL.md): the verse as a card on
 // the page being written, free, as Scripture is in the journal.
 rows.push({
 key: "journal",
 label: t("journal.quote.inJournal"),
 onSelect: () => {
 setShowTools(false);
 const card = verseBlock(book, chapter, verse.n);
 // Its words kept on the device, so the card reads offline as Saved's do.
 keepText(verseKey(book, chapter, verse.n), verse.text);
 if (card && quoteInJournal(card)) router.push("/journal/");
 },
 });
 rows.push({ key: "link", label: t("today.verse.copyLink"), onSelect: () => void copyVerseLink() });
 return rows;
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
 // The 1.9 tour lights a chapter's first verse: double tap it to highlight
 // it, hold it to open it (build 90 note 10).
 data-tour={verse.n === 1 ? "verse" : undefined}
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
 {/* The verse is the app's English, left to right under Arabic and Urdu (build 90 note 4); its commentary mark is named in the reader's words. */}
 {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
 <p
 lang="en"
 dir="ltr"
 className={cn(
 "indent-0 min-w-0 transition-colors duration-150",
 showDropCap &&
 "overflow-hidden first-letter:float-left first-letter:mr-2.5 first-letter:mt-[0.06em] first-letter:font-serif first-letter:font-normal first-letter:not-italic first-letter:text-[2.6em] first-letter:leading-[0.78]",
 dragging && "select-none",
 // 1.9: no box round the selected verse; its words wear the ghost
 // highlight below (.verse-ghost, app/globals.css).
 )}
 ref={wordsRef}
 // The app-wide hold-to-copy stands aside here: a verse has its own pill.
 data-own-press=""
 style={{ touchAction: "pan-y" }}
 onMouseDown={onWordsMouseDown}
 onTouchStart={onWordsTouchStart}
 onTouchMove={onWordsTouchMove}
 onTouchEnd={onWordsTouchEnd}
 onTouchCancel={() => onWordsTouchEnd()}
 onDoubleClick={onWordsDoubleClick}
 onContextMenu={openContextMenu}
 >
 {showDropCap ? null : hasCommentary ? (
 // Desktop: anchor link to the sticky right-rail section.
 // Mobile (`lg:hidden`), and a tablet in the apps, which has no rail
 // (native-md-*, 1.7): a button that opens the bottom sheet.
 // The marker red is brighter than the accent token on purpose: the
 // token at this size fails WCAG AA contrast on the night surface.
 <span className="inline-flex items-baseline me-1.5 align-super">
 <a
 href={`#rail-v${verse.n}`}
 className="hidden lg:inline-flex native-md-hidden group/cmt items-baseline text-comment hover:text-comment-hover transition-colors"
 lang={locale}
 dir={textDir(locale)}
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 title={t("bible.openCommentary")}
 >
 {/* The mark itself keeps the verse's order: its number, then its dot. */}
 <span dir="ltr" className="inline-flex items-baseline">
 <sup className="font-sans text-eyebrow font-semibold tracking-[0.05em] group-hover/cmt:underline underline-offset-2">
 {verse.n}
 </sup>
 <span
 aria-hidden
 className="ms-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/75 group-hover/cmt:bg-accent transition-colors"
 {...KEEP_RED}
 />
 </span>
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
 lang={locale}
 dir={textDir(locale)}
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 >
 <span dir="ltr" className="inline-flex items-baseline">
 <sup className="font-sans text-eyebrow font-semibold tracking-[0.05em]">
 {verse.n}
 </sup>
 <span
 aria-hidden
 className="ms-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/75"
 {...KEEP_RED}
 />
 </span>
 </button>
 </span>
 ) : (
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] me-1.5 align-super">
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
 {/* Selected (1.9, the verse strip): a ghost of a highlight, the same
   stroke line by line in a faint white, so the verse reads chosen, not
   yet marked; a verse already highlighted keeps its colour with the
   ghost's edge. Where its words open their Greek, they wear a faint
   dotted line (.verse-ghost-words). */}
 <span
 className={cn(
 (ann.highlighted || showTools) &&
 "box-decoration-clone rounded-[4px] px-[3px] -mx-[3px] py-[0.1em] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200",
 ann.highlighted && "bg-[var(--hl-verse)]",
 showTools && (ann.highlighted ? "verse-ghost-edge" : "verse-ghost"),
 showTools && greekAvailable && "verse-ghost-words",
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
 <span className="inline-flex items-baseline ms-1.5 align-super">
 <a
 href={`#rail-v${verse.n}`}
 className="hidden lg:inline-flex native-md-hidden text-comment hover:text-comment-hover transition-colors"
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 title={t("bible.openCommentary")}
 >
 <span
 aria-hidden
 className="inline-block h-[5px] w-[5px] rounded-full bg-accent/75 hover:bg-accent transition-colors"
 {...KEEP_RED}
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
 TAP_TARGET_AFTER,
 )}
 aria-label={t("bible.openCommentaryOnVerse", { verse: verse.n })}
 >
 <span
 aria-hidden
 className="inline-block h-[5px] w-[5px] rounded-full bg-accent/75"
 {...KEEP_RED}
 />
 </button>
 </span>
 ) : null}
 {/* A note on the verse (1.9): a small pen at its end, which opens the
   note in the journal's sheet. Its tap is its own (the verse's tap rule
   leaves its buttons alone). */}
 {ann.note ? (
 <button
 type="button"
 data-verse-note-mark=""
 aria-label={t("bible.yourNote")}
 title={t("bible.yourNote")}
 onClick={(e) => {
 e.stopPropagation();
 setNoteOpen(true);
 }}
 className="hit-44 relative ms-1.5 inline-grid h-[26px] w-[26px] place-items-center rounded-full bg-paper/[0.12] align-[-3px] text-paper/85"
 >
 <Pen size={14} />
 </button>
 ) : null}
 </p>

 {hasInterlinear && (
 <p
 lang="grc"
 dir="ltr"
 style={{ fontFamily: "var(--font-greek), serif" }}
 className="indent-0 min-w-0 text-paper/85"
 >
 <sup className="font-sans text-eyebrow font-medium text-paper/55 tracking-[0.05em] me-1.5 align-super">
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

 {popoverIdx !== null && anchorRect && greekTokens && (
 <WordPopover
 token={greekTokens[popoverIdx]}
 entry={
 (() => {
 const s = greekTokens[popoverIdx].s;
 return s ? (strongsMap?.[s] ?? null) : null;
 })()
 }
 anchorRect={anchorRect}
 english={askedWord ?? undefined}
 onClose={closePopover}
 onWordStudy={
 onWordStudy && greekTokens[popoverIdx].s
 ? () => {
 const s = greekTokens[popoverIdx].s!;
 const lemma = strongsMap?.[s]?.l;
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
 onClick: () => setNoteOpen(true),
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
 noteOpen ||
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
 onClick={() => setNoteOpen(true)}
 aria-label={ann.note ? t("bible.editNote") : t("bible.addNote")}
 aria-pressed={noteOpen}
 title={ann.note ? t("bible.editNote") : t("bible.addNote")}
 // A 44px touch box round the 28px pen (a tablet's browser touches this
 // row too); the row's gap leaves the star beside it its own (1.9).
 className={
 "hit-44 ms-1 h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-ui md:text-caption transition-colors duration-150 " +
 (ann.note
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper")
 }
 >
 <Pen size={16} />
 </button>
 </div>
 </div>

 {/* The verse's note, in the journal's sheet (1.9, build 88 note 3): on a
   phone as tall as the keyboard leaves, on a computer the centred panel. */}
 <VerseNoteSheet
 open={noteOpen}
 book={book}
 chapter={chapter}
 verse={verse.n}
 label={reference()}
 note={ann.note}
 onSave={(body) => ann.setNote(body)}
 onClose={() => setNoteOpen(false)}
 />

 {/* The verse's door for a screen reader and a keyboard (build 90 note
   10): a lone tap opens nothing now, and the hold that opens the window
   is a finger's. One action for them, out of sight, a small pill under
   the verse when a keyboard lands on it (app/globals.css, .verse-door).
   Phones and the apps' tablets: a computer's hover tools take the
   keyboard there. */}
 <button
 type="button"
 data-verse-door=""
 className="verse-door md:hidden native-md-inline-flex"
 onClick={() => setShowTools(true)}
 data-mock-allow="target"
 data-mock-why="out of sight until a keyboard lands on it, then a pill 44px tall"
 >
 {t("bible.verseActionsFor", { reference: reference() })}
 </button>

 {showTools && (
 <VerseFocus
 reference={reference()}
 verseText={verse.text}
 edition={getBook(book)?.source === "brenton-lxx-pd" ? "Brenton" : "KJV"}
 link={shareLink(`/bible/${book}/${chapter}#v${verse.n}`)}
 anchor={wordsRef}
 highlight={{
 color: marked ? hl.id : null,
 onPick: applyColor,
 onRemove: removeHighlight,
 }}
 copied={copied}
 onCopy={() => void copyVerseForPaste()}
 onNote={() => {
 setShowTools(false);
 setNoteOpen(true);
 }}
 onWord={greekAvailable ? (idx, el) => void openEnglishWord(idx, el) : undefined}
 study={studyRows()}
 onClose={() => setShowTools(false)}
 />
 )}
 {compareOpen ? (
 <CompareSheet open onClose={() => setCompareOpen(false)} book={book} chapter={chapter} verse={verse.n} reference={reference()} words={verse.text} />
 ) : null}
 </div>
 );
}

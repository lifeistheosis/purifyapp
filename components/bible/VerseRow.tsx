"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Verse, Token } from "@/lib/bible/load";
import type { StrongsEntry } from "@/lib/bible/strongs";
import { useVerseAnnotation } from "@/lib/bible/annotations";
import { useInterlinear } from "@/lib/bible/interlinear";
import { useBookmarks } from "@/lib/bookmarks";
import { WordPopover } from "./WordPopover";
import {
  VerseContextMenu,
  type ContextMenuGroup,
} from "./VerseContextMenu";
import {
  MobileVerseToolbar,
  type MobileVerseAction,
} from "./MobileVerseToolbar";
import { cn } from "@/lib/cn";

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
  hasCommentary = false,
  onOpenCommentary,
  originalText,
  originalTokens,
  englishTokens,
  strongs,
}: {
  book: string;
  /** Display name of the book (e.g. "Matthew"). Used in citation copy
   *  formats: "Matthew 3:16", "...as a quote — Matthew 3:16 (KJV)". */
  bookName: string;
  chapter: number;
  verse: Verse;
  hasCommentary?: boolean;
  /** Mobile callback: when set, the verse-number badge opens a bottom-sheet
   *  with this verse's commentary on tap instead of routing to `#rail-vN`
   *  (which doesn't exist on mobile any more). Only wired when
   *  `hasCommentary` is true. */
  onOpenCommentary?: () => void;
  /** Greek NT / Greek LXX text for this verse, when Interlinear is on. */
  originalText?: string;
  /** Word-by-word Greek tokens with Strong's. */
  originalTokens?: Token[];
  /** Word-by-word KJV English tokens with Strong's (NT only). When provided
   *  and Interlinear is on, the English column re-renders as tokens so
   *  hovering a Greek word can highlight the matching English word(s). */
  englishTokens?: { w: string; s?: string }[];
  /** Chapter-scoped Strong's lexicon — only entries for this chapter's tokens. */
  strongs?: Record<string, StrongsEntry>;
}) {
  const ann = useVerseAnnotation(book, chapter, verse.n);
  const bookmarks = useBookmarks();
  const verseLocator = {
    kind: "bible-verse" as const,
    book,
    chapter,
    verse: verse.n,
  };
  const isVerseBookmarked = bookmarks.isBookmarked(verseLocator);
  function toggleVerseBookmark() {
    bookmarks.toggle({
      kind: "bible-verse",
      book,
      bookName,
      chapter,
      verse: verse.n,
      label: `${bookName} ${chapter}:${verse.n}`,
    });
  }
  const { on: showInterlinear } = useInterlinear();
  const hasInterlinear =
    showInterlinear && (!!originalText || (originalTokens?.length ?? 0) > 0);
  const hasTokens = (originalTokens?.length ?? 0) > 0;
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
  // — not all three.
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
      await navigator.clipboard.writeText(text);
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
    return copyToClipboard(
      `${window.location.origin}/bible/${book}/${chapter}#v${verse.n}`,
    );
  }
  function copyVerseText() {
    return copyToClipboard(verse.text);
  }
  function copyAsQuote() {
    return copyToClipboard(`"${verse.text}", ${reference()} (KJV)`);
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
    // Don't suppress the native menu when the user has selected text — let
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

  // Mobile gesture state — long-press opens the floating tool popup. A
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
        ann.toggleWordRange(start, end);
      }
      setDragStart(null);
      setDragEnd(null);
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
  }, [dragStart, dragEnd, ann]);

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
    // yet — only an explicit long-press should. A pure tap (and the
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
  // "Nth English with this Strong's" — so repeated words (begat / ἐγέννησεν)
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
        // Continuation of the current span — reuse the most recent occ.
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
      className="scroll-mt-24 group relative -mx-2 px-2 py-0.5 rounded transition-[background-color,box-shadow] duration-500 ease-out data-[hl=true]:shadow-[inset_3px_0_0_var(--color-gold)] data-[focus=true]:bg-gold/12 data-[focus=true]:shadow-[0_0_0_2px_rgba(212,175,55,0.55),0_0_24px_rgba(212,175,55,0.35)]"
      data-hl={ann.highlighted ? "true" : undefined}
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
        <p
          className={cn(
            "indent-0 min-w-0 transition-colors duration-150",
            dragging && "select-none",
            showTools &&
              "bg-gold/[0.05] rounded-sm shadow-[inset_0_0_0_1px_rgba(212,175,55,0.35)]",
          )}
          style={{ touchAction: "pan-y" }}
          onMouseDown={onWordsMouseDown}
          onTouchStart={onWordsTouchStart}
          onTouchMove={onWordsTouchMove}
          onTouchEnd={onWordsTouchEnd}
          onTouchCancel={onWordsTouchEnd}
          onContextMenu={openContextMenu}
        >
          {hasCommentary ? (
            // Desktop: anchor link to the sticky right-rail section.
            // Mobile (`lg:hidden`): a button that opens the bottom sheet.
            <span className="inline-flex items-baseline mr-1.5 align-super">
              <a
                href={`#rail-v${verse.n}`}
                className="hidden lg:inline-flex group/cmt items-baseline text-accent/75 hover:text-accent transition-colors"
                aria-label={`Open commentary on verse ${verse.n}`}
                title="Open commentary"
              >
                <sup className="font-sans text-[10px] font-semibold tracking-[0.05em] group-hover/cmt:underline underline-offset-2">
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
                className="lg:hidden group/cmt inline-flex items-baseline text-accent/75 active:text-accent transition-colors"
                aria-label={`Open commentary on verse ${verse.n}`}
              >
                <sup className="font-sans text-[10px] font-semibold tracking-[0.05em]">
                  {verse.n}
                </sup>
                <span
                  aria-hidden
                  className="ml-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/75"
                />
              </button>
            </span>
          ) : (
            <sup className="font-sans text-[10px] font-medium text-paper/40 tracking-[0.05em] mr-1.5 align-super">
              {verse.n}
            </sup>
          )}
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
                // takes precedence over me (user drag) — its tint is
                // brighter — so a word that's both matched and me lets the
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
                        me && "bg-gold/30",
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
                              backgroundColor: "rgba(212,175,55,0.45)",
                              color: "#fff",
                              boxShadow: "0 0 10px rgba(212,175,55,0.55)",
                            }
                          : undefined
                      }
                    >
                      {tk.w}
                    </span>
                    {i < englishTokens!.length - 1 && (
                      <span
                        className={
                          bridgeMe && !bridgeMatched ? "bg-gold/30" : ""
                        }
                        style={
                          bridgeMatched
                            ? { backgroundColor: "rgba(212,175,55,0.45)" }
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
                        me && "bg-gold/30",
                        me && !prev && "rounded-l-[3px] pl-[1px] -ml-[1px]",
                        me && !next && "rounded-r-[3px] pr-[1px] -mr-[1px]",
                      )}
                    >
                      {w}
                    </span>
                    {i < words.length - 1 && (
                      <span className={me && next ? "bg-gold/30" : ""}>
                        {" "}
                      </span>
                    )}
                  </Fragment>
                );
              })}
        </p>

        {hasInterlinear && (
          <p
            lang="grc"
            style={{ fontFamily: "var(--font-greek), serif" }}
            className="indent-0 min-w-0 text-paper/85"
          >
            <sup className="font-sans text-[10px] font-medium text-paper/30 tracking-[0.05em] mr-1.5 align-super">
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
                  // Strong's number AND occurrence index — set either by its
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
                              ? "border-transparent text-white px-[1px]"
                              : "border-paper/25 hover:border-paper/70 hover:text-paper",
                          )}
                          style={
                            gMatched
                              ? {
                                  backgroundColor: "rgba(212,175,55,0.45)",
                                  boxShadow: "0 0 10px rgba(212,175,55,0.55)",
                                }
                              : undefined
                          }
                          aria-label={`Look up ${tk.w}`}
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
                  label: copied ? "Copied" : "Copy verse",
                  onClick: copyVerseText,
                },
                { label: "Copy as quote", onClick: copyAsQuote },
                { label: "Copy reference", onClick: copyReference },
                { label: "Copy link", onClick: copyVerseLink },
              ];
              const annotateGroup: ContextMenuGroup = [
                {
                  label: ann.highlighted
                    ? "Remove highlight"
                    : "Highlight verse",
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
              ];
              const bookmarkGroup: ContextMenuGroup = [
                {
                  label: isVerseBookmarked ? "Remove bookmark" : "Bookmark verse",
                  onClick: toggleVerseBookmark,
                  destructive: isVerseBookmarked,
                },
              ];
              const groups: ContextMenuGroup[] = [
                copyGroup,
                annotateGroup,
                bookmarkGroup,
              ];
              if (hasCommentary) {
                groups.push([
                  {
                    label: "Open commentary",
                    onClick: () => {
                      window.location.hash = `rail-v${verse.n}`;
                    },
                  },
                ]);
              }
              return groups;
            })()}
          />
        )}
        </div>

        {/* Desktop-only inline toolbar — hover-revealed at md+. On mobile
            the same actions are presented in the MobileVerseToolbar popup
            triggered by long-press; see below. */}
        <div
          className={
            "hidden md:flex items-center gap-1 shrink-0 -mt-1 transition-opacity duration-150 " +
            (ann.highlighted ||
            ann.note ||
            editing ||
            isVerseBookmarked ||
            (ann.highlightedWords && ann.highlightedWords.length > 0)
              ? "md:opacity-100"
              : "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100")
          }
        >
          <button
            type="button"
            onClick={ann.toggleHighlight}
            aria-label={ann.highlighted ? "Remove highlight" : "Highlight verse"}
            aria-pressed={!!ann.highlighted}
            title={ann.highlighted ? "Remove highlight" : "Highlight verse"}
            className={
              "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-[14px] md:text-[12px] transition-colors duration-150 " +
              (ann.highlighted
                ? "bg-gold/30 border-gold/60 text-gold"
                : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper")
            }
          >
            ✦
          </button>
          {(ann.highlightedWords?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={ann.clearWords}
              aria-label="Clear word highlights"
              title="Clear word highlights"
              className="h-9 w-9 md:h-7 md:w-7 rounded-full border border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper flex items-center justify-center text-[14px] md:text-[12px] transition-colors duration-150"
            >
              ⌫
            </button>
          )}
          <button
            type="button"
            onClick={copyVerseLink}
            aria-label={copied ? "Verse link copied" : "Copy verse link"}
            title={copied ? "Copied" : "Copy verse link"}
            className={cn(
              "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-[14px] md:text-[12px] transition-colors duration-150",
              copied
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
            )}
          >
            {copied ? "✓" : "🔗"}
          </button>
          <button
            type="button"
            onClick={toggleVerseBookmark}
            aria-label={
              isVerseBookmarked ? "Remove bookmark" : "Bookmark verse"
            }
            aria-pressed={isVerseBookmarked}
            title={isVerseBookmarked ? "Remove bookmark" : "Bookmark verse"}
            className={cn(
              "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-[14px] md:text-[12px] transition-colors duration-150",
              isVerseBookmarked
                ? "bg-gold/25 border-gold/55 text-gold"
                : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper",
            )}
          >
            {isVerseBookmarked ? "★" : "☆"}
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
            className={
              "h-9 w-9 md:h-7 md:w-7 rounded-full border flex items-center justify-center text-[14px] md:text-[12px] transition-colors duration-150 " +
              (ann.note
                ? "bg-paper/15 border-paper/30 text-paper"
                : "border-paper/15 text-paper/55 hover:bg-paper/10 hover:text-paper")
            }
          >
            ✎
          </button>
        </div>
      </div>

      {/* User note (saved) */}
      {ann.note && !editing && (
        <div className="mt-2 rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
          <p className="font-sans text-[10px] uppercase tracking-[1.2px] text-paper/45 mb-1">
            Your note
          </p>
          <p className="font-sans text-[13px] text-paper/85 leading-[1.55] whitespace-pre-wrap">
            {ann.note}
          </p>
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
            placeholder="Add a note for this verse…"
            rows={3}
            className="w-full bg-transparent border-0 outline-none resize-y font-sans text-[14px] text-paper placeholder:text-paper/40 leading-[1.55]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-sans text-[11px] text-paper/40">
              {draft.length > 0 ? "⌘+Enter to save · Esc to cancel" : "Esc to close"}
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
                  className="font-sans text-[12px] text-paper/55 hover:text-paper transition-colors px-2 py-1"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={cancelEdit}
                className="font-sans text-[12px] text-paper/55 hover:text-paper transition-colors px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNote}
                className="font-sans text-[12px] font-medium bg-paper text-night rounded-pill px-3 py-1 hover:bg-paper/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showTools && (
        <MobileVerseToolbar
          reference={reference()}
          state={{
            highlighted: !!ann.highlighted,
            bookmarked: isVerseBookmarked,
            hasNote: !!ann.note,
            hasWordHighlights: (ann.highlightedWords?.length ?? 0) > 0,
            copied,
          }}
          onAction={(a: MobileVerseAction) => {
            switch (a) {
              case "highlight":
                ann.toggleHighlight();
                break;
              case "bookmark":
                toggleVerseBookmark();
                break;
              case "copyLink":
                copyVerseLink();
                break;
              case "note":
                setDraft(ann.note ?? "");
                setEditing(true);
                break;
              case "clearWords":
                ann.clearWords();
                break;
            }
          }}
          onClose={() => setShowTools(false)}
        />
      )}
    </div>
  );
}

"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Verse } from "@/lib/bible/load";
import { useVerseAnnotation } from "@/lib/bible/annotations";
import { useInterlinear } from "@/lib/bible/interlinear";
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
  chapter,
  verse,
  hasCommentary = false,
  originalText,
}: {
  book: string;
  chapter: number;
  verse: Verse;
  hasCommentary?: boolean;
  /** Optional Greek NT / Greek LXX text for this verse. Shown when the
   *  Interlinear toggle is ON. */
  originalText?: string;
}) {
  const ann = useVerseAnnotation(book, chapter, verse.n);
  const { on: showInterlinear } = useInterlinear();
  const hasInterlinear = showInterlinear && !!originalText;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ann.note ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag selection state for word-level highlighting.
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const dragStartRef = useRef<number | null>(null);

  // Re-sync draft when annotation hydrates from localStorage.
  useEffect(() => {
    setDraft(ann.note ?? "");
  }, [ann.note]);

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
    const idx = wordIndexFromElement(
      document.elementFromPoint(t.clientX, t.clientY),
    );
    if (idx === null) return;
    startDrag(idx);
  }

  function onWordsTouchMove(e: React.TouchEvent<HTMLParagraphElement>) {
    const t = e.touches[0];
    if (!t || dragStartRef.current === null) return;
    const idx = wordIndexFromElement(
      document.elementFromPoint(t.clientX, t.clientY),
    );
    if (idx === null) return;
    // Only suppress page scroll once the user has actually moved to a
    // different word — otherwise scrolling stays natural for normal taps.
    if (idx !== dragStartRef.current) e.preventDefault();
    setDragEnd(idx);
  }

  function onWordsTouchEnd() {
    const start = dragStartRef.current;
    const end = dragEnd ?? start;
    if (start !== null && end !== null) {
      ann.toggleWordRange(start, end);
    }
    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
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

  return (
    <div
      id={`v${verse.n}`}
      className="scroll-mt-24 group relative -mx-2 px-2 py-0.5 rounded transition-colors duration-200 data-[hl=true]:shadow-[inset_3px_0_0_#d4af37]"
      data-hl={ann.highlighted ? "true" : undefined}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex-1 min-w-0",
            hasInterlinear &&
              "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2",
          )}
        >
        <p
          className={cn(
            "indent-0 min-w-0",
            dragging && "select-none",
          )}
          onMouseDown={onWordsMouseDown}
          onTouchStart={onWordsTouchStart}
          onTouchMove={onWordsTouchMove}
          onTouchEnd={onWordsTouchEnd}
          onTouchCancel={onWordsTouchEnd}
        >
          {hasCommentary ? (
            <a
              href={`#rail-v${verse.n}`}
              className="inline-flex items-baseline mr-1.5 align-super text-accent/70 hover:text-accent transition-colors"
              aria-label={`Open commentary on verse ${verse.n}`}
              title="Open commentary"
            >
              <sup className="font-sans text-[10px] font-semibold tracking-[0.05em]">
                {verse.n}
              </sup>
              <span
                aria-hidden
                className="ml-[2px] inline-block h-[5px] w-[5px] rounded-full bg-accent/70"
              />
            </a>
          ) : (
            <sup className="font-sans text-[10px] font-medium text-paper/40 tracking-[0.05em] mr-1.5 align-super">
              {verse.n}
            </sup>
          )}
          {words.map((w, i) => (
            <Fragment key={i}>
              <span
                data-word-idx={i}
                className={cn(
                  "cursor-pointer transition-colors",
                  renderedHL.has(i) &&
                    "bg-[#d4af37]/30 rounded-[3px] px-[1px] -mx-[1px]",
                )}
              >
                {w}
              </span>
              {i < words.length - 1 ? " " : ""}
            </Fragment>
          ))}
        </p>

        {hasInterlinear && originalText && (
          <p
            lang="grc"
            style={{ fontFamily: "var(--font-greek), serif" }}
            className="indent-0 min-w-0 text-paper/85"
          >
            <sup className="font-sans text-[10px] font-medium text-paper/30 tracking-[0.05em] mr-1.5 align-super">
              {verse.n}
            </sup>
            {originalText}
          </p>
        )}
        </div>

        {/* Toolbar — always visible on touch, hover-revealed at md+ */}
        <div
          className={
            "flex items-center gap-1 shrink-0 -mt-1 transition-opacity duration-150 " +
            (ann.highlighted ||
            ann.note ||
            editing ||
            (ann.highlightedWords && ann.highlightedWords.length > 0)
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100")
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
                ? "bg-[#d4af37]/30 border-[#d4af37]/60 text-[#d4af37]"
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
    </div>
  );
}

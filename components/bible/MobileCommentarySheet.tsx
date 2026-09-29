"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Close } from "@/components/ui/icons/Close";
import type { ChapterCommentary, CommentaryNote } from "@/lib/bible/load";
import { paragraphsOf, previewParagraphs, readingMinutes } from "@/lib/bible/readability";
import { SaintIcon } from "./SaintIcon";
import { GlossedText } from "./GlossedText";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";

/** Group a verse's notes by author, preserving first-appearance order. */
function groupByAuthor(notes: CommentaryNote[]): { author: string; items: CommentaryNote[] }[] {
  const order: string[] = [];
  const map = new Map<string, CommentaryNote[]>();
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

/** The teaser fades out rather than stopping at a hard line. A mask, so it
 *  fades to whatever the card sits on, on every palette. */
const TEASER_FADE = "linear-gradient(to bottom, black 62%, transparent)";

/** How tall the teaser stands, in rem: about seven lines of the serif. It
 *  spans paragraphs on purpose. St. Gregory's first paragraph is usually his
 *  quotation of the verse itself, so a one-paragraph teaser only repeated the
 *  line the reader had just tapped. */
const TEASER_REM = 12.5;

/**
 * One commentary. It opens as a few lines of the Father's own words rather
 * than a bare title row, so the sheet reads on arrival; "Continue reading"
 * then gives the reading budget (lib/bible/readability.ts), and once more
 * gives the rest. The height change is animated, not jumped.
 *
 * Depth: 0 the teaser, 1 the budget, 2 everything.
 */
function NoteCard({
  note,
  label,
  onGrow,
}: {
  note: CommentaryNote;
  /** The work, when the Father's header cannot name it for all his cards. */
  label?: string;
  /** Called when the card opens further, so the sheet can rise to full height. */
  onGrow: () => void;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  const paragraphs = paragraphsOf(note.text);
  const { shown, hidden } = previewParagraphs(paragraphs);
  const minutes = readingMinutes(note.text);

  const [depth, setDepth] = useState<0 | 1 | 2>(0);
  // Whether the teaser actually hides anything. Measured, because it depends
  // on the width of the phone and not only on the word count.
  const [clipped, setClipped] = useState(true);
  const cardRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const fromHeight = useRef<number | null>(null);
  // Whether the budget itself overflows the teaser; when it does not, the
  // first tap can go straight to the whole note.
  const overflows = useRef(true);

  useLayoutEffect(() => {
    if (depth !== 0) return;
    const el = textRef.current;
    if (!el) return;
    overflows.current = el.scrollHeight > el.clientHeight + 1;
    setClipped(hidden > 0 || overflows.current);
  }, [depth, hidden]);

  // Animate the text box from its old height to its new one. The teaser's
  // max-height is lifted for the ride, or a collapse would snap to it.
  useLayoutEffect(() => {
    const el = textRef.current;
    const from = fromHeight.current;
    fromHeight.current = null;
    if (!el || from === null || reduced) return;
    const cap = el.style.maxHeight;
    el.style.maxHeight = "none";
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const to = cap ? Math.min(el.scrollHeight, TEASER_REM * rem) : el.offsetHeight;
    if (Math.abs(to - from) < 2) {
      el.style.maxHeight = cap;
      return;
    }
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.transition = "height 360ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.height = `${to}px`;
    const done = () => {
      el.style.height = "";
      el.style.transition = "";
      el.style.maxHeight = cap;
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
    const guard = setTimeout(done, 420);
    return () => clearTimeout(guard);
  }, [depth, reduced]);

  const deeper = depth === 0 ? clipped : depth === 1 && hidden > 0;
  const toggle = () => {
    fromHeight.current = textRef.current?.offsetHeight ?? null;
    if (deeper) {
      setDepth(depth === 0 && overflows.current ? 1 : 2);
      onGrow();
    } else {
      setDepth(0);
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    }
  };

  const visible = depth === 2 ? paragraphs : shown;
  const teaser = depth === 0 && clipped;

  return (
    <article
      ref={cardRef}
      className="rounded-2xl bg-paper/[0.035] px-4 pb-1.5 pt-3.5 ring-1 ring-inset ring-paper/10"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-sans text-eyebrow italic text-paper/55">{label}</p>
        {/* Length before the tap, as on the desktop rail: a 40 minute homily
            on a phone deserves to be announced. */}
        <span className="shrink-0 font-sans text-eyebrow tabular-nums text-paper/45">
          {t("bible.minRead", { minutes })}
        </span>
      </div>
      {note.digest ? (
        <p className="mb-3 border-l-2 border-paper/15 pl-3 font-sans text-caption leading-[1.6] text-paper/60">
          {note.digest}
        </p>
      ) : null}
      <div
        ref={textRef}
        className="space-y-2.5 overflow-hidden"
        style={
          teaser
            ? { maxHeight: `${TEASER_REM}rem`, maskImage: TEASER_FADE, WebkitMaskImage: TEASER_FADE }
            : undefined
        }
      >
        {visible.map((para, i) => (
          <GlossedText key={i} text={para} className="font-serif text-ui leading-[1.62] text-paper/85" />
        ))}
      </div>
      {clipped || depth > 0 ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={depth > 0}
          className="-ml-1 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-1 font-sans text-caption font-semibold text-premium-ink transition-opacity hover:opacity-80"
        >
          {deeper ? t("bible.continueReading") : t("bible.showLess")}
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={"h-3 w-3 transition-transform duration-300 " + (deeper ? "" : "rotate-180")}
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="h-2" />
      )}
    </article>
  );
}

/** A Father and his commentaries on this verse. When they all come from one
 *  work, the header names it once instead of every card repeating it. */
function FatherBlock({
  author,
  items,
  onGrow,
}: {
  author: string;
  items: CommentaryNote[];
  onGrow: () => void;
}) {
  const { tn } = useTranslate();
  const works = new Set(items.map((n) => n.work));
  const shared = works.size === 1 ? items[0].work : null;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2.5 px-0.5">
        <SaintIcon author={author} size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/75">
            {author}
          </p>
          <p className="truncate font-sans text-eyebrow italic text-paper/55">
            {shared ?? tn("bible.commentariesCount", items.length)}
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.map((n, i) => (
          <NoteCard key={i} note={n} label={shared ? undefined : n.work} onGrow={onGrow} />
        ))}
      </div>
    </section>
  );
}

/**
 * Mobile-only bottom sheet with the patristic commentary on one verse. Desktop
 * keeps the sticky right rail (StudyRail).
 *
 * It follows the finger (lib/ui/useDraggableSheet.ts): long commentary opens
 * to 60% of the screen and pulls up to full height; the header drags either
 * way, the body pulls down from its top, a flick down closes it, and the
 * backdrop dims and blurs in step instead of arriving at once.
 *
 * Portaled to <body> like components/ui/Sheet.tsx, so no page stacking
 * context can put the tab bar over it (commit 5ee95ed3).
 */
export function MobileCommentarySheet({
  bookName,
  chapter,
  verse,
  commentary,
  onClose,
}: {
  bookName: string;
  chapter: number;
  verse: number | null;
  commentary: ChapterCommentary;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  const { mounted, panelRef, scrimRef, bodyRef, grab, expand } = useDraggableSheet({
    open: verse !== null,
    onClose,
    reduced,
  });
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Keep showing the last verse while the sheet slides away, rather than
  // emptying it mid-exit.
  const [lastVerse, setLastVerse] = useState<number | null>(verse);
  if (verse !== null && verse !== lastVerse) setLastVerse(verse);
  const shownVerse = verse ?? lastVerse;

  // Lock body scroll while open, and flag the global overlay so other
  // floating UI (the PWA install banner) steps aside.
  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  useEffect(() => {
    if (verse !== null) closeRef.current?.focus({ preventScroll: true });
  }, [verse]);

  // Android hardware back closes the sheet rather than leaving the chapter.
  // `mounted` rather than `verse !== null`, so the listener stays live for the
  // whole close animation.
  useAndroidBack(mounted, onClose);

  if (!mounted || typeof document === "undefined") return null;

  const notes = shownVerse !== null ? commentary[String(shownVerse)] ?? [] : [];
  const titleId = "commentary-sheet-title";

  return createPortal(
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop. Its opacity and blur are driven by the sheet's position. */}
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-label={t("bible.closeCommentary")}
        onClick={onClose}
        className="absolute inset-0 bg-night/60"
        style={{ opacity: 0 }}
      />
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] border-t border-paper/15 bg-night shadow-[0_-12px_40px_rgba(0,0,0,0.32)] will-change-transform"
      >
        {/* The whole top of the sheet is the handle. touch-none stops the
            browser claiming the gesture before the pointer handlers see it. */}
        <div className="cursor-grab touch-none select-none active:cursor-grabbing" {...grab}>
          <div className="flex justify-center pb-1.5 pt-3">
            <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/25" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <div className="min-w-0">
              <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
                {t("bible.patristicCommentary")}
              </p>
              <p id={titleId} className="mt-0.5 truncate font-serif text-body text-paper">
                {bookName} {chapter}:{shownVerse}
                {notes.length > 0 ? (
                  <span className="ml-2 rounded-full bg-paper/10 px-1.5 py-0.5 align-middle font-sans text-eyebrow font-semibold tabular-nums text-paper/55">
                    {notes.length}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper/65 transition-colors hover:bg-paper/[0.06] hover:text-paper"
            >
              <Close size={16} />
            </button>
          </div>
        </div>
        <div aria-hidden className="h-px bg-paper/10" />

        {/* Scroll body. The bottom padding clears the home indicator, or the
            last line of a Father sits under it (Android beta, 2026-07-14). */}
        <div
          ref={bodyRef}
          className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}
        >
          {notes.length === 0 ? (
            <p className="py-10 text-center font-sans text-detail text-paper/55">{t("bible.noCommentaryVerse")}</p>
          ) : (
            groupByAuthor(notes).map((g, i) => (
              <FatherBlock key={i} author={g.author} items={g.items} onGrow={expand} />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

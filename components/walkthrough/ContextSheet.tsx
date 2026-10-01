"use client";

// The context card, in its two states (the owner's specification, 3.1):
//
//   peek   "Pausing elevates a contextual preview 15% from the lower edge,
//          presenting a brief hook." A low card rises above the tab bar with
//          the card's title and hook. Tap to open; swipe it down to let it go.
//   open   "Tapping presents a full-sheet tactile overlay": the line drawing
//          with tilt parallax, the note, the Father's line, one question to
//          carry, and Keep, which saves the card to Saved in one tap.
//
// The peek slides on transform and is still under reduced motion
// (app/globals.css, "Walkthroughs"). The open sheet follows the finger like
// every other pop-up card (lib/ui/useDraggableSheet): its top drags both ways,
// the body pulls down from its top, a flick closes it, and the backdrop dims
// and blurs in step. It locks the page, hides the tab bar, and answers Escape
// and the Android back button.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import type { ContextCard } from "@/lib/walkthroughs/types";
import { WalkArt } from "./art";
import { useTilt } from "./useTilt";

export type SheetMode = "peek" | "open" | null;

// How long a closed card stays mounted: the peek's exit slide, and the open
// sheet's close (useDraggableSheet's 300ms, with room to finish).
const EXIT_MS = { peek: 260, open: 340 } as const;

export function ContextSheet({
  card,
  mode,
  book,
  bookName,
  chapter,
  fatherSource,
  onOpen,
  onClose,
}: {
  card: ContextCard | null;
  mode: SheetMode;
  book: string;
  bookName: string;
  chapter: number;
  fatherSource: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  // Keep the last card mounted through the exit slide.
  const [shown, setShown] = useState<{ card: ContextCard; mode: Exclude<SheetMode, null> } | null>(null);
  const [leaving, setLeaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- the exit slide needs the
     last card to outlive the prop that closed it (Sheet.tsx does the same). */
  useEffect(() => {
    if (card && mode) {
      setShown({ card, mode });
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, EXIT_MS[shown.mode]);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, mode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!shown || typeof document === "undefined") return null;
  return createPortal(
    shown.mode === "peek" ? (
      <Peek card={shown.card} leaving={leaving} bookName={bookName} chapter={chapter} onOpen={onOpen} onClose={onClose} />
    ) : (
      <Open
        card={shown.card}
        leaving={leaving}
        book={book}
        bookName={bookName}
        chapter={chapter}
        fatherSource={fatherSource}
        onClose={onClose}
      />
    ),
    document.body,
  );
}

/** Follows a downward drag and reports whether it went far enough to close. */
function useDragDown(onDismiss: () => void, threshold: number) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  return {
    dy,
    handlers: {
      onPointerDown: (e: ReactPointerEvent) => {
        start.current = e.clientY;
      },
      onPointerMove: (e: ReactPointerEvent) => {
        if (start.current == null) return;
        setDy(Math.max(0, e.clientY - start.current));
      },
      onPointerUp: () => {
        if (start.current == null) return;
        const went = dy;
        start.current = null;
        setDy(0);
        if (went > threshold) onDismiss();
      },
      onPointerCancel: () => {
        start.current = null;
        setDy(0);
      },
    },
  };
}

function Peek({
  card,
  leaving,
  bookName,
  chapter,
  onOpen,
  onClose,
}: {
  card: ContextCard;
  leaving: boolean;
  bookName: string;
  chapter: number;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const drag = useDragDown(onClose, 40);
  return (
    <div
      className={cn(
        "walk-peek lm-card fixed inset-x-3 z-[65] mx-auto max-w-xl rounded-[22px] ring-1 ring-inset ring-premium/25",
        "bottom-[calc(var(--tab-bar-h)+var(--now-playing-h)+env(safe-area-inset-bottom,0px)+12px)] md:bottom-6",
        leaving && "is-leaving",
      )}
      style={{
        background:
          "radial-gradient(120% 90% at 85% 0%, rgba(201,162,90,0.10) 0%, transparent 55%), linear-gradient(160deg, #26262b 0%, #19191c 100%)",
        transform: drag.dy ? `translateY(${drag.dy}px)` : undefined,
      }}
      role="region"
      aria-label={card.title}
      {...drag.handlers}
    >
      <div className="flex items-start gap-2 p-4 pb-3">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-premium-ink">
            {t("walk.verseRef", { book: bookName, chapter, verse: card.verse })}
          </span>
          <span className="mt-1 block font-heading text-ui font-bold leading-snug text-paper">{card.title}</span>
          <span className="mt-1 block font-sans text-detail leading-[1.5] text-paper/70">{card.hook}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("walk.close")}
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
      <div className="flex justify-end px-4 pb-4">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night transition-colors hover:bg-paper/90"
        >
          {t("walk.open")}
        </button>
      </div>
    </div>
  );
}

function Open({
  card,
  leaving,
  book,
  bookName,
  chapter,
  fatherSource,
  onClose,
}: {
  card: ContextCard;
  leaving: boolean;
  book: string;
  bookName: string;
  chapter: number;
  fatherSource: string;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const { toggle, isBookmarked } = useBookmarks();
  const frame = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);
  const reduced = useReducedMotion();
  // half: 1, because the owner's specification makes this a full sheet.
  const { panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({ open: !leaving, onClose, reduced, half: 1 });
  const kept = isBookmarked({ kind: "walkthrough-card", cardId: card.id });

  useTilt(frame, !leaving);
  useAndroidBack(!leaving, onClose);

  useEffect(() => {
    lockBodyScroll();
    setOverlayOpen(true);
    const r = requestAnimationFrame(() => setEntered(true));
    closeBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [onClose]);

  const titleId = `walk-card-${card.id}`;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop. Its opacity and blur are driven by the sheet's position. */}
      <button
        ref={scrimRef}
        type="button"
        aria-label={t("walk.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        style={{ opacity: 0 }}
        tabIndex={-1}
      />
      {/* Centred on desktop by margin, not by translate: the sheet's own
          transform is its position while it is dragged. */}
      <div
        ref={panelRef}
        className={cn(
          "lm-card absolute inset-x-0 bottom-0 top-[max(env(safe-area-inset-top,0px),2.25rem)] flex flex-col overflow-hidden rounded-t-[28px] ring-1 ring-inset ring-paper/10 will-change-transform",
          "md:top-auto md:bottom-[6vh] md:mx-auto md:max-h-[88vh] md:w-[min(40rem,92vw)] md:rounded-[28px]",
        )}
        style={{ background: "linear-gradient(170deg, #1f1f23 0%, #141416 100%)" }}
      >
        <div className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between px-3 pt-2 active:cursor-grabbing" {...grab}>
          <span aria-hidden className="ml-[calc(50%-1.75rem)] h-1.5 w-10 rounded-full bg-paper/20 md:invisible" />
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label={t("walk.close")}
            className="inline-flex size-11 items-center justify-center rounded-full text-paper/55 transition-colors hover:text-paper"
          >
            <Close size={16} />
          </button>
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] md:px-8">
          <div
            ref={frame}
            className="walk-art-frame dark-island relative overflow-hidden rounded-2xl text-paper/70 ring-1 ring-inset ring-paper/10"
            style={{ background: "radial-gradient(120% 100% at 50% 0%, rgba(201,162,90,0.10) 0%, transparent 60%), #17171a" }}
          >
            <WalkArt id={card.art} drawn={entered && !leaving} className="walk-art block aspect-[16/10] w-full" />
          </div>

          <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-premium-ink">
            {t("walk.verseRef", { book: bookName, chapter, verse: card.verse })}
          </p>
          <h2 id={titleId} className="mt-1.5 text-title-sm font-bold leading-tight text-paper">
            {card.title}
          </h2>
          <p className="mt-3 font-sans text-ui leading-[1.65] text-paper/80">{card.body}</p>

          {card.father ? (
            <figure className="mt-5 border-l-2 border-premium/50 pl-4">
              <blockquote className="font-serif text-ui italic leading-[1.6] text-paper/85">{card.father.excerpt}</blockquote>
              <figcaption className="mt-2 font-sans text-caption text-paper/50">{fatherSource}</figcaption>
            </figure>
          ) : null}

          <div className="mt-6 rounded-2xl bg-paper/[0.04] p-4 ring-1 ring-inset ring-paper/10">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-paper/50">{t("walk.carry")}</p>
            <p className="mt-1.5 font-serif text-body italic leading-[1.5] text-paper">{card.question}</p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              aria-pressed={kept}
              onClick={() =>
                toggle({
                  kind: "walkthrough-card",
                  book,
                  bookName,
                  chapter,
                  cardId: card.id,
                  label: card.title,
                })
              }
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-pill px-5 font-sans text-caption font-semibold transition-colors",
                kept ? "bg-premium text-night" : "bg-paper text-night hover:bg-paper/90",
              )}
            >
              <span aria-hidden className={cn("walk-keep-mark", kept && "is-kept")}>
                {kept ? "✓" : "+"}
              </span>
              {kept ? t("walk.kept") : t("walk.keep")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-caption text-paper/60 transition-colors hover:text-paper"
            >
              {t("walk.backToText")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

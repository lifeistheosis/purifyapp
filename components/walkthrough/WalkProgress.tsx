"use client";

import { useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useScrollFill } from "@/lib/ui/useScrollFill";

/**
 * Where the reader is in the book (1.7), under the page's bar: "Chapter 3 of
 * 42", the movement the chapter belongs to, and Chapters, which opens the
 * book's chapters in the sheet. The guided flow of the owner's pattern 4 (a
 * start, a sense of where you are, a finish, what comes next), in the shape of
 * Your first Liturgy's progress row.
 *
 * Its line fills as this chapter is read, moved by the scroll and nothing else
 * (lib/ui/useScrollFill.ts: written once a frame, never through React, never
 * eased), so it carries meaning and asks for no switch. It is this chapter's
 * line and not the book's: a forty-two chapter book would move a book's line
 * by a few pixels a chapter, and the words beside it already say where in the
 * book the reader is.
 */
export function WalkProgress({
  n,
  total,
  movement,
  onChapters,
}: {
  n: number;
  total: number;
  /** The movement's name, in the walk's own words. */
  movement: string;
  onChapters: () => void;
}) {
  const { t } = useTranslate();
  const fill = useRef<HTMLDivElement>(null);
  useScrollFill(fill);

  return (
    <div
      data-walk-progress
      className="sticky top-12 below-topbar z-20 -mx-5 bg-night px-5 pb-1 pt-3 md:top-[72px] md:-mx-8 md:px-8"
    >
      <div aria-hidden className="h-[3px] w-full overflow-hidden rounded-full bg-paper/10">
        <div
          ref={fill}
          className="h-full w-full origin-left rounded-full bg-paper/80 rtl:origin-right"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      <div className="mt-1 flex min-h-11 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-sans text-caption text-paper/60">
          <span className="font-semibold text-paper/85">{t("walk.chapterOf", { n, total })}</span>
          {movement ? (
            <>
              {" · "}
              <span lang="en">{movement}</span>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onChapters}
          aria-haspopup="dialog"
          className="tap-press -me-2 inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/75 hover:text-paper"
        >
          {t("walk.chapterNav")}
        </button>
      </div>
    </div>
  );
}

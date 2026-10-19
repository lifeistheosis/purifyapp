"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { markLessonRead, nextLessonId, useLessonsRead } from "@/lib/prayers/lessonProgress";

type Neighbour = { id: string; title: string } | null;

/** How long a lesson's last words stay on the screen before it counts as read. */
const READ_AFTER_MS = 2000;

/**
 * The foot of a lesson (1.7): where it is marked read and the way on is.
 *
 * A lesson is read once its end has been on the screen for two seconds,
 * counted only while the page is visible: scrolling past it on the way
 * somewhere else does not read it. Then the end says so, quietly, and offers
 * the next lesson as the one action, the previous as a quiet link. After the
 * last lesson the way on is a rule of the reader's own (/prayers/personal).
 */
export function LessonEnd({
  id,
  lessonIds,
  prev,
  next,
}: {
  id: string;
  /** Every lesson, in order, so the last one can tell when all are read. */
  lessonIds: string[];
  prev: Neighbour;
  next: Neighbour;
}) {
  const { t } = useTranslate();
  const read = useLessonsRead();
  const end = useRef<HTMLDivElement>(null);
  const isRead = read.has(id);

  useEffect(() => {
    const el = end.current;
    if (!el || isRead || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const io = new IntersectionObserver(([entry]) => {
      window.clearTimeout(timer);
      if (entry.isIntersecting && document.visibilityState === "visible") {
        timer = window.setTimeout(() => markLessonRead(id), READ_AFTER_MS);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [id, isRead]);

  const allRead = isRead && nextLessonId(read, lessonIds) === null;

  return (
    <div ref={end} data-lesson-end className="mt-14 border-t border-paper/10 pt-8">
      {isRead ? (
        <p role="status" className="inline-flex items-center gap-1.5 font-sans text-detail font-semibold text-paper/80">
          <Check size={15} className="shrink-0" />
          {t("prayers.learning.lessonRead")}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col items-start gap-3">
        {next ? (
          <Link
            href={`/prayers/learning/${next.id}`}
            className="tap-press inline-flex min-h-12 max-w-full items-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
          >
            <span className="truncate">{t("prayers.learning.nextLessonNamed", { title: next.title })}</span>
            <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
          </Link>
        ) : (
          <>
            {allRead ? <p className="font-serif text-body text-paper">{t("prayers.learning.allRead")}</p> : null}
            <Link
              href="/prayers/personal"
              className="tap-press inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
            >
              {t("prayers.learning.makeYourRule")}
              <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          </>
        )}
        {prev ? (
          <Link
            href={`/prayers/learning/${prev.id}`}
            className="tap-press inline-flex min-h-11 max-w-full items-center gap-1 font-sans text-detail text-paper/60 hover:text-paper"
          >
            <ChevronLeft size={14} className="shrink-0 rtl:-scale-x-100" />
            <span className="truncate">{t("prayers.learning.previousLessonNamed", { title: prev.title })}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

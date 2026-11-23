"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DayEnd, useDayHere } from "@/components/onboarding/DayFrame";
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
 *
 * On a day of a reader's first week (2.0, off for readers; the owner's "keep
 * going" of 2026-11-23): when this lesson is today's step, its end gives way.
 * The frame's end stands where the one action stood, the week's line and
 * "Done for today" (components/onboarding/DayFrame.tsx), since the lesson's
 * own button leads away from the week. The way on stays, as a quiet link like
 * the way back, and "Lesson read" is left unsaid: the day's end says it, and
 * a screen says each thing once. The lesson is still marked read, as for
 * every reader.
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
  // This lesson is today's step of the reader's first week, waiting or kept today.
  const day = useDayHere();
  const quiet = "tap-press inline-flex min-h-11 max-w-full items-center gap-1 font-sans text-detail text-paper/60 hover:text-paper";

  return (
    <div ref={end} data-lesson-end className="mt-14 border-t border-paper/10 pt-8">
      {isRead && !day ? (
        <p role="status" className="inline-flex items-center gap-1.5 font-sans text-detail font-semibold text-paper/80">
          <Check size={15} className="shrink-0" />
          {t("prayers.learning.lessonRead")}
        </p>
      ) : null}

      <div className={day ? "flex flex-col items-start gap-3" : "mt-5 flex flex-col items-start gap-3"}>
        {day ? (
          <>
            <DayEnd plain className="mb-2 w-full" />
            <Link href={next ? `/prayers/learning/${next.id}` : "/prayers/personal"} data-lesson-on="" className={quiet}>
              <span className="truncate">{next ? t("prayers.learning.nextLessonNamed", { title: next.title }) : t("prayers.learning.makeYourRule")}</span>
              <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          </>
        ) : next ? (
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
          <Link href={`/prayers/learning/${prev.id}`} className={quiet}>
            <ChevronLeft size={14} className="shrink-0 rtl:-scale-x-100" />
            <span className="truncate">{t("prayers.learning.previousLessonNamed", { title: prev.title })}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

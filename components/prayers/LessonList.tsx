"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { nextLessonId, useLessonsRead } from "@/lib/prayers/lessonProgress";

export type LessonRow = {
  id: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
};

/**
 * Learn to pray's way in and its lessons in order (1.7, the owner's note 16:
 * "lessons in order with progress"). The way in names the next lesson to
 * read; each lesson read wears a check where its number was. That is all the
 * progress there is: which lessons are done, no score.
 */
export function LessonWayIn({ lessons }: { lessons: LessonRow[] }) {
  const { t } = useTranslate();
  const read = useLessonsRead();
  const nextId = nextLessonId(read, lessons.map((l) => l.id));
  const next = lessons.find((l) => l.id === nextId) ?? null;

  if (!next) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="inline-flex items-center gap-1.5 font-serif text-body text-paper">
          <Check size={16} className="shrink-0" />
          {t("prayers.learning.allRead")}
        </p>
        <Link
          href="/prayers/personal"
          className="tap-press inline-flex min-h-12 items-center gap-1.5 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night"
        >
          {t("prayers.learning.makeYourRule")}
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    );
  }

  const first = read.size === 0;
  return (
    <Link
      href={`/prayers/learning/${next.id}`}
      data-learn-next
      className="tap-press inline-flex min-h-12 max-w-full items-center gap-1.5 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night"
    >
      <span className="truncate">
        {first ? t("prayers.learning.start") : t("prayers.learning.next", { title: next.title })}
      </span>
      <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
    </Link>
  );
}

export function LessonList({ lessons, lang }: { lessons: LessonRow[]; lang: string }) {
  const { t } = useTranslate();
  const read = useLessonsRead();

  return (
    <ol className="divide-y divide-paper/10 border-y border-paper/10">
      {lessons.map((l) => {
        const done = read.has(l.id);
        return (
          <li key={l.id}>
            <Link href={`/prayers/learning/${l.id}`} className="press-card flex items-start gap-4 py-4">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full font-sans text-detail font-semibold tabular-nums",
                  done ? "bg-paper text-night" : "text-paper/70 ring-1 ring-inset ring-paper/25",
                )}
              >
                {done ? <Check size={15} /> : l.order}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span lang={lang} className="font-serif text-lede font-semibold leading-tight text-paper">
                  {l.title}
                </span>
                <span lang={lang} className="mt-1 font-sans text-detail leading-[1.55] text-paper/60">
                  {l.summary}
                </span>
                <span className="mt-1.5 font-sans text-caption text-paper/50">
                  {[t("today.minRead", { count: l.estimatedMinutes }), done ? t("prayers.learning.read") : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import { useInReadersLanguage, type Loaders } from "@/components/i18n/useInReadersLanguage";
import { rowsOf } from "@/lib/prayers/lessonText";

import { LessonList, LessonWayIn, type LessonRow } from "./LessonList";
import { LESSON_FILES } from "./LessonView";

/**
 * Learn to pray's list in the reader's language (1.9): the page writes the
 * English rows, and a German reader's are the German file's, loaded on the
 * device (components/prayers/LessonView.tsx, LESSON_FILES).
 */
const ROWS: Loaders<LessonRow[]> = { de: async () => rowsOf(await LESSON_FILES.de!()) };

function useRows(english: LessonRow[]) {
  return useInReadersLanguage(english, ROWS, "lessons");
}

/** The way in: the next lesson to read, named in the reader's language. */
export function LessonWayInHere({ lessons }: { lessons: LessonRow[] }) {
  const { value } = useRows(lessons);
  return <LessonWayIn lessons={value} />;
}

/** The lessons in order, in the reader's language. */
export function LessonListHere({ lessons }: { lessons: LessonRow[] }) {
  const { value, lang } = useRows(lessons);
  return <LessonList lessons={value} lang={lang} />;
}

import lessonsJson from "@/data/prayers/learning/lessons.json";
import lessonsDeJson from "@/data/prayers/learning/lessons.de.json";

export type PrayerLesson = {
  id: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  intro: string;
  prayer: string | null;
  tryThis: string;
};

export const LESSONS: PrayerLesson[] = (lessonsJson as PrayerLesson[])
  .slice()
  .sort((a, b) => a.order - b.order);

const LESSONS_DE: PrayerLesson[] = (lessonsDeJson as PrayerLesson[])
  .slice()
  .sort((a, b) => a.order - b.order);

const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
const BY_ID_DE = new Map(LESSONS_DE.map((l) => [l.id, l]));

/**
 * Pick the lesson list for a given locale. Falls back to the English
 * catalog when the locale variant is unknown. Keeps the IDs identical
 * across locales so deep links stay stable.
 */
export function lessonsFor(locale: string): PrayerLesson[] {
  return locale === "de" ? LESSONS_DE : LESSONS;
}

export function getLesson(
  id: string,
  locale: string = "en",
): PrayerLesson | undefined {
  return locale === "de"
    ? BY_ID_DE.get(id) ?? BY_ID.get(id)
    : BY_ID.get(id);
}

export function adjacentLessons(
  id: string,
  locale: string = "en",
): {
  prev: PrayerLesson | null;
  next: PrayerLesson | null;
} {
  const list = lessonsFor(locale);
  const idx = list.findIndex((l) => l.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}

export function allLessonParams(): { lessonId: string }[] {
  return LESSONS.map((l) => ({ lessonId: l.id }));
}

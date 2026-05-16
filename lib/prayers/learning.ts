import lessonsJson from "@/data/prayers/learning/lessons.json";

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

const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export function getLesson(id: string): PrayerLesson | undefined {
  return BY_ID.get(id);
}

export function adjacentLessons(id: string): {
  prev: PrayerLesson | null;
  next: PrayerLesson | null;
} {
  const idx = LESSONS.findIndex((l) => l.id === id);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? LESSONS[idx - 1] : null,
    next: idx < LESSONS.length - 1 ? LESSONS[idx + 1] : null,
  };
}

export function allLessonParams(): { lessonId: string }[] {
  return LESSONS.map((l) => ({ lessonId: l.id }));
}

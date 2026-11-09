import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readingMinutes } from "@/lib/bible/readability";

import { passageVerses, type ReadingPlan } from "./plans";

/**
 * How long each day of a plan takes to read, in whole minutes (1.7: "about
 * 5 min" on the day's card, "about 4 min a day" on the list). Counted at
 * build time from the chapters' own text (data/bible) at the pace the app
 * uses for the Fathers (lib/bible/readability.ts), so a page carries a short
 * list of numbers and not the chapters.
 */

const cache = new Map<string, number[]>();

/** A chapter's text, or only the verses a passage reads in it (1.9, the Nativity Fast's days). */
function chapterText(book: string, chapter: number, spans?: readonly [number, number][]): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "bible", book, `${chapter}.json`), "utf8");
    const parsed = JSON.parse(raw) as { verses?: { n?: number; text?: string }[] };
    const verses = (parsed.verses ?? []).filter((v) => !spans || spans.some(([a, b]) => (v.n ?? 0) >= a && (v.n ?? 0) <= b));
    return verses.map((v) => v.text ?? "").join(" ");
  } catch {
    return "";
  }
}

export function dayMinutes(plan: ReadingPlan): number[] {
  const known = cache.get(plan.id);
  if (known) return known;
  const minutes = plan.days.map((day) => {
    // Each passage's verses, from the reference on its first reading, for the
    // chapters that follow it until the next passage (Holy Thursday's Gospel
    // reads Matthew 26 three times, a different part each time).
    let verses: Map<number, [number, number][]> | null = null;
    const texts = day.map((r) => {
      if (r.ref) verses = passageVerses(r.ref);
      return chapterText(r.book, r.chapter, verses?.get(r.chapter));
    });
    return readingMinutes(texts.join(" "));
  });
  cache.set(plan.id, minutes);
  return minutes;
}

/** A plan's usual day, rounded: the list's "about {n} min a day". */
export function usualMinutes(plan: ReadingPlan): number {
  const days = dayMinutes(plan);
  return Math.max(1, Math.round(days.reduce((a, b) => a + b, 0) / Math.max(1, days.length)));
}

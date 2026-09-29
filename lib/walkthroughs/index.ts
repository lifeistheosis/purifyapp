// Every walkthrough, by book slug. Job first (the owner's build order of
// 2026-09-28); Matthew follows in the same shape.

import { JOB } from "./job";
import type { ChapterWalk, Walkthrough } from "./types";

export const WALKTHROUGHS: Record<string, Walkthrough> = { job: JOB };

/** Total chapters in each walked book, written or not. */
export const BOOK_CHAPTERS: Record<string, number> = { job: 42 };

export function getWalkthrough(book: string): Walkthrough | null {
  return WALKTHROUGHS[book] ?? null;
}

export function getChapterWalk(book: string, n: number): ChapterWalk | null {
  return getWalkthrough(book)?.chapters.find((c) => c.n === n) ?? null;
}

/** The movement a chapter belongs to, for its eyebrow. */
export function movementOf(w: Walkthrough, n: number) {
  return w.movements.find((m) => n >= m.from && n <= m.to) ?? null;
}

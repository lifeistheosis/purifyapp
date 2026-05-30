import "server-only";
import { loadVerseRange, type Verse } from "@/lib/bible/load";
import versesJson from "@/data/today/verses.json";

type VerseRef = {
  book: string;
  chapter: number;
  from: number;
  to: number;
  label: string;
};

const ROTATION: VerseRef[] = (versesJson as { rotation: VerseRef[] }).rotation;

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export type VerseOfDay = {
  ref: VerseRef;
  passage: { name: string; verses: Verse[] } | null;
  href: string;
};

/**
 * Picks today's verse-of-day by day-of-year modulo the curated rotation
 * length, then resolves the text from Purify's public-domain Bible
 * (Brenton LXX / KJV) via the existing loadVerseRange. Returns the passage
 * shape the mobile card renders, plus a href into the full chapter.
 */
export async function getVerseOfDay(today: Date = new Date()): Promise<VerseOfDay> {
  const idx = dayOfYearUtc(today) % ROTATION.length;
  const ref = ROTATION[idx];
  const passage = await loadVerseRange(ref.book, ref.chapter, ref.from, ref.to);
  const href = `/bible/${ref.book}/${ref.chapter}#v${ref.from}`;
  return { ref, passage, href };
}

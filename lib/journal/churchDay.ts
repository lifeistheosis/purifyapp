// What the Church keeps on a day, as a journal page names it under its date
// (1.9, docs/1.9-build/JOURNAL.md, "the journal, by the Church's day"): the
// owner's word of 2026-11-08, "the whole journaling system should feel like a
// journaling system, not just a notepad system". A notepad is text; a journal
// is a dated page of a life, here a life with the Church's year, so each day
// is headed by its feast or its saints, and its fast when it keeps one.
//
// From the app's own calendar (lib/calendar/orthodox.ts), on the day the
// reader's calendar keeps, as Today names it (lib/calendar/useChurchDay.ts):
// the commemorations on the shifted day, the fast on the civil day.

import { commemorationsOn, fastingStatus, shiftForStyle, type CalStyle, type FastingStatus, type ReadingKind } from "@/lib/calendar/orthodox";

export type ChurchDayLine = {
  /** The day's feast, else its first saint; null on a day the menologion leaves empty. */
  headline: string | null;
  /** The day's fast, when it keeps one; null on a day without (or a fast-free day). */
  fast: FastingStatus | null;
};

/** The kinds of day that are fasts: a fast-free day and an ordinary one are not. */
const FASTING = new Set<FastingStatus["kind"]>(["strict", "wine-oil", "fish", "fast"]);

/** What the Church keeps on `date`, by the reader's calendar. */
export function churchDayLine(date: Date, style: CalStyle): ChurchDayLine {
  const commemorations = commemorationsOn(shiftForStyle(date, style));
  const head = commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const fast = fastingStatus(date, style);
  return { headline: head?.name ?? null, fast: FASTING.has(fast.kind) ? fast : null };
}

/** A day's key ("2026-11-08", lib/journal/feed.ts) as the local date it names, at noon, clear of clock changes. */
export function dayFromKey(day: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Each kind of reading by its long name: a closed map, so every key is a literal the key test reads. */
export const READING_KIND_KEY: Record<ReadingKind, string> = {
  gospel: "bible.kindGospelLong",
  epistle: "bible.kindEpistleLong",
  ot: "bible.kindOtLong",
};

/** A passage's verses as a reference names them: "41-56", or "47" alone. */
export function verseSpan(from: number, to: number): string {
  return to && to !== from ? `${from}-${to}` : String(from);
}

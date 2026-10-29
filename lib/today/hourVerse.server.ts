import "server-only";

import { loadVerseRange } from "@/lib/bible/load";

import { HOUR_VERSES, type DayPart, type HourVerse, type HourVerses } from "./greeting";

/**
 * The verse for each part of the day (lib/today/greeting.ts, HOUR_VERSES),
 * its words read from the app's own Psalter in data/bible/psalms. Read once
 * at build time and handed to Today's greeting as three short strings: the
 * words do not change with the day, and a device has no files to read them
 * from (the same reason components/today/VerseOfDayCard.tsx reads its verses
 * on the server). Null if any of them cannot be read, and the greeting is
 * then the one it always was.
 */
export async function loadHourVerses(): Promise<HourVerses | null> {
  const out: Partial<Record<DayPart, HourVerse>> = {};
  for (const part of Object.keys(HOUR_VERSES) as DayPart[]) {
    const { chapter, verse } = HOUR_VERSES[part];
    const range = await loadVerseRange("psalms", chapter, verse, verse);
    const text = range?.verses.find((v) => v.n === verse)?.text?.trim();
    if (!text) return null;
    out[part] = { text, ref: `${chapter}:${verse}` };
  }
  return out as HourVerses;
}

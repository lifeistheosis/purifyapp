import "server-only";
import { loadVerseRange, type Verse } from "@/lib/bible/load";
import { readingsOn, startOfDayUtc } from "@/lib/calendar/orthodox";
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
  /** Where the ref came from. Helps the UI label "Today's Gospel" honestly. */
  source: "gospel" | "epistle" | "ot" | "rotation";
};

/**
 * Verse of the Day. Resolution order:
 *   1. Today's appointed Gospel reading (lectionary).
 *   2. Today's Epistle, if no Gospel.
 *   3. Today's Old Testament reading, if neither.
 *   4. The curated rotation in data/today/verses.json (day-of-year mod len)
 *      as a last-resort fallback for ferial days with nothing appointed.
 *
 * This makes the mobile VoD card match the Today's Readings card below it,
 * so the verse and the appointed reading are never out of sync.
 *
 * Verse text is loaded from Purify's public-domain Bible (Brenton LXX +
 * KJV) via loadVerseRange; no licensed translation is reproduced here.
 */
export async function getVerseOfDay(today: Date = new Date()): Promise<VerseOfDay> {
  const day = startOfDayUtc(today);
  const readings = readingsOn(day);

  const order: VerseOfDay["source"][] = ["gospel", "epistle", "ot"];
  for (const kind of order) {
    const r = readings.find((x) => x.kind === kind);
    if (r) {
      const ref: VerseRef = {
        book: r.book,
        chapter: r.chapter,
        from: r.from,
        to: r.to,
        label: r.label,
      };
      const passage = await loadVerseRange(ref.book, ref.chapter, ref.from, ref.to);
      // The lectionary range can be too long for a hero card; if there's
      // a passage, we still pass it through (the card itself fades the
      // overflow to a mask so a longer range reads as a teaser).
      return {
        ref,
        passage,
        href: `/bible/${ref.book}/${ref.chapter}#v${ref.from}`,
        source: kind,
      };
    }
  }

  const idx = dayOfYearUtc(day) % ROTATION.length;
  const ref = ROTATION[idx];
  const passage = await loadVerseRange(ref.book, ref.chapter, ref.from, ref.to);
  return {
    ref,
    passage,
    href: `/bible/${ref.book}/${ref.chapter}#v${ref.from}`,
    source: "rotation",
  };
}

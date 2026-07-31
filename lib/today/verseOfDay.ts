import "server-only";
import { loadVerseRange, type Verse } from "@/lib/bible/load";
import { readingsOn, startOfDayUtc } from "@/lib/calendar/orthodox";
import versesJson from "@/data/today/verses.json";
import { verseDayKey, type VerseOfDayEntry } from "./verseOfDay.types";

export { verseDayKey, type VerseOfDayEntry };

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
 * The Verse of the Day is deliberately a SINGLE verse: whatever the source
 * (an appointed range like John 10:9-16, or a rotation entry), we anchor on
 * its first verse (`from`) and never render the whole range. The label is
 * rebuilt to that single verse so it reads "John 10:9", not "John 10:9-16".
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
      return buildSingleVerse(r.book, r.chapter, r.from, r.label, kind);
    }
  }

  const idx = dayOfYearUtc(day) % ROTATION.length;
  const rot = ROTATION[idx];
  return buildSingleVerse(rot.book, rot.chapter, rot.from, rot.label, "rotation");
}

function toEntry(vod: VerseOfDay): VerseOfDayEntry {
  const text =
    vod.passage?.verses
      .map((v) => v.text.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim() ?? null;
  return {
    label: vod.ref.label,
    text: text || null,
    href: vod.href,
    source: vod.source,
    book: vod.ref.book,
    bookName: vod.passage?.name ?? vod.ref.book,
    chapter: vod.ref.chapter,
    verse: vod.ref.from,
  };
}

/**
 * A date-keyed table of verses, starting at `base` and running `days`
 * forward.
 *
 * WHY A TABLE. The Android target is a static export: a server component
 * renders once, at build time, so a card that resolved "today" on the
 * server showed the build day for the entire life of that APK. The verse
 * text cannot move to the client (it is read from data/bible at build time
 * through `server-only` code), so instead the build precomputes a window of
 * days and a client child picks the reader's local day out of it. The web
 * build renders per request and only needs a couple of days to cover
 * whichever side of UTC the reader is on.
 */
export async function getVerseOfDayTable(
  base: Date,
  days: number,
): Promise<Record<string, VerseOfDayEntry>> {
  const out: Record<string, VerseOfDayEntry> = {};
  const start = startOfDayUtc(base);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out[verseDayKey(d)] = toEntry(await getVerseOfDay(d));
  }
  return out;
}

/**
 * Load a single verse and build a single-verse VerseOfDay. The display book
 * name is taken from the source range label (so "1 Corinthians", "Song of
 * Songs", etc. keep their exact formatting), falling back to the chapter's
 * loaded name and finally the book slug.
 */
async function buildSingleVerse(
  book: string,
  chapter: number,
  from: number,
  sourceLabel: string,
  source: VerseOfDay["source"],
): Promise<VerseOfDay> {
  const passage = await loadVerseRange(book, chapter, from, from);
  const m = sourceLabel.match(/^(.*?)\s+\d+:\d+(?:-\d+)?$/);
  const bookName = m?.[1] ?? passage?.name ?? book;
  const ref: VerseRef = {
    book,
    chapter,
    from,
    to: from,
    label: `${bookName} ${chapter}:${from}`,
  };
  return {
    ref,
    passage,
    href: `/bible/${book}/${chapter}#v${from}`,
    source,
  };
}

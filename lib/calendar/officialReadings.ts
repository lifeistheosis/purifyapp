import official from "@/data/calendar/official-readings.json";

/**
 * The day's readings as an official Church calendar lists them.
 *
 * WHY THIS EXISTS. Until 1.6 the app answered "what is read today" from its
 * own date table, which is a menaion: the reading proper to the day's saint.
 * On most days that is not what a printed Church calendar lists first, which
 * is the course reading reckoned by the week after Pentecost. A reader held
 * the app beside a St Tikhon's calendar and asked why they differed, and the
 * owner ruled (2026-10-10) that the day's readings follow an official
 * jurisdictional list.
 *
 * THE LIST is the Orthodox Church in America's published daily readings,
 * collected for 2026-10-01 to 2027-12-31: data/calendar/official-readings.json.
 * It holds REFERENCES AND LABELS ONLY, the book, chapter and verses and what
 * each reading is ("Epistle", "Matins Gospel", "Epistle, Saint"). The words
 * of Scripture a reader sees are always Purify's own public-domain Bible.
 *
 * WHAT THIS MODULE DOES. It reads a reference the way the calendar prints it
 * ("1 Corinthians 15:58-16:3", "Luke 1:39-49, 56", "Composite 16 - Isaiah
 * 63:15-64:5, 8-9") into runs of verses in our own books, and it says which
 * of a day's readings are the day's own Epistle and Gospel: the two the
 * calendar labels plainly, with nobody's name after them.
 *
 * It is a dated table, not a rule. Past its last day the app falls back to
 * what it did before (lib/calendar/orthodox.ts, readingsOn), and the table
 * has to be collected again or the rule behind it built.
 *
 * Pure: no window, no filesystem, so it is tested under node and can be
 * imported by server and client alike.
 */

export type OfficialKind = "epistle" | "gospel" | "ot";

/** One run of verses inside one chapter of one book. */
export type PassageSegment = {
  /** Bible book slug, as in /bible/<book>/<chapter>. */
  book: string;
  chapter: number;
  from: number;
  /** END_OF_CHAPTER when the run goes on to the chapter's last verse. */
  to: number;
};

/**
 * "To the end of the chapter". A reference such as 15:58-16:3 does not say
 * where chapter 15 ends, and this module does not open the Bible to find out.
 * No chapter has this many verses, so whoever loads the text reads "up to".
 */
export const END_OF_CHAPTER = 999;

export type OfficialReading = {
  /** The reference exactly as the calendar prints it. */
  raw: string;
  /** What the calendar says it is. "" when it says nothing. */
  label: string;
  kind: OfficialKind;
  /**
   * The verses, in reading order. Empty when the calendar names chapters and
   * no verses (most of its "Composite" readings) or when the reference could
   * not be read, in which case `unread` is true.
   */
  segments: PassageSegment[];
  /** A reading stitched together from several places. */
  composite: boolean;
  /** The reference was not understood. Held to zero by the test. */
  unread: boolean;
};

const GOSPELS = new Set(["matthew", "mark", "luke", "john"]);
const APOSTLE = new Set([
  "acts", "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians",
  "philippians", "colossians", "1-thessalonians", "2-thessalonians", "1-timothy",
  "2-timothy", "titus", "philemon", "hebrews", "james", "1-peter", "2-peter",
  "1-john", "2-john", "3-john", "jude", "revelation",
]);
/** Books of one chapter: "Jude 1-10" is verses, not chapters. */
const ONE_CHAPTER = new Set(["jude", "2-john", "3-john", "philemon", "obadiah", "epistle-of-jeremiah", "prayer-of-manasseh"]);

/** Names the calendar uses that are not simply our slug with spaces. */
const NAMED: Record<string, string> = {
  "wisdom of solomon": "wisdom",
  wisdom: "wisdom",
  "matt.": "matthew",
  matt: "matthew",
  "gal.": "galatians",
  gal: "galatians",
  psalm: "psalms",
};

/**
 * Our slug for a book as the calendar names it. The calendar writes the
 * books of Kingdoms both ways at once, "3[1] Kings": the number in brackets
 * is the name our Bible files use.
 */
export function bookSlug(name: string): string {
  const plain = name
    .trim()
    .toLowerCase()
    .replace(/^[1-4]\s?\[([1-4])\]\s?/, "$1 ")
    .replace(/\s+/g, " ");
  return NAMED[plain] ?? plain.replace(/\.$/, "").replace(/ /g, "-");
}

export function kindOfBook(slug: string): OfficialKind {
  if (GOSPELS.has(slug)) return "gospel";
  if (APOSTLE.has(slug)) return "epistle";
  return "ot";
}

/**
 * References our Bible numbers differently, verse for verse. Each is the
 * calendar's own string and where those words stand in our books. The test
 * opens every chapter the table names, so a fifth one cannot hide: it fails
 * on the first verse that is not there.
 *
 *   Romans 14:24-26 is the doxology, which the Church's text has at the end
 *     of chapter 14 and the King James at the end of chapter 16.
 *   3 John ends at verse 14 in the King James; later Bibles split it in two.
 *   Genesis 5:32 opens chapter 6 in the Septuagint ("And Noe was five
 *     hundred years old").
 *   Proverbs 16 has no verse 1 in the Septuagint, nor 3, 4 or 6 to 9: of the
 *     calendar's 16:1-9 ours holds verses 2 and 5.
 */
const RENUMBERED: Record<string, PassageSegment[]> = {
  "Romans 14:19-26": [
    { book: "romans", chapter: 14, from: 19, to: 23 },
    { book: "romans", chapter: 16, from: 25, to: 27 },
  ],
  "3 John 1:1-15": [{ book: "3-john", chapter: 1, from: 1, to: 14 }],
  "Genesis 5:32-6:8": [{ book: "genesis", chapter: 6, from: 1, to: 8 }],
  "Proverbs 15:20-16:9": [
    { book: "proverbs", chapter: 15, from: 20, to: END_OF_CHAPTER },
    { book: "proverbs", chapter: 16, from: 2, to: 5 },
  ],
};

const BOOK_THEN_REST = /^((?:[1-4]\s?(?:\[[1-4]\]\s?)?)?[A-Za-z][A-Za-z.]*(?:\s[A-Za-z][A-Za-z.]*)*):?\s+(\d.*)$/;

/**
 * Read one reference as the calendar prints it.
 *
 * The grammar, all of it seen in the collected list:
 *   Book C:V-V                 one run
 *   Book C:V-C:V               across chapters
 *   Book C:V-V, V-V, V         more verses of the same chapter
 *   Book C:V-V; C:V-V          another chapter
 *   Book C:V-V, C:V-V          the same, with a comma
 *   Book C:V-V, V-C:V          a run that ends in the next chapter
 *   Book V-V                   a book of one chapter
 *   Book A C:V; Book B C:V     two books in one reading
 *   Book C:V-V (C:V-V LXX)     the Septuagint's numbers, which are ours
 *   Jeremiah (Baruch C:V-C:V)  read under one name, found under another
 *   Composite N - Book C, C    stitched from chapters: no verses to give
 *   Composite N - Book C:V-V   stitched, with its verses
 */
export function parseOfficialRef(raw: string, label = ""): OfficialReading {
  let text = raw.trim();
  let composite = false;
  const reading = (kind: OfficialKind, segments: PassageSegment[], unread = false): OfficialReading => ({
    raw,
    label,
    kind,
    segments,
    composite,
    unread,
  });

  const stitched = /^Composite\s+\d+(?:\s*-\s*(.*))?$/.exec(text);
  if (stitched) {
    composite = true;
    text = (stitched[1] ?? "").trim();
    // A composite the calendar gives by number alone: an Old Testament
    // lesson at Vespers, with nothing to point at.
    if (!text) return reading("ot", []);
  }

  const renumbered = RENUMBERED[text];
  if (renumbered) return reading(kindOfBook(renumbered[0].book), renumbered);

  // "Jeremiah (Baruch 3:35-4:4)": the bracket holds the real reference.
  const under = /^[A-Za-z ]+\(([A-Za-z][^)]*\d[^)]*)\)$/.exec(text);
  if (under) text = under[1].trim();
  // "Ezekiel 1:21-28 (1:1-28,2:1 LXX)": our Old Testament is the Septuagint.
  const septuagint = /^(.*?\D)\s+[\d:,;\s-]+\(([^)]*?)\s*LXX\)$/.exec(text);
  if (septuagint) text = `${septuagint[1].trim()} ${septuagint[2].trim()}`;
  text = text.replace(/\s+LXX$/, "").replace(/\s+with verses$/, "");

  const segments: PassageSegment[] = [];
  let book: string | null = null;
  let firstBook: string | null = null;
  let chapter: number | null = null;
  let offset = 0;
  let unread = false;
  let chaptersOnly = false;

  for (const chunk of text.split(";")) {
    let spec = chunk.trim();
    if (!spec) continue;
    const named = BOOK_THEN_REST.exec(spec);
    if (named) {
      const name = named[1];
      spec = named[2];
      chapter = null;
      offset = 0;
      if (/^song of the three$/i.test(name)) {
        // The Song of the Three stands inside Daniel 3 in our Bible, after
        // verse 23: its verse 1 is Daniel 3:24.
        book = "daniel";
        chapter = 3;
        offset = 23;
      } else {
        book = bookSlug(name);
      }
      firstBook ??= book;
    }
    if (!book) {
      unread = true;
      continue;
    }
    for (const part of spec.split(",")) {
      const item = part.trim();
      if (!item) continue;
      let m: RegExpExecArray | null;
      if ((m = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(item))) {
        const [c1, v1, c2, v2] = m.slice(1).map(Number);
        segments.push({ book, chapter: c1, from: v1, to: END_OF_CHAPTER });
        for (let c = c1 + 1; c < c2; c++) segments.push({ book, chapter: c, from: 1, to: END_OF_CHAPTER });
        segments.push({ book, chapter: c2, from: 1, to: v2 });
        chapter = c2;
      } else if ((m = /^(\d+):(\d+)-(\d+)$/.exec(item))) {
        chapter = Number(m[1]);
        segments.push({ book, chapter, from: Number(m[2]), to: Number(m[3]) });
      } else if ((m = /^(\d+):(\d+)$/.exec(item))) {
        chapter = Number(m[1]);
        segments.push({ book, chapter, from: Number(m[2]), to: Number(m[2]) });
      } else if ((m = /^(\d+)-(\d+):(\d+)$/.exec(item)) && chapter !== null) {
        const next = Number(m[2]);
        segments.push({ book, chapter, from: Number(m[1]), to: END_OF_CHAPTER });
        for (let c = chapter + 1; c < next; c++) segments.push({ book, chapter: c, from: 1, to: END_OF_CHAPTER });
        segments.push({ book, chapter: next, from: 1, to: Number(m[3]) });
        chapter = next;
      } else if ((m = /^(\d+)-(\d+)$/.exec(item))) {
        if (chapter === null && ONE_CHAPTER.has(book)) chapter = 1;
        if (chapter === null) {
          unread = true;
          continue;
        }
        segments.push({ book, chapter, from: Number(m[1]) + offset, to: Number(m[2]) + offset });
      } else if ((m = /^(\d+)$/.exec(item))) {
        if (chapter === null && ONE_CHAPTER.has(book)) chapter = 1;
        if (chapter === null) {
          // A chapter named with no verses. Only a composite does this.
          chaptersOnly = true;
          if (!composite) unread = true;
          continue;
        }
        segments.push({ book, chapter, from: Number(m[1]) + offset, to: Number(m[1]) + offset });
      } else {
        unread = true;
      }
    }
  }

  if (!firstBook) return reading("ot", [], true);
  // A composite named by chapter has nothing exact to point at, even where
  // one of its parts happens to give verses.
  return reading(kindOfBook(firstBook), chaptersOnly ? [] : segments, unread);
}

/** A feast's or a saint's own Epistle and Gospel, and whose they are. */
export type ProperReadings = {
  /** As the calendar names it: "Theotokos", "Saint", "Fathers", "Cross". */
  whose: string;
  epistle: OfficialReading | null;
  gospel: OfficialReading | null;
};

export type OfficialDay = {
  /** YYYY-MM-DD, a civil date on the New Calendar. */
  date: string;
  /** Everything the calendar lists for the day, in its order. */
  all: OfficialReading[];
  /** The day's own Epistle: the one labelled "Epistle" and nothing more. */
  epistle: OfficialReading | null;
  /** The day's own Gospel: the one labelled "Gospel" and nothing more. */
  gospel: OfficialReading | null;
  /** Readings given for a feast or a saint that day, in the calendar's order. */
  proper: ProperReadings[];
};

type Listed = [ref: string, label: string | null];
const TABLE = (official as unknown as { days: Record<string, Listed[]> }).days;

const DATES = Object.keys(TABLE).sort();
/** The first and last day the table holds. */
export const OFFICIAL_FROM = DATES[0] ?? "";
export const OFFICIAL_TO = DATES[DATES.length - 1] ?? "";

/** Every date in the table, in order. For the tests and the tools. */
export function officialDates(): readonly string[] {
  return DATES;
}

/**
 * The calendar's readings for a civil date, or null when the table does not
 * hold the day, or holds it without knowing what each reading is. A day is
 * used whole or not at all: guessing which of four readings is "the Gospel"
 * is exactly the mistake this table exists to end.
 */
export function officialDay(date: string): OfficialDay | null {
  const listed = TABLE[date];
  if (!listed || listed.length === 0 || listed.some(([, label]) => label === null)) return null;

  const all = listed.map(([ref, label]) => parseOfficialRef(ref, label ?? ""));
  let epistle: OfficialReading | null = null;
  let gospel: OfficialReading | null = null;
  const proper: ProperReadings[] = [];
  for (const r of all) {
    const [what, ...rest] = r.label.split(",").map((s) => s.trim());
    const whose = rest.join(", ");
    const isEpistle = /^epistle$/i.test(what);
    const isGospel = /^gospel$/i.test(what);
    if (!isEpistle && !isGospel) continue;
    if (!whose) {
      if (isEpistle) epistle = r;
      else gospel = r;
      continue;
    }
    let entry = proper.find((p) => p.whose === whose && (isEpistle ? p.epistle === null : p.gospel === null));
    if (!entry) {
      entry = { whose, epistle: null, gospel: null };
      proper.push(entry);
    }
    if (isEpistle) entry.epistle = r;
    else entry.gospel = r;
  }
  return { date, all, epistle, gospel, proper };
}

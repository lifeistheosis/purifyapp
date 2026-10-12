import booksJson from "@/data/bible/books.json";

export type Testament = "OT" | "NT";

export type BibleBook = {
  slug: string;
  name: string;
  testament: Testament;
  chapters: number;
  source: string;
};

export const BOOKS: BibleBook[] = booksJson as BibleBook[];

const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));
const ORDER = BOOKS.map((b) => b.slug);

export function getBook(slug: string): BibleBook | undefined {
  return BY_SLUG.get(slug);
}

export function getOldTestament(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "OT");
}

export function getNewTestament(): BibleBook[] {
  return BOOKS.filter((b) => b.testament === "NT");
}

export function nextChapter(slug: string, chapter: number): { slug: string; chapter: number } | null {
  const b = getBook(slug);
  if (!b) return null;
  if (chapter < b.chapters) return { slug, chapter: chapter + 1 };
  const idx = ORDER.indexOf(slug);
  const next = ORDER[idx + 1];
  return next ? { slug: next, chapter: 1 } : null;
}

export function prevChapter(slug: string, chapter: number): { slug: string; chapter: number } | null {
  const b = getBook(slug);
  if (!b) return null;
  if (chapter > 1) return { slug, chapter: chapter - 1 };
  const idx = ORDER.indexOf(slug);
  const prev = ORDER[idx - 1];
  const prevBook = prev ? getBook(prev) : undefined;
  return prevBook ? { slug: prev, chapter: prevBook.chapters } : null;
}

export function nextBook(slug: string): BibleBook | null {
  const idx = ORDER.indexOf(slug);
  if (idx < 0 || idx === ORDER.length - 1) return null;
  return getBook(ORDER[idx + 1]) ?? null;
}

export function prevBook(slug: string): BibleBook | null {
  const idx = ORDER.indexOf(slug);
  if (idx <= 0) return null;
  return getBook(ORDER[idx - 1]) ?? null;
}

/**
 * Parses a free-form query against the canonical book list and returns matching books.
 * Also tries to extract a chapter number if the query ends with one.
 */
export type SearchHit =
  | { kind: "book"; book: BibleBook }
  | { kind: "chapter"; book: BibleBook; chapter: number; passage?: NamedPassageId }
  | { kind: "verse"; book: BibleBook; chapter: number; verse: number; passage?: NamedPassageId }
  | {
      kind: "range";
      book: BibleBook;
      chapter: number;
      verseFrom: number;
      verseTo: number;
    };

const ALIASES: Record<string, string> = {
  ps: "psalms",
  pss: "psalms",
  psalm: "psalms",
  prov: "proverbs",
  eccl: "ecclesiastes",
  song: "song-of-solomon",
  sos: "song-of-solomon",
  isa: "isaiah",
  jer: "jeremiah",
  ez: "ezekiel",
  ezek: "ezekiel",
  dan: "daniel",
  hos: "hosea",
  hab: "habakkuk",
  zech: "zechariah",
  mal: "malachi",
  mt: "matthew",
  matt: "matthew",
  mk: "mark",
  lk: "luke",
  jn: "john",
  rom: "romans",
  cor: "corinthians",
  gal: "galatians",
  eph: "ephesians",
  phil: "philippians",
  col: "colossians",
  thess: "thessalonians",
  tim: "timothy",
  philem: "philemon",
  heb: "hebrews",
  jas: "james",
  pet: "peter",
  rev: "revelation",
  apoc: "revelation",
};

/**
 * Passages the Church knows by their own name, which this library files the
 * way the Septuagint does: inside Daniel, and as the Psalter's last psalm.
 *
 * Added 2026-09-25. A reader asked on Discord why Purify did not carry
 * Susanna, the Song of the Three, Bel and the Dragon or Psalm 151, "what we
 * believe as Orthodox". All four were already here, in Brenton's Septuagint,
 * as Daniel 13, Daniel 3:52, Daniel 14 and Psalm 151. Nothing named them, so
 * searching for any of them found nothing and the book list said only
 * "Daniel", and a reader who knows them by name concluded they were missing.
 * This table is the way in; the text and its order are untouched.
 *
 * Psalm 151 needs no entry: "psalm 151" already resolves through the alias
 * table to the Psalter's 151st chapter.
 *
 * `names` are matched in English whatever the reader's language; the search
 * box adds the reader's own translation of each name as well (see
 * searchBible's `localNames`), so "Сусанна" finds it too.
 */
export type NamedPassageId = "susanna" | "bel" | "azariah" | "song-of-the-three";

export const NAMED_PASSAGES: readonly {
  id: NamedPassageId;
  names: readonly string[];
  book: string;
  chapter: number;
  verse?: number;
}[] = [
  { id: "susanna", names: ["susanna", "susannah", "suzanna"], book: "daniel", chapter: 13 },
  { id: "bel", names: ["bel and the dragon", "bel and the serpent"], book: "daniel", chapter: 14 },
  // Where each begins inside the Greek Daniel 3: the Prayer at 3:25, the Song
  // ("O all ye works of the Lord") from 3:52.
  { id: "azariah", names: ["prayer of azariah", "prayer of azarias", "azariah", "azarias"], book: "daniel", chapter: 3, verse: 25 },
  {
    id: "song-of-the-three",
    names: [
      "song of the three",
      "song of the three holy children",
      "song of the three young men",
      "song of the three youths",
      "song of the three children",
      "three holy children",
      "three young men",
      "benedicite",
    ],
    book: "daniel",
    chapter: 3,
    verse: 52,
  },
];

function normalName(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * The named passages this query points at. A name matches when the query
 * starts it, or when the query (four letters or more) starts any of its
 * words, so "bel", "dragon" and "three" all find their passage while "the"
 * finds nothing.
 */
export function namedPassageHits(
  rawQuery: string,
  localNames: Partial<Record<NamedPassageId, string>> = {},
): SearchHit[] {
  const q = normalName(rawQuery);
  if (q.length < 3) return [];
  const hits: SearchHit[] = [];
  for (const p of NAMED_PASSAGES) {
    const candidates = [...p.names, localNames[p.id] ?? ""].map(normalName).filter(Boolean);
    const matched = candidates.some(
      (n) => n.startsWith(q) || (q.length >= 4 && n.split(" ").some((w) => w.startsWith(q))),
    );
    if (!matched) continue;
    const book = getBook(p.book);
    if (!book) continue;
    hits.push(
      p.verse
        ? { kind: "verse", book, chapter: p.chapter, verse: p.verse, passage: p.id }
        : { kind: "chapter", book, chapter: p.chapter, passage: p.id },
    );
  }
  return hits;
}

/** The passage a chapter opens with, for a subtitle on its page. */
export function passageForChapter(bookSlug: string, chapter: number): NamedPassageId | null {
  const p = NAMED_PASSAGES.find((x) => x.book === bookSlug && x.chapter === chapter && !x.verse);
  return p ? p.id : null;
}

/** Lower case, no accents, letters and digits only: how a typed name and a book's own are compared. */
function foldName(s: string): string {
  return normalName(s.normalize("NFD").replace(/\p{M}/gu, ""));
}

/**
 * Whether what was typed names a book by its name in the reader's own
 * language: every word typed begins some word of that name. "ιωαν" finds
 * "Κατά Ιωάννην" with or without its accents, "cor" finds "1 Corinteni".
 *
 * A number typed first is the book's own number, and it is read off the
 * slug, which is the same in every language: a Greek reader's "1 κορ" has
 * to find the book the Greek catalog calls "Α΄ Προς Κορινθίους".
 */
function namedLocally(book: BibleBook, localName: string | undefined, typed: string): boolean {
  if (!localName) return false;
  const numbered = /^([1-4])\s*(.*)$/.exec(typed);
  const rest = (numbered ? numbered[2] : typed).trim();
  // Two letters at least, so one letter does not name half the Bible.
  if (rest.length < 2) return false;
  if (numbered && !book.slug.startsWith(`${numbered[1]}-`)) return false;
  const words = foldName(localName).split(" ");
  return rest.split(" ").every((typedWord) => words.some((word) => word.startsWith(typedWord)));
}

/**
 * Each book's name as a catalog says it, by slug. `t` is the reader's
 * translate function; it answers a key it does not have with the key, and
 * such a book is left out. Kept per `t`, which is stable for a language,
 * since the three callers ask on every keystroke.
 */
const namesFor = new WeakMap<(key: string) => string, Readonly<Record<string, string>>>();
export function localBookNames(t: (key: string) => string): Readonly<Record<string, string>> {
  const known = namesFor.get(t);
  if (known) return known;
  const out: Record<string, string> = {};
  for (const b of BOOKS) {
    const key = `bible.books.${b.slug}`;
    const name = t(key);
    if (name && name !== key) out[b.slug] = name;
  }
  namesFor.set(t, out);
  return out;
}

/**
 * A reference with its book named in the reader's language.
 *
 * The calendar's tables carry each appointed reading's reference in English
 * ("Luke 13:31-35"), and the screens used to print it as written, so a phone
 * set to Greek showed the day's readings under English book names it had
 * Greek for. The book is known by its slug, so the English name at the front
 * is swapped for the reader's and the chapter and verses are kept exactly as
 * the table wrote them. `localBooks` is localBookNames(t).
 *
 * A label that does not begin with its own book's English name is handed
 * back untouched: a wrong guess here would misname Scripture.
 */
export function referenceIn(
  label: string,
  bookSlug: string,
  localBooks: Readonly<Record<string, string>>,
): string {
  const book = BY_SLUG.get(bookSlug);
  const local = localBooks[bookSlug];
  if (!book || !local || local === book.name) return label;
  if (!label.startsWith(book.name)) return label;
  const rest = label.slice(book.name.length);
  // What follows the name has to be the reference itself, a space and a
  // number, so one book's name is never cut out of a longer one.
  if (!/^\s+\d/.test(rest)) return label;
  return local + rest;
}

/**
 * `localBooks` is each book's name in the reader's language, by slug
 * (the catalog's `bible.books.<slug>`). With it a book is found by that
 * name as well as by its English one, so a reader in Greek, Romanian or
 * Filipino can type the reference the way their own Bible prints it. The
 * English names and short forms keep working in every language.
 */
export function searchBible(
  rawQuery: string,
  limit = 8,
  localNames: Partial<Record<NamedPassageId, string>> = {},
  localBooks: Readonly<Record<string, string>> = {},
): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  // A named passage is the most specific answer there is, so it leads.
  const named = namedPassageHits(rawQuery, localNames);

  // Pull a trailing reference off the end:
  //   "john 3"          -> chapter 3
  //   "john 3:16"       -> chapter 3, verse 16
  //   "1 cor 13"        -> chapter 13
  //   "james 2:14-26"   -> chapter 2, verses 14..26 (range)
  // The range trailer accepts a hyphen-minus or an en-dash, with optional
  // spaces around it ("james 2:14 - 26" works the same as "james 2:14-26").
  const m = q.match(
    /^(.*?)(?:\s+(\d{1,3})(?::(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?)?$/,
  );
  const namePart = (m?.[1] ?? q).trim();
  const chapterPart = m?.[2] ? parseInt(m[2], 10) : null;
  const versePart = m?.[3] ? parseInt(m[3], 10) : null;
  const verseEndPart = m?.[4] ? parseInt(m[4], 10) : null;

  // Normalize "1 john", "1cor" -> "1-..."
  const norm = namePart
    .replace(/^([1-3])\s+/, "$1-")
    .replace(/\./g, "")
    .replace(/[^\w-]/g, "");

  const tokens = norm.split("-").filter(Boolean);
  // Expand last token via alias map ("cor" -> "corinthians", "ps" -> "psalms").
  if (tokens.length > 0 && ALIASES[tokens[tokens.length - 1]]) {
    tokens[tokens.length - 1] = ALIASES[tokens[tokens.length - 1]];
  }
  const expanded = tokens.join("-");

  const typedLocal = foldName(namePart);
  // `expanded` keeps only Latin letters and digits, so a name typed in Greek
  // or Cyrillic leaves it EMPTY, and every slug starts with the empty
  // string: until 1.6 such a query matched all 78 books and offered Genesis.
  // A slug is compared only when a Latin letter was typed. A book's number
  // alone does not count: "1 Κορινθίους" leaves just the "1", which begins
  // nine slugs.
  const latin = /[a-z]/.test(expanded);
  const matches = BOOKS.filter((b) => {
    const slug = b.slug.toLowerCase();
    const name = b.name.toLowerCase();
    return (
      (latin && (slug.startsWith(expanded) || slug.includes(expanded))) ||
      (namePart.length > 0 && name.includes(namePart)) ||
      namedLocally(b, localBooks[b.slug], typedLocal)
    );
  }).slice(0, Math.max(0, limit - named.length));

  return [...named, ...matches.map((b) => {
    if (chapterPart && chapterPart >= 1 && chapterPart <= b.chapters) {
      if (versePart && versePart >= 1) {
        // Range only when the trailing number is strictly greater than the
        // start. Equal or smaller falls back to a single verse hit so the
        // user still gets a useful destination from a malformed input.
        if (verseEndPart && verseEndPart > versePart) {
          return {
            kind: "range" as const,
            book: b,
            chapter: chapterPart,
            verseFrom: versePart,
            verseTo: verseEndPart,
          };
        }
        return {
          kind: "verse" as const,
          book: b,
          chapter: chapterPart,
          verse: versePart,
        };
      }
      return { kind: "chapter" as const, book: b, chapter: chapterPart };
    }
    return { kind: "book" as const, book: b };
  })];
}

export type BookCategory = { label: string; books: BibleBook[] };

const OT_CATEGORIES: { label: string; slugs: string[] }[] = [
  {
    label: "Pentateuch",
    slugs: ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"],
  },
  {
    label: "Historical",
    slugs: [
      "joshua", "judges", "ruth",
      "1-samuel", "2-samuel", "1-kings", "2-kings",
      "1-chronicles", "2-chronicles",
      "1-esdras", "ezra", "nehemiah",
      "tobit", "judith", "esther",
      "1-maccabees", "2-maccabees", "3-maccabees",
    ],
  },
  {
    label: "Wisdom",
    slugs: [
      "job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon",
      "wisdom", "sirach",
    ],
  },
  {
    label: "Prophets",
    slugs: [
      "hosea", "amos", "micah", "joel", "obadiah", "jonah",
      "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
      "isaiah", "jeremiah", "baruch", "lamentations", "epistle-of-jeremiah",
      "ezekiel", "daniel", "prayer-of-manasseh",
      // Not in the Greek Old Testament; the KJV Apocrypha's text, printed
      // last as the Slavonic Bible prints it (as 3 Esdras). 2026-09-26.
      "2-esdras",
    ],
  },
];

const NT_CATEGORIES: { label: string; slugs: string[] }[] = [
  {
    label: "Gospels",
    slugs: ["matthew", "mark", "luke", "john"],
  },
  {
    label: "Acts",
    slugs: ["acts"],
  },
  {
    label: "Pauline Epistles",
    slugs: [
      "romans", "1-corinthians", "2-corinthians", "galatians",
      "ephesians", "philippians", "colossians",
      "1-thessalonians", "2-thessalonians",
      "1-timothy", "2-timothy", "titus", "philemon", "hebrews",
    ],
  },
  {
    label: "Catholic Epistles",
    slugs: [
      "james", "1-peter", "2-peter",
      "1-john", "2-john", "3-john", "jude",
    ],
  },
  {
    label: "Revelation",
    slugs: ["revelation"],
  },
];

function resolveCategories(
  defs: { label: string; slugs: string[] }[],
): BookCategory[] {
  return defs
    .map((d) => ({
      label: d.label,
      books: d.slugs.map((s) => getBook(s)).filter((b): b is BibleBook => !!b),
    }))
    .filter((c) => c.books.length > 0);
}

export function getOldTestamentCategories(): BookCategory[] {
  return resolveCategories(OT_CATEGORIES);
}

export function getNewTestamentCategories(): BookCategory[] {
  return resolveCategories(NT_CATEGORIES);
}

export function allChapterParams(): { book: string; chapter: string }[] {
  const out: { book: string; chapter: string }[] = [];
  for (const b of BOOKS) {
    for (let c = 1; c <= b.chapters; c++) {
      out.push({ book: b.slug, chapter: String(c) });
    }
  }
  return out;
}

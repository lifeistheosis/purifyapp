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
  | { kind: "chapter"; book: BibleBook; chapter: number }
  | { kind: "verse"; book: BibleBook; chapter: number; verse: number };

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

export function searchBible(rawQuery: string, limit = 8): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  // Pull a trailing reference off the end:
  //   "john 3"     -> chapter 3
  //   "john 3:16"  -> chapter 3, verse 16
  //   "1 cor 13"   -> chapter 13
  const m = q.match(/^(.*?)(?:\s+(\d{1,3})(?::(\d{1,3}))?)?$/);
  const namePart = (m?.[1] ?? q).trim();
  const chapterPart = m?.[2] ? parseInt(m[2], 10) : null;
  const versePart = m?.[3] ? parseInt(m[3], 10) : null;

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

  const matches = BOOKS.filter((b) => {
    const slug = b.slug.toLowerCase();
    const name = b.name.toLowerCase();
    return slug.startsWith(expanded) || name.includes(namePart) || slug.includes(expanded);
  }).slice(0, limit);

  return matches.map((b) => {
    if (chapterPart && chapterPart >= 1 && chapterPart <= b.chapters) {
      if (versePart && versePart >= 1) {
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
  });
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

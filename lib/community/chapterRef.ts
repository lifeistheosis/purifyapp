// Which Bible chapter a post is about, so each chapter can show the posts
// that talk about it ("Discussed in Community").
//
// A shared verse says so itself. A discussion written from a chapter's page
// carries it from there. Otherwise the first reference in the post's own
// words decides: "John 3:16", "1 Cor 13:4", "Psalm 23". A book and a chapter
// with nothing after them ("Mark 2") is too easily ordinary English ("Mark 2
// of these"), so it counts only for the Psalms, where it is how people write.
//
// Pure: the routes and the tests share it.

import { BOOKS, getBook } from "@/lib/bible/books";

/** Short names people write, to the book's slug. Full names are added below. */
const ABBREVIATIONS: Record<string, string> = {
  gen: "genesis",
  ex: "exodus",
  exod: "exodus",
  lev: "leviticus",
  num: "numbers",
  deut: "deuteronomy",
  josh: "joshua",
  judg: "judges",
  sam: "samuel",
  kgs: "kings",
  chron: "chronicles",
  neh: "nehemiah",
  esth: "esther",
  ps: "psalms",
  psa: "psalms",
  psalm: "psalms",
  prov: "proverbs",
  eccl: "ecclesiastes",
  eccles: "ecclesiastes",
  wis: "wisdom",
  wisdom: "wisdom",
  "song of songs": "song-of-solomon",
  sir: "sirach",
  isa: "isaiah",
  jer: "jeremiah",
  lam: "lamentations",
  ezek: "ezekiel",
  dan: "daniel",
  hos: "hosea",
  obad: "obadiah",
  mic: "micah",
  hab: "habakkuk",
  zeph: "zephaniah",
  hag: "haggai",
  zech: "zechariah",
  mal: "malachi",
  mt: "matthew",
  matt: "matthew",
  mk: "mark",
  mrk: "mark",
  lk: "luke",
  jn: "john",
  jhn: "john",
  rom: "romans",
  cor: "corinthians",
  gal: "galatians",
  eph: "ephesians",
  phil: "philippians",
  php: "philippians",
  col: "colossians",
  thess: "thessalonians",
  thes: "thessalonians",
  tim: "timothy",
  tit: "titus",
  philem: "philemon",
  phlm: "philemon",
  heb: "hebrews",
  jas: "james",
  pet: "peter",
  rev: "revelation",
  apoc: "revelation",
};

/** Lowercase name (no number prefix) to the slug's tail: "kings" -> "kings". */
const NAMES: Map<string, string> = (() => {
  const m = new Map<string, string>(Object.entries(ABBREVIATIONS));
  for (const b of BOOKS) {
    const bare = b.name.toLowerCase().replace(/^[1-3]\s+/, "");
    if (!m.has(bare)) m.set(bare, b.slug.replace(/^[1-3]-/, ""));
  }
  return m;
})();

/** The slug for a numbered or plain book name, or null. */
function bookSlug(prefix: string | undefined, name: string): string | null {
  const tail = NAMES.get(name.toLowerCase().replace(/\.$/, ""));
  if (!tail) return null;
  if (prefix) {
    const slug = `${prefix}-${tail}`;
    return getBook(slug) ? slug : null;
  }
  return getBook(tail) ? tail : null;
}

/** "john/3" for a book and chapter that exist, else null. */
export function chapterRefOf(book: string, chapter: number): string | null {
  const b = getBook(book);
  if (!b || !Number.isInteger(chapter) || chapter < 1 || chapter > b.chapters) return null;
  return `${b.slug}/${chapter}`;
}

/** A stored chapter reference that still names a real chapter, or null. */
export function validChapterRef(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  const m = /^([a-z0-9-]{1,40})\/(\d{1,3})$/.exec(ref);
  return m ? chapterRefOf(m[1], Number(m[2])) : null;
}

const REFERENCE =
  /(?<![\p{L}\d])(?:([1-3])\s*)?((?:song of solomon)|(?:song of songs)|(?:wisdom of solomon)|[a-z]{2,15}\.?)\s+(\d{1,3})(?:\s*:\s*(\d{1,3}))?/giu;

/** The chapter of the first Bible reference in some text, or null. */
export function findChapterRef(texts: readonly (string | null | undefined)[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    const re = new RegExp(REFERENCE.source, REFERENCE.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const [, prefix, rawName, chapter, verse] = m;
      const slug = bookSlug(prefix, rawName);
      // "Mark 2" without a verse is ordinary English; the Psalms are cited so.
      // A verse 0 is a clock ("9:00"), not a verse.
      const ref = slug && (verse ? Number(verse) >= 1 : slug === "psalms") ? chapterRefOf(slug, Number(chapter)) : null;
      if (ref) return ref;
      // Not a reference: try again one character on, so "Reading 1 Cor 13:4"
      // does not lose its "1" to the word before it.
      re.lastIndex = m.index + 1;
    }
  }
  return null;
}

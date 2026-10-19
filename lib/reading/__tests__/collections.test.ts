// The Purify collections and the row by feeling (1.8).
//
// The owner's note of 2026-10-17 asked for "our own collection of stuff ...
// collection of quotes from the things we have, like verses about hatred or
// like sections of books ... talk about hatred", and the standing rules ask
// that nothing be paraphrased and nothing invented. So every passage is held
// here to the text the app itself carries, letter for letter: Scripture to
// whole verses of the app's own Bible (the King James New Testament,
// Brenton's Old Testament), the Fathers to whole sentences of one paragraph
// of a work in the library, never from a section that is Purify's own prose
// and never from a work the room calls a retelling. Each passage's place is
// the address it opens at, and that place has to exist.
//
// What a reader would notice if this broke: a quotation that is not what the
// book says, a link that opens the wrong page or nowhere, a feeling whose
// name shows as its key, or our own words with no mark for the clergy review.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { PASSAGES, passageHref, type FatherPassage } from "@/lib/reading/collections";
import { collectionPage, markOf, placeOf } from "@/lib/reading/collectionView";
import { ENTRIES, type WorkKey } from "@/lib/reading/entries";
import { COLLECTION_SLUGS, COLLECTIONS_REVIEW, FEELINGS, collectionIntroKey, collectionNameKey } from "@/lib/reading/feelings";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const readJson = <T,>(...p: string[]) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8")) as T;
const catalog = (code: string) => readJson<Record<string, string>>("lib", "i18n", "messages", `${code}.json`);
const EN = catalog("en");
const EM_DASH = String.fromCharCode(0x2014);

type Verse = { n: number; text: string };
type Chapter = { verses: Verse[] };
type Book = { slug: string; source: string; chapters: number };
type Section = { n: number; title: string; voice?: string; paragraphs: string[] };
type Work = { sections: Section[] };

const BOOKS = new Map(readJson<Book[]>("data", "bible", "books.json").map((b) => [b.slug, b]));
const works = new Map<string, Work>();
function work(p: FatherPassage): Work {
  const key = `${p.saint}/${p.work}`;
  if (!works.has(key)) works.set(key, readJson<Work>("data", "saints", p.saint, `${p.work}.json`));
  return works.get(key)!;
}

const ALL = COLLECTION_SLUGS.flatMap((slug) => PASSAGES[slug].map((p) => ({ slug, p })));

describe("the row by feeling", () => {
  it("opens one collection for each feeling, every collection on the row", () => {
    expect(Object.keys(PASSAGES).sort()).toEqual([...COLLECTION_SLUGS].sort());
    expect(new Set(COLLECTION_SLUGS).size).toBe(COLLECTION_SLUGS.length);
    // Hatred first among the collections, as the owner asked; and on the row.
    expect(COLLECTION_SLUGS).toContain("hatred");
  });

  it("answers each feeling from Scripture and from at least two of the Fathers", () => {
    for (const slug of COLLECTION_SLUGS) {
      const list = PASSAGES[slug];
      const scripture = list.filter((p) => p.kind === "scripture");
      const fathers = list.filter((p): p is FatherPassage => p.kind === "father");
      expect(list.length, slug).toBeGreaterThanOrEqual(6);
      expect(list.length, slug).toBeLessThanOrEqual(12);
      expect(scripture.length, slug).toBeGreaterThanOrEqual(2);
      expect(new Set(fathers.map((p) => ENTRIES[`${p.saint}/${p.work}` as WorkKey]?.by)).size, slug).toBeGreaterThanOrEqual(2);
      expect(new Set(list.map((p) => p.text)).size, `${slug}: a passage twice`).toBe(list.length);
    }
  });
});

describe("a passage of Scripture", () => {
  const scripture = ALL.filter((x) => x.p.kind === "scripture");

  it("is whole verses of the app's own Bible, the King James New Testament or Brenton's Old, word for word", () => {
    for (const { slug, p } of scripture) {
      if (p.kind !== "scripture") continue;
      const book = BOOKS.get(p.book);
      expect(book, `${slug}: ${p.book}`).toBeDefined();
      expect(["kjv-pd", "brenton-lxx-pd"]).toContain(book!.source);
      expect(p.chapter).toBeGreaterThanOrEqual(1);
      expect(p.chapter).toBeLessThanOrEqual(book!.chapters);
      const { from, to = p.from } = p;
      expect(to, `${slug}: ${p.book} ${p.chapter}`).toBeGreaterThanOrEqual(from);
      const chapter = readJson<Chapter>("data", "bible", p.book, `${p.chapter}.json`);
      const verses = chapter.verses.filter((v) => v.n >= from && v.n <= to);
      expect(verses.length, `${slug}: ${p.book} ${p.chapter}:${from}-${to}`).toBe(to - from + 1);
      expect(p.text, `${slug}: ${p.book} ${p.chapter}:${from}-${to}`).toBe(verses.map((v) => v.text).join(" "));
    }
  });

  it("opens at its verses in the Bible", () => {
    for (const { p } of scripture) {
      if (p.kind !== "scripture") continue;
      expect(passageHref(p)).toBe(`/bible/${p.book}/${p.chapter}#v${p.from}${p.to !== undefined ? `-${p.to}` : ""}`);
      if (p.to !== undefined) expect(p.to).toBeGreaterThan(p.from);
    }
  });
});

describe("a passage of the Fathers", () => {
  const fathers = ALL.filter((x): x is { slug: (typeof COLLECTION_SLUGS)[number]; p: FatherPassage } => x.p.kind === "father");

  it("is a work in the library, in the Fathers' own words and by a named author", () => {
    for (const { slug, p } of fathers) {
      const saint = SAINTS.find((s) => s.slug === p.saint);
      expect(saint?.works.some((w) => w.slug === p.work), `${slug}: ${p.saint}/${p.work}`).toBe(true);
      const entry = ENTRIES[`${p.saint}/${p.work}` as WorkKey];
      expect(entry, `${slug}: ${p.saint}/${p.work}`).toBeDefined();
      expect(entry!.form, `${slug}: ${p.saint}/${p.work} is a retelling`).not.toBe("retelling");
      expect(entry!.by, `${slug}: ${p.saint}/${p.work} has no named author`).toBeTruthy();
    }
  });

  it("is whole sentences of one paragraph, letter for letter, from no section of our own prose", () => {
    for (const { slug, p } of fathers) {
      const where = `${slug}: ${p.saint}/${p.work} s${p.section} p${p.paragraph}`;
      const section = work(p).sections.find((s) => s.n === p.section);
      expect(section, where).toBeDefined();
      expect(section!.voice, where).not.toBe("editorial");
      const paragraph = section!.paragraphs[p.paragraph];
      expect(paragraph, where).toBeTypeOf("string");
      const at = paragraph.indexOf(p.text);
      expect(at, `${where}: not in the paragraph`).toBeGreaterThanOrEqual(0);
      // It begins a sentence: the paragraph's start, or after a sentence's end
      // (a bracketed reference the edition prints counts as one).
      expect(at === 0 || /[.?!:;"'’”)\]]\s+$/.test(paragraph.slice(0, at)), `${where}: begins inside a sentence`).toBe(true);
      // And it ends one.
      expect(p.text, `${where}: ends inside a sentence`).toMatch(/[.?!]["'’”]?$/);
      const after = paragraph.slice(at + p.text.length);
      expect(after === "" || /^\s/.test(after), `${where}: ends inside a word`).toBe(true);
      // No editor's apparatus carried in with it.
      expect(p.text, where).not.toMatch(/\[|\]|--/);
    }
  });

  it("opens at its paragraph, which the reader can find", () => {
    for (const { p } of fathers) {
      expect(passageHref(p)).toBe(`/saints/${p.saint}/${p.work}#p-${p.section}-${p.paragraph}`);
    }
    // The reader answers that address: it opens the section and scrolls to
    // the paragraph (components/saints/WritingReader.tsx, ParagraphRow).
    const reader = fs.readFileSync(path.join(ROOT, "components/saints/WritingReader.tsx"), "utf8");
    expect(reader).toContain("p-(\\d+)-(\\d+)");
    expect(fs.readFileSync(path.join(ROOT, "components/saints/ParagraphRow.tsx"), "utf8")).toContain("id={`p-${sectionN}-${paragraphIdx}`}");
  });

  it("names its place as the work does", () => {
    expect(placeOf("Book 8, Chapter 17. That the peace of our heart does not depend on another's will, but lies")).toBe("Book 8, Chapter 17");
    expect(placeOf("Conference 16, Chapter 13. How love does not only belong to God but is God.")).toBe("Conference 16, Chapter 13");
    expect(placeOf("Book II, Chapter XIV. Concerning Pain")).toBe("Book II, Chapter XIV");
    expect(placeOf("Homily 18, Matthew 5:38, 39, 40")).toBe("Homily 18, Matthew 5:38, 39, 40");
    expect(placeOf("Exhortations to faith and love")).toBe("Exhortations to faith and love");
    expect(markOf("78. Which same sentence")).toBe("§78");
    expect(markOf("But we are to know")).toBeUndefined();
  });
});

describe("a collection's page", () => {
  it("names every passage's place from the registry and the work itself, and lists the books they come from", () => {
    for (const slug of COLLECTION_SLUGS) {
      const page = collectionPage(slug, false);
      expect(page.passages.map((p) => p.text), slug).toEqual(PASSAGES[slug].map((p) => p.text));
      for (const p of page.passages) {
        expect(p.href, slug).toBe(passageHref(PASSAGES[slug].find((q) => q.text === p.text)!));
        if (p.kind === "father") {
          for (const part of [p.author, p.work, p.place]) expect(part.trim(), `${slug}: ${p.href}`).toBeTruthy();
          expect(p.place.length, `${slug}: ${p.place}`).toBeLessThanOrEqual(48);
        } else {
          expect(p.reference, slug).toMatch(/^\d+:\d+(-\d+)?$/);
          expect(["kjv", "brenton"]).toContain(p.translation);
        }
      }
      const works = new Set(PASSAGES[slug].filter((p): p is FatherPassage => p.kind === "father").map((p) => `${p.saint}/${p.work}`));
      expect(page.sources.map((c) => c.key), slug).toEqual([...works]);
    }
  });

  it("says a passage's place as the edition does", () => {
    const shown = (slug: (typeof COLLECTION_SLUGS)[number], start: string) => collectionPage(slug, false).passages.find((p) => p.text.startsWith(start));
    expect(shown("hatred", "For hatred is inveterate anger")).toMatchObject({
      kind: "father",
      author: "St. Augustine of Hippo",
      work: "Our Lord's Sermon on the Mount",
      place: "Book 2, Chapter 19",
      mark: "§63",
      href: "/saints/augustine-of-hippo/sermon-on-the-mount#p-42-0",
    });
    expect(shown("anger", "The chief part then of our improvement")).toMatchObject({ author: "St. John Cassian", work: "The Institutes", place: "Book 8, Chapter 17" });
    expect(shown("envy", "For it is impossible for us to envy")).toMatchObject({ author: "St. Gregory the Great", place: "Book 5, on Job 3 to 5", mark: "§84" });
    expect(shown("hatred", "Thou shalt not hate thy brother")).toMatchObject({ kind: "scripture", book: "leviticus", reference: "19:17-18", translation: "brenton" });
    expect(shown("grief", "Jesus wept.")).toMatchObject({ kind: "scripture", book: "john", reference: "11:35", translation: "kjv", href: "/bible/john/11#v35" });
  });
});

describe("the collections' words", () => {
  const UI = [
    "reading.row.feelings",
    "reading.featured.read",
    "reading.collection.english",
    "reading.collection.note",
    "reading.collection.sources",
    "reading.collection.kjv",
    "reading.collection.brenton",
  ];

  it("name each feeling in English as the row's list does, letter for letter", () => {
    for (const f of FEELINGS) expect(EN[collectionNameKey(f.slug)], f.slug).toBe(f.label);
  });

  it("have every line in every language, with no em dash, and one line of introduction each", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      const keys = [...UI, ...COLLECTION_SLUGS.flatMap((s) => [collectionNameKey(s), collectionIntroKey(s)]), "reading.collection.passages.other"];
      for (const key of keys) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key].includes(EM_DASH), `${code} ${key}`).toBe(false);
      }
      expect(m["reading.collection.passages.other"], `${code}: the count`).toContain("{count}");
      for (const slug of COLLECTION_SLUGS) expect(m[collectionIntroKey(slug)], `${code} ${slug}`).not.toMatch(/\n/);
    }
    for (const slug of COLLECTION_SLUGS) expect(EN[collectionIntroKey(slug)].length, slug).toBeLessThanOrEqual(110);
  });

  it("are marked for a future clergy review, and the queue says so", () => {
    expect(COLLECTIONS_REVIEW.status).toBe("awaiting-clergy-review");
    const standards = fs.readFileSync(path.join(ROOT, "docs/editorial-standards.md"), "utf8");
    expect(standards).toContain("COLLECTIONS_REVIEW");
  });
});

describe("the room's motion", () => {
  const css = fs.readFileSync(path.join(ROOT, "components/reading/room.module.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("moves only behind the app's motion switch, never on the operating system's word", () => {
    expect(css).not.toMatch(/prefers-reduced-motion/);
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\banimation\s*:[^;{}]*\b(heroBackdropAway|heroPosterAway|heroWordsAway)\b/g)) {
      expect(m[1], m[1].trim()).toContain(':where([data-motion="full"])');
    }
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.heroBackdrop/);
  });

  it("keeps the rows and a collection's passages still", () => {
    // Their scroll-driven settle ran only in Chromium, so only Android moved
    // them under the thumb (the owner, 2026-10-19), as the shop's grid had.
    expect(css).not.toMatch(/\.(row|passage)\b/);
    expect(css).not.toMatch(/@keyframes\s+settle\b/);
  });

  it("moves transform and opacity only, and blurs nothing that moves", () => {
    for (const m of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
      const props = [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
      for (const prop of props) expect(["opacity", "transform"]).toContain(prop);
    }
    expect(css).not.toMatch(/backdrop-filter|blur\(/);
  });
});

// The Bibles a reader downloads (1.9): the files on the website, made by
// scripts/bibles/build.mjs from the editions docs/1.9-build/BIBLES.md names.
// Each verse is its edition's words, as the edition holds them; these hold
// the files to that, and to the list the apps carry.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import CATALOG from "@/data/bibles/catalog.json";
import BOOKS from "@/data/bible/books.json";
import { DOWNLOADABLE_BIBLES, hasBook } from "@/lib/bible/downloads/catalog";
import type { BibleBookFile, BibleManifest } from "@/lib/bible/downloads/store";

const ROOT = path.resolve(__dirname, "../../../..");
const dir = (bible: string) => path.join(ROOT, "public/bibles", bible);
const manifest = (bible: string) => JSON.parse(fs.readFileSync(path.join(dir(bible), "index.json"), "utf8")) as BibleManifest;
const book = (bible: string, slug: string) => JSON.parse(fs.readFileSync(path.join(dir(bible), `${slug}.json`), "utf8")) as BibleBookFile;
const verse = (bible: string, slug: string, chapter: number, label: number | string) =>
  book(bible, slug).chapters[chapter - 1]?.find(([l]) => l === label)?.[1];
const APP = new Map((BOOKS as { slug: string; chapters: number }[]).map((b) => [b.slug, b.chapters]));
const RU = "ru-synodal";
const GRC = "grc-lxx-patriarchal";

describe("the list the apps carry", () => {
  it("is the website's own list of each Bible, version, size and books", () => {
    expect(Object.keys(CATALOG).sort()).toEqual(DOWNLOADABLE_BIBLES.map((b) => b.id).sort());
    for (const b of DOWNLOADABLE_BIBLES) {
      const m = manifest(b.id);
      expect(m.bible).toBe(b.id);
      expect(b.version, b.id).toBe(m.version);
      expect(b.bytes, b.id).toBe(m.bytes);
      expect([...b.books], b.id).toEqual(m.books.map((x) => x.book));
    }
  });

  it("knows which books each Bible has: the Russian all 78, the Greek all but 2 Esdras, which survives in Latin", () => {
    const [ru, grc] = [RU, GRC].map((id) => DOWNLOADABLE_BIBLES.find((b) => b.id === id)!);
    expect(ru.books).toHaveLength(78);
    expect(grc.books).toHaveLength(77);
    expect(hasBook(grc, "2-esdras")).toBe(false);
    expect(hasBook(ru, "2-esdras")).toBe(true);
  });

  it("downloads in under 10 MB a Bible", () => {
    for (const b of DOWNLOADABLE_BIBLES) expect(b.bytes, b.id).toBeLessThan(10_000_000);
  });
});

describe("each book's file", () => {
  for (const b of DOWNLOADABLE_BIBLES) {
    it(`${b.id}: is the book its list names, at its size and hash, with every verse's words and nothing else`, () => {
      const m = manifest(b.id);
      const onDisk = fs.readdirSync(dir(b.id)).filter((f) => f !== "index.json").sort();
      expect(onDisk).toEqual(m.books.map((x) => `${x.book}.json`).sort());
      for (const entry of m.books) {
        const raw = fs.readFileSync(path.join(dir(b.id), `${entry.book}.json`), "utf8");
        expect(Buffer.byteLength(raw), entry.book).toBe(entry.bytes);
        const file = JSON.parse(raw) as BibleBookFile;
        expect(file.bible).toBe(b.id);
        expect(file.book).toBe(entry.book);
        expect(file.chapters.length).toBe(entry.chapters);
        const hash = crypto.createHash("sha256").update(JSON.stringify(file.chapters) + JSON.stringify(file.elsewhere ?? {})).digest("hex").slice(0, 12);
        expect(file.hash, entry.book).toBe(hash);
        expect(entry.hash).toBe(hash);
        expect(APP.has(entry.book), entry.book).toBe(true);
        for (const [i, ch] of file.chapters.entries()) {
          for (const [label, text] of ch) {
            const where = `${entry.book} ${i + 1}:${label}`;
            expect(typeof label === "number" ? label > 0 : /^(\d+[a-z]*)?$/.test(label), where).toBe(true);
            expect(text.length, where).toBeGreaterThan(0);
            expect(text, where).toBe(text.trim());
            // No markup left: USFM's marks and word tags, OSIS's tags, escaped or not.
            expect(text, where).not.toMatch(/[\\|<>]|strong=|&lt;|&gt;|&amp;/);
          }
        }
      }
    });
  }
});

describe("the Russian: the Synodal of 1876, from CrossWire's RusSynodal 1.9.1", () => {
  it("is its words, in its own numbering", () => {
    expect(verse(RU, "genesis", 1, 1)).toBe("В начале сотворил Бог небо и землю.");
    expect(verse(RU, "john", 1, 1)).toBe("В начале было Слово, и Слово было у Бога, и Слово было Бог.");
    // The psalm's title is its verses 1 and 2, as the Synodal counts them.
    expect(verse(RU, "psalms", 50, 3)).toBe("Помилуй меня, Боже, по великой милости Твоей, и по множеству щедрот Твоих изгладь беззакония мои.");
    // The doxology of Romans closes chapter 14 in the Synodal.
    expect(verse(RU, "romans", 14, 26)).toBe("Единому Премудрому Богу, через Иисуса Христа, слава во веки. Аминь.");
    expect(verse(RU, "tobit", 1, 1)).toMatch(/^Книга сказаний Товита, сына Товиилова/);
  });

  it("keeps every chapter in the app's chapters, each book as the app divides it", () => {
    for (const entry of manifest(RU).books) expect(entry.chapters, entry.book).toBe(APP.get(entry.book));
  });

  it("is mended where the module holds markup as text: a note left out, a psalm's title set back on its psalm", () => {
    expect(verse(RU, "job", 2, 9)).toBe("И сказала ему жена его: ты все еще тверд в непорочности твоей! похули Бога и умри.");
    expect(verse(RU, "psalms", 143, 15)).toBe("Блажен народ, у которого это есть. Блажен народ, у которого Господь есть Бог.");
    expect(verse(RU, "psalms", 144, 1)).toMatch(/^Хвала Давида\. Буду превозносить Тебя, Боже мой/);
  });
});

describe("the Greek: Brenton's Septuagint (1851) and the Patriarchal New Testament (1904)", () => {
  it("is their words, in their own numbering", () => {
    expect(verse(GRC, "genesis", 1, 1)).toBe("ἘΝ ἀρχῇ ἐποίησεν ὁ Θεὸς τὸν οὐρανὸν καὶ τὴν γῆν.");
    expect(verse(GRC, "john", 1, 1)).toBe("Ἐν ἀρχῇ ἦν ὁ Λόγος, καὶ ὁ Λόγος ἦν πρὸς τὸν Θεόν, καὶ Θεὸς ἦν ὁ Λόγος.");
    expect(verse(GRC, "psalms", 50, 3)).toMatch(/^Ἐλέησον με ὁ Θεὸς κατὰ τὸ μέγα ἔλεός σου/);
    // A word tag gives back its word, and a quotation's italics their words.
    expect(verse(GRC, "matthew", 1, 23)).toBe(
      "ἰδοὺ ἡ παρθένος ἐν γαστρὶ ἕξει καὶ τέξεται υἱόν, καὶ καλέσουσι τὸ ὄνομα αὐτοῦ Ἐμμανουήλ, ὅ ἐστι μεθερμηνευόμενον μεθ᾽ ἡμῶν ὁ Θεός.",
    );
    // The Septuagint's added verses keep their letters.
    expect(verse(GRC, "genesis", 31, "50a")).toBe("Καὶ εἶπε Λάβαν τῷ Ἰακὼβ, ἰδοὺ ὁ βουνὸς οὗτος καὶ μάρτυς ἡ στήλη αὕτη.");
  });

  it("is set in the app's books: Esdras B as Ezra and Nehemiah, Susanna and Bel as Daniel 13 and 14", () => {
    expect(book(GRC, "ezra").chapters).toHaveLength(10);
    expect(verse(GRC, "nehemiah", 1, 1)).toMatch(/^ΛΟΓΟΙ Νεεμία/);
    expect(verse(GRC, "daniel", 13, 1)).toMatch(/^ΚΑΙ ἦν ἀνὴρ οἰκῶν ἐν Βαβυλῶνι/);
    expect(verse(GRC, "daniel", 14, 1)).toMatch(/^ΚΑΙ ὁ βασιλεὺς Ἀστυάγης/);
    expect(fs.existsSync(path.join(dir(GRC), "4-maccabees.json"))).toBe(false);
  });

  it("opens Sirach on its prologue, unnumbered, then the book's own first verse", () => {
    const first = book(GRC, "sirach").chapters[0];
    expect(first[0][0]).toBe("");
    expect(first[0][1]).toMatch(/^ΠΟΛΛΩΝ καὶ μεγάλων ἡμῖν/);
    expect(first[1]).toEqual([1, "ΠΑΣΑ σοφία παρὰ Κυρίου, καὶ μετʼ αὐτοῦ ἐστιν εἰς τὸν αἰῶνα."]);
    expect(first.filter(([l]) => l === 1)).toHaveLength(1);
  });

  it("keeps Lamentations' preface before its first verse, unnumbered", () => {
    const first = book(GRC, "lamentations").chapters[0];
    expect(first[0][0]).toBe("");
    expect(first[0][1]).toMatch(/^ΚΑΙ ἐγένετο μετὰ τὸ αἰχμαλωτισθῆναι/);
  });

  it("keeps its own chapters where they differ from the app's, and says where a page's verses stand", () => {
    // Joel in four chapters, as Greek Bibles print it.
    expect(book(GRC, "joel").chapters).toHaveLength(4);
    expect(APP.get("joel")).toBe(3);
    // Malachi in three: the app's 4:1-6 is its 3:19-24.
    const malachi = book(GRC, "malachi");
    expect(malachi.chapters).toHaveLength(3);
    expect(malachi.elsewhere).toEqual({ 4: 3 });
    expect(malachi.chapters[2].at(-1)?.[0]).toBe(24);
    // Proverbs 30 stands in its chapter 24, as the Septuagint orders it.
    const proverbs = book(GRC, "proverbs");
    expect(proverbs.chapters[29]).toEqual([]);
    expect(proverbs.elsewhere).toEqual({ 30: 24 });
    // No other book has an empty chapter or one the app's pages cannot reach.
    for (const entry of manifest(GRC).books) {
      const file = book(GRC, entry.book);
      const empty = file.chapters.map((c, i) => (c.length ? 0 : i + 1)).filter(Boolean);
      expect(empty, entry.book).toEqual(entry.book === "proverbs" ? [30] : []);
      if (!["joel", "malachi"].includes(entry.book)) expect(file.chapters.length, entry.book).toBe(APP.get(entry.book));
    }
  });
});

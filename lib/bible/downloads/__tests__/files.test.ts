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
const SR = "sr-danicic-karadzic";
const AR = "ar-van-dyck";
const ES = "es-reina-valera-1909";
const PT = "pt-almeida-1911";
const WEB = "en-web";
const HEBREW_CANON = [SR, AR, ES, PT];
/** Numbered as the Hebrew numbers the Psalms: the Bibles of the Hebrew canon, and the World English Bible. */
const HEBREW_PSALMS = [...HEBREW_CANON, WEB];
/** The Bibles of the Hebrew canon whose files print the psalms' titles: the Almeida's transcription has none. */
const TITLED = [SR, AR, ES];

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

  it("knows the Bibles of the Hebrew canon for what they are: 66 books, none of the deuterocanonical", () => {
    for (const id of HEBREW_CANON) {
      const b = DOWNLOADABLE_BIBLES.find((x) => x.id === id)!;
      expect(b.books, id).toHaveLength(66);
      for (const slug of ["tobit", "judith", "wisdom", "sirach", "baruch", "1-maccabees"]) expect(hasBook(b, slug), `${id} ${slug}`).toBe(false);
      for (const slug of ["genesis", "psalms", "daniel", "malachi", "matthew", "revelation"]) expect(hasBook(b, slug), `${id} ${slug}`).toBe(true);
    }
  });

  it("runs the Arabic right to left, and every other left to right", () => {
    for (const b of DOWNLOADABLE_BIBLES) expect(b.dir, b.id).toBe(b.id === AR ? "rtl" : "ltr");
  });

  it("says how each numbers the Psalms, as its file does: the Synodal and the Greek as the Septuagint, the rest as the Hebrew", () => {
    for (const b of DOWNLOADABLE_BIBLES) {
      expect(b.psalms, b.id).toBe(HEBREW_PSALMS.includes(b.id) ? "hebrew" : "septuagint");
      // "Have mercy upon me, O God" is the Septuagint's Psalm 50 and the Hebrew's 51, verse 1 or past the title.
      const fifty = book(b.id, "psalms").chapters[b.psalms === "hebrew" ? 50 : 49].map(([, t]) => t).join(" ");
      expect(fifty, b.id).toMatch(/Помилуй меня, Боже|Ἐλέησον με|Смилуј се на ме|اِرْحَمْنِي يَا ٱللهُ|TEN piedad de mí|Tem misericordia de mim, ó Deus|Have mercy on me, God/);
    }
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

describe("the Bibles of the Hebrew canon: the Serbian (1868), the Arabic (1865) and the Spanish (1909), from eBible.org, and the Portuguese (1911), from CrossWire", () => {
  it("are their words, in their own numbering", () => {
    expect(verse(SR, "genesis", 1, 1)).toBe("У почетку створи Бог небо и земљу.");
    expect(verse(SR, "john", 1, 1)).toBe("У почетку беше Реч, и Реч беше у Бога, и Бог беше Реч.");
    expect(verse(AR, "genesis", 1, 1)).toBe("فِي ٱلْبَدْءِ خَلَقَ ٱللهُ ٱلسَّمَاوَاتِ وَٱلْأَرْضَ.");
    expect(verse(AR, "john", 1, 1)).toBe("فِي ٱلْبَدْءِ كَانَ ٱلْكَلِمَةُ، وَٱلْكَلِمَةُ كَانَ عِنْدَ ٱللهِ، وَكَانَ ٱلْكَلِمَةُ ٱللهَ.");
    expect(verse(ES, "genesis", 1, 1)).toBe("EN el principio crió Dios los cielos y la tierra.");
    expect(verse(ES, "john", 1, 1)).toBe("EN el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.");
    // The psalms numbered as the Hebrew numbers them: Psalm 51 is the Septuagint's 50.
    expect(verse(SR, "psalms", 51, 1)).toMatch(/^Смилуј се на ме, Боже/);
    expect(verse(AR, "psalms", 51, 1)).toMatch(/^اِرْحَمْنِي يَا ٱللهُ/);
    expect(verse(ES, "psalms", 51, 1)).toMatch(/^TEN piedad de mí, oh Dios/);
  });

  it("print a psalm's title before its verse 1, unnumbered, as the editions do", () => {
    for (const id of TITLED) {
      const psalm = book(id, "psalms").chapters[50];
      expect(psalm[0][0], id).toBe("");
      expect(psalm[1][0], id).toBe(1);
    }
    expect(book(ES, "psalms").chapters[50][0][1]).toBe("Al Músico principal: Salmo de David, cuando después que entró á Bathsebah, vino á él Nathán el profeta.");
    // "A TI, oh Jehová": the one-letter first word stays with its psalm.
    expect(book(ES, "psalms").chapters[24].slice(0, 2)).toEqual([["", "Salmo de David."], [1, "A TI, oh Jehová, levantaré mi alma."]]);
    // An untitled psalm has none.
    expect(book(ES, "psalms").chapters[0][0][0]).toBe(1);
    // Psalm 119's Hebrew letters are headings over its stanzas, left out as headings are.
    expect(verse(ES, "psalms", 119, 1)).toMatch(/^BIENAVENTURADOS los perfectos/);
    expect(verse(ES, "psalms", 119, 9)).toMatch(/^¿Con qué limpiará el joven/);
  });

  it("end the Psalms at 150 and Daniel at 12, and every other book where the app does", () => {
    for (const id of HEBREW_CANON) {
      for (const entry of manifest(id).books) {
        const expected = entry.book === "psalms" ? 150 : entry.book === "daniel" ? 12 : APP.get(entry.book);
        expect(entry.chapters, `${id} ${entry.book}`).toBe(expected);
        const file = book(id, entry.book);
        expect(file.elsewhere, `${id} ${entry.book}`).toBeUndefined();
        expect(file.chapters.every((c) => c.length > 0), `${id} ${entry.book}`).toBe(true);
      }
    }
  });

  it("keep the Arabic's opening words where it prints them, before verse 1, and leave out an editor's pointer", () => {
    expect(book(AR, "nehemiah").chapters[7][0]).toEqual(["", "وَلَمَّا ٱسْتُهِلَّ ٱلشَّهْرُ ٱلسَّابِعُ وَبَنُو إِسْرَائِيلَ فِي مُدُنِهِمِ،"]);
    expect(book(AR, "jeremiah").chapters[38][0]).toEqual(["", "وَلَمَّا أُخِذَتْ أُورُشَلِيمُ،"]);
    // "(to verse 73)" over Nehemiah 7 is a reader's pointer, not words of the book.
    expect(book(AR, "nehemiah").chapters[6][0][0]).toBe(1);
    expect(JSON.stringify(book(AR, "nehemiah").chapters)).not.toContain("عدد73");
  });

  it("keep the Almeida as it was printed in 1911, word for word and in its spelling, with no psalm titles in its transcription", () => {
    // Call 23, the owner's yes of 2026-11-11: "verbatim in its 1911 spelling".
    expect(verse(PT, "genesis", 1, 1)).toBe("No principio creou Deus os céus e a terra.");
    expect(verse(PT, "john", 1, 1)).toBe("No principio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.");
    // The psalms numbered as the Hebrew numbers them, as every Bible of the Hebrew canon here.
    expect(verse(PT, "psalms", 51, 1)).toMatch(/^Tem misericordia de mim, ó Deus/);
    expect(book(PT, "psalms").chapters[50][0][0]).toBe(1);
    // The blessing is its 2 Corinthians 13:13, as Portuguese Bibles number it; the
    // English count's 13:14, which the module keeps empty, is left out.
    expect(book(PT, "2-corinthians").chapters[12].at(-1)).toEqual([13, "A graça do Senhor Jesus Christo, e o amor de Deus, e a communhão do Espirito Sancto seja com vós todos. Amen."]);
  });

  it("leave out the Spanish file's empty verse numbers and the notes after Paul's letters", () => {
    // Numbers 12:16 is the Reina-Valera's 13:1, which the file kept empty at 12:16 as well.
    expect(book(ES, "numbers").chapters[11].at(-1)?.[0]).toBe(15);
    expect(verse(ES, "numbers", 13, 1)).toMatch(/^Y DESPUÉS movió el pueblo de Haseroth/);
    expect(verse(ES, "romans", 16, 27)).toBe("Al solo Dios sabio, sea gloria por Jesucristo para siempre. Amén.");
    expect(verse(ES, "hebrews", 13, 25)).toBe("La gracia sea con todos vosotros. Amén.");
    expect(verse(ES, "2-corinthians", 13, 13)).toMatch(/sea con vosotros todos\. Amén\.$/);
    for (const slug of ["romans", "galatians", "1-timothy", "titus", "philemon", "hebrews"]) {
      expect(JSON.stringify(book(ES, slug).chapters.at(-1)), slug).not.toMatch(/fué escrita|Escrita de|fué enviada|Enviada de/);
    }
  });
});

describe("the World English Bible: the British Edition with the deuterocanon (2020), from eBible.org", () => {
  // Build 95 note 25 (his word of 2026-11-13, "Both": it ships in 1.9, no longer "Coming soon").
  const web = () => DOWNLOADABLE_BIBLES.find((b) => b.id === WEB)!;

  it("is a Bible a reader downloads, in English, with every book of the app", () => {
    expect(web().language).toBe("en");
    expect(web().textLang).toBe("en");
    expect(web().title).toBe("World English Bible");
    expect([...web().books].sort()).toEqual([...APP.keys()].sort());
  });

  it("is its words, God's name as the LORD, in its own numbering", () => {
    expect(verse(WEB, "genesis", 1, 1)).toBe("In the beginning, God created the heavens and the earth.");
    expect(verse(WEB, "psalms", 23, 1)).toBe("The LORD is my shepherd; I shall lack nothing.");
    expect(verse(WEB, "psalms", 51, 1)).toMatch(/^Have mercy on me, God, according to your loving kindness\./);
    expect(verse(WEB, "john", 1, 1)).toBe("In the beginning was the Word, and the Word was with God, and the Word was God.");
    const all = (slug: string) => JSON.stringify(book(WEB, slug).chapters);
    expect(all("psalms")).not.toContain("Yahweh is my shepherd");
  });

  it("is set in the app's books: the Greek Esther and Daniel, Baruch and the Letter of Jeremiah apart, Psalm 151 after the 150", () => {
    expect(manifest(WEB).books.find((b) => b.book === "daniel")?.chapters).toBe(14);
    expect(verse(WEB, "daniel", 13, 1)).toBe("A man lived in Babylon, and his name was Joakim.");
    expect(verse(WEB, "daniel", 14, 1)).toMatch(/^King Astyages was gathered to his fathers/);
    expect(verse(WEB, "esther", 1, 1)).toMatch(/^\[In the second year of the reign of Ahasuerus the great king/);
    expect(manifest(WEB).books.find((b) => b.book === "baruch")?.chapters).toBe(5);
    expect(verse(WEB, "epistle-of-jeremiah", 1, 1)).toMatch(/^A copy of a letter that Jeremy sent/);
    expect(manifest(WEB).books.find((b) => b.book === "psalms")?.chapters).toBe(151);
    expect(verse(WEB, "psalms", 151, 1)).toMatch(/^I was small amongst my brothers/);
  });

  it("leaves out the edition's own notes on each deuterocanonical book, and keeps Sirach's prologue before its verse 1", () => {
    for (const slug of ["tobit", "judith", "esther", "wisdom", "sirach", "baruch", "1-maccabees", "2-maccabees", "3-maccabees", "1-esdras", "2-esdras", "prayer-of-manasseh", "psalms"]) {
      expect(JSON.stringify(book(WEB, slug).chapters), slug).not.toMatch(/recognised as Deuterocanonical|included in the Slavonic Bible|We have chosen not to distract/);
    }
    for (const slug of ["tobit", "judith", "wisdom", "1-maccabees", "2-esdras"]) expect(book(WEB, slug).chapters[0][0][0], slug).toBe(1);
    const sirach = book(WEB, "sirach").chapters[0];
    expect(sirach[0][0]).toBe("");
    expect(sirach[0][1]).toMatch(/^WHEREAS many and great things have been delivered to us by the law and the prophets/);
    expect(sirach[1][0]).toBe(1);
  });

  it("prints a psalm's title before its verse 1, and leaves out the letters over Psalm 119's stanzas, as headings", () => {
    expect(book(WEB, "psalms").chapters[2].slice(0, 2)).toEqual([["", "A Psalm by David, when he fled from Absalom his son."], [1, expect.stringMatching(/^LORD, how my adversaries have increased!/)]]);
    expect(verse(WEB, "psalms", 119, 1)).toMatch(/^Blessed are those whose ways are blameless/);
    expect(verse(WEB, "psalms", 119, 9)).toMatch(/^How can a young man keep his way pure\?/);
    expect(JSON.stringify(book(WEB, "psalms").chapters[118])).not.toMatch(/"(ALEPH|BETH|TAV)"|\bSIN AND SHIN\b/);
  });

  it("leaves out the verse numbers its text does not hold, and nothing else", () => {
    expect(book(WEB, "sirach").chapters[0].some(([l]) => l === 5)).toBe(false);
    expect(book(WEB, "acts").chapters[7].some(([l]) => l === 37)).toBe(false);
    expect(verse(WEB, "acts", 8, 36)).toBeTruthy();
    expect(verse(WEB, "acts", 8, 38)).toBeTruthy();
  });
});

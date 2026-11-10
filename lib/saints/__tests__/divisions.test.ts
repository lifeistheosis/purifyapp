// The printed divisions of the library's works (1.8, lib/saints/divisions.ts).
//
// The owner asked for the book, the chapter and the verse, "the original
// book's formatting ... to be easily quotable": Confessions I.1.1, Homily
// 15.2 on Matthew, Institutes 8.21. Those numbers are read from what each
// file keeps of its edition, so these tests hold every work's numbering to
// its file: each division found where it begins, in order, none read twice,
// and every one of them answering a link (#at-1.1.1). The Confessions, whose
// file kept no numbers at all, are held to the Latin's 31 sections in 20
// chapters, matched to Pusey's paragraphs by their opening words.
//
// What a reader would notice if this broke: a copied citation with the wrong
// number, a link that opens the wrong place, a section headed by the file's
// own count (177) instead of the edition's (8.21).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SCHEMES,
  atOf,
  citeLabel,
  divisionsOf,
  findAt,
  placeAt,
  sectionLabel,
  shownMarks,
  synopsisChapter,
  type WorkDivisions,
  type WorkLike,
} from "@/lib/saints/divisions";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (key: string): WorkLike => {
  const [saint, work] = key.split("/");
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${work}.json`), "utf8")) as WorkLike;
};
const code = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/** Every division a work begins, in the file's order, with where it begins. */
function begun(d: WorkDivisions, w: WorkLike) {
  const out: { path: number[]; n: number; i: number; synopsis: boolean }[] = [];
  d.places.forEach((sec, s) =>
    sec.forEach((p, i) => {
      if (p && p.begins > 0) out.push({ path: p.path, n: w.sections[s].n, i, synopsis: Boolean(p.synopsis) });
    }),
  );
  return out;
}

const cmp = (a: readonly number[], b: readonly number[]) => {
  for (let k = 0; k < Math.max(a.length, b.length); k++) {
    const d = (a[k] ?? -1) - (b[k] ?? -1);
    if (d) return d;
  }
  return 0;
};

describe("every work that keeps its edition's divisions", () => {
  const keys = Object.keys(SCHEMES);

  it("is a work in the library, with its file", () => {
    for (const key of keys) {
      const [saint, work] = key.split("/");
      expect(SAINTS.find((s) => s.slug === saint)?.works.some((w) => w.slug === work), key).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "data", "saints", saint, `${work}.json`)), key).toBe(true);
      expect(SCHEMES[key].edition.trim().length, key).toBeGreaterThan(3);
    }
  });

  it("numbers its divisions in order, none read twice, each where it begins", () => {
    for (const key of keys) {
      const w = read(key);
      const d = divisionsOf(key, w)!;
      expect(d, key).not.toBeNull();
      // A chapter the edition opens with its own heading begins at the heading.
      const list = begun(d, w);
      expect(list.length, key).toBeGreaterThan(0);
      for (let k = 1; k < list.length; k++) {
        // Never backwards. Equal only where the file itself repeats a heading
        // (Cyril on Luke has two sections each for Sermons 29 and 96).
        expect(cmp(list[k].path, list[k - 1].path), `${key}: ${atOf(list[k - 1].path)} then ${atOf(list[k].path)}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("opens each division where it begins: a link by its numbers finds its paragraph", () => {
    for (const key of keys) {
      const w = read(key);
      const d = divisionsOf(key, w)!;
      const seen = new Set<string>();
      for (const b of begun(d, w)) {
        const at = atOf(b.path);
        if (seen.has(at)) continue;
        seen.add(at);
        expect(findAt(d, w, b.path), `${key} #at-${at}`).toEqual({ n: b.n, i: b.i });
      }
    }
  });

  it("is answered by the reader, which opens #at-1.1.1 and shows the edition's own numbers", () => {
    // Since r3-29 A the reader draws one chapter at a time, chosen from the
    // address (components/saints/useWorkPlace.ts) and headed by the edition's
    // own names for its parts (lib/saints/parts.ts).
    expect(code("components/saints/useWorkPlace.ts")).toContain("at-(\\d+(?:\\.\\d+)*)");
    const reader = code("components/saints/WritingReader.tsx");
    expect(reader).toContain("findAt(divisions, content, path)");
    expect(reader).toContain("partsOf(content.sections, divisions, content.title)");
    const row = code("components/saints/ParagraphRow.tsx");
    // A copy carries the citation; a link to a division's first paragraph is by its numbers.
    expect(row).toContain("return cite ?? `${saintName}, ${workTitle}, ${sectionTitle}`;");
    expect(row).toContain("#at-${at}");
  });
});

describe("the Confessions", () => {
  const key = "augustine-of-hippo/confessions";
  const w = read(key);
  const d = divisionsOf(key, w)!;

  it("are the thirteen books, a section each, in Pusey's paragraphs (Book I as it was, the rest past its old numbers)", () => {
    const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
    expect(w.sections.map((s) => [s.n, s.title])).toEqual(ROMAN.map((r, k) => [k === 0 ? 1 : 101 + k, `Book ${r}`]));
    expect(w.sections.map((s) => s.paragraphs.length)).toEqual([38, 18, 21, 31, 25, 27, 27, 32, 38, 70, 41, 43, 53]);
    expect(w.sections[0].paragraphs[0].startsWith("Great art Thou, O Lord, and greatly to be praised")).toBe(true);
    expect(w.sections[12].paragraphs[52].endsWith("so shall it be opened. Amen.")).toBe(true);
  });

  it("carry all 453 of the Latin's sections in its 278 chapters, each opening a paragraph, every paragraph placed", () => {
    const list = begun(d, w);
    expect(list).toHaveLength(453);
    expect(new Set(list.map((b) => b.path.slice(0, 2).join("."))).size).toBe(278);
    const perBook = [31, 18, 21, 31, 25, 26, 27, 30, 37, 70, 41, 43, 53];
    perBook.forEach((n, k) => expect(list.filter((b) => b.path[0] === k + 1), `Book ${k + 1}`).toHaveLength(n));
    for (let s = 0; s < w.sections.length; s++) expect(d.places[s].every((p) => p !== null), w.sections[s].title).toBe(true);
    // Each book's sections in order, 1 to its last.
    perBook.forEach((n, k) => expect(list.filter((b) => b.path[0] === k + 1).map((b) => b.path[2])).toEqual(Array.from({ length: n }, (_, i) => i + 1)));
  });

  it("cite a passage of any book as the edition numbers it", () => {
    const at = (words: string) => {
      for (const s of w.sections) {
        const i = s.paragraphs.findIndex((p) => p.startsWith(words));
        if (i >= 0) return citeLabel(d, placeAt(d, w, s.n, i)!.path);
      }
      return null;
    };
    expect(at("Theft is punished by Thy law, O Lord")).toBe("II.4.9");
    expect(at("To Carthage I came")).toBe("III.1.1");
    expect(at("O Lord, Lord, Which hast bowed the heavens")).toBe("VIII.2.4");
    expect(at("Thus with the baggage of this present world")).toBe("VIII.5.12");
    expect(at("So was I speaking and weeping")).toBe("VIII.12.29");
    expect(at("Too late loved I Thee, O Thou Beauty of ancient days")).toBe("X.27.38");
    expect(at("\"What will ye say then, O ye gainsayers?")).toBe("XII.15.19");
    expect(at("For to one is given by the Spirit the word of wisdom")).toBe("XIII.18.23");
    expect(at("We therefore see these things which Thou madest")).toBe("XIII.38.53");
    expect(sectionLabel(d, w, 102)).toBe("II");
    expect(sectionLabel(d, w, 113)).toBe("XIII");
  });

  it("carry the Latin's 31 sections in 20 chapters, Book I, chapter 1, section 1 to chapter 20, section 31", () => {
    const list = begun(d, w).filter((b) => b.path[0] === 1);
    expect(list.map((b) => citeLabel(d, b.path))).toEqual([
      "I.1.1", "I.2.2", "I.3.3", "I.4.4", "I.5.5", "I.5.6", "I.6.7", "I.6.8", "I.6.9", "I.6.10",
      "I.7.11", "I.7.12", "I.8.13", "I.9.14", "I.9.15", "I.10.16", "I.11.17", "I.11.18", "I.12.19", "I.13.20",
      "I.13.21", "I.13.22", "I.14.23", "I.15.24", "I.16.25", "I.16.26", "I.17.27", "I.18.28", "I.18.29", "I.19.30",
      "I.20.31",
    ]);
    // Every paragraph has its place: Terence's lines and Augustine on them carry 1.16.26 on, Virgil's line 1.17.27.
    expect(d.places[0].every((p) => p !== null)).toBe(true);
    expect(citeLabel(d, placeAt(d, w, 1, 28)!.path)).toBe("I.16.26");
    expect(citeLabel(d, placeAt(d, w, 1, 32)!.path)).toBe("I.17.27");
  });

  it("show quietly what the text does not print: the chapter where one begins, the section's number", () => {
    // A chapter and its first section begin together; a later section of the chapter alone.
    expect(shownMarks(d, placeAt(d, w, 1, 4))).toEqual([{ level: "chapter", n: 5 }, { level: "section", n: 5 }]);
    expect(shownMarks(d, placeAt(d, w, 1, 5))).toEqual([{ level: "section", n: 6 }]);
    expect(shownMarks(d, placeAt(d, w, 1, 27))).toEqual([]);
    expect(sectionLabel(d, w, 1)).toBe("I");
  });
});

describe("the edition's own numbers, as each work is cited", () => {
  const label = (key: string, n: number, i: number) => {
    const w = read(key);
    const d = divisionsOf(key, w)!;
    return citeLabel(d, placeAt(d, w, n, i)!.path);
  };

  it("read the numbers each file keeps: titles, order, the numbers at a paragraph's head, the edition's headings", () => {
    expect(label("athanasius-the-great/on-the-incarnation", 1, 145)).toBe("54");
    expect(label("athanasius-the-great/against-the-heathen", 6, 11)).toBe("40");
    expect(label("athanasius-the-great/life-of-antony", 2, 57)).toBe("55");
    expect(label("athanasius-the-great/four-discourses-against-the-arians", 1, 31)).toBe("I.9");
    expect(label("athanasius-the-great/on-the-nicene-definition", 1, 87)).toBe("19");
    expect(label("john-chrysostom/on-the-priesthood", 3, 7)).toBe("III.6");
    expect(label("john-of-damascus/exact-exposition-of-the-orthodox-faith", 58, 1)).toBe("III.15");
    expect(label("john-chrysostom/homilies-on-matthew", 15, 7)).toBe("15.2");
    expect(label("john-chrysostom/homilies-on-matthew", 15, 0)).toBe("15.1");
    expect(label("ignatius-of-antioch/epistle-to-the-romans", 5, 0)).toBe("4");
    expect(label("ignatius-of-antioch/epistle-to-the-ephesians", 15, 0)).toBe("14");
    expect(label("leo-the-great/the-tome-of-leo", 5, 0)).toBe("4");
    expect(label("justin-martyr/first-apology", 66, 0)).toBe("66");
    expect(label("basil-the-great/on-the-holy-spirit", 1, 5)).toBe("1.3");
  });

  it("count each work's divisions as its edition prints them", () => {
    const count = (key: string, synopsis = false) => {
      const w = read(key);
      const d = divisionsOf(key, w)!;
      return new Set(begun(d, w).filter((b) => b.synopsis === synopsis).map((b) => atOf(b.path))).size;
    };
    expect(count("athanasius-the-great/life-of-antony")).toBe(94);
    expect(count("athanasius-the-great/on-the-incarnation", true)).toBe(57);
    expect(count("athanasius-the-great/against-the-heathen", true)).toBe(47);
    expect(count("justin-martyr/first-apology")).toBe(68);
    // 142 chapters, each its own section since 1.8 (chapter 61 out of section 60, no second chapter 116).
    expect(count("justin-martyr/dialogue-with-trypho")).toBe(142);
    expect(count("justin-martyr/dialogue-with-trypho", true)).toBe(0);
    expect(count("ignatius-of-antioch/epistle-to-the-ephesians")).toBe(21);
    expect(count("polycarp-of-smyrna/the-martyrdom-of-polycarp")).toBe(22);
    // A hundred chapters: 99 with a section of their own, and Book III's second, which the file
    // runs on inside the first, under the edition's heading for it (below).
    expect(count("john-of-damascus/exact-exposition-of-the-orthodox-faith")).toBe(99);
    expect(count("john-of-damascus/exact-exposition-of-the-orthodox-faith", true)).toBe(1);
    expect(count("john-cassian/institutes")).toBe(268);
  });

  it("set the edition's chapter headings apart from the author's words", () => {
    const key = "athanasius-the-great/on-the-incarnation";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    const first = d.places[0][0]!;
    expect(first.synopsis).toBe(true);
    expect(synopsisChapter(d, w.sections[0].paragraphs[0])).toBe(1);
  });

  // The edition's headings and summaries a file keeps as paragraphs, each a
  // heading and never the author's words (1.9). Until then the rule for two
  // of these works looked for "Chapter I.--" with two hyphens and the files
  // print a dash, so no heading in either was known, and the Arianism page
  // quoted three of them as St Athanasius's own.
  const headings = (key: string) => {
    const w = read(key);
    const d = divisionsOf(key, w)!;
    return d.places.flatMap((sec, s) => sec.flatMap((pl, i) => (pl?.synopsis ? [{ n: w.sections[s].n, i, words: w.sections[s].paragraphs[i], at: citeLabel(d, pl.path) }] : [])));
  };

  it("know every chapter heading of St Athanasius against the Arians, whichever dash the file prints", () => {
    const four = headings("athanasius-the-great/four-discourses-against-the-arians");
    const chapters = four.filter((h) => /^Chapter /.test(h.words));
    // Thirty chapters across Discourses I to III, in order, both dashes among them.
    expect(chapters.map((h) => synopsisChapter(divisionsOf("athanasius-the-great/four-discourses-against-the-arians", read("athanasius-the-great/four-discourses-against-the-arians"))!, h.words))).toEqual(
      Array.from({ length: 30 }, (_, k) => k + 1),
    );
    expect(chapters.some((h) => /^Chapter [IVXLC]+\.--/.test(h.words))).toBe(true);
    expect(chapters.some((h) => /^Chapter [IVXLC]+\.\u2014/.test(h.words))).toBe(true);
    // Discourse IV has no chapters: the edition sums up each run of its sections instead.
    const sums = four.filter((h) => /^§/.test(h.words));
    expect(sums.map((h) => /^(§§?[\d, -]+)\./.exec(h.words)![1])).toEqual(["§§1-5", "§§6, 7", "§8", "§§9, 10", "§§11, 12", "§§13, 14", "§§15-24", "§25", "§§26-36"]);
    expect(sums.every((h) => h.n === 4)).toBe(true);
    expect(four).toHaveLength(39);

    const nicene = headings("athanasius-the-great/on-the-nicene-definition");
    expect(nicene.map((h) => /^Chapter ([IVXLC]+)/.exec(h.words)![1])).toEqual(["I", "II", "III", "IV", "V", "VI", "VII"]);
  });

  it("put a heading where the text under it stands, and leave a section that carries on under one where it was", () => {
    const key = "athanasius-the-great/four-discourses-against-the-arians";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    const one = w.sections.find((x) => x.n === 1)!;
    // Chapter II's heading stands over "5. Now the commencement of Arius's Thalia": it opens I.5.
    const two = one.paragraphs.findIndex((p) => /^Chapter II\./.test(p));
    expect(one.paragraphs[two + 1]).toMatch(/^5\. /);
    expect(label(key, 1, two)).toBe("I.5");
    expect(label(key, 1, two + 1)).toBe("I.5");
    expect(placeAt(d, w, 1, two)?.synopsis).toBe(true);
    expect(placeAt(d, w, 1, two + 1)?.synopsis).toBeUndefined();
    // A chapter that opens in the middle of a section: "22 (continued). ..." under the heading is
    // still I.22, and I.23 begins at its own number. (Read as the next number, the continued words
    // of nine sections would have been cited one section on.)
    const carried = one.paragraphs.findIndex((p) => /^22 \(continued\)\./.test(p));
    expect(carried).toBeGreaterThan(0);
    expect(placeAt(d, w, 1, carried - 1)?.synopsis).toBe(true);
    expect(label(key, 1, carried - 1)).toBe("I.22");
    expect(label(key, 1, carried)).toBe("I.22");
    expect(one.paragraphs[carried + 1]).toMatch(/^23\. /);
    expect(label(key, 1, carried + 1)).toBe("I.23");
    expect(placeAt(d, w, 1, carried + 1)?.begins).toBe(1);
    for (const sec of w.sections) {
      sec.paragraphs.forEach((p, i) => {
        const said = /^(\d+)\.? \(continued\)\./.exec(p);
        if (said) expect(placeAt(d, w, sec.n, i)?.path.at(-1), `${sec.n}:${i} ${p.slice(0, 24)}`).toBe(Number(said[1]));
      });
    }
    // The same in On the Nicene Definition, whose second chapter opens inside section 2.
    const nd = "athanasius-the-great/on-the-nicene-definition";
    const ndw = read(nd);
    const at = ndw.sections[0].paragraphs.findIndex((p) => /^Chapter II\./.test(p));
    expect(ndw.sections[0].paragraphs[at + 1]).not.toMatch(/^\d/);
    expect(label(nd, 1, at)).toBe("2");
    expect(label(nd, 1, at + 1)).toBe("2");
  });

  it("know each Part's summary in On the Councils, and Part III's title where the file keeps it", () => {
    const got = headings("athanasius-the-great/on-the-councils");
    expect(got.map((h) => `${h.n}:${h.words.slice(0, 24)}`)).toEqual([
      "1:Reason why two Councils ",
      "2:Arius's own sentiments; ",
      "2:Part III. On the Symbols",
      "2:We must look at the sens",
    ]);
    // Each stands at the number the text under it begins.
    expect(got.map((h) => h.at)).toEqual(["1", "15", "33", "33"]);
    // And the first words of St Athanasius's own in Part II are the next paragraph's.
    const key = "athanasius-the-great/on-the-councils";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    expect(w.sections[1].paragraphs[1]).toMatch(/^15\. Arius and those with him/);
    expect(placeAt(d, w, 2, 1)?.synopsis).toBeUndefined();
  });

  it("open Book III's second chapter of the Exact Exposition under its heading, inside the first's section", () => {
    const key = "john-of-damascus/exact-exposition-of-the-orthodox-faith";
    const got = headings(key);
    expect(got).toHaveLength(1);
    expect(got[0].words).toMatch(/^Chapter II\. --Concerning the manner in which the Word was conceived/);
    expect(got[0].at).toBe("III.2");
    const w = read(key);
    const d = divisionsOf(key, w)!;
    expect(synopsisChapter(d, got[0].words)).toBe(2);
    // The first chapter's own words, then the second's under its heading.
    expect(label(key, got[0].n, 0)).toBe("III.1");
    expect(label(key, got[0].n, got[0].i + 1)).toBe("III.2");
    // And a link to III.2 has somewhere to land.
    expect(findAt(d, w, [3, 2])).toEqual({ n: got[0].n, i: got[0].i });
  });

  it("number St Justin's Dialogue by the edition's chapters where its file runs out of step", () => {
    const key = "justin-martyr/dialogue-with-trypho";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    // In step to chapter 60, and from chapter 117 on.
    expect(label(key, 56, 2)).toBe("56");
    expect(label(key, 60, 3)).toBe("60");
    expect(label(key, 124, 0)).toBe("124");
    expect(label(key, 142, 0)).toBe("142");
    // Chapter 61 is its own section (143), read right after section 60, and section 60 ends with chapter 60.
    expect(w.sections.find((s) => s.n === 60)!.paragraphs).toHaveLength(4);
    expect(w.sections[w.sections.findIndex((s) => s.n === 60) + 1].n).toBe(143);
    expect(label(key, 143, 0)).toBe("61");
    expect(sectionLabel(d, w, 143)).toBe("61");
    expect(w.sections.some((s) => s.paragraphs.some((p) => /^Chapter [IVXLC]+—/.test(p)))).toBe(false);
    // Sections 61 to 114 hold chapters 62 to 115, and 115 holds chapter 116, once.
    expect(label(key, 61, 0)).toBe("62");
    expect(label(key, 99, 0)).toBe("100");
    expect(w.sections.find((s) => s.n === 99)!.title).toBe("In what sense Christ is [called] Jacob, and Israel, and Son of Man");
    expect(label(key, 114, 0)).toBe("115");
    expect(label(key, 115, 0)).toBe("116");
    expect(w.sections.some((s) => s.n === 116)).toBe(false);
    expect(label(key, 117, 0)).toBe("117");
    expect(sectionLabel(d, w, 99)).toBe("100");
    // Every chapter once.
    const chapters = w.sections.map((s) => sectionLabel(d, w, s.n));
    expect(new Set(chapters).size).toBe(142);
  });

  it("number Cassian's books On the Incarnation as a work of their own, the Conferences their 22 conferences only", () => {
    const conferences = read("john-cassian/conferences");
    const dc = divisionsOf("john-cassian/conferences", conferences)!;
    // Conference 24, Chapter 26 is the last; 12 and 22 are not in this edition.
    expect(sectionLabel(dc, conferences, conferences.sections.at(-1)!.n)).toBe("24.26");
    const parts = new Set(conferences.sections.map((s) => sectionLabel(dc, conferences, s.n)?.split(".")[0]));
    expect([...parts].map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24]);
    // Conference 5, Chapter 18, which the edition prints with no title, is numbered all the same.
    expect(sectionLabel(dc, conferences, 110)).toBe("5.18");

    const key = "john-cassian/on-the-incarnation";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    // The Preface, then seven books: 6, 7, 16, 13, 15, 23 and 31 chapters.
    expect(w.sections[0].title).toBe("Preface");
    expect(d.places[0].every((p) => p === null)).toBe(true);
    const chapters = [0, 0, 0, 0, 0, 0, 0];
    for (const s of w.sections.slice(1)) chapters[Number(sectionLabel(d, w, s.n)!.split(".")[0]) - 1] += 1;
    expect(chapters).toEqual([6, 7, 16, 13, 15, 23, 31]);
    expect(sectionLabel(d, w, 2)).toBe("1.1");
    expect(sectionLabel(d, w, 112)).toBe("7.31");
  });

  it("set St. Leo's translator's headings apart, and cite his Nativity sermons by sermon and chapter", () => {
    const key = "leo-the-great/sermons-on-the-nativity";
    const w = read(key);
    const d = divisionsOf(key, w)!;
    const first = w.sections[0];
    expect(first.paragraphs[0]).toBe("I. All share in the joy of Christmas.");
    expect(placeAt(d, w, first.n, 0)?.synopsis).toBe(true);
    expect(synopsisChapter(d, first.paragraphs[2])).toBe(2);
    expect(label(key, first.n, 1)).toBe("XXI.1");
    expect(label(key, first.n, 3)).toBe("XXI.2");
    // The chapters start again in the next sermon.
    expect(label(key, w.sections[1].n, 1)).toBe("XXII.1");
    // The seven the volume prints: XXV is not among them.
    expect(w.sections.map((s) => sectionLabel(d, w, s.n))).toEqual(["XXI", "XXII", "XXIII", "XXIV", "XXVI", "XXVII", "XXVIII"]);
  });
});

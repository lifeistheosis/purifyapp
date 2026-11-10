// St Cyril on John: each section is named by the verse he is expounding
// there (1.9, F-49, quick win 14A).
//
// The ingest (scripts/ingest-cyril-john.mjs) named a section by the first
// italic quotation of John in it. Cyril quotes the whole Gospel as he goes,
// so a section of Book 1 on "In the beginning was the Word" that answers
// Eunomius with John 3:35 was "Book 1, on John 3:35", and 505 of the 1,066
// titles named a verse he quotes in passing, back or forward, rather than
// the one he is on. The rail said "Book 2, on John 1:3" of a page on 5:30,
// and a heresy page and two Theology pages copied places that were wrong.
//
// On 2026-11-10 the titles were set from the lemmas of the printed
// commentary (LFC 43 and 48, tertullian.org's transcription): the verse in
// force where each section begins, each lemma verified against the
// Scripture the app ships (scripts/lib/lemma-verify.mjs). A title already
// inside the passage being expounded was kept. Only titles changed: no
// paragraph moved and no section was renumbered, so no reader's mark moved.
// The rail's places (scripts/place-commentary.mjs) and every copy of a
// place follow the titles.
//
// What a reader would notice if this broke: a place under a Father's words
// that names a verse he is not writing on, and a contents that runs back
// and forth through the Gospel.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")) as T;

type Section = { n: number; title: string; paragraphs: string[] };
const WORK = read<{ sections: Section[] }>("data/saints/cyril-of-alexandria/commentary-on-john.json");
const TITLE = new Map(WORK.sections.map((s) => [s.n, s.title]));

const PLACE = /^Book (\d+), (?:Preface|on John (\d+):(\d+))$/;
const at = (c: number, v: number) => c * 1000 + v;
function place(title: string): { book: number; ord: number | null } {
  const m = PLACE.exec(title);
  if (!m) throw new Error(`not a place: ${title}`);
  return { book: Number(m[1]), ord: m[2] ? at(Number(m[2]), Number(m[3])) : null };
}

/** The verses of John the app carries, chapter by chapter. */
const JOHN = new Map<number, Set<number>>();
for (const f of fs.readdirSync(path.join(ROOT, "data/bible/john")).filter((x) => x.endsWith(".json"))) {
  const doc = read<{ chapter: number; verses: { n: number }[] }>(`data/bible/john/${f}`);
  JOHN.set(doc.chapter, new Set(doc.verses.map((v) => v.n)));
}

/**
 * The stretch of John each book covers, as the printed commentary divides
 * it. Book 3 opens on the verse Book 2 closed with ("Our second book then
 * ended with ..."), and Books 7 and 8 are fragments.
 */
const BOOKS: Record<number, [number, number]> = {
  1: [at(1, 1), at(1, 28)],
  2: [at(1, 29), at(5, 34)],
  3: [at(5, 34), at(6, 37)],
  4: [at(6, 38), at(7, 24)],
  5: [at(7, 25), at(8, 43)],
  6: [at(8, 44), at(10, 17)],
  7: [at(10, 18), at(12, 2)],
  8: [at(12, 3), at(12, 48)],
  9: [at(12, 49), at(14, 20)],
  10: [at(14, 21), at(16, 13)],
  11: [at(16, 14), at(18, 27)],
  12: [at(18, 24), at(21, 25)],
};

/**
 * Where the contents steps back, and why. Before the relabel it stepped back
 * 284 times, once for every title anchored to a quotation.
 */
const STEPS_BACK = new Map<number, string>([
  [138, "Cyril's second reading of the cleansing of the Temple: he quotes John 2:14 again after 2:16"],
  [359, "two titles inside one printed passage, 6:38 and 6:39, in the order the sections hold them"],
  [825, "two titles inside one printed passage, 14:5 and 14:6"],
  [968, "two titles inside one printed passage, 17:6 to 17:8"],
]);

describe("St Cyril on John: each section names the verse he is on", () => {
  it("names a verse of John the app carries, or Book 1's Preface", () => {
    const bad: string[] = [];
    for (const s of WORK.sections) {
      const m = PLACE.exec(s.title);
      if (!m) bad.push(`${s.n}: ${s.title}`);
      else if (m[2] && !JOHN.get(Number(m[2]))?.has(Number(m[3]))) bad.push(`${s.n}: ${s.title} (no such verse)`);
      else if (!m[2] && (Number(m[1]) !== 1 || s.n > 4)) bad.push(`${s.n}: ${s.title} (only Book 1 opens with a preface)`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("keeps each book inside the stretch of John it covers", () => {
    const out: string[] = [];
    for (const s of WORK.sections) {
      const { book, ord } = place(s.title);
      if (ord === null) continue;
      const [from, to] = BOOKS[book];
      if (ord < from || ord > to) out.push(`${s.n}: ${s.title}`);
    }
    expect(out, out.join("\n")).toEqual([]);
  });

  it("runs forward through the Gospel within each book, but where named", () => {
    const back: number[] = [];
    let prev: { book: number; ord: number | null } | null = null;
    for (const s of WORK.sections) {
      const here = place(s.title);
      if (prev && prev.book === here.book && prev.ord !== null && here.ord !== null && here.ord < prev.ord) back.push(s.n);
      prev = here;
    }
    expect(back).toEqual([...STEPS_BACK.keys()]);
  });

  it("shows none of the edition's table of chapters as his words", () => {
    // Book 5's table of chapters ("3. That no work of Jewish might was the
    // Suffering on the Cross ...; on the words, ...") was read in as the first
    // four paragraphs of section 453, and copied onto the rail at John 7:39.
    // They are empty slots now, so no reader's mark moves (F-49's way with an
    // edition's matter), and the section opens with the book's first lemma.
    const entries: string[] = [];
    for (const s of WORK.sections)
      s.paragraphs.forEach((p, i) => {
        if (/^\d{1,2}\. That\b[\s\S]*\bon the words\b/.test(p)) entries.push(`${s.n}/${i}: ${p.slice(0, 50)}`);
      });
    expect(entries, entries.join("\n")).toEqual([]);
    const s453 = WORK.sections.find((s) => s.n === 453)!;
    expect(s453.paragraphs.slice(0, 4)).toEqual(["", "", "", ""]);
    expect(s453.paragraphs.find((p) => p !== "")).toMatch(/^25 Some therefore of them of Jerusalem said/);
    const rail = read<Record<string, { at?: { section?: number }; text?: string }[]>>("data/bible/commentary/john/7.json");
    const copy = Object.values(rail).flat().find((n) => n.at?.section === 453);
    expect(copy?.text).toMatch(/^25 Some therefore of them of Jerusalem said/);
  });

  it("keeps its sections in order and numbered once", () => {
    const ns = WORK.sections.map((s) => s.n);
    expect(new Set(ns).size).toBe(ns.length);
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
    expect(WORK.sections.length).toBe(1066);
  });
});

describe("a copy of a place says what the section's title says", () => {
  type Cite = { kind?: string; saint?: string; work?: string; section?: number };
  type Node = Record<string, unknown> & { reference?: unknown; cite?: Cite; saintSlug?: unknown; workSlug?: unknown; sectionN?: unknown; gloss?: unknown };
  /** Every object in a JSON file, however deep. */
  function* objects(v: unknown): Generator<Node> {
    if (Array.isArray(v)) for (const x of v) yield* objects(x);
    else if (v && typeof v === "object") {
      yield v as Node;
      for (const x of Object.values(v)) yield* objects(x);
    }
  }
  const files = (dir: string) =>
    fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json")).map((f) => `${dir}/${f}`);

  it("a Theology page's reference to Cyril on John is the section's title", () => {
    const wrong: string[] = [];
    let seen = 0;
    for (const f of files("data/theology")) {
      for (const o of objects(read<unknown>(f))) {
        if (o.cite?.saint !== "cyril-of-alexandria" || o.cite?.work !== "commentary-on-john" || typeof o.reference !== "string") continue;
        seen++;
        const title = TITLE.get(Number(o.cite.section));
        if (o.reference !== title) wrong.push(`${f}: "${o.reference}", section ${o.cite.section} is "${title}"`);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("a gloss that names its verse names the section's verse", () => {
    const wrong: string[] = [];
    let seen = 0;
    const check = (where: string, sectionN: number, gloss: string) => {
      const m = /^On John (\d+:\d+):/.exec(gloss);
      if (!m) return;
      seen++;
      const title = TITLE.get(sectionN) ?? "";
      if (!title.endsWith(`on John ${m[1]}`)) wrong.push(`${where}: "${gloss.slice(0, 40)}", section ${sectionN} is "${title}"`);
    };
    const conciliar = fs.readFileSync(path.join(ROOT, "lib/heresies/conciliar.ts"), "utf8");
    const entry = /saintSlug: "cyril-of-alexandria",\s*workSlug: "commentary-on-john",\s*sectionN: (\d+),[^}]*?gloss: "([^"]*)"/g;
    for (const m of conciliar.matchAll(entry)) check("lib/heresies/conciliar.ts", Number(m[1]), m[2]);
    for (const f of files("data/topics")) {
      for (const o of objects(read<unknown>(f))) {
        if (o.saintSlug === "cyril-of-alexandria" && o.workSlug === "commentary-on-john" && typeof o.gloss === "string") check(f, Number(o.sectionN), o.gloss);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("the reading room's two Book 12 themes hold only the chapters their words name", () => {
    const entries = fs.readFileSync(path.join(ROOT, "lib/reading/entries.ts"), "utf8");
    const block = entries.slice(entries.indexOf('"cyril-of-alexandria/commentary-on-john": {'));
    const themes = [...block.slice(0, block.indexOf("review:")).matchAll(/t\("(\w+)", "Book 12 on John ([^:"]+:?\d*)(?: to (\d+))?:[^"]*", \{\s*sections: \[\[(\d+), (\d+)\]\]/g)];
    expect(themes.map((m) => m[1])).toEqual(["holyWeek", "pascha"]);
    for (const [, name, fromText, toChapter, a, b] of themes) {
      const [fc, fv] = fromText.split(":").map(Number);
      const lo = at(fc, fv || 1);
      const hi = at(toChapter ? Number(toChapter) : fc, 99);
      const outside = WORK.sections
        .filter((s) => s.n >= Number(a) && s.n <= Number(b))
        .filter((s) => { const p = place(s.title).ord; return p === null || p < lo || p > hi; })
        .map((s) => `${name}: ${s.n} ${s.title}`);
      expect(outside, outside.join("\n")).toEqual([]);
    }
  });
});

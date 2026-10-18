// Each note of the Bible's commentary names where it stands in the library
// (1.8, scripts/place-commentary.mjs).
//
// The owner, 2026-10-17: "whenever it quotes a father, I want that quote
// linked specifically to their book." For the twenty-three works the library
// holds in the very edition the commentary was cut from, every note carries
// `at`, the paragraph of the library's copy where it begins, and the rail
// names that place by the work's own divisions and opens it. These tests
// hold every `at` to the note's own words and to the work's numbering, and
// every note of those works to having one.
//
// What a reader would notice if this broke: a note's line naming the wrong
// homily, or a link that opens a paragraph the note does not begin.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COMMENTARY_WORKS, editionOfCitation, noteCite, type CommentaryAt } from "@/lib/bible/commentaryWorks";
import { placeOf } from "@/lib/citations/cite";
import { SCHEMES, divisionsOf, placeAt, placeWords, type WorkLike } from "@/lib/saints/divisions";
import { SAINTS } from "@/lib/saints/saints";

// The script's own table of which notes come from which work.
import { WORKS } from "../../../scripts/place-commentary.mjs";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Note = { author: string; work: string; citation: string; at?: CommentaryAt; text: string };

const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const NOTES: { where: string; note: Note }[] = [];
const dir = path.join(ROOT, "data", "bible", "commentary");
for (const book of fs.readdirSync(dir)) {
  for (const f of fs.readdirSync(path.join(dir, book))) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, book, f), "utf8")) as Record<string, Note[]>;
    for (const [v, notes] of Object.entries(c)) notes.forEach((note, i) => NOTES.push({ where: `${book}/${f} v${v}[${i}]`, note }));
  }
}

const files = new Map<string, WorkLike>();
function work(key: string): WorkLike {
  if (!files.has(key)) {
    const [saint, slug] = key.split("/");
    files.set(key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${slug}.json`), "utf8")) as WorkLike);
  }
  return files.get(key)!;
}

const fromLibrary = (n: Note) => (WORKS as [string, RegExp, string, string][]).find(([a, re]) => a === n.author && re.test(n.work));

describe("a commentary note cut from a work the library holds", () => {
  it("names where it begins in the library, every one of them", () => {
    const of = NOTES.filter(({ note }) => fromLibrary(note));
    expect(of.length).toBeGreaterThan(4_700);
    // None missing, but where the work's file gives the section its heading
    // names twice (Cyril on Luke, Sermons 29 and 96), which no number can open.
    const twice = (key: string, n: number) => work(key).sections.filter((s) => s.n === n).length > 1;
    const missing = of
      .filter(({ note }) => !note.at)
      .filter(({ note }) => {
        const n = Number(/(\d+)$/.exec(note.work)?.[1]);
        return !twice(fromLibrary(note)![2], n);
      })
      .map(({ where }) => where);
    expect(missing).toEqual([]);
    expect(of.filter(({ note }) => !note.at).length).toBeLessThanOrEqual(7);
    // And only those: no other note claims a place in the library.
    const stray = NOTES.filter(({ note }) => note.at && !fromLibrary(note)).map(({ where }) => where);
    expect(stray).toEqual([]);
  });

  it("begins where it says: its own words open in that paragraph, in the work its heading names", () => {
    const wrong: string[] = [];
    for (const { where, note } of NOTES) {
      if (!note.at) continue;
      const row = fromLibrary(note)!;
      if (note.at.work !== row[2]) wrong.push(`${where}: ${note.at.work}`);
      const w = work(note.at.work);
      const section = w.sections.find((s) => s.n === note.at!.section);
      const paragraph = section?.paragraphs[note.at.paragraph];
      if (paragraph === undefined) {
        wrong.push(`${where}: no paragraph s${note.at.section} p${note.at.paragraph}`);
        continue;
      }
      const first = note.text
        .split(/\n\s*\n/)
        .map(words)
        .filter((p) => p.split(" ").length >= 8)
        .slice(0, 4)
        .map((p) => p.split(" ").slice(0, 14).join(" "));
      if (!first.some((anchor) => words(paragraph).includes(anchor))) wrong.push(`${where}: not at s${note.at.section} p${note.at.paragraph}`);
    }
    expect(wrong).toEqual([]);
  });

  it("says its place by the work's own divisions, as they stand now", () => {
    const stale: string[] = [];
    for (const { where, note } of NOTES) {
      if (!note.at) continue;
      const w = work(note.at.work);
      const d = divisionsOf(note.at.work, w);
      const section = w.sections.find((s) => s.n === note.at!.section)!;
      const place = d ? placeAt(d, w, note.at.section, note.at.paragraph) : null;
      const said = d && place ? placeWords(d, place.path, section.title, placeOf) : { place: placeOf(section.title) };
      if (said.place !== note.at.place || (said as { mark?: string }).mark !== note.at.mark) stale.push(`${where}: ${note.at.place} ${note.at.mark ?? ""} is now ${said.place} ${(said as { mark?: string }).mark ?? ""}`);
    }
    // Run node scripts/place-commentary.mjs --apply after a work's divisions change.
    expect(stale.slice(0, 20)).toEqual([]);
  });

  it("opens that paragraph, under the work's own title and edition", () => {
    for (const [key, w] of Object.entries(COMMENTARY_WORKS)) {
      const [saint, slug] = key.split("/");
      expect(SAINTS.find((s) => s.slug === saint)?.works.find((x) => x.slug === slug)?.title, key).toBe(w.title);
      if (SCHEMES[key]) expect(w.edition, key).toBe(SCHEMES[key].edition);
    }
    const sample = NOTES.find(({ note }) => note.at?.work === "john-chrysostom/homilies-on-matthew")!.note;
    const cite = noteCite(sample);
    expect(cite.kind).toBe("father");
    if (cite.kind === "father") {
      expect(cite.href).toBe(`/saints/john-chrysostom/homilies-on-matthew#p-${sample.at!.section}-${sample.at!.paragraph}`);
      expect(cite.edition).toBe("NPNF I 10");
    }
  });
});

describe("a reading plan's saying of the Fathers", () => {
  type Saying = { text: string; author: string; work: string; citation: string; at?: CommentaryAt };
  const sayings = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "plans", "sayings.json"), "utf8")) as Record<string, Record<string, Saying>>;
  const all = Object.entries(sayings).flatMap(([plan, days]) => Object.entries(days).map(([day, s]) => ({ where: `${plan} day ${day}`, s })));

  it("names where its words stand in the library, where the library holds the work", () => {
    const placed = all.filter(({ s }) => s.at);
    expect(placed.length).toBeGreaterThanOrEqual(98);
    for (const { where, s } of placed) {
      const w = work(s.at!.work);
      const paragraph = w.sections.find((x) => x.n === s.at!.section)?.paragraphs[s.at!.paragraph];
      expect(paragraph, where).toBeTypeOf("string");
      expect(words(paragraph!).includes(words(s.text)), where).toBe(true);
      expect(COMMENTARY_WORKS[s.at!.work], where).toBeDefined();
    }
    // The rest are from works the library does not hold: St Augustine on the Psalms, the Catena Aurea.
    for (const { where, s } of all.filter(({ s }) => !s.at)) expect(s.work, where).toMatch(/^(?:Expositions on the Book of Psalms|Catena Aurea)/);
  });

  it("is shown with the line every quotation in the app has", () => {
    const src = fs.readFileSync(path.join(ROOT, "components/plans/PlanSaying.tsx"), "utf8");
    expect(src).toContain("<SourceLine cite={noteCite(saying)} />");
  });
});

describe("every other commentary note", () => {
  it("still shows its own heading and edition under it", () => {
    const other = NOTES.find(({ note }) => !note.at && /^Catena Aurea/.test(note.work))!.note;
    const cite = noteCite(other);
    expect(cite.kind).toBe("text");
    expect(editionOfCitation("NPNF1-08")).toBe("NPNF I 8");
    expect(editionOfCitation("NPNF2-07")).toBe("NPNF II 7");
    expect(editionOfCitation("ANF07")).toBe("ANF 7");
    expect(editionOfCitation("Catena Aurea (Oxford, Rivington, 1842)")).toBe("Catena Aurea (Oxford, Rivington, 1842)");
  });

  it("is shown with its line on the rail and in the phone's sheet", () => {
    for (const file of ["components/bible/StudyRail.tsx", "components/bible/MobileCommentarySheet.tsx"]) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf8");
      expect(src, file).toContain("<SourceLine cite=");
      expect(src, file).toContain("noteCite(");
    }
  });
});

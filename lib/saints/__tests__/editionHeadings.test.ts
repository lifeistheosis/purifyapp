// An edition's headings and summaries are never the author's words (1.9).
//
// The Fathers' works are read from public-domain editions, and some files
// keep what the editor printed over a chapter as a paragraph of the text: the
// NPNF's "Chapter I." with a dash, a title and a summary over St Athanasius;
// "§54." and a summary over On the Incarnation; "§§1-5." over a run of
// sections; a Part's contents strung on semicolons. The library knows each
// as a heading (lib/saints/divisions.ts, `synopsis`), which is what keeps it
// out of a quotation (lib/citations/resolve.ts) and sets it apart in the
// reader (components/saints/WritingReader.tsx).
//
// It knew them by a pattern, and the pattern fell out of step with the
// files: the rule for two works looked for "Chapter I.--" with two hyphens,
// the works were read again from their edition on 2026-10-23 and print its
// dash, and nothing failed. For eighteen days 34 of 37 headings were drawn as
// St Athanasius's paragraphs and three were quoted as his on the Arianism
// page. So this reads every work in the library by how a heading reads, not
// by any work's rule, and holds each one found to being known.
//
// What a reader would notice if this broke: an editor's summary of a chapter
// in italics under a Father's face, with his name on the line beneath it.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCHEMES, divisionsOf, type WorkLike } from "@/lib/saints/divisions";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SAINTS_DIR = path.join(ROOT, "data", "saints");

type Section = { n: number; title: string; paragraphs: string[]; voice?: string };
const works: { key: string; sections: Section[] }[] = [];
for (const saint of fs.readdirSync(SAINTS_DIR)) {
  const dir = path.join(SAINTS_DIR, saint);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as { sections?: Section[] };
    if (Array.isArray(parsed.sections)) works.push({ key: `${saint}/${file.replace(/\.json$/, "")}`, sections: parsed.sections });
  }
}

/**
 * How an edition's heading reads, whatever work it is in: a chapter's number
 * and a dash (either dash, with or without a space before it), or a section
 * sign and its number or run of numbers.
 */
const READS_AS_HEADING = /^(?:Chapter [IVXLC]+\.\s?(?:--|—)|§§?\d+(?:(?:-|, )\d+)*\.\s)/;

/**
 * How an edition's summary reads where it has no number at all: the
 * paragraph a section opens on, a run of short clauses strung on semicolons
 * ("Arius's own sentiments; his Thalia and Letter to S. Alexander;
 * corrections by Eusebius and others; ..."). Words under a number of their
 * own (a mark, a numeral, a verse) are the text's.
 */
function readsAsSummary(p: string): boolean {
  const t = p.trim();
  if (!t || /^(?:\d|[IVXLC]+\.\s|["“‘])/.test(t)) return false;
  const words = t.split(/\s+/).length;
  const clauses = (t.match(/;/g) ?? []).length + 1;
  return clauses >= 4 && words <= 110 && words / clauses <= 11;
}

const known = (key: string, sections: Section[]) => {
  const d = divisionsOf(key, { sections } as WorkLike);
  return (s: number, i: number) => Boolean(d?.places[s]?.[i]?.synopsis);
};

describe("an edition's headings, across the library", () => {
  it("reads the library", () => {
    expect(works.length).toBeGreaterThan(150);
  });

  it("are each known as a heading: every paragraph that reads as one, in every work", () => {
    const missed: string[] = [];
    let found = 0;
    for (const { key, sections } of works) {
      let is: ReturnType<typeof known> | null = null;
      sections.forEach((sec, s) =>
        sec.paragraphs.forEach((p, i) => {
          if (!READS_AS_HEADING.test(p)) return;
          found++;
          is ??= known(key, sections);
          if (!is(s, i)) missed.push(`${key} section ${sec.n}, paragraph ${i}: "${p.slice(0, 60)}"`);
        }),
      );
    }
    // The Athanasius works and On the Incarnation's fifty-seven: if this falls to nothing, the reading has stopped.
    expect(found).toBeGreaterThan(140);
    expect(
      missed,
      "These read as an edition's own heading and the library takes them for the author's words. Give the work's scheme a rule that knows them (lib/saints/divisions.ts: synopsis, summary, or a title's heading).",
    ).toEqual([]);
  });

  it("and so is a summary with no number, where a section opens on one", () => {
    const missed: string[] = [];
    let found = 0;
    for (const { key, sections } of works) {
      let is: ReturnType<typeof known> | null = null;
      sections.forEach((sec, s) => {
        // Scripture is the app's own Bible, verse for verse, and has no
        // editor's summary; a verse of names strung on semicolons (Acts 20:4,
        // 1 Corinthians 1:12, in December's saints) only reads like one.
        if (sec.voice === "editorial" || sec.voice === "scripture") return;
        const first = sec.paragraphs.findIndex((p) => p.trim() !== "");
        if (first < 0 || !readsAsSummary(sec.paragraphs[first])) return;
        found++;
        is ??= known(key, sections);
        if (!is(s, first)) missed.push(`${key} section ${sec.n}: "${sec.paragraphs[first].slice(0, 60)}"`);
      });
    }
    // On the Councils' two Parts today.
    expect(found).toBeGreaterThan(0);
    expect(
      missed,
      "A section opens on what reads as the edition's summary of it, and the library takes it for the author's words. Name it in the work's scheme (lib/saints/divisions.ts, summary.words), or, if the words are the author's, say why here.",
    ).toEqual([]);
  });

  it("only a work with a scheme can know one, so none without a scheme has any", () => {
    for (const { key, sections } of works) {
      if (SCHEMES[key]) continue;
      const any = sections.some((sec) => sec.paragraphs.some((p) => READS_AS_HEADING.test(p)));
      expect(any, `${key} has no scheme, and a paragraph that reads as an edition's heading`).toBe(false);
    }
  });
});

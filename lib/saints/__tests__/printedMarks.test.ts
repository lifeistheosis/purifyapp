// The Fathers' quotation marks as the printed page has them, and the lines
// the import dropped (1.9, quick win 18, F-49).
//
// In October an import lost most opening quotation marks, and a pass put
// them back by finding each beside the same words in CCEL's transcription.
// It left about 72 it could not settle. Read again in 1.9 against the
// printed volumes themselves (the NPNF scans on archive.org, every copy's
// own OCR, and the page image where that was unclear), they came to 144
// marks across the library:
// - para-start: double openers lost at a paragraph's start (Acts, John,
//   Hebrews);
// - antony: in both copies of the Life of Antony, his address (sections 16
//   to 43) and his reply to the philosophers (77 to 80) open each paragraph
//   with an opening mark and close only at the end, as the print sets them;
//   the closers CCEL put at the end of 14 paragraphs are not on the page;
// - 2cor: single marks in the Homilies on 2 Corinthians, read against both
//   copies (CCEL's transcription has no single opening marks at all);
// - rail-15: 19 inner openers the rail's copies had and the library had
//   lost, every one on the page;
// - ccel-differs and other: where CCEL's words differed from ours, because
//   the import had dropped every CCEL line that began with a link marker
//   ("[189] talk of ..."), taken for a footnote. 32 lines of words (about
//   380) and the closing punctuation of 4 more are back (lost-line,
//   punctuation), each found on the page.
// And Acts, Homily 28, paragraph 10 was the second line of an editor's
// footnote: an empty slot now, like the rest.
//
// Nothing else moved: every edit stands inside its paragraph, so no reader's
// mark moves, and every copy of a changed paragraph on the Bible's rail and
// in the plans' sayings was given the same words: no rail note that stood
// whole in its section stopped doing so, and 15 more now do. Where the page
// is itself inconsistent (a printer's slip) it is followed as printed, on
// the owner's standing yes (F-49): John, Homily 21:2 and 2 Corinthians,
// Homilies 3:19, 13:14, 17:24 and 28:1 (printersSlip); 2 Corinthians 8:17
// already stood as printed. Three small word differences from the print,
// read beside the marks, follow it too (word, 2026-11-11): 2 Corinthians,
// Homily 23:27, "For what, if even ye would give?"; Acts, Homily 38:3, "not a
// partial (work)"; 1 Corinthians, Homily 35:17, "[3.]".

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Edit = { work: string; n: number; i: number; group: string; now: string; not?: string };
const EDITS = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "printed-marks.json"), "utf8")) as Edit[];

const works = new Map<string, Map<number, string[]>>();
function paragraph(work: string, n: number, i: number): string | undefined {
  if (!works.has(work)) {
    const [saint, slug] = work.split("/");
    const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${slug}.json`), "utf8")) as {
      sections: { n: number; paragraphs: string[] }[];
    };
    works.set(work, new Map(file.sections.map((s) => [s.n, s.paragraphs])));
  }
  return works.get(work)!.get(n)?.[i];
}

describe("the Fathers' quotation marks, as the printed page has them", () => {
  it("holds every mark and every restored line read against the page", () => {
    expect(EDITS.length).toBe(171);
    const wrong: string[] = [];
    for (const e of EDITS) {
      const p = paragraph(e.work, e.n, e.i);
      const where = `${e.work} ${e.n}:${e.i} (${e.group})`;
      if (p === undefined) wrong.push(`${where}: no such paragraph`);
      else if (e.now === "" ? p !== "" : !p.includes(e.now)) wrong.push(`${where}: lacks ${JSON.stringify(e.now.slice(0, 40))}`);
      else if (e.not && p.includes(e.not)) wrong.push(`${where}: still has ${JSON.stringify(e.not.slice(0, 40))}`);
    }
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("opens each paragraph of St Antony's address with a mark and closes it once, in both copies", () => {
    for (const work of ["athanasius-the-great/life-of-antony", "anthony-the-great/life-of-antony"]) {
      const [saint, slug] = work.split("/");
      const file = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", saint, `${slug}.json`), "utf8")) as {
        sections: { paragraphs: string[] }[];
      };
      const bySection = new Map<number, string>();
      for (const s of file.sections) {
        for (const p of s.paragraphs) {
          const m = /^(\d+)\.\s/.exec(p);
          if (m) bySection.set(Number(m[1]), p);
        }
      }
      // The address runs from §16, whose own words open it, to §43; the reply
      // to the philosophers from inside §77 to §80.
      for (const k of [...Array.from({ length: 27 }, (_, j) => 17 + j), 78, 79, 80]) {
        expect(bySection.get(k), `${work} §${k}`).toMatch(new RegExp(`^${k}\\. ‘`));
      }
      for (const k of [26, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 77]) {
        expect(bySection.get(k)?.trimEnd().endsWith("’"), `${work} §${k} closes where the print runs on`).toBe(false);
      }
      expect(bySection.get(43)?.trimEnd().endsWith("’"), `${work} §43 closes the address`).toBe(true);
    }
  });
});

// F-49 named three places as open after quick win 18; read again against the
// page (2026-11-11), all three were already as printed, and nothing in the
// text changed. Held here so the record and the text cannot drift apart again.
describe("the places F-49 last named, as the page has them", () => {
  it("John, Homily 11:7: a comma after the first \"was made\" (NPNF I 14, p. 39), the other two as printed", () => {
    const p = paragraph("john-chrysostom/homilies-on-john", 11, 7) ?? "";
    expect(p).toContain('the expression, "was made," only that you should not suppose');
    expect(p).toContain("from the word ‘was made’; I spoke not");
    expect(p).toContain("for It was made, so as He knoweth.");
  });

  it("John, Homily 70 and Hebrews, Homily 19: the print's [1.] ends paragraph 0, where both works set every number", () => {
    for (const [work, n, opens] of [
      ["john-chrysostom/homilies-on-john", 70, "“Be ye imitators of me,”"],
      ["john-chrysostom/homilies-on-hebrews", 19, "“Having therefore, brethren, boldness"],
    ] as const) {
      expect(paragraph(work, n, 0)?.trimEnd().endsWith("[1.]"), `${work} ${n}:0`).toBe(true);
      expect(paragraph(work, n, 1)?.startsWith(opens), `${work} ${n}:1`).toBe(true);
    }
  });
});

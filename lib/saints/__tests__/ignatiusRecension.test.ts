// St Ignatius's seven letters are the shorter recension, as their source line
// says (F-49 in docs/audit/findings.yaml). Checked paragraph by paragraph on
// 2026-11-09 against ANF vol. 1, which prints the shorter and the longer
// recension side by side: CCEL's transcription, each paragraph's eight-word
// runs measured against both, and the two columns read on two 1885 scans
// (archive.org antenicenefather0001reva and apostolicfathers0000acle). Every
// paragraph followed the shorter text but Ephesians 20, which was the longer
// recension's chapter ("being under the guidance of the Comforter ... but a
// cleansing remedy driving away evil"); it is now the shorter's, word for
// word, in the same place, so no reader's mark moves.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const DIR = "data/saints/ignatius-of-antioch";
const LETTERS = [
  "epistle-to-the-ephesians",
  "epistle-to-the-magnesians",
  "epistle-to-the-trallians",
  "epistle-to-the-romans",
  "epistle-to-the-philadelphians",
  "epistle-to-the-smyrnaeans",
  "epistle-to-polycarp",
];

type Letter = { source: string; sections: { n: number; title: string; paragraphs: string[] }[] };
const read = (slug: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), "utf8")) as Letter;

describe("St Ignatius's letters, the shorter recension", () => {
  it("say so in their source line", () => {
    for (const slug of LETTERS) expect(read(slug).source, slug).toContain("Shorter (authentic) recension");
  });

  it("print Ephesians 20 as the shorter recension has it", () => {
    const at = read("epistle-to-the-ephesians").sections.find((s) => s.n === 21);
    expect(at?.title).toBe("Promise of another letter");
    expect(at?.paragraphs).toHaveLength(1);
    expect(at?.paragraphs[0]).toMatch(/^If Jesus Christ shall graciously permit me through your prayers/);
    expect(at?.paragraphs[0]).toContain(
      "breaking one and the same bread, which is the medicine of immortality, and the antidote to prevent us from dying, but which causes that we should live for ever in Jesus Christ.",
    );
  });

  it("carry none of the longer recension's additions that were found in them", () => {
    const LONGER = ["under the guidance of the Comforter", "a cleansing remedy driving away evil", "Exhortations to stedfastness and unity"];
    for (const slug of LETTERS) {
      for (const s of read(slug).sections) {
        const text = [s.title, ...s.paragraphs].join(" ");
        for (const phrase of LONGER) expect(text, `${slug} section ${s.n}`).not.toContain(phrase);
      }
    }
  });
});

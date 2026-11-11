// The short lines an edition sets between paragraphs, laid over the text
// (1.9, quick win 16, F-49).
//
// The 2026-08-15 import of St Cyril on Luke (scripts/ingest-cyril-luke.mjs)
// kept only paragraphs longer than 40 characters, so it dropped every short
// line of the transcription: the words of the Gospel a passage expounds, a
// few of the edition's headings, the editor's notes of where a fragment
// comes from, the stars of a gap, and with them page furniture, the
// translator's footnotes and each sermon's bare number. Putting the lines
// back as paragraphs would move every later paragraph's number, which
// readers' highlights, notes and bookmarks are kept by. So they stand beside
// the paragraphs as `lines` (lib/saints/load.ts, SectionLine), each before
// the paragraph that followed it in the transcription, and the reader draws
// them there (components/saints/WritingReader.tsx, EditionLine).
//
// Read again from Roger Pearse's transcription (tertullian.org) and against
// the 1859 printing (five archive.org copies' OCR): 205 short lines in 181
// places. 47 are back. Left out: 117 bare sermon numbers ("SERMON XLVII."),
// which the section's title gives, and two bare references ("cc. 2:21-24.")
// that repeat a title's passage; 23 lines of page furniture; 11 translator's
// footnotes; four "FROM"s that open the next sermon's heading, three of them
// already restored there; and "PRAISE GOD.", which is not on the printed
// page. Two set right by the page: Sermon 21's heading is "FROM SERMON XXI.
// Explanation of what follows." (its FROM had fallen to the end of Sermon
// 12, and it is set as the file sets Sermons 22, 23 and 25), and Luke 6:11
// reads "were", where the transcription has "ware".

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { SectionLine } from "../load";
import { joinWork, splitWork, type WholeWork } from "../writingParts";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Sec = { n: number; title: string; paragraphs: string[]; lines?: SectionLine[] };
const LUKE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/saints/cyril-of-alexandria/commentary-on-luke.json"), "utf8")) as {
  source: string;
  sections: Sec[];
};
const section = (title: string) => {
  const s = LUKE.sections.find((x) => x.title === title);
  if (!s) throw new Error(`no section titled ${title}`);
  return s;
};
const all = LUKE.sections.flatMap((s) => (s.lines ?? []).map((line) => ({ s, line })));

describe("St Cyril on Luke's short lines, laid over the text", () => {
  it("holds the 47 lines read back, by kind", () => {
    expect(all.length).toBe(47);
    expect(LUKE.sections.filter((s) => s.lines?.length).length).toBe(28);
    const kinds: Record<string, number> = {};
    for (const { line } of all) kinds[line.kind] = (kinds[line.kind] ?? 0) + 1;
    expect(kinds).toEqual({ lemma: 22, label: 13, heading: 9, break: 3 });
  });

  it("stands each line before a paragraph of its own section, never in one", () => {
    for (const { s, line } of all) {
      const where = `${s.title}: ${JSON.stringify(line.text)}`;
      expect(Number.isInteger(line.before) && line.before >= 0 && line.before <= s.paragraphs.length, where).toBe(true);
      expect(s.paragraphs.some((p) => p.trim() === line.text.trim()), `${where} is a paragraph too`).toBe(false);
      // The import's rule, 40 characters or fewer: all but the heading made whole again.
      if (line.text !== "FROM SERMON XXI. Explanation of what follows.") expect(line.text.length, where).toBeLessThanOrEqual(40);
    }
  });

  it("stands where the transcription had them", () => {
    const at = (title: string, text: string) => {
      const s = section(title);
      const line = (s.lines ?? []).find((l) => l.text === text);
      expect(line, `${title}: ${text}`).toBeDefined();
      return s.paragraphs[line!.before] ?? "";
    };
    expect(at("Sermon 12", "4:3. And the devil said unto him.")).toMatch(/^Then the devil draweth near to tempt Him/);
    expect(at("Sermon 1, Luke 2:1-7", "2:7. And she laid him in the manger.")).toMatch(/^He found man reduced to the level of the beasts/);
    expect(at("Sermon 29, the fragments", "Love your enemies.")).toMatch(/^\[From Mai\.\] The blessed Paul speaks the truth/);
    expect(at("Sermon 97, from the Catena", "It is like a grain of mustard seed.")).toMatch(/^The comparison is an excellent one/);
    expect(at("Sermon 123", "THE SAME SUBJECT CONTINUED.")).toMatch(/^I PERCEIVE you assembled/);
    expect(at("Sermon 82", "* * * * * *")).toMatch(/^THE request originated in malice/);
    expect(at("Sermon 21", "FROM SERMON XXI. Explanation of what follows.")).toMatch(/^"Or how can a man enter the house of the strong man/);
    expect(at("Sermon 23", "6:11. And they were filled with madness.")).toMatch(/^Is not the miracle enough to produce faith\?/);
  });

  it("follows the printed page where the transcription slipped", () => {
    const texts = all.map(({ line }) => line.text);
    expect(texts).toContain("6:11. And they were filled with madness.");
    expect(texts.some((t) => /\bware\b/.test(t))).toBe(false);
    expect(texts).toContain("FROM SERMON XXI. Explanation of what follows.");
    expect(texts).not.toContain("SERMON XXI. Explanation of what follows.");
  });

  it("leaves out what is not the edition's page or only repeats a title", () => {
    for (const { s, line } of all) {
      const where = `${s.title}: ${JSON.stringify(line.text)}`;
      expect(line.text, where).not.toMatch(/^SERMON [IVXLC]+\.$/);
      expect(line.text, where).not.toMatch(/Early Church Fathers|Greek text is rendered/);
      expect(line.text, where).not.toMatch(/^\d+\.\s/);
      expect(line.text, where).not.toMatch(/^cc\.\s*\d/);
      expect(line.text, where).not.toBe("PRAISE GOD.");
      expect(line.text, where).not.toBe("FROM");
    }
  });

  it("knows each line for what it is", () => {
    const unnumbered = ["Love your enemies.", "All His adversaries were ashamed.", "It is like a grain of mustard seed."];
    for (const { s, line } of all) {
      const where = `${s.title}: ${JSON.stringify(line.text)}`;
      if (line.kind === "lemma") expect(/^\d{1,2}:\d/.test(line.text) || unnumbered.includes(line.text), where).toBe(true);
      if (line.kind === "label") expect(line.text, where).toMatch(/^\[?From\b/);
      if (line.kind === "break") expect(line.text, where).toMatch(/^(\* )+\*$/);
      if (line.kind === "heading") expect(line.text, where).toMatch(/^(FROM SERMON|SERMONS|THE SAME SUBJECT|The same subject|UPON THE SAME|Fragments of sermons)/);
    }
  });

  it("says so in the work's source line", () => {
    expect(LUKE.source).toContain("The short lines the edition sets between passages stand between the paragraphs as it sets them");
    expect(LUKE.source).not.toContain("which the library does not repeat");
  });

  it("reaches the apps in the work's parts", () => {
    const { index, parts } = splitWork(LUKE as unknown as WholeWork);
    const whole = joinWork(index, parts) as unknown as { sections: Sec[] };
    expect(whole.sections.map((s) => s.lines ?? null)).toEqual(LUKE.sections.map((s) => s.lines ?? null));
  });

  it("holds every work's lines to the same shape", () => {
    const dir = path.join(ROOT, "data", "saints");
    for (const saint of fs.readdirSync(dir)) {
      if (!fs.statSync(path.join(dir, saint)).isDirectory()) continue;
      for (const file of fs.readdirSync(path.join(dir, saint)).filter((f) => f.endsWith(".json"))) {
        const work = JSON.parse(fs.readFileSync(path.join(dir, saint, file), "utf8")) as { sections?: Sec[] };
        for (const s of work.sections ?? []) {
          for (const line of s.lines ?? []) {
            const where = `${saint}/${file} ${s.n}`;
            expect(["lemma", "heading", "label", "break"], where).toContain(line.kind);
            expect(line.before >= 0 && line.before <= s.paragraphs.length, where).toBe(true);
            expect(line.text.trim().length, where).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("is drawn before its paragraph, as the edition's and not the author's", () => {
    const reader = fs.readFileSync(path.join(ROOT, "components/saints/WritingReader.tsx"), "utf8");
    expect(reader).toContain("function EditionLine({ line }: { line: SectionLine })");
    expect(reader).toMatch(/const lines = linesAt\.get\(i\);\s*const body = paragraph\(p, i\);/);
    expect(reader).toContain("linesAt.get(sec.paragraphs.length)");
    const line = reader.slice(reader.indexOf("function EditionLine"), reader.indexOf("// Shared framing + citation + paragraph stack."));
    expect((line.match(/lang="en" dir="ltr" data-edition-line=/g) ?? []).length).toBe(3);
    // Not a paragraph row: nothing on it is highlighted, noted or cited.
    expect(line).not.toContain("ParagraphRow");
  });
});

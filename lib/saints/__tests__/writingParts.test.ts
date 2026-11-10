// The Fathers' words are in the apps once (1.9, lib/saints/writingParts.ts).
// A work the commentary quotes is written in parts, and a note found whole in
// its work is stored as a span of it. These hold the two ends together on the
// real data: every work comes back whole from its parts, and every note comes
// back word for word from its span.

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { chapterCommentaryFile, chapterOfFile, commentaryFiles } from "@/lib/bible/chapterExtras";
import { COMMENTARY_WORKS } from "@/lib/bible/commentaryWorks";
import { loadCommentary } from "@/lib/bible/load";
import { isInParts, workInParts, writingFile, writingFileNamed, writingFiles, writingPartFiles } from "@/lib/saints/writingFile";
import {
  PART_BYTES,
  cutSpan,
  isWorkIndex,
  joinWork,
  parseWorkFileName,
  partOfSection,
  spanOf,
  splitWork,
  workFileName,
  type PartSection,
  type WholeWork,
} from "@/lib/saints/writingParts";

const QUOTED = Object.keys(COMMENTARY_WORKS).map((key) => key.split("/") as [string, string]);
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

describe("a work in parts", () => {
  it("splits at whole sections and joins back to the same work", () => {
    const section = (n: number, size: number): PartSection => ({ n, title: `S${n}`, paragraphs: ["x".repeat(size)] });
    const work: WholeWork = { title: "T", source: "S", sections: [section(1, 100), section(2, PART_BYTES), section(3, 50), section(4, 60), section(5, PART_BYTES * 2)] };
    const { index, parts } = splitWork(work);
    expect(parts.map((p) => p.map((s) => s.n))).toEqual([[1], [2], [3, 4], [5]]);
    expect(index.parts).toEqual([0, 1, 2, 4]);
    expect(index.sections.every((s) => !("paragraphs" in s))).toBe(true);
    expect(isWorkIndex(index)).toBe(true);
    expect(isWorkIndex(work)).toBe(false);
    expect(joinWork(index, parts)).toEqual(work);
    expect(partOfSection(index, 4)).toBe(2);
    expect(partOfSection(index, 5)).toBe(3);
    expect(partOfSection(index, 9)).toBeNull();
  });

  it("names a part's file and reads the name back, and refuses any other name", () => {
    expect(workFileName("homilies-on-john")).toBe("homilies-on-john.json");
    expect(workFileName("homilies-on-john", 12)).toBe("homilies-on-john.p12.json");
    expect(parseWorkFileName("homilies-on-john.json")).toEqual({ work: "homilies-on-john", part: null });
    expect(parseWorkFileName("homilies-on-john.p12.json")).toEqual({ work: "homilies-on-john", part: 12 });
    for (const bad of ["../a.json", "a", "A.json", "a..json", ".json", "a.p.json", "a.p01.json", "a.p-1.json", "a.p1.json.json", "i18n/ru/a.json"]) {
      expect(parseWorkFileName(bad), bad).toBeNull();
    }
  });

  it("cuts a note out of its section, and refuses a span that runs outside it", () => {
    const section = { paragraphs: ["First paragraph.", "Second one, longer.", "Third."] };
    const note = "paragraph.\n\nSecond one";
    const span = spanOf(section, note);
    expect(span).toEqual([6, note.length]);
    expect(cutSpan(section, span!)).toBe(note);
    expect(spanOf(section, "not in it")).toBeNull();
    expect(spanOf(section, "")).toBeNull();
    expect(cutSpan(section, [0, 0])).toBeNull();
    expect(cutSpan(section, [-1, 3])).toBeNull();
    expect(cutSpan(section, [40, 400])).toBeNull();
  });

  it("is every work the commentary quotes and no other, each whole again from its parts", async () => {
    expect(QUOTED.length).toBeGreaterThanOrEqual(23);
    const listed = new Set((await writingPartFiles()).map((f) => `${f.slug}/${f.file}`));
    for (const [saint, work] of QUOTED) {
      expect(isInParts(saint, work), `${saint}/${work}`).toBe(true);
      const whole = await writingFile(saint, work);
      const split = await workInParts(saint, work);
      expect(whole, `${saint}/${work}`).not.toBeNull();
      expect(split, `${saint}/${work}`).not.toBeNull();
      expect(joinWork(split!.index, split!.parts)).toEqual(whole);
      // What the route answers at each name is what the reader joins.
      expect(await writingFileNamed(saint, workFileName(work))).toEqual(split!.index);
      for (const [n, part] of split!.parts.entries()) {
        expect(listed.has(`${saint}/${workFileName(work, n)}`), `${saint}/${work} part ${n} is written`).toBe(true);
        // A part is about PART_BYTES, or one section that is larger by itself.
        expect(part.length === 1 || bytes(part) <= PART_BYTES * 1.05, `${saint}/${work} part ${n}`).toBe(true);
      }
      expect(await writingFileNamed(saint, workFileName(work, split!.parts.length))).toBeNull();
    }
    // A work nobody quotes stays whole in its one file, and has no parts.
    expect(isInParts("athanasius-the-great", "on-the-incarnation")).toBe(false);
    expect(isWorkIndex(await writingFileNamed("athanasius-the-great", "on-the-incarnation.json"))).toBe(false);
    expect(await writingFileNamed("athanasius-the-great", "on-the-incarnation.p0.json")).toBeNull();
    expect([...listed].every((f) => QUOTED.some(([s, w]) => f.startsWith(`${s}/${w}.p`)))).toBe(true);
    expect(writingFiles().length).toBeGreaterThan(100);
  }, 240_000);
});

describe("a commentary note as a place in its work", () => {
  it("comes back word for word, every one, and the rest keep their own words", async () => {
    let spans = 0;
    let kept = 0;
    for (const f of await commentaryFiles()) {
      const chapter = chapterOfFile(f.file)!;
      const source = await loadCommentary(f.book, chapter);
      const stored = await chapterCommentaryFile(f.book, chapter);
      expect(stored, `${f.book} ${chapter}`).not.toBeNull();
      expect(Object.keys(stored!)).toEqual(Object.keys(source));
      for (const [verse, notes] of Object.entries(stored!)) {
        expect(notes.length).toBe(source[verse].length);
        for (const [i, note] of notes.entries()) {
          const original = source[verse][i];
          if (!note.span) {
            expect(note).toEqual(original);
            kept += 1;
            continue;
          }
          spans += 1;
          expect(note.text).toBe("");
          const [saint, work] = note.at!.work.split("/");
          const split = await workInParts(saint, work);
          // The reader's own way: the index says which part, the part holds the section.
          const part = partOfSection(split!.index, note.at!.section);
          const section = split!.parts[part!].find((s) => s.n === note.at!.section);
          const { span, ...rest } = note;
          expect({ ...rest, text: cutSpan(section!, span) }, `${f.book} ${chapter}:${verse} note ${i}`).toEqual(original);
        }
      }
    }
    // 4,570 on 2026-11-10: most of the notes that point into a work at all.
    expect(spans).toBeGreaterThan(4000);
    expect(kept).toBeGreaterThan(5000);
  }, 600_000);
});

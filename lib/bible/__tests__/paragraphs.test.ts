import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import paragraphs from "@/data/bible/paragraphs.json";

// Paragraph view (1.7): the verses that begin a paragraph, per chapter
// (scripts/build-paragraphs.mjs). Each must be a verse the chapter has,
// after its first, in order, once.
describe("paragraph breaks", () => {
  it("name only verses the chapter has, after the first, in order", () => {
    const bad: string[] = [];
    let chapters = 0;
    for (const [book, byChapter] of Object.entries(paragraphs as Record<string, Record<string, number[]>>)) {
      for (const [ch, starts] of Object.entries(byChapter)) {
        chapters += 1;
        const file = path.join("data/bible", book, `${ch}.json`);
        const count = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).verses as unknown[]).length : 0;
        starts.forEach((v, i) => {
          if (!Number.isInteger(v) || v <= 1 || v > count || (i > 0 && v <= starts[i - 1])) bad.push(`${book} ${ch}: ${v}`);
        });
      }
    }
    expect(chapters).toBeGreaterThan(100);
    expect(bad).toEqual([]);
  });
});

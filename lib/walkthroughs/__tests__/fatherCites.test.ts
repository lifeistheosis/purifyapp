// Each Father's line in a walk's notes names its exact place (1.8,
// lib/walkthroughs/fatherCites.ts): the book and paragraph of the library's
// copy of St Gregory's Morals that holds the excerpt, which the line opens.
// Until 1.8 every line was credited "St. Gregory the Great, Morals on the
// Book of Job", with the book dropped and no link.
//
// What a reader would notice if this broke: a line credited to the wrong
// book of the Morals, or a link that opens a paragraph without those words.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { WALKTHROUGHS } from "@/lib/walkthroughs";
import { fatherCites } from "@/lib/walkthroughs/fatherCites";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

type Work = { sections: { n: number; paragraphs: string[] }[] };
const morals = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "saints", "gregory-the-dialogist", "morals-on-the-book-of-job.json"), "utf8"),
) as Work;

describe("a Father's line in a walk's note", () => {
  it("names the book and paragraph of the library's copy that hold it, every one", async () => {
    let lines = 0;
    for (const w of Object.values(WALKTHROUGHS)) {
      for (const c of w.chapters) {
        const cites = await fatherCites(w.book, c.n, c.cards);
        for (const card of c.cards) {
          if (!card.father) continue;
          lines++;
          const cite = cites[card.id];
          expect(cite?.kind, card.id).toBe("father");
          if (cite?.kind !== "father") continue;
          expect(cite.work, card.id).toBe("Morals on the Book of Job");
          expect(cite.place, card.id).toMatch(/^Book \d+, on Job /);
          expect(cite.mark, card.id).toMatch(/^§\d+$/);
          // It opens a paragraph that holds the excerpt's words.
          const m = /#p-(\d+)-(\d+)$/.exec(cite.href)!;
          expect(cite.href, card.id).toMatch(/^\/saints\/gregory-the-dialogist\/morals-on-the-book-of-job#p-\d+-\d+$/);
          const paragraph = morals.sections.find((s) => s.n === Number(m[1]))!.paragraphs[Number(m[2])];
          const anchor = words(card.father.excerpt).split(" ").slice(0, 12).join(" ");
          expect(words(paragraph).includes(anchor), card.id).toBe(true);
        }
      }
    }
    expect(lines).toBeGreaterThanOrEqual(100);
  });

  it("is shown under the line in the note's sheet, built with the chapter's page", () => {
    const sheets = fs.readFileSync(path.join(ROOT, "components/walkthrough/WalkSheets.tsx"), "utf8");
    expect(sheets).toContain("{fatherCite ? <SourceLine cite={fatherCite} /> : fatherSource}");
    const page = fs.readFileSync(path.join(ROOT, "app/(app)/walkthroughs/[book]/[chapter]/page.tsx"), "utf8");
    expect(page).toContain("fatherCites(book, n, c.cards)");
    expect(page).toContain("fatherCites: cites,");
  });
});

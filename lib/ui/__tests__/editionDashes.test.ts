// A Father's words keep their edition's dashes, and say so (1.9).
//
// The house writes no em dash (AGENTS.md, CLAUDE.md), and checkMock fails a
// screen with one (scripts/mock-check.mjs, emdash). The Fathers' words are
// not the house's: 1,845 paragraphs of the works and 208 notes on the
// Bible's rail carry the dashes their editions print, set as print sets them
// in F-49's passes. checkMock allows those only where the piece holding them
// says so by name (data-mock-allow="emdash" with its reason), and none did,
// so every such page failed the pre-build gate's second step (CLAUDE.md, the
// owner's word of 2026-11-11). Found on St Cyril on Luke, Sermon 1 (quick
// win 16). An editorial section's prose is the house's own, and never is.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("a Father's words keep their edition's dashes, and say so", () => {
  it("in a work, but never in an editorial section's prose", () => {
    const reader = read("components/saints/WritingReader.tsx");
    expect(reader).toContain('data-mock-allow={sec.voice === "editorial" ? undefined : "emdash"}');
    expect(reader).toContain('data-mock-why={sec.voice === "editorial" ? undefined : "the work\'s own words, as its edition prints them"}');
  });

  it("on the Bible's rail and in its sheet, around the notes and not the digest", () => {
    const rail = read("components/bible/StudyRail.tsx");
    const allowed = rail.indexOf('data-mock-allow="emdash"');
    expect(allowed).toBeGreaterThan(rail.indexOf("{digest && ("));
    expect(rail.slice(allowed, rail.indexOf("</div>", allowed))).toContain("<GlossedText");
    const sheet = read("components/bible/MobileCommentarySheet.tsx");
    const at = sheet.indexOf('data-mock-allow="emdash"');
    expect(at).toBeGreaterThan(0);
    expect(sheet.slice(at, sheet.indexOf("</div>", at))).toContain("<GlossedText");
  });

  it("names its reason wherever it is allowed", () => {
    for (const file of ["components/saints/WritingReader.tsx", "components/bible/StudyRail.tsx", "components/bible/MobileCommentarySheet.tsx"]) {
      const src = read(file);
      const allows = src.split("data-mock-allow").length - 1;
      expect(src.split("data-mock-why").length - 1, file).toBeGreaterThanOrEqual(allows);
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { askedLine, askedList, askedShare, catechismLine, undoValue, type DeskSaint } from "../contentDesk";

/**
 * Content, his pick A on r3-17 (2026-10-30): the editors' desk. The saints
 * below are the app's own names with made-up counts.
 */

const saint = (slug: string, bumps: number, views30d: number, complete = false, overridden = false): DeskSaint => ({
  slug,
  name: slug.replace(/-/g, " "),
  bumps,
  views30d,
  complete,
  overridden,
});

const ROWS = [
  saint("isaac-the-syrian", 47, 1120),
  saint("seraphim-of-sarov", 88, 2310),
  saint("paisios-the-athonite", 71, 1980),
  saint("nicholas-the-wonderworker", 0, 1870, true),
  saint("mary-of-egypt", 64, 1204),
  saint("john-chrysostom", 64, 3000, true, true),
];

describe("the list of saints asked for", () => {
  it("puts the most asked first, then the most read", () => {
    expect(askedList(ROWS, "open").map((r) => r.slug)).toEqual([
      "seraphim-of-sarov",
      "paisios-the-athonite",
      "mary-of-egypt",
      "isaac-the-syrian",
    ]);
    expect(askedList(ROWS, "complete").map((r) => r.slug)).toEqual(["john-chrysostom", "nicholas-the-wonderworker"]);
    expect(askedList(ROWS, "all")).toHaveLength(ROWS.length);
  });

  it("says how often each was asked for and read", () => {
    expect(askedLine(ROWS[1])).toBe("88 asked · 2,310 views in 30 days");
    expect(askedLine(ROWS[3])).toBe("not asked for yet · 1,870 views in 30 days");
    expect(askedLine(ROWS[1], false)).toBe("88 asked");
  });

  it("draws each bar against the most asked", () => {
    expect(askedShare(ROWS[1], ROWS)).toBe(1);
    expect(askedShare(ROWS[0], ROWS)).toBeCloseTo(47 / 88);
    expect(askedShare(ROWS[0], [saint("x", 0, 0)])).toBe(0);
  });
});

describe("Undo after Mark complete", () => {
  it("puts back exactly what was there", () => {
    // Open by the registry's word: Undo clears the override.
    expect(undoValue({ complete: false, overridden: false })).toBeNull();
    // Set open here before: Undo sets it open again.
    expect(undoValue({ complete: false, overridden: true })).toBe(false);
  });
});

describe("the catechism as one line", () => {
  it("says where the bank goes while it is empty, and names no script this branch lacks", () => {
    const line = catechismLine(0);
    expect(line).toContain("data/catechism/questions.json");
    expect(line).toContain("docs/CATECHISM.md");
    expect(line).not.toContain("quiz-import");
  });

  it("counts the bank once it is in", () => {
    expect(catechismLine(1)).toMatch(/^1 question in the bank\./);
    expect(catechismLine(240)).toMatch(/^240 questions in the bank\./);
  });

  it("is true about the files it names", () => {
    const root = process.cwd();
    expect(() => readFileSync(join(root, "data/catechism/questions.json"))).not.toThrow();
    expect(() => readFileSync(join(root, "docs/CATECHISM.md"))).not.toThrow();
  });

  it("leaves no command for a missing script anywhere in the admin", () => {
    const desk = readFileSync(join(process.cwd(), "components/admin/content/catechism.tsx"), "utf8");
    expect(desk).not.toContain("quiz-import");
  });
});

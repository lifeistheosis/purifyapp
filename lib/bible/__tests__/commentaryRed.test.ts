// The commentary mark stays red on every palette (his pick of late
// 2026-11-09, "keep red": docs/1.9-build/BRAINSTORM.md, the photo page's 11).
//
// What it holds: each of the mark's four dots (before a verse and after a
// drop-capped one, on a phone and in the desktop rail) tells the mock check
// (scripts/mock-check.mjs) by name why its red does not change with the
// palette, so the check reads it as his choice and not as a colour typed in.
//
// What a reader would notice if this broke: nothing; the next checkMock run on
// a chapter would report 44 typed colours that are his own pick.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "components/bible/VerseRow.tsx"), "utf8");

describe("the commentary mark's red", () => {
  it("is named to the mock check as his pick, with its reason", () => {
    const block = src.slice(src.indexOf("const KEEP_RED = {"), src.indexOf("} as const;", src.indexOf("const KEEP_RED = {")));
    expect(block).toContain('"data-mock-allow": "palette"');
    expect(block).toMatch(/"data-mock-why": "the commentary mark stays red on every palette: his pick, keep red \(2026-11-09/);
  });

  it("is told so on every one of the mark's four dots", () => {
    const dots = [...src.matchAll(/className="[^"]*inline-block h-\[5px\] w-\[5px\] rounded-full bg-accent\/75[^"]*"\s*\{\.\.\.KEEP_RED\}/g)];
    const all = [...src.matchAll(/inline-block h-\[5px\] w-\[5px\] rounded-full bg-accent\/75/g)];
    expect(all).toHaveLength(4);
    expect(dots).toHaveLength(4);
  });
});

// In Arabic the wash over the sentence being read aloud, and the reader's own
// marks on a page that writes its own text, turn round with the page (build
// 98 note 2: checkMock's mirror rule found them placed with left on every text
// while it played, 2 to 18 boxes). What a reader would notice if this broke:
// the page turned to Arabic, and the light over the words still standing
// where the English page had it, over the wrong words or none.
//
// Fails on the code before the mend: no start edge (the import), and both
// layers place their washes with left.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fromStart } from "@/lib/marks/startEdge";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const LAYERS = ["components/reading/ListenHere.tsx", "components/reading/MarksLayer.tsx"];

describe("a wash's place from the start edge", () => {
  it("is its left in a page read left to right, and its right in Arabic", () => {
    expect(fromStart({ left: 40, right: 300 }, 390, false)).toBe(40);
    expect(fromStart({ left: 40, right: 300 }, 390, true)).toBe(90);
  });

  it("so the same place, with the page turned round, is the box's mirror", () => {
    const W = 390;
    const box = { left: 24, right: 211 };
    const s = fromStart(box, W, false);
    const turned = { left: W - s - (box.right - box.left), right: W - s };
    expect(turned).toEqual({ left: W - box.right, right: W - box.left });
  });
});

describe("the reading's wash and the reader's marks", () => {
  for (const file of LAYERS) {
    it(`${path.basename(file)} places every wash from the start edge, never with left`, () => {
      const src = read(file);
      // A wash's style is one line: where it stands, its top and its size.
      const washes = src.split("\n").filter((line) => line.includes("style={{") && /\btop:\s*\w+\.(box\.)?top\b/.test(line));
      expect(washes.length).toBeGreaterThan(0);
      for (const s of washes) {
        expect(s).toMatch(/insetInlineStart:/);
        expect(s).not.toMatch(/\bleft:/);
      }
      expect(src).not.toMatch(/absolute left-0 top-0/);
    });
  }
});

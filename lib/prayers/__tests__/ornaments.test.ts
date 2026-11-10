import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The prayers' small marks: the arrow at the end of a Pray now row or of a
 * row in the prayer book's index, and a closed chapter's numeral in the
 * prayer book. Small as they are, they are words a reader sees, and the
 * guardrail holds them to 4.5:1 on every palette. They were written at 35 and
 * 40 percent of the ink, under every palette's lift, and the Themes chat's
 * sweep measured them at 3.21:1 and 3.83:1 on True black (docs/1.9-build/
 * notes/themes-fable.md, section 25; the other palettes draw these rows on a
 * gradient the checker cannot measure, and the arithmetic is the same). Each
 * is now written at 45 percent or more, the faintest share the palettes' own
 * rules lift to 4.5:1 on a page, a card and a box
 * (lib/ui/__tests__/faintText.test.ts holds that arithmetic).
 */

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const HELD = 45;

describe("the prayers' small marks", () => {
  it("draws every arrow at the end of a row at a share the palettes lift", () => {
    for (const file of ["components/prayers/PrayNow.tsx", "components/prayers/PrayerBookIndex.tsx"]) {
      const arrows = [...read(file).matchAll(/className="([^"]*)"[^>]*>\s*→\s*</g)].map((m) => m[1]);
      expect(arrows.length, `${file}: its arrows`).toBeGreaterThan(0);
      for (const cls of arrows) {
        const share = Number(/(?:^|\s)text-paper\/(\d+)(?:\s|$)/.exec(cls)?.[1]);
        expect(share, `${file}: an arrow at ${share} percent`).toBeGreaterThanOrEqual(HELD);
      }
    }
  });

  it("draws a chapter's numeral, closed or open, at a share the palettes lift", () => {
    const shares = /isOpen \? "text-paper\/(\d+)" : "text-paper\/(\d+)"/.exec(read("components/prayers/PrayerBookContents.tsx"));
    expect(shares, "the numeral's two shares").not.toBeNull();
    const [, open, closed] = shares!.map(Number);
    expect(open).toBeGreaterThanOrEqual(HELD);
    expect(closed).toBeGreaterThanOrEqual(HELD);
  });
});

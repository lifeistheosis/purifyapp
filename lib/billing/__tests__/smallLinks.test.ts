import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Terms and Privacy links under the plans are 44 by 44 to the touch
 * (CLAUDE.md's guardrails; checkMock's target check). They were 44 tall and
 * only as wide as their words, 34 and 41px, found by the Themes chat on the
 * Plus sheet (2026-11-10). The sheet's dock (KeptPaywall) and the apps'
 * /pricing page (PlusPaywall) draw the same pair.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const words = (cls: string) => cls.split(/\s+/);

describe("the links under the plans", () => {
  it("are 44 by 44 in the Plus sheet's dock", () => {
    const links = /const links = "([^"]*)"/.exec(read("components/billing/KeptPaywall.tsx"))?.[1] ?? "";
    expect(words(links)).toEqual(expect.arrayContaining(["min-h-11", "min-w-11"]));
    const dock = read("components/billing/KeptPaywall.tsx");
    // Each opens its text in a sheet over the plans (build 90 note 1).
    for (const doc of ["terms", "privacy"]) expect(dock).toContain(`<LegalLink doc="${doc}" className={links}>`);
  });

  it("are 44 by 44 on the apps' /pricing page", () => {
    const page = read("components/billing/PlusPaywall.tsx");
    for (const doc of ["terms", "privacy"]) {
      const cls = new RegExp(`<LegalLink doc="${doc}" className="([^"]*)"`).exec(page)?.[1] ?? "";
      expect(words(cls), doc).toEqual(expect.arrayContaining(["min-h-11", "min-w-11"]));
    }
  });
});

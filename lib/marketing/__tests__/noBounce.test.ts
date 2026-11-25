// His strict rule of 2026-11-25 (CLAUDE.md, "No bounce"): in an edit, nothing pops and eases back. No punch in that
// settles, no zoom that lands, no pulse on the beat, no text that springs in, no page that bends and settles, no
// overshoot curve. These are the parts a test can read: every promo edit's renderer from edit 3 on.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "docs/plans/promo-edits");
const renderers = readdirSync(root)
  .filter((d) => /^edit-(\d+)$/.test(d) && Number(d.slice(5)) >= 3)
  .flatMap((d) => readdirSync(join(root, d)).filter((f) => /\.(py|mjs|js|ts)$/.test(f)).map((f) => join(d, f)))
  .filter((f) => existsSync(join(root, f)));

const FORBIDDEN: [RegExp, string][] = [
  [/def\s+(kick|pulse|punch|bounce|spring|pop)\s*\(/, "a function that pops a picture or a word and lets it settle"],
  [/whoosh/i, "an entry that zooms in and lands"],
  [/overshoot|elastic|spring\(/i, "an overshoot or spring curve"],
  [/bezier\(\s*0?\.34\s*,\s*1\.56/, "the house's ease-pop, which overshoots"],
  [/def\s+bend\s*\(/, "a page that bends and settles"],
];

describe("no bounce in a promo edit", () => {
  it("finds the renderers to read", () => {
    expect(renderers.length).toBeGreaterThan(0);
  });

  it.each(renderers)("%s pops nothing and lets nothing settle", (file) => {
    const src = readFileSync(join(root, file), "utf8");
    for (const [pattern, what] of FORBIDDEN) {
      expect(pattern.test(src), `${file}: ${what}`).toBe(false);
    }
  });
});

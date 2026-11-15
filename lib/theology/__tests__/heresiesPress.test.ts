// Gate 3c, group 9 (Updates 86, 2026-11-15): with motion reduced, a tap on
// "Marcionism" on /heresies/ flashed a box 150 by 30px for 2 frames (3 of 4,
// on the export of f637f7b8a). The row lights white as it is pressed
// (app/globals.css, .theology-row:active), and with motion reduced the page
// it opens comes in at once, so the light, drawn on the tap, stood for two
// frames and was gone. The heresies' rows that open another page now keep
// still as they are pressed when motion is reduced; the keyboard's chosen row
// still lights, and with motion on nothing changes.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const RULE = ':where([data-motion="reduce"]) .theology-row.theology-row-leaves:active:not(:focus-visible) {\n background: none;\n box-shadow: none;\n}';

describe("the heresies' rows do not flash as they open a page with motion reduced", () => {
  it("the list's rows and the councils' rows on an error's page are rows that leave", () => {
    expect(read("app/(app)/heresies/page.tsx")).toContain('className="theology-row flex min-h-[60px] items-center gap-3 rounded-[14px] px-2.5 py-2.5 theology-row-leaves"');
    expect(read("app/(app)/heresies/[slug]/page.tsx")).toContain('const ROW = "theology-row flex min-h-[54px] items-center gap-3 rounded-[14px] px-2 py-2 theology-row-leaves";');
  });

  it("with motion reduced such a row keeps still as it is pressed, and only then", () => {
    const css = read("app/globals.css");
    expect(css).toContain(RULE);
    // Every rule that names it is that one: nothing else changes its look.
    expect(css.match(/theology-row-leaves/g)).toHaveLength(1);
  });

  it("outweighs every rule that lights a pressed row, the Parchment one included", () => {
    // (ids, classes and the like, elements) of each selector; :where() weighs nothing.
    const weigh = (selector: string): [number, number, number] => {
      // :is() and :not() weigh as their heaviest argument; each here holds pseudo-classes alone.
      const s = selector.replace(/:where\([^)]*\)/g, "").replace(/:(is|not)\([^)]*\)/g, ":arg");
      const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) ?? []).length;
      const elements = (s.match(/(^|[\s>+~])[a-z]+(?=[.[:\s]|$)/g) ?? []).length;
      return [0, classes, elements];
    };
    const beats = (a: [number, number, number], b: [number, number, number]) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    const mine = weigh(':where([data-motion="reduce"]) .theology-row.theology-row-leaves:active:not(:focus-visible)');
    expect(mine).toEqual([0, 4, 0]);
    for (const lit of [".theology-row:active", 'html[data-reading-mode="parchment"] .theology-row:is(:active, :focus-visible)']) {
      expect(beats(mine, weigh(lit)), lit).toBeGreaterThan(0);
    }
    // And the rules it outweighs are the ones the stylesheet has.
    const css = read("app/globals.css");
    expect(css).toContain(".theology-row:active,\n.theology-row:focus-visible {");
    expect(css).toContain('html[data-reading-mode="parchment"] .theology-row:is(:active, :focus-visible) {');
  });
});

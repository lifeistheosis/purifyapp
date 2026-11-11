// Every block of the stylesheet closes (1.9, 2026-11-11).
//
// app/globals.css is one file of nearly fourteen thousand lines that every
// chat adds to. When the order gift's styles were brought onto the branch
// they landed inside the last block of the file, the base layer that sets
// how a long heading breaks, and the brace that closed that layer was lost
// under them. Nothing in the unit tests reads the stylesheet as a
// stylesheet, so they stayed green while neither the website nor the apps
// could be built ("Unclosed block" at the layer's first line). This reads
// it the way a parser does, without one: comments and quoted strings set
// aside, every "{" has its "}".
//
// What a reader would notice if this broke: nothing, because no build would
// reach them.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAW = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
/** The stylesheet with its comments and its quoted strings blanked, line for line, so a brace in either is not counted. */
const BARE = RAW.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => " ".repeat(m.length));

describe("the stylesheet", () => {
  it("closes every block it opens, and closes none it did not open", () => {
    let depth = 0;
    let line = 1;
    const open: number[] = [];
    let early: number | null = null;
    for (const ch of BARE) {
      if (ch === "\n") line += 1;
      else if (ch === "{") {
        depth += 1;
        open.push(line);
      } else if (ch === "}") {
        depth -= 1;
        open.pop();
        if (depth < 0 && early === null) early = line;
      }
    }
    expect(early, `a "}" with no block to close, at line ${early}`).toBeNull();
    expect(open, `unclosed: the block opened at line ${open[0]}`).toEqual([]);
  });

  it("ends its base layer for long headings before the order gift's styles begin", () => {
    // The layer that was left open, and what was written into it by mistake.
    const layer = RAW.indexOf("@layer base {\n :where(h1, h2, h3) {\n  overflow-wrap: break-word;");
    const gift = RAW.indexOf("The order gift: the card in your hand");
    expect(layer).toBeGreaterThan(-1);
    expect(gift).toBeGreaterThan(layer);
    const between = RAW.slice(layer, gift).replace(/\/\*[\s\S]*$/, "");
    expect(between.split("{").length - 1).toBe(between.split("}").length - 1);
    // Outside any layer, the gift's rules weigh what they weighed where they were written.
    expect(between.trimEnd().endsWith("}\n}") || between.trimEnd().endsWith(" }\n}")).toBe(true);
  });
});

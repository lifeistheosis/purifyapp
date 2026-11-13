// An account's parts row steps aside under its thread map (1.9, Gate 2.0's
// run of 2026-11-13, Alaska's mission).
//
// The parts row (components/history/EventPartsNav.tsx) is pinned under the
// bar; the thread map (components/history/EventThread.tsx) pins half a rem
// below the same line, later in the page, and is drawn over it. At rest the
// row's pill showed at the map's sides, 348 by 65px of the two met, and on
// the way the map slid over the pinned row. The least visible mend (the
// arbiter's word): while the map stands over the row, the row steps aside;
// where it does not, as at the top of the page, nothing changes.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the parts row under the thread map", () => {
  const nav = code("components/history/EventPartsNav.tsx");
  const thread = code("components/history/EventThread.tsx");

  it("the two still pin at the same line (else the row need not step aside)", () => {
    expect(thread).toMatch(/sticky top-\[calc\(var\(--history-sticky-top\)\+0\.5rem\)\][^"]*" data-thread-map=""/);
    const css = code("app/globals.css");
    expect(css).toMatch(/\.history-era-head \{\s*position: sticky;\s*top: var\(--history-sticky-top\);/);
  });

  it("steps aside while the map's box stands over its own, and only then", () => {
    // Asked inside each read, never once: the map is drawn after the row.
    expect(nav).toMatch(/const read = \(\) => \{\s*frame = 0;\s*const map = document\.querySelector<HTMLElement>\("\[data-thread-map\]"\);/);
    expect(nav).toMatch(/setUnderMap\(m\.top < r\.bottom - 1 && m\.bottom > r\.top \+ 1\)/);
    expect(nav).toMatch(/underMap && "pointer-events-none opacity-0"/);
    // Read once a frame while the page scrolls, never on each scroll event.
    expect(nav).toMatch(/if \(!frame\) frame = requestAnimationFrame\(read\);/);
    expect(nav).toMatch(/addEventListener\("scroll", onMove, \{ passive: true \}\)/);
  });

  it("fades as the bars step aside, and is still where motion is reduced", () => {
    expect(nav).toMatch(/"history-era-head [^"]*motion-safe:transition-opacity motion-safe:duration-200"/);
  });
});

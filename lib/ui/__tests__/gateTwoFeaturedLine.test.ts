import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Gate 2's fault 8 (docs/1.9-build/notes/gate-run-2.md, "The faults", 8):
 * /reading/ in Arabic at 800 and 1032 on Candlelight, the featured work's
 * line of facts ("مختارات · 25 دقيقة · عصر المجامع المسكونية") read 4.40:1
 * and 4.39:1 at its least on the pixels under it, at the 60 percent it is
 * written in. Beside the poster the words stand on the stage's picture, and
 * in Arabic on its other side. Mended by Updates 42 (2026-11-14) with the
 * least that passes: on Candlelight, from a tablet's width, the line is drawn
 * at 65; everywhere else it is left as written.
 */

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("the featured work's line of facts on Candlelight (Gate 2, fault 8)", () => {
  const work = read("components/reading/FeaturedWork.tsx");
  const room = read("components/reading/room.module.css");

  it("carries the room's own name for the rule, and is written as it was everywhere else", () => {
    expect(work).toContain('<p className={cn(styles.heroFacts, "font-sans text-caption text-paper/60 md:mt-2")}>{facts.join(" · ")}</p>');
  });

  it("is drawn at 65 percent of the ink on Candlelight beside the poster, a step under the author's 75", () => {
    const rule = /@media \(min-width: 768px\) \{\s*html\[data-reading-mode="candlelight"\] \.heroFacts \{\s*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%, transparent\);\s*\}\s*\}/.exec(room);
    expect(rule, "the Candlelight rule at a tablet's width").not.toBeNull();
    const share = Number(rule![1]);
    // 4.40:1 at 60 on the gate's pixels; 65 reads about 4.9 there by the same sum.
    expect(share).toBeGreaterThanOrEqual(64);
    // Still the quiet line under the author (text-paper/75).
    expect(share).toBeLessThan(75);
    expect(work).toContain('<p className="hidden font-sans text-ui text-paper/75 md:mt-2 md:block">{author}</p>');
  });

  it("reaches no other palette and no phone", () => {
    const named = [...room.matchAll(/html\[data-reading-mode="([a-z]+)"\] \.heroFacts/g)].map((m) => m[1]);
    expect(named).toEqual(["candlelight"]);
    expect(room).not.toMatch(/(?:^|[{};,])\s*\.heroFacts\s*[{,]/m);
  });
});

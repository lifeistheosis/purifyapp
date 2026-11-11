// A study's page, held to what the pre-build gate's first run found on
// /theology/comma-johanneum/ (2026-11-11, docs/1.9-build/notes/gate-run-1.md):
// the step's link at its head was 26px tall, the quiet label over the related
// studies ("Doctrine") read 2.31:1 on every palette, and the part line inside
// the Begin button ("Part 1 of 4") read 3.97:1 on Dark, Candlelight and
// Monastery. The three are shared by every study, so they are mended in the
// components and held here; scripts/mock-check.mjs measures them on the
// export, on five palettes.
//
// What a reader would notice if this broke: a link too small to hit at the
// head of every study, and two lines too faint to read.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const page = fs.readFileSync("components/theology/TopicReader.tsx", "utf8");
const contents = fs.readFileSync("components/theology/StudyContents.tsx", "utf8");

/** The ink's share in a Tailwind class such as text-paper/50. */
const share = (cls: string) => Number(/text-paper\/(\d+)/.exec(cls)?.[1] ?? 100);

describe("a study's page", () => {
  it("the step's link at its head is 44 tall in its own box", () => {
    const link = /data-study-step=""\s+className="([^"]+)"/.exec(page)?.[1] ?? "";
    expect(link).toContain("min-h-11");
    expect(link).toContain("inline-flex");
    expect(link).toContain("items-center");
    // Not a small box with a larger place to tap laid over it: the gate measures the box.
    expect(link).not.toContain("hit-44");
  });

  it("and the head stands where it stood: the room the link gained is taken from the space around it", () => {
    // 44 where it was 26: nine pixels over it and nine under.
    expect(page).toContain('className={`saint-head-in ${subject ? "mt-[19px]" : "mt-7"}`}');
    expect(page).toContain('className={`${subject ? "mt-[3px]" : "mt-3"} font-serif text-[27px]');
  });

  it("no label over a part is fainter than the house lifts to 4.5:1", () => {
    // lib/ui/__tests__/faintText.test.ts: ink at 45 to 60 is lifted on every palette; below 45 it is not.
    const label = /function PartLabel[\s\S]*?quiet \? "([^"]+)" : "([^"]+)"/.exec(page);
    expect(label).not.toBeNull();
    for (const cls of [label![1], label![2]]) {
      expect(share(cls), cls).toBeGreaterThanOrEqual(45);
      expect(share(cls), cls).toBeLessThanOrEqual(60);
    }
  });

  it("the part line inside the Begin button is dark enough on the button's own ground", () => {
    const line = /<span className="font-medium opacity-(\d+)">\{t\("paths\.part", \{ n: resume, total \}\)\}<\/span>/.exec(contents);
    expect(line).not.toBeNull();
    // Night at 55% on paper read 3.97:1; at 70% it is past 6:1.
    expect(Number(line![1])).toBeGreaterThanOrEqual(70);
  });
});

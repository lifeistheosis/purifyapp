// An observer's margin is never built from where something happens to stand.
//
// Found 2026-11-23 by the day's frame's probe walking the first Liturgy's guide
// card by card: Next tapped at the foot of "During the Liturgy" opened "Something
// went wrong" in place of "After the Liturgy". The guide's strip built its
// observer's margin from its own place on the screen (getBoundingClientRect().bottom).
// The new card arrives while the page is still far down the one before it, the
// strip stood 1,379px above the screen for that moment, the margin read
// "--1379px", and the browser refuses a margin that is not pixels or percent:
// the card's own error page. In 1.9 as it shipped.
//
// What a reader would notice if this broke: a card or a page that turns into
// "Something went wrong" when it is opened from far down the page before it.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") walk(rel, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

const FILES = ["app", "components", "lib"].flatMap((d) => walk(d));
/** Every margin written with a value set into it: the file, and the words of the margin. */
const MARGINS = FILES.flatMap((file) => {
  const src = fs.readFileSync(file, "utf8");
  return [...src.matchAll(/rootMargin:\s*`([^`]*)`/g)].map((m) => ({ file, margin: m[1], src }));
});

describe("an observer's margin", () => {
  it("is found in the places this test knows of", () => {
    // A positive control: an empty scan would pass everything below.
    expect(MARGINS.length).toBeGreaterThanOrEqual(6);
    expect(MARGINS.map((m) => m.file)).toContain("components/start/liturgy/FirstLiturgyGuide.tsx");
  });

  it("never reads a place on the screen as it is written: a place can be over the screen, and its minus then doubles", () => {
    for (const { file, margin } of MARGINS) {
      expect(margin, file).not.toMatch(/getBoundingClientRect\(\)\.(top|bottom|left|right|x|y)/);
    }
  });

  it("is built from a value that cannot be under nothing: a height, a style, or one held at nothing or more", () => {
    for (const { file, margin, src } of MARGINS) {
      for (const [, name] of margin.matchAll(/-\$\{([A-Za-z_]+)\}px/g)) {
        const set = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*([^;]+);`).exec(src);
        expect(set, `${file}: where ${name} is set`).not.toBeNull();
        const from = set![1];
        const safe = /^Math\.max\(0,/.test(from) || /offsetHeight|getBoundingClientRect\(\)\.height|getComputedStyle\([^)]*\)\.top/.test(from);
        expect(safe, `${file}: ${name} = ${from}`).toBe(true);
        // A place on the screen is never part of it, even held at nothing: the margin would be wrong for the life of the page.
        expect(from, `${file}: ${name}`).not.toMatch(/getBoundingClientRect\(\)\.(top|bottom)/);
      }
    }
  });

  it("the guide's strip reads where its foot stands once it is stuck, by its own style", () => {
    const guide = fs.readFileSync("components/start/liturgy/FirstLiturgyGuide.tsx", "utf8").replace(/\s+/g, " ");
    expect(guide).toContain("const foot = Math.max(0, Math.round((parseFloat(getComputedStyle(strip).top) || 0) + strip.offsetHeight));");
    expect(guide).toContain("{ rootMargin: `-${foot}px 0px 0px 0px`, threshold: 0 }");
  });
});

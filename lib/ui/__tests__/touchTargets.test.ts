// A source-reading guard, in the idiom of lib/saints/__tests__/iconRights.test.ts
// (MAX_UNVERIFIED) and lib/calendar/__tests__/noFrozenDay.test.ts.
//
// WCAG 2.5.5 asks for a 44x44 CSS px touch target. Nothing in CI checks it:
// tests/smoke/_axe.ts runs the WCAG 2.1 AA tag set, and `target-size` is AAA,
// so it is not in the run. The audit counted roughly sixty interactive
// elements under the floor, worst of them the Save control on Today at 61x22,
// whose height came from a 22px icon and no padding at all.
//
// This cannot measure pixels: vitest here is a node environment with no DOM
// and no layout. What it can do is count the class patterns that PROVE a
// too-small box, and hold that count so it only falls. Fixing a control means
// the number drops and the ceiling drops with it in the same commit. Adding
// one means the suite goes red.
//
// Deliberately narrow: it only counts explicit height classes on elements that
// are interactive, because those are unambiguous. It does NOT catch a control
// whose height comes from its content, which is exactly what the Save button
// was, so a falling number here is evidence of progress and never a proof of
// compliance. The real check is a device walk.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];

// Tailwind height classes below 44px (h-11 = 2.75rem = 44px is the floor).
// h-10 = 40, h-9 = 36, h-8 = 32, h-7 = 28, h-6 = 24.
const SMALL_H = /\bh-(?:[1-9]|10)\b(?!\S)/;

/** Lines that both open an interactive element and set a sub-44px height. */
const INTERACTIVE = /<(?:button|a|Link)\b/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next", "out", "__tests__"].includes(entry)) continue;
      yield* walk(full);
    } else if (entry.endsWith(".tsx")) {
      yield full;
    }
  }
}

/**
 * Count sub-44px interactive elements. An element counts when its opening tag
 * and its className land within a short window of each other, which is how
 * these are written throughout the codebase.
 */
function countSmallTargets(): { total: number; byFile: Record<string, number> } {
  const byFile: Record<string, number> = {};
  let total = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      let n = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!INTERACTIVE.test(lines[i])) continue;
        // The className may sit on the same line or a few lines below.
        const window = lines.slice(i, i + 8).join(" ");
        const upToNextTag = window.split(/<(?:button|a|Link)\b/).slice(0, 2).join(" ");
        if (!/className=/.test(upToNextTag)) continue;
        // A control carrying .hit-44 has a 44px touch box regardless of the
        // height it paints at, so it is not a defect even though the small
        // height class is still there.
        if (/\bhit-44\b/.test(upToNextTag)) continue;
        if (SMALL_H.test(upToNextTag)) n++;
      }
      if (n > 0) {
        byFile[file.slice(ROOT.length + 1).replace(/\\/g, "/")] = n;
        total += n;
      }
    }
  }
  return { total, byFile };
}

// The count as measured when this guard was written. IT MAY ONLY FALL.
// Lower it in the same commit that fixes the controls, so the diff shows the
// work. Never raise it.
const MAX_SMALL_TARGETS = 49;

describe("touch targets", () => {
  const { total, byFile } = countSmallTargets();

  it(`has no more than ${MAX_SMALL_TARGETS} interactive elements under 44px`, () => {
    const worst = Object.entries(byFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([f, n]) => `  ${n}  ${f}`)
      .join("\n");
    expect(
      total,
      `Sub-44px interactive elements rose to ${total}, ceiling ${MAX_SMALL_TARGETS}.\n` +
        `WCAG 2.5.5 wants 44x44. Give the control real padding where the layout\n` +
        `has room, or app/globals.css .hit-44 where it does not, then lower the\n` +
        `ceiling in this file. Worst offenders:\n${worst}`,
    ).toBeLessThanOrEqual(MAX_SMALL_TARGETS);
  });

  it("the .hit-44 utility the fixes rely on is still defined", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44::after\s*\{/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});

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
//
// 49 -> 46 when components/admin/preview/PurifyShopifyAdmin.tsx was deleted in
// v5. That file was 826 lines of dead Polaris mockup behind /admin/preview,
// imported by nothing, and it held three of the offenders. The ceiling was at
// exactly 49 with the tree at 49, so the redesign had no room for a single
// compact control until it went.
//
// 46 -> 40 on 2026-09-28, with the saved, reading and Florilegium redesign:
// its new controls went in at 44px, the Discord first-open card's two buttons
// went from 40 to 44, and the 40px icon tile became a named constant
// (Graphite ICON_TILE_SM) so a tall row that shows one is no longer read as a
// small target.
//
// 40 -> 39 on 2026-10-15 (1.7): the old floating ambience controller went,
// ambience moved into the reader's settings at 44px.
//
// 39 -> 35 on 2026-10-16 (1.7), with the one phone tab bar (MobileHeader):
// the bar's Support lamp and the dead one in MobileTopBar went, Today's old
// bar and its 40px bell went, and You's 36px settings mark left the bar. The
// search, the bell and the Premium pill's box are 44px on every tab.
//
// 35 -> 33 on 2026-10-28 (1.8), with the Bible reader as the owner's pick B
// of round 2, "The page": the reader's bookmark and settings icons left the
// bar for two round buttons with 44px touch boxes, and the chapter's name on
// the pill is h-11, over 44px. The tree stood at 34 before it, one under the
// line.
// 33 -> 29 on 2026-11-08 (1.9, build 88 note 5, found by
// scripts/mock-check.mjs): the shared sheet's close and the phone top bar's
// menu button were h-10 w-10, 42.5px on the app's 17px root, and are h-11
// w-11. The top bar's back button had the same size in a class constant this
// count cannot see, and went to h-11 w-11 with them. The tree stood at 31
// before it.
// 29 -> 28 on 2026-11-10 (1.9, the arbiter's guardrail list from the Themes
// chat's scripts/mock-check.mjs run on John 1): the chapter pill's two arrows
// were h-10 w-10, 42.5px, and are 44 to the touch with .hit-44, as the audio
// dock's arrows already were. The 44 commentary markers on the same page,
// about 14 by 5 drawn, had a 24px touch box in a class constant this count
// cannot see, and are .hit-44 with them (held below).
const MAX_SMALL_TARGETS = 28;

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

  it("the Bible's commentary markers and the chapter pill's arrows are 44px to the touch", () => {
    const verse = readFileSync(join(ROOT, "components/bible/VerseRow.tsx"), "utf8");
    // Beside the marker, never over a word: before a verse, and after a drop-capped first verse.
    expect(verse).toContain('const TAP_TARGET = "touch-manipulation hit-44 hit-44-lead";');
    expect(verse).toContain('const TAP_TARGET_AFTER = "touch-manipulation hit-44 hit-44-trail";');
    expect((verse.match(/^\s*TAP_TARGET,$/gm) ?? []).length).toBe(1);
    expect((verse.match(/^\s*TAP_TARGET_AFTER,$/gm) ?? []).length).toBe(1);
    // The squares' gap is the markers' own (0.375rem, spacing 1.5), and it is logical.
    expect(verse).toContain('<span className="inline-flex items-baseline me-1.5 align-super">');
    expect(verse).toContain('<span className="inline-flex items-baseline ms-1.5 align-super">');
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44\.hit-44-lead::after \{\s*inset-inline-end: -0\.375rem;\s*\}/);
    expect(css).toMatch(/\.hit-44\.hit-44-trail::after \{\s*inset-inline-start: -0\.375rem;\s*\}/);
    const pill = readFileSync(join(ROOT, "components/bible/MobileChapterPill.tsx"), "utf8");
    const link = pill.slice(pill.indexOf("<Link"), pill.indexOf(">", pill.indexOf("className=", pill.indexOf("<Link"))));
    expect(link).toMatch(/className="hit-44 h-10 w-10 /);
  });

  it("the small text links the same checkMock run found are 44px to the touch", () => {
    // John 1's links to the neighbouring books (41 by 19) and Today's "See all" (51 by 19).
    const pager = readFileSync(join(ROOT, "components/bible/ChapterPager.tsx"), "utf8");
    expect((pager.match(/className="hit-44 hover:text-paper transition-colors"/g) ?? []).length).toBe(2);
    const pray = readFileSync(join(ROOT, "components/today/PrayNowCard.tsx"), "utf8");
    expect(pray).toContain('className="hit-44 tap-press inline-flex items-center gap-0.5');
  });

  it("Theology's councils heading, a 22px line of words, is 44px to the touch", () => {
    const lib = readFileSync(join(ROOT, "components/theology/TheologyLibrary.tsx"), "utf8");
    expect(lib).toContain('<Link href="/councils" className="hit-44 tap-press flex items-baseline justify-between gap-3">');
  });

  it("the .hit-44 utility the fixes rely on is still defined", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    expect(css).toMatch(/\.hit-44::after\s*\{/);
    expect(css).toMatch(/min-height:\s*44px/);
  });
});

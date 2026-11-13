// The running line over the reader's pill stands on the page's own colour,
// never across the words under it (fresh eyes L2, 2026-11-11: "The Bible's
// 'v 7 of 38 · 3 min left' line lies across the verse under it", and the
// same on a Father's work, "Hymn I of 19 · 13 min left"). The fade under the
// pill was 62% to 77% where the line stands, and the verse showed on either
// side of its words. While the line is open the fade is solid up to its top
// (Night sky, Linen, and any look on a wide screen), and a look with a picture
// at its foot lifts the whole foot by the same measure.
//
// What would go wrong if this broke: the verse shows on either side of the
// line's words again, and the line reads as written across it. The export
// walk that measures it pixel by pixel is the session's l2 probe, recorded in
// docs/1.9-build/notes/fresh-eyes.md, L2.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const CSS = read("app/globals.css");
const STATUS = read("components/bible/ChapterVerseStatus.tsx");
const WORK = read("components/saints/MobileWorkPill.tsx");
const CHAPTER_PILL = read("components/bible/MobileChapterPill.tsx");

/** The open line and the pill under it, from their own classes, as px plus rem. */
function openLine(): { px: number; rem: number } {
  const eyebrow = Number(/--text-eyebrow:\s*(\d+(?:\.\d+)?)px/.exec(CSS)?.[1]);
  expect(eyebrow).toBeGreaterThan(0);
  // The words: the eyebrow size at 1.35, 0.125rem above and below.
  for (const src of [STATUS, WORK]) {
    expect(src).toContain("rounded-pill bg-night px-2.5 py-0.5 font-sans text-eyebrow font-medium leading-[1.35]");
  }
  // Under them the 0.375rem gap and the pill's 3.5rem.
  for (const [file, src] of [["MobileChapterPill", CHAPTER_PILL], ["MobileWorkPill", WORK]] as const) {
    expect(src, file).toContain("fixed inset-x-0 z-40 flex flex-col items-center gap-1.5 px-4");
    expect(src, file).toMatch(/"(?:reader-pill-in )?flex h-14 min-w-0 max-w-full items-center/);
  }
  return { px: eyebrow * 1.35, rem: 0.25 + 0.375 + 3.5 };
}

/** The ramp of the fade under the pill, from transparent to the page's colour. */
const RAMP = Number(/\.pill-fade \{[^}]*var\(--color-night\) (\d+)px\)/.exec(CSS)?.[1]);

describe("the running line over the reader's pill", () => {
  it("says when it is open, on a chapter and on a Father's work", () => {
    expect(STATUS).toContain('data-running-line=""');
    expect(STATUS).toContain('data-open={show ? "" : undefined}');
    expect(WORK).toContain('data-running-line=""');
    expect(WORK).toContain('data-open={show && text ? "" : undefined}');
    // Each stands right under the pill's container, where the rule looks for it.
    expect(CHAPTER_PILL).toMatch(/pill-fade pointer-events-none absolute inset-x-0 -z-10" \/>\s*\{\/\*[\s\S]*?\*\/\}\s*<ChapterVerseStatus/);
    expect(WORK).toMatch(/pill-fade pointer-events-none absolute inset-x-0 -z-10" \/>\s*<RunningLine/);
  });

  it("stands where the fade is solid, 4px under its top, the words above going quiet over the same ramp", () => {
    const line = openLine();
    expect(RAMP).toBe(127);
    // Laid out at the open line's height at all times, and shifted down while the line is closed, so its top
    // stands 164px over the pill's foot then (Gate 2.0: the height eased on the page's thread came at once).
    const m = /\.pill-fade \{\s*bottom: calc\(-1 \* var\(--pill-lift, 12px\)\);\s*\/\*[\s\S]*?\*\/\s*height: calc\((\d+(?:\.\d+)?)px \+ (\d+(?:\.\d+)?)rem \+ var\(--pill-lift, 12px\)\);\s*transform: translateY\(calc\((\d+(?:\.\d+)?)rem - (\d+(?:\.\d+)?)px\)\);/.exec(CSS);
    expect(m, "the fade laid out at the open line's height").not.toBeNull();
    const [px, rem] = [Number(m![1]), Number(m![2])];
    expect(Number(m![3])).toBe(rem);
    expect(px + Number(m![4])).toBe(164);
    expect(CSS).toMatch(/\[data-screen-edge="bottom"\]:has\(> \[data-running-line\]\[data-open\]\) > \.pill-fade \{\s*transform: none;\s*\}/);
    // The same rems as the line and the pill, so it holds at any root size.
    expect(rem).toBe(line.rem);
    // The fade's solid part starts RAMP under its top: at the line's top, 4px to spare.
    expect(px - RAMP).toBeGreaterThanOrEqual(line.px + 4);
    expect(px - RAMP).toBeLessThan(line.px + 8);
  });

  it("lifts a look's foot by the same measure, only while it is open, and a browser with no @property keeps its foot", () => {
    const line = openLine();
    // Every stop of the foot's mask is measured from --foot-lift, which now carries the raise.
    expect(CSS).toContain("--foot-lift: calc(env(safe-area-inset-bottom, 0px) + var(--foot-raise, 0px));");
    expect(CSS).toMatch(/@property --foot-raise \{\s*syntax: "<length>";\s*inherits: false;\s*initial-value: 0px;\s*\}/);
    const m = /html\[data-look\]:not\(\[data-look="nightsky"\], \[data-look="linen"\]\):has\(\[data-running-line\]\[data-open\]\) body::after \{\s*--foot-raise: max\(0px, calc\(var\(--tab-bar-h\) \+ var\(--now-playing-h\) \+ var\(--readings-flow-h, 0px\) \+ (\d+(?:\.\d+)?)px \+ (\d+(?:\.\d+)?)rem - var\(--foot-solid\)\)\);/.exec(CSS);
    expect(m, "the open line's rule for a look's foot").not.toBeNull();
    const [px, rem] = [Number(m![1]), Number(m![2])];
    expect(rem).toBe(line.rem);
    // The pill stands 12px over the bars (its --pill-lift), and the line 4px under the solid part's top.
    for (const src of [CHAPTER_PILL, WORK]) expect(src).toContain('env(safe-area-inset-bottom, 0px) + 12px)"');
    expect(px).toBeGreaterThanOrEqual(12 + line.px + 4);
    expect(px).toBeLessThan(12 + line.px + 8);
  });

  it("moves on the house curve, and stays still on the reader's own motion switch", () => {
    expect(CSS).toMatch(/\.pill-fade \{\s*transition: transform 300ms var\(--ease-house\);\s*\}\s*:where\(\[data-motion="reduce"\]\) \.pill-fade \{\s*transition: none;\s*\}/);
    expect(CSS).toMatch(
      /html\[data-look\]:not\(\[data-look="nightsky"\], \[data-look="linen"\]\) body::after \{\s*transition: --foot-raise 300ms var\(--ease-house\);\s*\}\s*html\[data-look\]:not\(\[data-look="nightsky"\], \[data-look="linen"\]\):where\(\[data-motion="reduce"\]\) body::after \{\s*transition: none;\s*\}/,
    );
  });
});

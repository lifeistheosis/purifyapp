// Now Playing docked beside the page on a wide screen
// (components/player/NowPlayingSheet.tsx), from 800px up.
//
// Updates 19 measured it with checkMock's pixels at 800 and 1032 (build 95,
// note 25) and found two faults the voices did not bring:
//
//   - the dim behind the docked player was bg-black/55, a black typed in: on
//     Light it stays black where every other sheet's dim takes the palette's
//     own night (components/ui/Sheet.tsx), so checkMock's palette rule failed it;
//   - the docked player stayed on the right in Arabic, its edge on its left
//     (md:left-auto md:border-l md:translate-x-full): placed by left and
//     right, not by start and end, so checkMock's mirror rule failed it.
//
// Both fail here on the code before the mend.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const SHEET = read("components/player/NowPlayingSheet.tsx");

/** The class list of the first element after `marker` (its className string or cn(...) call, to the first `>`). */
function classesAfter(source: string, marker: string): string {
  const at = source.indexOf(marker);
  expect(at, `${marker} is in NowPlayingSheet.tsx`).toBeGreaterThan(-1);
  const rest = source.slice(at);
  return rest.slice(0, rest.indexOf("\n      >") > -1 ? rest.indexOf("\n      >") : rest.indexOf("/>"));
}

describe("Now Playing docked on a wide screen", () => {
  it("dims the page with the house's own dim, the palette's night, as every sheet does", () => {
    const dim = classesAfter(SHEET, "onClick={closeNowPlaying}\n        className");
    const house = /\bbg-night\/(\d+)\b/.exec(read("components/ui/Sheet.tsx"));
    expect(house, "the house sheet's dim is the palette's night").not.toBeNull();
    expect(dim).toContain(`bg-night/${house![1]}`);
    expect(dim).not.toMatch(/\bbg-black\b|bg-\[#|rgba?\(/);
  });

  it("docks at the end of the line and leaves that way, so it mirrors in Arabic", () => {
    const panel = classesAfter(SHEET, 'data-mock-why="the player\'s edge, docked beside the page on a wide screen"');
    // Placed by start and end: the right in English, the left in Arabic.
    expect(panel).toContain("md:start-auto");
    expect(panel).toContain("md:border-s");
    expect(panel).not.toMatch(/\bmd:(left|right)-auto\b|\bmd:border-[lr]\b/);
    // It leaves toward its own side: right in English, left in Arabic.
    expect(panel).toContain("md:translate-x-full");
    expect(panel).toContain("md:rtl:-translate-x-full");
  });
});

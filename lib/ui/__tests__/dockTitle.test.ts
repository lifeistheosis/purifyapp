// The reader's dock (components/bible/ReaderDock.tsx), build 98 note 2:
//  - its track name is read whole: checkMock's cut rule found "The life of
//    St. Athanasius the G..." ended by an ellipsis, and a work's part is named
//    longer than any fixed room (one past 700 letters), so a long name glides
//    slowly along its one line and begins again with no jump;
//  - its cover is carried into Now Playing as the mini player's is (Updates
//    98e's lib/player/carry.ts: "one call, noteCarryFrom(...), on the dock's
//    open button").
// What a reader would notice if this broke: a work's name cut short under the
// player with no way to read the rest there; Now Playing rising from nowhere
// when opened from the dock, though from the mini player its cover flies up.
//
// Fails on the code before the mend: no glide (the import), the name
// truncated, and the dock's two open buttons call openNowPlaying() alone.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GLIDE_GAP_PX, GLIDE_PX_PER_S, GLIDE_REST_MS, titleGlide } from "@/lib/ui/titleGlide";

const dock = fs.readFileSync(path.join(process.cwd(), "components/bible/ReaderDock.tsx"), "utf8");

describe("a long name glides along its line", () => {
  it("not at all when it fits", () => {
    expect(titleGlide(180, 216, false)).toBeNull();
    expect(titleGlide(216.5, 216, false)).toBeNull();
  });

  it("rests at its start, then glides at a reading pace", () => {
    const g = titleGlide(280, 216, false)!;
    expect(g.duration).toBe(Math.round(GLIDE_REST_MS + ((280 + GLIDE_GAP_PX) / GLIDE_PX_PER_S) * 1000));
    expect(g.keyframes[0].transform).toBe("translateX(0px)");
    expect(g.keyframes[1]).toMatchObject({ transform: "translateX(0px)", easing: "linear" });
    expect((g.keyframes[1].offset as number) * g.duration).toBeCloseTo(GLIDE_REST_MS, 5);
  });

  it("by exactly the name and its gap, so its copy ends where it began: no jump at the loop", () => {
    const g = titleGlide(280, 216, false)!;
    expect(g.to).toBe(-(280 + GLIDE_GAP_PX));
    expect(g.keyframes.at(-1)).toMatchObject({ transform: `translateX(${g.to}px)`, offset: 1 });
  });

  it("and the other way in Arabic, where it begins at the right", () => {
    expect(titleGlide(280, 216, true)!.to).toBe(280 + GLIDE_GAP_PX);
  });
});

describe("the dock", () => {
  it("draws its track name with the glide, not an ellipsis, while motion is on", () => {
    expect(dock).toMatch(/<GlideName text=\{trackName\} \/>/);
    expect(dock).not.toMatch(/className="block truncate[^"]*">\{trackName\}</);
  });

  it("carries the tapped cover into Now Playing from both its open buttons", () => {
    expect(dock).not.toMatch(/onClick=\{\(\) => openNowPlaying\(\)\}/);
    expect(dock.match(/onClick=\{openFromCover\}/g)?.length).toBe(2);
    expect(dock).toMatch(/noteCarryFrom\(e\.currentTarget\.querySelector\("img"\)\);\s*openNowPlaying\(\);/);
  });
});

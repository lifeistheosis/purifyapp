// Now Playing's tap and its close, without a long frame (build 98 note 8, his
// word of 2026-11-15: "make the music player opening more smooth"; Updates 98h).
//
// After Updates 98e the sheet slid at a frame's pace, but two frames were long
// at a phone's speed (the motion walk at CPU 4x, read in a Chrome trace with
// scripts/gate/trace-frames.mjs): the tap's, 117 to 167ms, most of it a
// restyle of the whole page, and the blurred picture's first draw after the
// slide, a 49ms decode and 70ms of raster. The restyle came from the mini
// player leaving as the sheet opened: its class on <html>, whose room at the
// foot every element inherits, went with it, 27 to 52ms each way, and came
// back on the close. Now the bar stays under the sheet, out of reach, and the
// picture behind it is read small before the tap and blurred into a small
// canvas, so no filter is drawn on the screen at all.
//
// What a reader would notice if this broke: a hitch as the sheet starts to
// rise or as it goes down, or a pause just after it lands as the soft picture
// comes.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  open: false,
  audio: {
    src: "https://audio.purifyapp.net/read/john/10.mp3",
    title: "John 10",
    artist: "St John the Theologian",
    art: "/icons/saints/john.webp",
    artFallback: null,
    playing: true,
    currentTime: 10,
    duration: 126,
  },
}));

vi.mock("@/lib/prayers/persistentAudioStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayers/persistentAudioStore")>()),
  usePersistentAudio: () => state.audio,
}));
vi.mock("@/lib/player/sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/sheet")>()),
  useNowPlayingSheet: () => ({ open: state.open, view: "cover" }),
}));
vi.mock("@/lib/ambience/player", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ambience/player")>()),
  useAmbience: () => ({ playing: null, loading: null, failed: null, volume: 0.5, balance: 0.5 }),
}));
vi.mock("@/lib/player/pagePlayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/pagePlayer")>()),
  usePagePlayer: () => [],
}));

import { NowPlayingBar } from "@/components/prayers/NowPlayingBar";
import { BACKDROP_FILTER, backdropPixels, canvasFilter, coverCrop } from "@/lib/player/backdrop";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const sheet = read("components/player/NowPlayingSheet.tsx");
const css = read("app/globals.css");

function bar(open: boolean): string {
  state.open = open;
  return renderToStaticMarkup(createElement(NowPlayingBar));
}
/** The bar's own outer tag, the one that carries data-mini-player. */
function shellOf(html: string): string {
  const at = html.indexOf("data-mini-player");
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

describe("the mini player under Now Playing", () => {
  it("stays where it is when Now Playing opens, so the page keeps its room and is not restyled", () => {
    expect(bar(false)).toContain("data-mini-player");
    const open = bar(true);
    expect(open).toContain("data-mini-player");
    // The room at the foot is set on <html> while the bar is mounted; it stays mounted.
    expect(read("components/prayers/NowPlayingBar.tsx")).toMatch(/const visible = \(Boolean\(src\) && !playsOnPage\(src, ownOnly\)\) \|\| soundOnly;/);
  });

  it("is out of reach and out of hearing under the sheet, and back in reach when it closes", () => {
    const shell = shellOf(bar(true));
    expect(shell).toContain("data-under-sheet");
    expect(shell).toMatch(/inert=""/);
    expect(shell).toContain('aria-hidden="true"');
    const shut = shellOf(bar(false));
    expect(shut).not.toContain("data-under-sheet");
    expect(shut).not.toContain("inert");
  });

  it("is unseen beside the wide screen's panel, by a rule on itself and never on <html>", () => {
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\[data-mini-player\]\[data-under-sheet\] \{\s*visibility: hidden;/);
    expect(css).not.toMatch(/html[^{]*\.now-playing-open/);
  });
});

describe("the soft picture behind Now Playing", () => {
  it("is blurred into a small canvas, with no filter left on the screen where a canvas takes one", () => {
    expect(sheet).toMatch(/<canvas\s+ref=\{paintRef\}/);
    expect(sheet).not.toContain('style={{ filter: "grayscale(1) blur(42px) brightness(0.5)" }}');
    // Only where the canvas cannot take a filter does the cover keep it.
    expect(sheet).toMatch(/bakes \? \(/);
    expect(BACKDROP_FILTER).toBe("grayscale(1) blur(42px) brightness(0.5)");
  });

  it("is read before the tap, while the player stands closed and the page is idle", () => {
    expect(sheet).toMatch(/if \(!ready \|\| !art \|\| !bakes \|\| !holder \|\| !slab\) return;/);
    expect(sheet).toMatch(/requestIdleCallback/);
    // Still drawn only once the slide has ended, and taken away as it goes down: no blur moves.
    expect(sheet).toMatch(/\{audio\.art && up && settled \? \(/);
  });

  it("is cropped as the cover's box crops it, at an eighth of its size, the blur scaled with it", () => {
    // A landscape picture in a phone's tall box: the full height, the middle of the width.
    const crop = coverCrop({ width: 1000, height: 800 }, { width: 518, height: 972 });
    expect(crop.sh).toBe(800);
    expect(crop.sy).toBe(0);
    expect(crop.sw).toBeCloseTo((518 / 972) * 800, 6);
    expect(crop.sx).toBeCloseTo((1000 - crop.sw) / 2, 6);
    // A square picture in a wide box: the full width, the middle of the height.
    const wide = coverCrop({ width: 600, height: 600 }, { width: 568, height: 400 });
    expect(wide.sw).toBe(600);
    expect(wide.sh).toBeCloseTo((400 / 568) * 600, 6);
    expect(backdropPixels({ width: 518, height: 972 })).toEqual({ width: 65, height: 122 });
    expect(backdropPixels({ width: 2, height: 2 })).toEqual({ width: 1, height: 1 });
    expect(canvasFilter()).toBe("grayscale(1) blur(5.25px) brightness(0.5)");
  });
});

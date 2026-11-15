// A verse link's chapter is drawn at its verse from its first frame with
// motion reduced (Gate 3c rule 3; docs/handoffs/updates-89.md). Each case
// fails on the code before the mend.
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import * as place from "../readingPlace";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const FLASH = "components/bible/VerseFocusFlash.tsx";

/** Frames asked for, held until a case lets one run. */
function holdFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  return frames;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a verse link's chapter, arriving", () => {
  // Cause 1: the landing waited for React's passive effect and then a frame,
  // so the chapter was painted at its top (or the page left's scroll) first.
  // Cause 2: it scrolled inside a frame's callbacks, after that frame's scroll
  // steps, so the running line heard of it a frame later (the fade 582 then
  // 530, James 1's line 27px sideways).
  it("goes before the first paint with motion reduced: after the commit, in a microtask, never in a frame", async () => {
    const frames = holdFrames();
    const go = vi.fn();
    place.goOnArrival(go, true);
    // Not inside the commit: Next's own scroll for the route runs after the page's layout effects.
    expect(go).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(go).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  });

  it("glides from the next frame with motion on, as it did", async () => {
    const frames = holdFrames();
    const go = vi.fn();
    place.goOnArrival(go, false);
    await Promise.resolve();
    expect(go).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);
    frames[0](0);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("is set off while the page is put on screen: a layout effect, not a passive one", () => {
    const src = read(FLASH);
    expect(src).toMatch(/useIsoLayoutEffect\(\(\) => \{[\s\S]*focusFromHash\(true\);/);
    expect(src).not.toMatch(/\buseEffect\(\(\) =>/);
  });

  it("lands an arrival through goOnArrival, and only a change of the hash on the page waits a frame", () => {
    const src = read(FLASH);
    expect(src).toMatch(/if \(arriving\) goOnArrival\(land\);\s*else requestAnimationFrame\(land\);/);
    expect(src).not.toMatch(/requestAnimationFrame\(\(\) => \{\s*const head/);
  });

  it("never lands for a page already left (the effect's cleanup)", () => {
    const src = read(FLASH);
    expect(src).toMatch(/const land = \(\) => \{\s*if \(!live\) return;/);
    expect(src).toMatch(/return \(\) => \{\s*live = false;/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { WAKE_FRAME_MS, houseEase, seen, wakeClock } from "@/lib/player/wordsGlide";

/**
 * The player's words as they wake (Updates 75). Round 5 filmed them on the
 * export of d6bef349d (scripts/ambience-open-walk.mjs --film, each frame read
 * where it is painted): with motion on, while the ambience sheet was open the
 * line being read moved from 1 to 2, and in the one frame the sheet left the
 * words scrolled from 55 to 142px. LiveCaptions' wake placed them at once
 * (scrollTo(top, false)) over the glide its line effect had just begun. They
 * now glide there where they can be seen, paced by the frames; the Words view
 * chosen from Cover is still placed at once while its panel stands at opacity
 * 0, before its fade begins (the film: 87px at 123ms, the fade from 185ms).
 */

const CAPTIONS = readFileSync(join(process.cwd(), "components", "player", "LiveCaptions.tsx"), "utf8");
const MOVE_MS = 520;

/** The wake effect's body: from its comment to its deps. */
function wakeEffect(): string {
  const end = CAPTIONS.indexOf("}, [active]);");
  expect(end, "the effect run when the words wake").toBeGreaterThan(-1);
  const start = CAPTIONS.lastIndexOf("useLayoutEffect(", end);
  return CAPTIONS.slice(start, end);
}

/** Where a glide of `d`px stands at each frame time, on the clock given. */
function glide(times: number[], clock: (now: number) => number, d: number): number[] {
  return times.map((t) => d * houseEase(clock(t)));
}

describe("the words, woken where they can be seen, glide to the line being read", () => {
  it("glides on the wake's paced clock where the words are seen, and places them at once where they are not", () => {
    const body = wakeEffect();
    expect(body).toMatch(/if \(seen\(boxRef\.current\)\) scrollTo\(top, true, wakeClock\(MOVE_MS\)\);/);
    expect(body).toMatch(/else scrollTo\(top, false\);/);
    // The old wake: in place, whatever could be seen.
    expect(body).not.toMatch(/if \(top !== null\) scrollTo\(top, false\);/);
  });

  it("keeps Purify's motion off as it was: scrollTo places the words at once when motion is reduced, on any clock", () => {
    const start = CAPTIONS.indexOf("function scrollTo(top: number, smooth: boolean, clock?: (now: number) => number)");
    expect(start).toBeGreaterThan(-1);
    const fn = CAPTIONS.slice(start, CAPTIONS.indexOf("scrolling.current = requestAnimationFrame(step);", start));
    expect(fn).toContain("if (!smooth || reduced() || Math.abs(top - from) < 1) {");
    expect(fn).toContain("box.scrollTop = top;");
    // Every other glide keeps the wall's clock, in step with the rows' own move (flip).
    expect(fn).toContain("const p = clock ? clock(now) : Math.min(1, (now - start) / MOVE_MS);");
  });

  it("draws the curve from the one module, unchanged", () => {
    expect(CAPTIONS).toContain('import { houseEase, seen, wakeClock } from "@/lib/player/wordsGlide";');
    expect(CAPTIONS).not.toContain("function houseEase(");
    expect(houseEase(0)).toBe(0);
    expect(houseEase(1)).toBeCloseTo(1, 6);
    let last = 0;
    for (let i = 1; i <= 100; i++) {
      const v = houseEase(i / 100);
      expect(v).toBeGreaterThanOrEqual(last - 1e-9);
      last = v;
    }
    // cubic-bezier(0.22, 1, 0.36, 1) at x = 0.5 stands at about 0.94.
    expect(houseEase(0.5)).toBeGreaterThan(0.9);
  });
});

describe("the wake's clock", () => {
  it("stands its first frame at the start and counts no frame for more than two at 60Hz", () => {
    const clock = wakeClock(MOVE_MS);
    expect(clock(1000)).toBe(0);
    expect(clock(1100)).toBeCloseTo(WAKE_FRAME_MS / MOVE_MS, 9);
    expect(clock(1116)).toBeCloseTo((WAKE_FRAME_MS + 16) / MOVE_MS, 9);
    // A time before the last counts nothing.
    expect(clock(1110)).toBeCloseTo((WAKE_FRAME_MS + 16) / MOVE_MS, 9);
    expect(clock(99999)).toBeCloseTo((2 * WAKE_FRAME_MS + 16) / MOVE_MS, 9);
  });

  it("runs the whole glide at 60Hz in its own time and ends at the line", () => {
    const clock = wakeClock(MOVE_MS);
    const times = Array.from({ length: 40 }, (_, i) => i * 16.7);
    const at = times.map(clock);
    expect(at[0]).toBe(0);
    expect(at.findIndex((p) => p === 1)).toBe(32);
    expect(at[at.length - 1]).toBe(1);
  });

  it("carries no frame over half of the way, though the wake's own frame is long (round 5's, 85 and 100ms)", () => {
    const d = 87;
    for (const wakeFrame of [85, 100, 250]) {
      // The wake runs in one frame; the next comes `wakeFrame` later, then a phone's frames at CPU 4x.
      const times = [0, wakeFrame, wakeFrame + 21, wakeFrame + 44, wakeFrame + 120, wakeFrame + 139];
      for (let t = wakeFrame + 160; t < wakeFrame + 2400; t += 20) times.push(t);
      const at = glide(times, wakeClock(MOVE_MS), d);
      const steps = at.slice(1).map((p, i) => p - at[i]);
      expect(Math.max(...steps), `a ${wakeFrame}ms wake frame`).toBeLessThan(d / 2);
      expect(at[0]).toBe(0);
      expect(at[at.length - 1]).toBeCloseTo(d, 6);
      // The wall's clock would have put over half of the way into that one frame.
      expect(houseEase(Math.min(1, wakeFrame / MOVE_MS)) * d).toBeGreaterThan(d / 2);
    }
  });

  it("covers under two fifths of a glide in WAKE_FRAME_MS, so no single frame can carry half", () => {
    expect(houseEase(WAKE_FRAME_MS / MOVE_MS)).toBeLessThan(0.4);
  });
});

describe("whether the words can be seen", () => {
  type Node = { opacity: string; parentElement: Node | null };
  const chain = (...opacities: string[]): Node => {
    let node: Node | null = null;
    for (const opacity of [...opacities].reverse()) node = { opacity, parentElement: node };
    return node!;
  };
  afterEach(() => vi.unstubAllGlobals());

  it("is not seen while anything it stands in is at opacity 0 (the Words panel under Cover, or as its fade begins)", () => {
    vi.stubGlobal("getComputedStyle", (n: Node) => ({ opacity: n.opacity }));
    // The box, its panel, the sheet, the page.
    expect(seen(chain("1", "0", "1", "1") as unknown as Element)).toBe(false);
    expect(seen(chain("0") as unknown as Element)).toBe(false);
    // Under a sheet over the player the words stand at full strength behind its scrim.
    expect(seen(chain("1", "1", "1", "1") as unknown as Element)).toBe(true);
    // Fading back out to Cover, still part seen.
    expect(seen(chain("1", "0.4", "1") as unknown as Element)).toBe(true);
  });
});

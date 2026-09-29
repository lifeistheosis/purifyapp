import { describe, expect, it } from "vitest";

import {
  REMEASURE_OK_MS,
  REMEASURE_SLOW_MS,
  SLOW_FRAME_MS,
  classifyFrames,
  hintSlow,
  isStale,
  slowFrom,
} from "../deviceSpeed";

const run = (ms: number, n = 90) => Array.from({ length: n }, () => ms);

describe("the frame verdict", () => {
  it("calls a 60 Hz or 120 Hz phone fine", () => {
    expect(classifyFrames(run(16.7))).toBe("ok");
    expect(classifyFrames(run(8.3))).toBe("ok");
  });

  it("calls a phone drawing near 30 frames a second slow", () => {
    expect(classifyFrames(run(33.3))).toBe("slow");
  });

  it("does not condemn a good phone for a few long frames", () => {
    // A garbage collection or an image decode: 20 long frames in 90.
    const frames = [...run(16.7, 70), ...run(120, 20)];
    expect(classifyFrames(frames)).toBe("ok");
  });

  it("draws the line just past about 42 frames a second", () => {
    expect(classifyFrames(run(SLOW_FRAME_MS))).toBe("ok");
    expect(classifyFrames(run(SLOW_FRAME_MS + 1))).toBe("slow");
  });

  it("says nothing on too little to go on, or on junk", () => {
    expect(classifyFrames(run(16.7, 10))).toBeNull();
    expect(classifyFrames([...run(Number.NaN, 60), ...run(-5, 20)])).toBeNull();
  });
});

describe("the hardware hints", () => {
  it("treats 2 GB or less, or two cores or fewer, as slow", () => {
    expect(hintSlow({ deviceMemory: 2 })).toBe(true);
    expect(hintSlow({ deviceMemory: 1 })).toBe(true);
    expect(hintSlow({ hardwareConcurrency: 2 })).toBe(true);
  });

  it("gives an iPhone, which reports no memory, the benefit of the doubt", () => {
    expect(hintSlow({ hardwareConcurrency: 6 })).toBe(false);
    expect(hintSlow({})).toBe(false);
  });

  it("lets a measurement overrule the hints, both ways", () => {
    expect(slowFrom("ok", { deviceMemory: 1 })).toBe(false);
    expect(slowFrom("slow", { deviceMemory: 8, hardwareConcurrency: 8 })).toBe(true);
    expect(slowFrom(null, { deviceMemory: 1 })).toBe(true);
  });
});

describe("taking it again", () => {
  const now = 1_800_000_000_000;

  it("measures a device never measured", () => {
    expect(isStale(null, 0, now)).toBe(true);
  });

  it("keeps a good verdict for a week and gives a slow one another look next day", () => {
    expect(isStale("ok", now - REMEASURE_OK_MS + 1000, now)).toBe(false);
    expect(isStale("ok", now - REMEASURE_OK_MS - 1000, now)).toBe(true);
    expect(isStale("slow", now - REMEASURE_SLOW_MS + 1000, now)).toBe(false);
    expect(isStale("slow", now - REMEASURE_SLOW_MS - 1000, now)).toBe(true);
  });
});

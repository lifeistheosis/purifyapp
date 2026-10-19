// How loud the ambience plays (1.7, the ambience sheet's volume and balance).
//
// The reading voice is never made quieter: an iPhone ignores an audio
// element's volume, and routing the voice through Web Audio would stop it
// when the screen goes off. So the balance lowers the ambience alone, and
// only while the voice is playing. These hold the arithmetic.

import { describe, expect, it } from "vitest";

import { DEFAULT_BALANCE, DEFAULT_VOLUME, DUCK_FLOOR, clamp01, mixGain, readLevel } from "@/lib/ambience/mix";

describe("the ambience's level", () => {
  it("is the volume when nothing else plays", () => {
    expect(mixGain(0.55, 0, false)).toBe(0.55);
    expect(mixGain(1, 0.2, false)).toBe(1);
    expect(mixGain(0, 1, false)).toBe(0);
  });

  it("starts where the ambience always played", () => {
    expect(DEFAULT_VOLUME).toBe(0.55);
    expect(mixGain(DEFAULT_VOLUME, DEFAULT_BALANCE, false)).toBe(0.55);
  });

  it("steps back under the voice, by the balance", () => {
    // The voice end keeps the sound faintly there; the sound end leaves it whole.
    expect(mixGain(1, 0, true)).toBeCloseTo(DUCK_FLOOR);
    expect(mixGain(1, 1, true)).toBeCloseTo(1);
    expect(mixGain(0.5, 0.5, true)).toBeCloseTo(0.5 * (DUCK_FLOOR + (1 - DUCK_FLOOR) * 0.5));
    // The default sits nearer the voice: about half the volume while it reads.
    expect(mixGain(1, DEFAULT_BALANCE, true)).toBeCloseTo(0.49);
  });

  it("is never louder under the voice than alone, and rises with the balance", () => {
    let last = -1;
    for (let b = 0; b <= 1.0001; b += 0.05) {
      const g = mixGain(0.8, b, true);
      expect(g).toBeLessThanOrEqual(mixGain(0.8, b, false) + 1e-9);
      expect(g).toBeGreaterThanOrEqual(last);
      last = g;
    }
  });

  it("keeps every level between silence and full", () => {
    expect(mixGain(3, 2, true)).toBeLessThanOrEqual(1);
    expect(mixGain(-1, -1, true)).toBe(0);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("a level kept on the device", () => {
  it("is read back as it was kept", () => {
    expect(readLevel("0.30", 0.55)).toBe(0.3);
    expect(readLevel("0", 0.55)).toBe(0);
    expect(readLevel("1", 0.55)).toBe(1);
  });

  it("is the default when there is none, or it is not a level", () => {
    for (const raw of [null, "", "  ", "loud", "2", "-0.1", "NaN"]) expect(readLevel(raw, 0.4), String(raw)).toBe(0.4);
  });
});

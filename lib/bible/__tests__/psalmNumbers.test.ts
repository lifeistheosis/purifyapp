import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import { hebrewLine, hebrewOf, septuagintOf } from "../psalmNumbers";

describe("the Psalms in both numberings", () => {
  it("knows the psalms readers look for by the Hebrew number", () => {
    // The Lord is my shepherd; Have mercy on me; He that dwelleth in the
    // help of the Most High; the Great Psalm (the 17th kathisma).
    expect(septuagintOf(23)).toEqual([22]);
    expect(septuagintOf(51)).toEqual([50]);
    expect(septuagintOf(91)).toEqual([90]);
    expect(septuagintOf(119)).toEqual([118]);
    expect(hebrewOf(22)).toEqual({ kind: "one", n: 23 });
    expect(hebrewOf(50)).toEqual({ kind: "one", n: 51 });
  });

  it("splits and joins where the two Psalters do", () => {
    expect(hebrewOf(9)).toEqual({ kind: "two", a: 9, b: 10 });
    expect(septuagintOf(10)).toEqual([9]);
    expect(hebrewOf(113)).toEqual({ kind: "two", a: 114, b: 115 });
    expect(septuagintOf(116)).toEqual([114, 115]);
    expect(septuagintOf(147)).toEqual([146, 147]);
    expect(hebrewOf(151)).toEqual({ kind: "none" });
  });

  it("goes there and back for every Hebrew psalm", () => {
    for (let h = 1; h <= 150; h++) {
      const ours = septuagintOf(h);
      expect(ours.length, `Hebrew ${h}`).toBeGreaterThan(0);
      for (const lxx of ours) {
        const back = hebrewOf(lxx);
        const names =
          back.kind === "same" ? [lxx] : back.kind === "one" ? [back.n] : back.kind === "two" ? [back.a, back.b] : back.kind === "part" ? [back.n] : [];
        expect(names, `Hebrew ${h} -> ours ${lxx}`).toContain(h);
      }
    }
  });

  it("covers our 151 and says nothing where the numbers agree", () => {
    for (let lxx = 1; lxx <= 151; lxx++) {
      const line = hebrewLine(lxx);
      const same = lxx <= 8 || (lxx >= 148 && lxx <= 150);
      expect(line === null, `ours ${lxx}`).toBe(same);
      if (line) expect((en as Record<string, string>)[line.key], line.key).toBeTruthy();
    }
  });
});

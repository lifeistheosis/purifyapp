// The profile-open walk's rule for the card's height between frames
// (lib/profile/cardSteps.ts; scripts/profile-open-walk.mjs; build 97 note 6).
//
// What a reader would notice if this broke: a profile whose card leaps to its
// full height in one frame as the profile comes, while the walk says PASS.
// The frames below are the walk's own, [ms from the tap, card height px], from
// the picture case on one export (09734eb4), 390x844, CPU 4x, Updates 71.

import { describe, expect, it } from "vitest";

import { oneFrameJumps, type CardFrame } from "@/lib/profile/cardSteps";

const frames = (pairs: [number, number][]): CardFrame[] => pairs.map(([t, h]) => ({ t, h }));

// The step Updates 66 measured, as the walk read it until Updates 71 (in a
// task after the paint): 566, 776, 566px in three frames, then eased up.
const A_RUN_1 = frames([[959, 566], [975, 566], [992, 776], [1009, 566], [1092, 566], [1125, 606], [1142, 641], [1159, 671], [1175, 696], [1192, 715], [1209, 731], [1225, 742], [1242, 751], [1259, 758], [1275, 763], [1292, 767], [1309, 769], [1325, 772], [1342, 773]]);
const A_RUN_3 = frames([[926, 566], [943, 566], [960, 776], [976, 566], [1060, 566], [1093, 606], [1110, 641], [1126, 671], [1143, 696], [1160, 716], [1176, 731], [1193, 742], [1210, 751], [1226, 758], [1243, 763], [1260, 767], [1276, 769], [1293, 771], [1310, 773], [1326, 774]]);
// The same opening read as it is painted: the hand-over from the first frame.
const PAINTED = frames([[991, 566], [1058, 566], [1091, 606], [1108, 641], [1125, 671], [1141, 696], [1158, 716], [1174, 731], [1191, 742], [1208, 751], [1225, 758], [1241, 763], [1258, 767], [1274, 769], [1291, 772], [1308, 773]]);
// A post's author, painted: a 66ms frame (the CPU) carried 90 of the 207px.
const LONG_FRAME = frames([[1036, 566], [1236, 566], [1286, 606], [1303, 641], [1369, 731], [1403, 751], [1436, 763], [1486, 772], [1503, 773]]);

/** The walk's check before Updates 71: a growth over 100px fails only when it took fewer than 3 changing frames. */
const oldRuleFails = (f: CardFrame[]) => {
  const changing = f.slice(1).filter((x, i) => Math.abs(x.h - f[i].h) > 1).length;
  return Math.abs(f[f.length - 1].h - f[0].h) > 100 && changing < 3;
};

describe("the card's height between frames (oneFrameJumps)", () => {
  it("fails A's step, which the walk's old check passed", () => {
    for (const run of [A_RUN_1, A_RUN_3]) {
      expect(oldRuleFails(run)).toBe(false);
      const jumps = oneFrameJumps(run);
      expect(jumps.length).toBeGreaterThan(0);
      expect(jumps[0].step).toBe(210);
    }
  });

  it("passes the hand-over as it is painted, and a long frame the CPU made", () => {
    expect(oneFrameJumps(PAINTED)).toEqual([]);
    expect(oneFrameJumps(LONG_FRAME)).toEqual([]);
  });

  it("fails a whole growth in one short frame, and a shrink", () => {
    expect(oneFrameJumps(frames([[0, 566], [17, 566], [34, 776], [51, 776]]))).toEqual([{ at: 34, step: 210, growth: 210 }]);
    expect(oneFrameJumps(frames([[0, 776], [17, 566], [34, 566]]))).toEqual([{ at: 17, step: -210, growth: -210 }]);
  });

  it("leaves a change a reader does not follow alone", () => {
    expect(oneFrameJumps(frames([[0, 566], [17, 596]]))).toEqual([]);
    expect(oneFrameJumps(frames([[0, 566]]))).toEqual([]);
  });

  it("never judges the house curve's first two frames a jump, whatever the CPU", () => {
    // cubic-bezier(0.22, 1, 0.36, 1) over 380ms (useDraggableSheet, SNAP_MS and EASE): its progress after 34ms.
    const bez = (a: number, b: number, s: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (bez(0.22, 0.36, mid) < 34 / 380) lo = mid;
      else hi = mid;
    }
    expect(bez(1, 1, lo)).toBeLessThan(0.5);
  });
});

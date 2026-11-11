// A council's row keeps the Father the reader chose, for when they come
// back (1.9, build 93 note 1; the story is in ../fatherShown.ts).
//
// What a reader would notice if this broke: they choose St Alexander on
// Nicaea's page, open him by the card, press Back, and the row has begun
// again at St Athanasius. Or the other way: a fresh visit to a council opens
// on whoever they looked at last week.

import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

let back = false;
vi.mock("@/lib/ui/scrollReset", () => ({ cameBack: () => back }));

import { fatherKept, forgetFather, keepFather, resetFatherShownForTests } from "../fatherShown";

const NICAEA = "/councils/first-nicaea/";

beforeEach(() => {
  back = false;
  resetFatherShownForTests();
});

describe("the Father a council's row was showing", () => {
  it("is given back to a reader who has come back to the page", () => {
    keepFather(NICAEA, "St. Alexander of Alexandria");
    back = true;
    expect(fatherKept(NICAEA)).toBe("St. Alexander of Alexandria");
  });

  it("and not to one who has gone forward to it: a fresh visit begins at the first Father", () => {
    keepFather(NICAEA, "St. Alexander of Alexandria");
    back = false;
    expect(fatherKept(NICAEA)).toBeNull();
  });

  it("each page keeps its own, and the last one chosen is the one kept", () => {
    keepFather(NICAEA, "St. Alexander of Alexandria");
    keepFather("/councils/chalcedon/", "St. Leo the Great");
    keepFather(NICAEA, "St. Spyridon of Trimythous");
    back = true;
    expect(fatherKept(NICAEA)).toBe("St. Spyridon of Trimythous");
    expect(fatherKept("/councils/chalcedon/")).toBe("St. Leo the Great");
    expect(fatherKept("/councils/ephesus/")).toBeNull();
  });

  it("a visit that went forward lets go of what an earlier visit chose", () => {
    keepFather(NICAEA, "St. Alexander of Alexandria");
    forgetFather(NICAEA);
    back = true;
    expect(fatherKept(NICAEA)).toBeNull();
  });

  it("only so many pages are kept, the oldest let go first", () => {
    for (let i = 0; i < 30; i += 1) keepFather(`/councils/c${i}/`, `Father ${i}`);
    back = true;
    expect(fatherKept("/councils/c0/")).toBeNull();
    expect(fatherKept("/councils/c5/")).toBeNull();
    expect(fatherKept("/councils/c6/")).toBe("Father 6");
    expect(fatherKept("/councils/c29/")).toBe("Father 29");
  });
});

describe("the row uses it", () => {
  const row = readFileSync(path.resolve(__dirname, "..", "..", "..", "components/councils/CouncilFathers.tsx"), "utf8");

  it("begins on the Father kept, by his name, until the reader taps another", () => {
    expect(row).toContain("const keptName = useFatherKept(pathname);");
    expect(row).toContain("fathers.findIndex((x) => x.name === keptName)");
    expect(row).toContain("picked ?? Math.max(keptAt, 0)");
  });

  it("keeps each tap, and lets go on a visit that went forward", () => {
    expect(row).toContain("keepFather(pathname, x.name);");
    expect(row).toContain("if (!cameBack()) forgetFather(pathname);");
  });
});

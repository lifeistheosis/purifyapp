// A cover that is a window onto a larger picture (1.8, the councils' books,
// the owner's pick of r3-03: "each book a window onto its council's own
// icon"). What a reader would notice if this broke: a council's books all the
// same picture, or a window pulled so far that the poster's ground shows.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { windowStyle } from "../coverWindow";

const root = join(__dirname, "..", "..", "..");
const code = (p: string) =>
  readFileSync(join(root, p), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("a cover's window", () => {
  it("keeps its point where it is in the box and draws the picture nearer about it", () => {
    expect(windowStyle({ x: 0.2, y: 0.56, zoom: 2 })).toEqual({
      objectPosition: "20% 56%",
      transformOrigin: "20% 56%",
      transform: "scale(2)",
    });
  });

  it("never draws the picture smaller than the box, nor a point outside it", () => {
    expect(windowStyle({ x: 1.4, y: -0.2, zoom: 0.6 })).toEqual({
      objectPosition: "100% 0%",
      transformOrigin: "100% 0%",
      transform: "scale(1)",
    });
  });

  it("is laid over the cover's own picture, and every row passes it on", () => {
    expect(code("components/covers/WorkCover.tsx")).toContain("crop ? windowStyle(crop) : { objectPosition: `50% ${focusY}%` }");
    expect(code("components/reading/CoverRow.tsx")).toContain("crop={card.cover?.crop}");
  });
});

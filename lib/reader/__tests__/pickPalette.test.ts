import { describe, expect, it } from "vitest";

import { pickPalette } from "@/lib/reader/pickPalette";
import { FREE_THEMES, READING_THEMES, type ReadingTheme } from "@/lib/reader/readingModes";

/**
 * A tap on a palette always does something a reader can see
 * (lib/reader/pickPalette.ts; the owner's note 3 of build 93: "When I click
 * on the stuff, it doesn't change anything").
 *
 * What a reader would notice if this broke: a tap that draws a check and
 * leaves the app as it was, or a Plus palette that neither opens nor says
 * what it needs.
 */
function tap(id: ReadingTheme, over: { worn?: ReadingTheme; plus?: boolean; locked?: boolean } = {}) {
  const done: string[] = [];
  const plus = over.plus ?? false;
  const result = pickPalette(id, {
    worn: over.worn ?? "default",
    allows: (theme) => FREE_THEMES.includes(theme) || plus,
    locked: over.locked ?? !plus,
    setTheme: (theme) => done.push(`wear ${theme}`),
    sell: () => done.push("sheet"),
  });
  return { result, done };
}

describe("a tap on a palette", () => {
  it("is worn at once by a reader who may wear it: every palette for a reader with Plus", () => {
    for (const { id } of READING_THEMES) {
      if (id === "default") continue;
      expect(tap(id, { plus: true }), id).toEqual({ result: "worn", done: [`wear ${id}`] });
    }
  });

  it("the three every reader has are worn by a reader without Plus too", () => {
    expect(tap("parchment")).toEqual({ result: "worn", done: ["wear parchment"] });
    expect(tap("black")).toEqual({ result: "worn", done: ["wear black"] });
    expect(tap("default", { worn: "parchment" })).toEqual({ result: "worn", done: ["wear default"] });
  });

  it("opens the Purify Plus sheet for a reader without Plus, on every Plus palette, and writes nothing", () => {
    for (const { id } of READING_THEMES) {
      if (FREE_THEMES.includes(id)) continue;
      expect(tap(id), id).toEqual({ result: "sold", done: ["sheet"] });
    }
  });

  it("never leaves a reader with a kept tap and no change: there is no third thing it does once the gate has answered", () => {
    for (const { id } of READING_THEMES) {
      for (const plus of [true, false]) {
        const { result, done } = tap(id, { plus, worn: "blush" });
        if (id === "blush") continue;
        expect(done.length, `${id} ${plus}`).toBe(1);
        expect(["worn", "sold"], `${id} ${plus}`).toContain(result);
      }
    }
  });

  it("on the palette the app is already in does nothing, and writes nothing", () => {
    expect(tap("dawn", { plus: true, worn: "dawn" })).toEqual({ result: "kept", done: [] });
    // After sunset with Candlelight at Vespers on, the app is in Candlelight and the reader's own palette is another:
    // a tap on Candlelight must not make it their palette by day.
    expect(tap("candlelight", { plus: true, worn: "candlelight" })).toEqual({ result: "kept", done: [] });
  });

  it("while the gate is still asking, a Plus palette waits: no sheet at a reader who may have Plus", () => {
    expect(tap("dawn", { plus: false, locked: false })).toEqual({ result: "waited", done: [] });
    // The free three never wait.
    expect(tap("parchment", { plus: false, locked: false })).toEqual({ result: "worn", done: ["wear parchment"] });
  });
});

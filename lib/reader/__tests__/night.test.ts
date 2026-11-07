// Night reading in one tap (1.9, s2-05): the rules of what it turns on and
// what it gives back. The row that uses them is
// components/reader/NightReadingRow.tsx.

import { describe, expect, it } from "vitest";

import { NIGHT_FIRST_SOUND, NIGHT_THEME, isNight, largerSize, nightSound, readBeforeNight, stopsSound } from "@/lib/reader/night";

describe("night reading", () => {
  it("reads in Candlelight, the pair the palettes have always named with Focus", () => {
    expect(NIGHT_THEME).toBe("candlelight");
  });

  it("sets the text one size larger, never past the largest", () => {
    expect(largerSize("sm")).toBe("md");
    expect(largerSize("md")).toBe("lg");
    expect(largerSize("lg")).toBe("xl");
    expect(largerSize("xl")).toBe("xl");
  });

  it("plays the reader's last sound, or rain before they have one", () => {
    expect(nightSound("peal")).toBe("peal");
    expect(nightSound(null)).toBe(NIGHT_FIRST_SOUND);
    expect(NIGHT_FIRST_SOUND).toBe("rain");
  });

  it("reads back what it put down, and nothing it cannot trust", () => {
    expect(readBeforeNight(JSON.stringify({ theme: "parchment", focus: false, size: null, sound: null }))).toEqual({
      theme: "parchment",
      focus: false,
      size: null,
      sound: null,
    });
    expect(readBeforeNight(JSON.stringify({ theme: "monastery", focus: true, size: "md", sound: "sea" }))).toEqual({
      theme: "monastery",
      focus: true,
      size: "md",
      sound: "sea",
    });
    // A palette or a sound no longer in the app, a size that is none.
    expect(readBeforeNight(JSON.stringify({ theme: "gold", focus: "yes", size: "huge", sound: "thunder" }))).toEqual({
      theme: "default",
      focus: false,
      size: null,
      sound: null,
    });
    expect(readBeforeNight(null)).toBeNull();
    expect(readBeforeNight("{not json")).toBeNull();
    expect(readBeforeNight("null")).toBeNull();
  });

  it("is on while something is kept and the page is in Candlelight; another palette chosen by hand leaves it", () => {
    const before = { theme: "default" as const, focus: false, size: null, sound: null };
    expect(isNight(before, "candlelight")).toBe(true);
    expect(isNight(before, "parchment")).toBe(false);
    expect(isNight(null, "candlelight")).toBe(false);
  });

  it("gives back silence only where there was silence, and lets a sound that was playing play on", () => {
    expect(stopsSound({ theme: "default", focus: false, size: null, sound: null }, "rain")).toBe(true);
    expect(stopsSound({ theme: "default", focus: false, size: null, sound: null }, null)).toBe(false);
    expect(stopsSound({ theme: "default", focus: false, size: null, sound: "birds" }, "birds")).toBe(false);
  });
});

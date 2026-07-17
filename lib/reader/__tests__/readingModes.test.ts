// Reading-theme ids are persisted in localStorage and mirrored into a
// data attribute that CSS keys on, so id stability and strict coercion
// are the contract worth pinning.

import { describe, it, expect } from "vitest";
import {
  READING_THEMES,
  READING_THEME_KEY,
  coerceReadingTheme,
  type ReadingTheme,
} from "@/lib/reader/readingModes";

describe("READING_THEMES", () => {
  it("carries the four shipped modes with stable ids", () => {
    expect(READING_THEMES.map((t) => t.id)).toEqual([
      "default",
      "candlelight",
      "monastery",
      "parchment",
    ]);
  });

  it("every theme has a label and blurb", () => {
    for (const t of READING_THEMES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
    }
  });

  it("the storage key is namespaced with the reader prefs family", () => {
    expect(READING_THEME_KEY).toBe("purify.reader.theme");
  });
});

describe("coerceReadingTheme", () => {
  it("passes every valid id through", () => {
    for (const t of READING_THEMES) {
      expect(coerceReadingTheme(t.id)).toBe<ReadingTheme>(t.id);
    }
  });

  it("falls back to default for junk, null, undefined, and empty", () => {
    expect(coerceReadingTheme("sepia")).toBe("default");
    expect(coerceReadingTheme("CANDLELIGHT")).toBe("default");
    expect(coerceReadingTheme("")).toBe("default");
    expect(coerceReadingTheme(null)).toBe("default");
    expect(coerceReadingTheme(undefined)).toBe("default");
  });
});

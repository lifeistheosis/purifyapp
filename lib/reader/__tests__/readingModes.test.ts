// Reading-theme ids are persisted in localStorage and mirrored into a
// data attribute that CSS keys on, so id stability and strict coercion
// are the contract worth pinning.
//
// Since 2026-08-09 this file also holds the promise that light mode is free.
//
// On 2026-07-25 Purify answered a reader publicly: an app-wide light mode was
// going on the roadmap, it would not sit behind Pro, and "being able to read is
// not a premium feature". The request came from elderly readers who reported
// dizziness on the dark palette.
//
// The palette itself has worked since AppThemeController landed in the root
// layout. It was called Parchment, filed under premium reading modes, and gated
// with Candlelight and Monastery. Ungating it is a two-line change, and so is
// re-gating it by accident during a refactor of the entitlement layer. So the
// promise is asserted rather than remembered.

import { describe, it, expect } from "vitest";
import {
  FREE_THEMES,
  READING_THEMES,
  READING_THEME_KEY,
  coerceReadingTheme,
  isFreeTheme,
  type ReadingTheme,
} from "@/lib/reader/readingModes";

describe("READING_THEMES", () => {
  it("carries the four shipped modes with stable ids", () => {
    // Order changed on 2026-08-09 so the two free palettes come first: this
    // array is what the settings grid renders, and a reader should meet the
    // palettes they can actually use before the ones they cannot. The IDS are
    // the contract; the order is a deliberate, and therefore pinned, choice.
    expect(READING_THEMES.map((t) => t.id)).toEqual([
      "default",
      "parchment",
      "candlelight",
      "monastery",
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

  it("names the light palette something a reader searching for light finds", () => {
    const parchment = READING_THEMES.find((t) => t.id === "parchment");
    expect(parchment, "parchment must stay in the registry").toBeDefined();
    expect(parchment!.label.toLowerCase()).toContain("light");
  });

  it("carries no em dash in a label or blurb", () => {
    for (const t of READING_THEMES) {
      expect(t.label.includes("—"), t.id).toBe(false);
      expect(t.blurb.includes("—"), t.id).toBe(false);
    }
  });
});

describe("coerceReadingTheme", () => {
  it("passes every valid id through", () => {
    for (const t of READING_THEMES) {
      expect(coerceReadingTheme(t.id)).toBe<ReadingTheme>(t.id);
    }
  });

  it("keeps the parchment id, so a stored preference survives the rename", () => {
    // The label became "Light" but the id did not move. A reader who chose the
    // palette before the rename must not be silently reset to dark.
    expect(coerceReadingTheme("parchment")).toBe("parchment");
  });

  it("falls back to default for junk, null, undefined, and empty", () => {
    expect(coerceReadingTheme("sepia")).toBe("default");
    expect(coerceReadingTheme("CANDLELIGHT")).toBe("default");
    expect(coerceReadingTheme("")).toBe("default");
    expect(coerceReadingTheme(null)).toBe("default");
    expect(coerceReadingTheme(undefined)).toBe("default");
    // "light" is what a reader sees, not what is stored. It must not resolve.
    expect(coerceReadingTheme("light")).toBe("default");
  });
});

describe("the free palettes", () => {
  it("keeps light mode out of the Pro layer", () => {
    expect(isFreeTheme("parchment"), "light mode must never be Pro").toBe(true);
  });

  it("keeps the dark default free, which it must be as the fallback", () => {
    expect(isFreeTheme("default")).toBe(true);
  });

  it("keeps Candlelight and Monastery in the Pro layer", () => {
    // Not a promise to anyone, just the current split. If these move, it is a
    // pricing decision and belongs in a commit message, not a refactor.
    expect(isFreeTheme("candlelight")).toBe(false);
    expect(isFreeTheme("monastery")).toBe(false);
  });

  it("lists exactly the two free palettes", () => {
    expect([...FREE_THEMES].sort()).toEqual(["default", "parchment"]);
  });

  it("gives every reader somewhere to cycle to", () => {
    // The toolbar pill cycles within what a reader is allowed. One option
    // would make it a button that does nothing.
    expect(FREE_THEMES.length).toBeGreaterThan(1);
  });

  it("offers the free palettes before the Pro ones", () => {
    const ids = READING_THEMES.map((t) => t.id);
    const lastFree = Math.max(...FREE_THEMES.map((f) => ids.indexOf(f)));
    const firstPro = Math.min(
      ...ids.filter((id) => !isFreeTheme(id)).map((id) => ids.indexOf(id)),
    );
    expect(lastFree).toBeLessThan(firstPro);
  });
});

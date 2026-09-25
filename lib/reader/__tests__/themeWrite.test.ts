// The theme write's rule: 403 for a free account with enforcement on, 200
// with it off, 200 for Plus and for Pro, always 200 for a free palette,
// 400 for a palette the registry does not know.

import { describe, expect, it } from "vitest";

import { DEV_PLUS_ENTITLEMENTS } from "@/lib/dev/developer";
import type { EntitlementRow } from "@/lib/entitlements/entitlements";
import { COLLECTION_THEME_IDS, FREE_THEMES, READING_THEMES } from "@/lib/reader/readingModes";
import { decideThemeWrite } from "@/lib/reader/themeWrite";

const NOW = new Date("2026-09-05T12:00:00.000Z");
const FUTURE = "2027-01-01T00:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";

const free: EntitlementRow = { is_supporter: false, plus_until: null, plus_source: null, pro_until: null };
const lapsed: EntitlementRow = { ...free, plus_until: PAST };
const plus: EntitlementRow = { ...free, plus_until: FUTURE, plus_source: "play" };
const pro: EntitlementRow = { ...free, pro_until: FUTURE };
const supporter: EntitlementRow = { ...free, is_supporter: true };

const paid = READING_THEMES.filter((t) => !FREE_THEMES.includes(t.id)).map((t) => t.id);

describe("decideThemeWrite", () => {
  it("400s a palette the registry does not know", () => {
    for (const raw of ["sepia", "", null, undefined, 3, "CANDLELIGHT", "light"]) {
      expect(decideThemeWrite(raw, plus, { enforced: true, now: NOW }).status, String(raw)).toBe(400);
    }
  });

  it("answers 200 for a free palette whoever asks", () => {
    for (const theme of FREE_THEMES) {
      expect(decideThemeWrite(theme, null, { enforced: true, now: NOW }).status).toBe(200);
      expect(decideThemeWrite(theme, free, { enforced: true, now: NOW }).status).toBe(200);
    }
  });

  it("403s a free account for a paid palette while enforcement is on", () => {
    for (const theme of paid) {
      expect(decideThemeWrite(theme, null, { enforced: true, now: NOW }).status, theme).toBe(403);
      expect(decideThemeWrite(theme, free, { enforced: true, now: NOW }).status, theme).toBe(403);
      expect(decideThemeWrite(theme, lapsed, { enforced: true, now: NOW }).status, theme).toBe(403);
      // The pre-launch supporter promise covers sync, not the feature layer.
      expect(decideThemeWrite(theme, supporter, { enforced: true, now: NOW }).status, theme).toBe(403);
    }
  });

  it("answers 200 for anyone while enforcement is off, like Candlelight today", () => {
    for (const theme of paid) {
      expect(decideThemeWrite(theme, null, { enforced: false, now: NOW }).status, theme).toBe(200);
      expect(decideThemeWrite(theme, free, { enforced: false, now: NOW }).status, theme).toBe(200);
    }
  });

  it("answers 200 for Plus and for Pro with enforcement on", () => {
    for (const theme of paid) {
      expect(decideThemeWrite(theme, plus, { enforced: true, now: NOW }).status, theme).toBe(200);
      expect(decideThemeWrite(theme, pro, { enforced: true, now: NOW }).status, theme).toBe(200);
    }
  });

  it("covers the collection palettes with the same rule", () => {
    for (const theme of COLLECTION_THEME_IDS) {
      expect(paid).toContain(theme);
      expect(decideThemeWrite(theme, free, { enforced: true, now: NOW }).status).toBe(403);
      expect(decideThemeWrite(theme, plus, { enforced: true, now: NOW }).status).toBe(200);
    }
  });

  it("takes the developer override over the row", () => {
    const d = decideThemeWrite("councils", free, {
      enforced: true,
      now: NOW,
      override: DEV_PLUS_ENTITLEMENTS,
    });
    expect(d.status).toBe(200);
    if (d.ok) expect(d.theme).toBe("councils");
  });
});

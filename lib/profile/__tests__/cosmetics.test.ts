import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  BANNER_COLORS,
  BANNER_MOTIONS,
  DECORATIONS,
  NAME_COLORS,
  EFFECTS,
  THEMES,
  THEME_MAX_LUMINANCE,
  luminance,
  normalizeHex,
  inSeason,
  nextSeasonStart,
  readableThemeColor,
  SEASONAL_DECORATIONS,
  SEASONAL_EFFECTS,
  seasonOf,
  seasonWindow,
  subscriptionTier,
  visibleCosmetics,
  type Cosmetics,
} from "../cosmetics";

const CSS = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

const saved: Cosmetics = {
  bannerColor: "#7D1D27",
  bannerUrl: "https://example.supabase.co/storage/v1/object/public/avatars/b/x.webp",
  themePrimary: "#1f3a6b",
  themeAccent: "#0b1424",
  decoration: "halo",
  effect: "incense",
  nameColor: "gilded",
  bannerMotion: "aurora",
};

describe("visibleCosmetics", () => {
  it("shows every saved setting while a subscription runs", () => {
    expect(visibleCosmetics(saved, true)).toEqual({ ...saved, bannerColor: "#7d1d27" });
  });

  it("keeps only the free banner colour when it does not, and deletes nothing", () => {
    expect(visibleCosmetics(saved, false)).toEqual({
      bannerColor: "#7d1d27",
      bannerUrl: null,
      themePrimary: null,
      themeAccent: null,
      decoration: null,
      effect: null,
      nameColor: null,
      bannerMotion: null,
    });
    // The saved settings are untouched, ready for the subscription's return.
    expect(saved.decoration).toBe("halo");
  });

  it("draws a theme only as a pair, and never an id the catalog dropped", () => {
    const half = visibleCosmetics({ ...saved, themeAccent: null, decoration: "retired-frame" }, true);
    expect(half.themePrimary).toBeNull();
    expect(half.themeAccent).toBeNull();
    expect(half.decoration).toBeNull();
  });

  it("never draws a name colour or a banner the catalog does not have", () => {
    const odd = visibleCosmetics({ ...saved, nameColor: "neon", bannerMotion: "strobe" }, true);
    expect(odd.nameColor).toBeNull();
    expect(odd.bannerMotion).toBeNull();
  });
});

describe("theme colours", () => {
  it("every preset already keeps white text readable", () => {
    for (const th of THEMES) {
      expect(luminance(th.primary), th.id).toBeLessThanOrEqual(THEME_MAX_LUMINANCE);
      expect(luminance(th.accent), th.id).toBeLessThanOrEqual(THEME_MAX_LUMINANCE);
    }
  });

  it("a pale custom pick is deepened, keeping its hue, never refused", () => {
    const out = readableThemeColor("#f5e6d3")!;
    expect(luminance(out)).toBeLessThanOrEqual(THEME_MAX_LUMINANCE);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(out.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it("leaves a dark colour alone and refuses a non-colour", () => {
    expect(readableThemeColor("#1F3A6B")).toBe("#1f3a6b");
    expect(readableThemeColor("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });
});

describe("subscriptionTier", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  it("reads the live dates, Pro over Plus", () => {
    expect(subscriptionTier({ plus_until: "2026-11-01T00:00:00Z" }, now)).toBe("plus");
    expect(subscriptionTier({ plus_until: "2026-11-01T00:00:00Z", pro_until: "2026-12-01T00:00:00Z" }, now)).toBe("pro");
  });
  it("gives nothing for a lapsed or missing subscription", () => {
    expect(subscriptionTier({ plus_until: "2026-09-01T00:00:00Z" }, now)).toBeNull();
    expect(subscriptionTier(null, now)).toBeNull();
  });
});

describe("the catalog", () => {
  it("fits the database's id shape", () => {
    // profiles_cosmetics_format: '^[a-z0-9-]{1,40}$'
    for (const id of [...DECORATIONS, ...EFFECTS]) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("banner colours are stored colours", () => {
    for (const c of BANNER_COLORS) expect(normalizeHex(c.hex)).toBe(c.hex);
  });

  it("every name colour has a rule for the dark ground and one for Parchment", () => {
    for (const c of NAME_COLORS) {
      expect(c).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(CSS).toContain(`.name-color-${c}`);
      expect(CSS).toContain(`html[data-reading-mode="parchment"] .name-color-${c}:not(.dark-island *)`);
    }
  });

  it("every animated banner is drawn, and holds still on the motion switch", () => {
    for (const m of BANNER_MOTIONS) {
      expect(m).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(CSS).toContain(`.banner-motion-${m}`);
    }
    expect(CSS).toContain(':where([data-motion="reduce"]) .banner-motion::before');
    expect(CSS).toContain(':where([data-motion="reduce"]) .banner-drift-img');
  });

  it("every effect is drawn by a stylesheet rule, and every one holds still on the motion switch", () => {
    for (const fx of [...EFFECTS, ...SEASONAL_EFFECTS]) expect(CSS).toContain(`.pfx-${fx} .pfx-p`);
    expect(CSS).toContain(':where([data-motion="reduce"]) .pfx .pfx-p');
    expect(CSS).toContain(':where([data-motion="reduce"]) .af-flame');
  });
});

describe("seasons", () => {
  it("every seasonal cosmetic has a season, and the others none", () => {
    for (const id of [...SEASONAL_DECORATIONS, ...SEASONAL_EFFECTS]) expect(seasonOf(id), id).not.toBeNull();
    expect(seasonOf("halo")).toBeNull();
  });

  it("opens Pascha on the feast and closes it at the leave-taking", () => {
    // Pascha 2027 is May 2; the Ascension is June 10, its eve June 9.
    const [a, b] = seasonWindow("pascha", 2027);
    expect(new Date(a).toISOString().slice(0, 10)).toBe("2027-05-02");
    expect(new Date(b).toISOString().slice(0, 10)).toBe("2027-06-10");
    expect(inSeason("pascha-eggs", new Date("2027-05-20T12:00:00Z"))).toBe(true);
    expect(inSeason("pascha-eggs", new Date("2027-06-12T12:00:00Z"))).toBe(false);
  });

  it("carries the Nativity across the new year", () => {
    expect(inSeason("nativity-star", new Date("2026-12-24T12:00:00Z"))).toBe(true);
    expect(inSeason("nativity-star", new Date("2027-01-03T12:00:00Z"))).toBe(true);
    expect(inSeason("nativity-star", new Date("2027-01-07T12:00:00Z"))).toBe(false);
    expect(inSeason("theophany-dove", new Date("2027-01-07T12:00:00Z"))).toBe(true);
  });

  it("says when a season comes back", () => {
    expect(nextSeasonStart("dormition-lilies", new Date("2026-10-02T00:00:00Z"))).toBe("2027-08-01");
    expect(nextSeasonStart("halo")).toBeNull();
    expect(inSeason("halo")).toBe(true);
  });
});

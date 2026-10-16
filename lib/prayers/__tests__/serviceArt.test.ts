import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listHours } from "@/lib/prayers/hours";
import { PRAYER_ICONS } from "@/lib/prayers/icons";
import { readerRules } from "@/lib/prayers/rules";
import { serviceArt, serviceArtPairs } from "@/lib/prayers/serviceArt";

/**
 * The icon at the head of a prayer page (1.7) is one of the eight the app
 * already carries, never a new picture in the download, and each pairing
 * names a real icon. The smallest scan, Christ Enthroned (249 by 360
 * pixels), heads no page: at 120 pixels wide it would be drawn past its own
 * pixels on a phone (the owner's rule on picture crops: sharp or not at all).
 */

const PUBLIC = path.join(process.cwd(), "public");

describe("the prayer pages' icons", () => {
  it("are the app's own icons, every one on disk", () => {
    for (const [id, slug] of serviceArtPairs()) {
      const icon = PRAYER_ICONS[slug];
      expect(icon, `${id} names ${slug}`).toBeDefined();
      expect(fs.existsSync(path.join(PUBLIC, icon.src)), icon.src).toBe(true);
    }
  });

  it("head every page: each rule, each Hour, the lessons and a reader's own rule", () => {
    const ids = [...readerRules().map((r) => r.id), ...listHours().map((h) => h.slug), "learning", "mine", "akathist-theotokos"];
    for (const id of ids) {
      const art = serviceArt(id);
      expect(art.src.startsWith("/icons/prayer/"), id).toBe(true);
      expect(art.alt.trim(), id).not.toBe("");
    }
  });

  it("never stand the small Christ Enthroned at a page's head", () => {
    expect(serviceArtPairs().filter(([, slug]) => slug === "christ-enthroned")).toEqual([]);
  });
});

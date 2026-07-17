import { describe, expect, it } from "vitest";

import seedsJson from "@/data/shop/seed-products.json";
import { getSaint } from "@/lib/saints/saints";

/**
 * Integrity gate for the EIKON seed catalog, in the spirit of the
 * history events integrity suite: every claim a seed product makes must
 * hold before it can ship.
 */

type SeedProduct = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  priceCents: number;
  category: string;
  classification: string;
  inventoryStatus: string;
  quantityAvailable?: number;
  dispatchMinDays: number;
  dispatchMaxDays: number;
  subjects?: { type: string; slug: string }[];
  media: { file: string; alt: string };
};

const products = (seedsJson as { products: SeedProduct[] }).products;

const ALLOWED_CLASSIFICATIONS = [
  "printed_mounted",
  "standard_reproduction",
  "laminated",
  "wooden",
  "hand_finished_reproduction",
  // Non-icon devotional goods (dropshipped): prayer ropes, incense, beads,
  // metal crosses on a chain, woven textiles (prostration mats).
  "prayer_rope",
  "incense",
  "beaded",
  "cross",
  "textile",
];

/** Language a supplier-sourced reproduction may never use. */
const BANNED_CLAIMS = [
  /hand-?painted/i,
  /\boriginal\b/i,
  /handmade by eikon/i,
  /created by purify/i,
  /antique/i,
  /painted by (our|eikon)/i,
];

describe("shop seed catalog integrity", () => {
  it("has a sensible catalog size for Phase 1", () => {
    expect(products.length).toBeGreaterThanOrEqual(5);
    expect(products.length).toBeLessThanOrEqual(30);
  });

  it("every saint-type subject resolves in the saints registry", () => {
    for (const p of products) {
      for (const s of p.subjects ?? []) {
        if (s.type === "saint") {
          expect(getSaint(s.slug), `${p.slug}: unknown saint ${s.slug}`).toBeTruthy();
        }
      }
    }
  });

  it("uses only honest classifications", () => {
    for (const p of products) {
      expect(ALLOWED_CLASSIFICATIONS, p.slug).toContain(p.classification);
    }
  });

  it("makes no hand-painted / original / antique claims anywhere", () => {
    for (const p of products) {
      const text = [p.title, p.subtitle, p.description].filter(Boolean).join(" ");
      for (const pattern of BANNED_CLAIMS) {
        expect(pattern.test(text), `${p.slug}: banned claim ${pattern}`).toBe(false);
      }
    }
  });

  it("keeps dispatch windows consistent with availability", () => {
    for (const p of products) {
      expect(p.dispatchMaxDays, p.slug).toBeGreaterThanOrEqual(p.dispatchMinDays);
      if (p.inventoryStatus === "ready_to_ship") {
        expect(p.dispatchMaxDays, `${p.slug}: ready-to-ship dispatches fast`).toBeLessThanOrEqual(3);
        expect(p.quantityAvailable, `${p.slug}: ready-to-ship needs a quantity`).toBeGreaterThan(0);
      }
      if (p.inventoryStatus === "special_order") {
        expect(
          p.dispatchMinDays,
          `${p.slug}: special order must show the two-stage window`,
        ).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("prices every product above zero (placeholders, but real-shaped)", () => {
    for (const p of products) {
      expect(p.priceCents, p.slug).toBeGreaterThan(0);
    }
  });

  it("gives every image real alt text and no em dashes in copy", () => {
    for (const p of products) {
      expect(p.media.alt.length, p.slug).toBeGreaterThan(10);
      const text = [p.title, p.subtitle, p.description, p.media.alt]
        .filter(Boolean)
        .join(" ");
      expect(text.includes("—"), `${p.slug}: em dash in copy`).toBe(false);
    }
  });

  it("keeps slugs unique and url-safe", () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

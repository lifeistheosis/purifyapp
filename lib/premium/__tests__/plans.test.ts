// The plan copy is twin-sourced (EN + DE) and consumed by three renderers
// (/premium, /pricing, the native paywall). These tests pin the structure
// so the locales cannot drift apart and the ladder cannot silently lose
// or regain a perk (free shipping famously moved from Plus to Pro).

import { describe, it, expect } from "vitest";
import {
  PREMIUM_PLAN_EN,
  PREMIUM_PLAN_DE,
  getPremiumPlan,
} from "@/lib/premium/plans";

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("EN/DE parity", () => {
  it("both locales carry the same feature ids in the same order", () => {
    expect(ids(PREMIUM_PLAN_DE.plusItems)).toEqual(ids(PREMIUM_PLAN_EN.plusItems));
    expect(ids(PREMIUM_PLAN_DE.proItems)).toEqual(ids(PREMIUM_PLAN_EN.proItems));
  });

  it("both locales agree on which perks are still coming", () => {
    const soon = (items: { id: string; soon?: boolean }[]) =>
      items.filter((i) => i.soon).map((i) => i.id);
    expect(soon(PREMIUM_PLAN_DE.proItems)).toEqual(soon(PREMIUM_PLAN_EN.proItems));
    expect(soon(PREMIUM_PLAN_DE.plusItems)).toEqual(soon(PREMIUM_PLAN_EN.plusItems));
  });

  it("free foundation lists have the same length", () => {
    expect(PREMIUM_PLAN_DE.freeItems).toHaveLength(
      PREMIUM_PLAN_EN.freeItems.length,
    );
  });

  it("no empty copy anywhere", () => {
    for (const plan of [PREMIUM_PLAN_EN, PREMIUM_PLAN_DE]) {
      for (const item of [...plan.plusItems, ...plan.proItems]) {
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.sub.length).toBeGreaterThan(0);
      }
      for (const line of plan.freeItems) expect(line.length).toBeGreaterThan(0);
      expect(plan.soonLabel.length).toBeGreaterThan(0);
    }
  });
});

describe("the restructured ladder", () => {
  it("Plus no longer advertises free shipping; EIKON perks live under Pro", () => {
    const plusText = JSON.stringify(PREMIUM_PLAN_EN.plusItems).toLowerCase();
    expect(plusText).not.toContain("shipping");
    expect(ids(PREMIUM_PLAN_EN.proItems)).toContain("eikon-benefits");
    expect(ids(PREMIUM_PLAN_EN.proItems)).toContain("eikon-box");
  });

  it("reading modes ship as a live Plus perk; studio audio is still coming", () => {
    // Moved from Pro to Plus on 2026-08-12 by the owner's call. Asserted on
    // both sides so a refactor cannot quietly sell the palettes twice, or put
    // them back on the tier the runtime gate no longer checks.
    const reading = PREMIUM_PLAN_EN.plusItems.find(
      (i) => i.id === "reading-modes",
    );
    const audio = PREMIUM_PLAN_EN.proItems.find((i) => i.id === "studio-audio");
    expect(reading?.soon).toBeUndefined();
    expect(ids(PREMIUM_PLAN_EN.proItems)).not.toContain("reading-modes");
    expect(audio?.soon).toBe(true);
  });

  it("the reading-modes copy never names a free palette as paid", () => {
    // Parchment is the free Light palette (FREE_THEMES in
    // lib/reader/readingModes.ts) and the id survives only so a reader's
    // existing choice is not reset. Selling it was the contradiction this
    // change removed; the German copy carried it too.
    for (const plan of [PREMIUM_PLAN_EN, PREMIUM_PLAN_DE]) {
      const reading = plan.plusItems.find((i) => i.id === "reading-modes");
      expect(reading, "reading-modes must live under Plus").toBeDefined();
      const sub = (reading?.sub ?? "").toLowerCase();
      expect(sub).not.toContain("parchment");
      expect(sub).not.toContain("pergament");
    }
  });

  it("the EIKON Box promises no specific item", () => {
    expect(PREMIUM_PLAN_EN.proNote.toLowerCase()).toContain("no specific item");
  });

  it("the free foundation names all seven pillars", () => {
    const all = PREMIUM_PLAN_EN.freeItems.join(" ").toLowerCase();
    for (const pillar of [
      "scripture",
      "saint",
      "theology",
      "councils",
      "history",
      "prayer",
      "campaign",
    ]) {
      expect(all).toContain(pillar);
    }
  });
});

describe("getPremiumPlan", () => {
  it("maps locales, defaulting to EN", () => {
    expect(getPremiumPlan("de")).toBe(PREMIUM_PLAN_DE);
    expect(getPremiumPlan("en")).toBe(PREMIUM_PLAN_EN);
    expect(getPremiumPlan("fr")).toBe(PREMIUM_PLAN_EN);
  });
});

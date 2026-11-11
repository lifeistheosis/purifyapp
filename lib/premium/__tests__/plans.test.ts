// The plan copy is twin-sourced (EN + DE) and consumed by three renderers
// (/premium, /pricing, the native paywall). These tests pin the structure
// so the locales cannot drift apart and the ladder cannot silently lose
// or regain a perk (free shipping famously moved from Plus to Pro).

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { campaignsEnabled } from "@/lib/campaigns/flags";
import { READING_THEMES, THEME_FAMILIES, isCollectionTheme, isFreeTheme, isLook } from "@/lib/reader/readingModes";
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
      // True black joined the free palettes on 2026-10-10 (1.6), by the
      // owner's word that the phone-native touches are free. Candlelight is
      // "black and light grey" and is paid, so the bare word is not the
      // test: the palette's name is.
      expect(sub).not.toContain("true black");
    }
  });

  it("the words count the reading modes Plus opens, and the registry agrees (1.9)", () => {
    // The owner's word, 2026-11-10 ("all recs"): the sheet a reader without
    // Plus meets and the plan's row now say how many reading modes are Plus,
    // and name two of them. A number in words is true only while the
    // registry holds that many, so it is read here. If this fails because a
    // look was added or dropped, the three lines say what Plus includes, and
    // changing them waits for his word.
    const plus = READING_THEMES.filter((t) => !isFreeTheme(t.id) && !isCollectionTheme(t.id));
    const looks = plus.filter((t) => isLook(t.id));
    // Twenty and eighteen when he approved the lines; nineteen and seventeen
    // since Fire came out of the looks the same day, by his word ("remove
    // fire"): the numbers followed the registry, and nothing else in the lines moved.
    const WORDS: Record<number, [string, string]> = { 4: ["four", "vier"], 17: ["seventeen", "siebzehn"], 19: ["nineteen", "neunzehn"] };
    const word = (n: number, de = false) => WORDS[n]?.[de ? 1 : 0] ?? `no word for ${n}`;
    const capital = (w: string) => w[0].toUpperCase() + w.slice(1);
    const names = plus.map((t) => t.label);

    // The two that are not looks are the two the app had before them.
    expect(plus.filter((t) => !isLook(t.id)).map((t) => t.label)).toEqual(["Candlelight", "Monastery"]);
    // Every one of them stands in a family, so "in four families" is all of them.
    expect(new Set(plus.map((t) => t.family))).toEqual(new Set(THEME_FAMILIES.map((f) => f.id)));

    const en = JSON.parse(readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    expect(en["plus.palettes.title"]).toBe(`${capital(word(plus.length))} reading modes are part of Purify Plus`);
    expect(en["plus.palettes.body"]).toBe(
      `Candlelight, Monastery and ${word(looks.length)} looks in ${word(THEME_FAMILIES.length)} families, each one calm page with a sign of its own, built for long hours in the Scriptures and the Fathers.`,
    );

    // The row's own short name (Your plan, the paywall's list, a preview's head): the
    // title's first words, on the arbiter's word the same morning ("the same approved
    // words in its own short form").
    expect(en["plus.active.modes"]).toBe(`${capital(word(plus.length))} reading modes`);
    expect(en["plus.palettes.title"].startsWith(en["plus.active.modes"])).toBe(true);

    const row = (plan: typeof PREMIUM_PLAN_EN) => plan.plusItems.find((i) => i.id === "reading-modes")?.sub ?? "";
    expect(row(PREMIUM_PLAN_EN)).toBe(
      `${capital(word(plus.length))} reading modes, from Candlelight to the Holy Mountain, in the Scriptures and the writings of the Fathers`,
    );
    expect(row(PREMIUM_PLAN_DE)).toBe(
      `${capital(word(plus.length, true))} Lesemodi, von Kerzenlicht bis zum Heiligen Berg, in den Schriften und den Werken der V\u00e4ter`,
    );
    // The two it names are Plus reading modes, by the names the picker shows.
    expect(names).toContain("Candlelight");
    expect(names).toContain("Holy Mountain");
    // No em dash in words a reader sees.
    for (const line of [en["plus.palettes.title"], en["plus.palettes.body"], en["plus.active.modes"], row(PREMIUM_PLAN_EN), row(PREMIUM_PLAN_DE)]) {
      expect(line).not.toContain("\u2014");
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
    // Identity no longer holds: getPremiumPlan filters out any feature that is
    // currently withdrawn, so it returns a derived object. Everything except
    // freeItems must still come through untouched.
    for (const [locale, source] of [
      ["de", PREMIUM_PLAN_DE],
      ["en", PREMIUM_PLAN_EN],
      ["fr", PREMIUM_PLAN_EN],
    ] as const) {
      const plan = getPremiumPlan(locale);
      expect(plan.freeTitle).toBe(source.freeTitle);
      expect(plan.plusItems).toBe(source.plusItems);
      expect(plan.proItems).toBe(source.proItems);
      expect(plan.supportCta).toBe(source.supportCta);
    }
  });

  /**
   * /premium and /pricing both render freeItems, and both were selling
   * "Prayer Campaigns, prayed together" as part of the free foundation while
   * /campaigns answered 404. Confirmed in the built output on 2026-08-26: the
   * string was in the VISIBLE text of out/premium/index.html and
   * out/pricing/index.html, not merely in a bundled chunk.
   *
   * A withdrawal has to reach the pages that advertise the thing, or the
   * product promises what it does not have on the two pages people read
   * before paying.
   */
  it("the pricing copy follows the feature flag", () => {
    const expected = campaignsEnabled() ? 1 : 0;
    for (const [locale, needle] of [
      ["en", "Prayer Campaigns"],
      ["de", "Gebetsaktionen"],
    ] as const) {
      const shown = getPremiumPlan(locale).freeItems.filter((i) =>
        i.includes(needle),
      ).length;
      expect(shown, `${locale} free tier is out of step with the flag`).toBe(
        expected,
      );
    }
  });

  it("keeps the line in the source arrays so restoring is one flag", () => {
    // Deleting it would make the restore a copy-writing job in two languages
    // instead of flipping a boolean, and would break EN/DE length parity.
    expect(
      PREMIUM_PLAN_EN.freeItems.some((i) => i.includes("Prayer Campaigns")),
    ).toBe(true);
    expect(
      PREMIUM_PLAN_DE.freeItems.some((i) => i.includes("Gebetsaktionen")),
    ).toBe(true);
  });
});

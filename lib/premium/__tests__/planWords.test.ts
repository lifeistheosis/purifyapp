// The Plus page (/premium) and Your plan (/plan) say every word from the
// catalogs (his yes of 2026-11-10, "All recommendations. Start."; Updates 2
// found them in English and German only, in build 90's note 4, and the apps
// resolved them once, in English, for every reader).
//
// This holds:
//   1. the catalogs' English and German are lib/premium/plans.ts's own, letter
//      for letter: the approved text did not move a word;
//   2. prices, the trial and the saving come from plans.ts's figures, written
//      the reader's way, and say what the approved lines say;
//   3. the two screens read no copy of plans.ts any more, and every key they
//      ask for is in the English catalog.
//
// What would go wrong if this broke: a price or a store term in one language
// saying what the approved English does not, or a screen frozen in English.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PLAN_PRICE_CENTS, PLUS_TRIAL_DAYS, PREMIUM_PAGE_DE, PREMIUM_PAGE_EN, PREMIUM_PLAN_DE, PREMIUM_PLAN_EN } from "@/lib/premium/plans";
import { FREE_KEYS, PLUS_ITEM_KEYS, percentWords, planPrice, yearlySaving } from "@/lib/premium/planWords";
import { PRO_ROWS, PRO_TERMS, SOON_LABEL } from "@/lib/premium/plusRows";
import { resolvePluralKey } from "@/lib/i18n/plural";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const catalog = (code: string) => JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
const CATALOGS = { en: catalog("en"), de: catalog("de") } as const;
const PLAN = { en: PREMIUM_PLAN_EN, de: PREMIUM_PLAN_DE } as const;
const PAGE = { en: PREMIUM_PAGE_EN, de: PREMIUM_PAGE_DE } as const;

/** A line with its placeholders filled, as the app's t() fills them. */
const fill = (line: string, values: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
/** Intl writes a no-break space where the approved German has a plain one. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("the Plus page and Your plan, from the catalogs", () => {
  for (const lang of ["en", "de"] as const) {
    const c = CATALOGS[lang];
    const plan = PLAN[lang];
    const page = PAGE[lang];

    it(`${lang}: the plans' words are plans.ts's, letter for letter`, () => {
      expect(FREE_KEYS.map((k) => c[k])).toEqual(plan.freeItems);
      expect(c["premium.freeFoot"]).toBe(plan.freeFoot);
      expect(c["premium.plusLede"]).toBe(plan.plusLede);
      expect(c["premium.proLede"]).toBe(plan.proLede);
      expect(PLUS_ITEM_KEYS.map((k) => k.id)).toEqual(plan.plusItems.map((i) => i.id));
      for (const [i, k] of PLUS_ITEM_KEYS.entries()) {
        expect(c[k.title], k.title).toBe(plan.plusItems[i].title);
        expect(c[k.sub], k.sub).toBe(plan.plusItems[i].sub);
      }
      expect(c["premium.supportKicker"]).toBe(plan.supportKicker);
      expect(c["premium.supportLine"]).toBe(plan.supportLine);
      expect(c["premium.supportCta"]).toBe(plan.supportCta);
      expect(c["premium.supportFoot"]).toBe(plan.supportFoot);
      // Pro's rows, the box's terms, the promise and the pill: the paywall's keys, already held to plans.ts.
      expect(PRO_ROWS.map((r) => c[r.name])).toEqual(plan.proItems.map((i) => i.title));
      expect(c[PRO_TERMS]).toBe(plan.proNote);
      expect(c["plus.promise.supporters"]).toBe(plan.plusPromise);
      // The pill is the app's own word for it, as the paywall's same Pro rows
      // say it; in German that is "Demnächst" where this page said "Bald verfügbar".
      if (lang === "en") expect(c[SOON_LABEL]).toBe(plan.soonLabel);
    });

    it(`${lang}: the page's own words are the approved ones, letter for letter`, () => {
      for (const [field, words] of Object.entries(page)) {
        if (field === "perYear") continue;
        expect(c[`premium.${field}`], field).toBe(words);
      }
    });

    it(`${lang}: prices, the trial and the saving say what the approved lines say, from plans.ts's figures`, () => {
      const price = (cents: number) => planPrice(cents, lang);
      expect(plain(fill(c["premium.perMonth"], { price: price(PLAN_PRICE_CENTS.plusMonthly) }))).toBe(plan.plusPriceMonthly);
      expect(plain(fill(c["premium.perMonth"], { price: price(PLAN_PRICE_CENTS.proMonthly) }))).toBe(plan.proPriceMonthly);
      expect(plain(fill(c["premium.orPerYear"], { price: price(PLAN_PRICE_CENTS.plusYearly) }))).toBe(`${page.perYear} ${plan.plusPriceYearly}`);
      expect(plain(fill(c["premium.orPerYear"], { price: price(PLAN_PRICE_CENTS.proYearly) }))).toBe(`${page.perYear} ${plan.proPriceYearly}`);
      const trial = resolvePluralKey(c, "premium.plusTrial", PLUS_TRIAL_DAYS, lang);
      expect(plain(fill(trial, { count: PLUS_TRIAL_DAYS, pct: percentWords(yearlySaving(), lang) }))).toBe(plan.plusTrial);
      // No figure typed into a line: each comes in through its placeholder.
      for (const key of Object.keys(c).filter((k) => k.startsWith("premium.") || k.startsWith("yourPlan."))) {
        expect(c[key], key).not.toMatch(/\d/);
      }
    });
  }

  it("the figures are the ones the approved words name", () => {
    expect(PLUS_TRIAL_DAYS).toBe(7);
    expect(yearlySaving()).toBe(40);
    expect(PREMIUM_PLAN_EN.plusTrial).toContain(`${yearlySaving()}%`);
    expect(PREMIUM_PLAN_EN.plusTrial).toContain(`${PLUS_TRIAL_DAYS} days free`);
  });

  it("the two screens read no copy of plans.ts any more", () => {
    for (const file of ["app/(app)/premium/page.tsx", "app/(app)/plan/page.tsx", "components/premium/PlanScreen.tsx"]) {
      expect(read(file), file).not.toMatch(/getPremiumPlan|PREMIUM_PLAN_EN|PREMIUM_PLAN_DE|PREMIUM_PAGE_EN|PREMIUM_PAGE_DE|getServerLocale/);
    }
  });

  it("every line of the two screens is in all twenty-one languages, with every plural form each has", () => {
    // Landed 2026-11-10, the eight lines that forced a choice of meaning on
    // the arbiter's calls. A line added in English later, and not in the
    // other twenty, would show its English: this says so here.
    const dir = path.join(ROOT, "lib/i18n/messages");
    const codes = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    expect(codes).toHaveLength(21);
    const en = CATALOGS.en;
    const lines = Object.keys(en).filter((k) => (k.startsWith("premium.") || k.startsWith("yourPlan.")) && !k.startsWith("premium.plusTrial."));
    const missing: string[] = [];
    for (const code of codes) {
      const c = catalog(code);
      for (const k of lines) if (c[k] === undefined) missing.push(`${code}: ${k}`);
      for (const form of new Intl.PluralRules(code).resolvedOptions().pluralCategories) {
        if (c[`premium.plusTrial.${form}`] === undefined) missing.push(`${code}: premium.plusTrial.${form}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every language counts the reading modes with the word its own catalog uses", () => {
    for (const code of fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).map((f) => f.slice(0, -5))) {
      const c = catalog(code);
      const word = c["plus.active.modes"].split(/\s+/)[0].toLowerCase();
      expect(c["premium.plus.readingModes.sub"].toLowerCase(), code).toContain(word);
    }
  });

  it("every key the two screens ask for is in the English catalog", () => {
    const en = CATALOGS.en;
    const asked = new Set<string>([
      ...FREE_KEYS,
      ...PLUS_ITEM_KEYS.flatMap((k) => [k.title, k.sub]),
      ...PRO_ROWS.flatMap((r) => [r.name, r.body]),
      PRO_TERMS,
      SOON_LABEL,
      "premium.perMonth",
      "premium.orPerYear",
      "premium.owned.current",
      "premium.owned.includedWithPro",
    ]);
    for (const file of ["app/(app)/premium/page.tsx", "components/premium/PlanScreen.tsx", "components/premium/PlanStatus.tsx"]) {
      for (const m of read(file).matchAll(/(?:<T k=|t\()"((?:premium|yourPlan|plus|profile)\.[\w.]+)"/g)) asked.add(m[1]);
    }
    for (const m of read("components/premium/PlanScreen.tsx").matchAll(/"(yourPlan\.[\w.]+)"/g)) asked.add(m[1]);
    const missing = [...asked].filter((k) => en[k] === undefined && en[`${k}.other`] === undefined);
    expect(missing).toEqual([]);
    expect(asked.size).toBeGreaterThan(50);
  });
});

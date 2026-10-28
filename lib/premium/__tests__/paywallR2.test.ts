// The Plus paywall as the owner locked it on 2026-10-27: round 10 merged,
// "kept by those it helps, then the features working, then the plans",
// refined as R2 (boards/purify-master/variants/10b-paywall.png). Built in
// components/billing/KeptPaywall.tsx and standing in two places: the upgrade
// sheet a lock opens (UpgradeModal.tsx) and the apps' screen (PlusPaywall.tsx).
//
// What a reader would notice if this broke: a feature on the paywall that the
// app does not have, or one named in English to a reader in Athens; the sheet
// opened by a lock that does not lead with that feature; a price the store
// never set; the small print, Restore purchases, Terms or Privacy gone from a
// screen that asks for money; a review nobody wrote; or yellow.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { PLUS_ROWS, isPlusLock, plusRowsLedBy } from "@/lib/premium/plusRows";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Source with its comments taken out: a comment may say what the code may not. */
const bare = (p: string) =>
  code(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const CATALOGS = Object.fromEntries(
  fs
    .readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(MESSAGES, f), "utf8")) as Record<string, string>]),
);

const PAYWALL = ["components/billing/KeptPaywall.tsx", "components/billing/UpgradeModal.tsx", "components/billing/PlusPaywall.tsx"];

/** The words the R2 build added, every one of them in every language. */
const NEW_KEYS = [
  "plus.kept.title",
  "plus.offline.name",
  "plus.mark.name",
  "plus.plan.yearly",
  "plus.plan.monthly",
  "plus.plan.save",
  "plus.plan.trialYearly",
  "plus.plan.trialMonthly",
  "plus.plan.billedYearly",
  "plus.plan.billedMonthly",
  "plus.join",
  "plus.joinPro",
  "plus.fine.trialYear",
  "plus.fine.trialMonth",
  "plus.fine.year",
  "plus.fine.month",
  "plus.billedOnWeb",
  "plus.restore",
  "plus.restoring",
  "plus.restoreNone",
];

describe("the catalogs", () => {
  it("are all twenty-one", () => {
    expect(Object.keys(CATALOGS)).toHaveLength(21);
  });

  it("hold every word the paywall's features are said in", () => {
    for (const row of PLUS_ROWS) {
      for (const key of [row.title, row.name, row.body, row.keep].filter((k): k is string => k !== null)) {
        for (const [code, m] of Object.entries(CATALOGS)) {
          expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        }
      }
    }
  });

  it("hold the new words translated, never the English copied", () => {
    const en = CATALOGS.en;
    for (const key of NEW_KEYS) {
      expect(en[key], key).toBeTruthy();
      for (const [code, m] of Object.entries(CATALOGS)) {
        if (code === "en") continue;
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key], `${code} ${key} is the English`).not.toBe(en[key]);
      }
    }
  });

  it("keep the store's figures as places to fill, never as figures", () => {
    for (const key of NEW_KEYS) expect(CATALOGS.en[key], key).not.toMatch(/\d/);
    expect(CATALOGS.en["plus.fine.trialYear"]).toContain("{price}");
    expect(CATALOGS.en["plus.fine.trialYear"]).toContain("{trial}");
    expect(CATALOGS.en["plus.plan.save"]).toContain("{pct}");
  });
});

describe("the features, in depth", () => {
  it("lead with the one the lock was for, for every lock the sheet is opened with", () => {
    const src = code("components/billing/UpgradeModal.tsx");
    const union = /export type UpgradeFeature =([\s\S]*?);/.exec(src)?.[1] ?? "";
    const locks = [...union.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).filter((n) => n !== "general");
    expect(locks).toContain("offline");
    for (const lock of locks) {
      expect(isPlusLock(lock), lock).toBe(true);
      expect(plusRowsLedBy(lock)[0].feature, lock).toBe(lock);
      expect(plusRowsLedBy(lock)).toHaveLength(PLUS_ROWS.length);
    }
    // The Premium button opens the sheet on "general": the order stands.
    expect(plusRowsLedBy("general")).toBe(PLUS_ROWS);
    expect(plusRowsLedBy(null)).toBe(PLUS_ROWS);
  });

  it("still say why the sheet opened: the lock's own headline, what it does, and what stays free", () => {
    for (const row of PLUS_ROWS) {
      if (row.feature === null) continue;
      expect(row.title, row.id).toBe(`plus.${row.feature}.title`);
      expect(row.body, row.id).toBe(`plus.${row.feature}.body`);
      expect(row.keep, row.id).toBe(`plus.${row.feature}.keep`);
    }
    const rows = bare("components/billing/KeptPaywall.tsx");
    expect(rows).toContain("const name = lit && row.title ? t(row.title) : t(row.name);");
    expect(rows).toContain("keep={lit && row.keep ? t(row.keep) : null}");
  });

  it("begin as the owner's mockup does, then what 1.8 added", () => {
    expect(PLUS_ROWS.slice(0, 6).map((r) => r.feature)).toEqual(["wordstudy", "palettes", "crossrefs", "journal", "offline", "ambience"]);
  });

  it("name each feature once", () => {
    expect(new Set(PLUS_ROWS.map((r) => r.id)).size).toBe(PLUS_ROWS.length);
  });

  it("show the new ambience by the names the ambience sheet gives its sounds", () => {
    expect(AMBIENCE_TRACKS.map((t) => t.id)).toEqual(expect.arrayContaining(["peal", "sea", "wind"]));
    expect(bare("components/billing/KeptPaywall.tsx")).toContain("AMBIENCE_TRACKS.map");
  });

  it("each wear a picture: the Greek word, Candlelight's own page, or the feature's mark", () => {
    const ui = code("components/premium/PremiumUI.tsx");
    for (const row of PLUS_ROWS) {
      if (row.id === "word-study" || row.id === "reading-modes") continue;
      expect(ui, row.id).toMatch(new RegExp(`(?:^|\\s)(?:"${row.id}"|${row.id}): \\(`, "m"));
    }
    // Candlelight as the palette is, black and light grey (app/globals.css).
    const css = code("app/globals.css");
    const candle = /html\[data-reading-mode="candlelight"\] \{([^}]*)\}/.exec(css)?.[1] ?? "";
    const kept = code("components/billing/KeptPaywall.tsx");
    expect(candle).toContain("--color-night: #0a0a0a;");
    expect(candle).toContain("--color-paper: #d4d4d8;");
    expect(kept).toContain('{ page: "#0a0a0a", ink: "#d4d4d8" }');
  });
});

describe("the plans, held at the bottom", () => {
  it("stay at the bottom of the sheet and above the apps' tab bar while the features scroll", () => {
    expect(bare("components/billing/UpgradeModal.tsx")).toMatch(/<PlansDock\s+className="sticky bottom-0/);
    const screen = bare("components/billing/PlusPaywall.tsx");
    expect(screen).toMatch(/<PlansDock\s+className="[^"]*\bsticky\b/);
    expect(screen).toContain("var(--tab-bar-h, 0px)");
  });

  it("make the billed price the big number and the month it comes to the small one", () => {
    const dock = bare("components/billing/KeptPaywall.tsx");
    expect(dock).toMatch(/text-\[20px\] font-bold[^>]*>\{billed\}/);
    expect(dock).toMatch(/text-\[12\.5px\][^>]*>\{t\("plus\.perMonth", \{ price: chosen\.perMonth \}\)\}/);
    // Both the store's: the price it bills, and the month as it works it out.
    expect(bare("lib/billing/revenuecat.ts")).toContain("pkg.product.pricePerMonthString");
    expect(bare("lib/billing/revenuecatWeb.ts")).toContain("base?.pricePerMonth?.formattedPrice");
  });

  it("carry no price, plan or trial written into the code", () => {
    for (const file of [...PAYWALL, "lib/billing/offers.ts", "lib/premium/plusRows.ts"]) {
      const src = bare(file);
      expect(src, file).not.toMatch(/[$€£]\s?\d/);
      expect(src, file).not.toMatch(/\d[.,]\d\d\s?(?:\$|€|£|USD|EUR)/);
      expect(src, file).not.toMatch(/71[.,]99|9[.,]99|6[.,]00|38[.,]99|4[.,]99/);
    }
  });

  it("buy the plan the reader chose, not always the year", () => {
    const sheet = bare("components/billing/UpgradeModal.tsx");
    expect(sheet).toContain('const pkg = plan === "yearly" ? pkgs.yearly : pkgs.monthly;');
    expect(sheet).not.toContain("pkgs.yearly ?? pkgs.monthly");
  });
});

describe("every legal line the paywall had", () => {
  const dock = bare("components/billing/KeptPaywall.tsx");
  const sheet = bare("components/billing/UpgradeModal.tsx");
  const screen = bare("components/billing/PlusPaywall.tsx");

  it("is in the held plans: the terms in the store's price, how it is billed, that it can be cancelled", () => {
    for (const key of ["plus.fine.trialYear", "plus.fine.trialMonth", "plus.fine.year", "plus.fine.month", "plus.billedThroughStore", "plus.billedOnWeb"]) {
      expect(dock, key).toContain(`"${key}"`);
    }
  });

  it("links Terms and Privacy, and Restore purchases where the store can restore", () => {
    expect(dock).toMatch(/href="\/terms"[\s\S]{0,120}t\("shop\.terms"\)/);
    expect(dock).toMatch(/href="\/privacy"[\s\S]{0,120}t\("footer\.privacy"\)/);
    expect(dock).toContain('t("plus.restore")');
    expect(sheet).toContain("canRestore={isNative && canRestore}");
    expect(screen).toContain("onRestore={onRestore}");
    expect(screen).toMatch(/href="\/terms"/);
    expect(screen).toMatch(/href="\/privacy"/);
  });

  it("keeps what the apps' screen has always said around a purchase", () => {
    expect(screen).toContain("so you aren’t billed for both");
    expect(screen).toContain("terms={plan.proNote}");
    expect(screen).toContain("Manage subscription");
    expect(screen).toContain("Billed through {storeName()}. Cancel anytime.");
    expect(screen).toContain("Purify Plus and Pro are tied to your account");
  });

  it("keeps the sheet's own: its failure, the way to every plan, and no price where the store said none", () => {
    expect(sheet).toContain('t("plus.failed")');
    expect(sheet).toContain('t("plus.seeAllPlans")');
    expect(sheet).toContain("offers={canBuyHere ? offers : null}");
    expect(sheet).toContain('href={canBuyHere ? undefined : "/pricing"}');
  });
});

describe("kept by those it helps", () => {
  it("is the headline and the app's own line over the scribe", () => {
    const hero = bare("components/billing/KeptPaywall.tsx");
    expect(hero).toContain('t("plus.kept.title")');
    expect(hero).toContain('t("plus.footer")');
  });

  it("quotes no reader: no reviews or testimonials on the paywall", () => {
    for (const file of PAYWALL) {
      const src = code(file);
      expect(src, file).not.toMatch(/storeRatings|APP_REVIEWS|ReviewRow/);
    }
  });
});

describe("the look", () => {
  it("is black, white and grey: no gold, yellow or amber, and no lamp", () => {
    for (const file of PAYWALL) {
      const src = bare(file);
      expect(src, file).not.toMatch(/\b(?:text|bg|ring|border|from|to|via|shadow)-(?:amber|yellow|gold|premium)\b/);
      expect(src, file).not.toMatch(/Lampada/);
    }
  });

  it("lets every choice ease, and stand still where motion is turned down", () => {
    const css = code("app/globals.css");
    expect(css).toMatch(/\.paywall-choice \{\s*transition:/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.paywall-choice \{\s*transition: none;/);
  });
});

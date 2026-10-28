// The paywall as the owner picked it, B of three (2026-10-19: "B is the
// best"), and his next note: "Make it so that you can scroll through all the
// different features, and you can click on each one and see what it does."
//
// What a reader would notice if this broke: gold back on a premium screen
// (he called even the antique gold "vibe coded yellow"), a free trial promised
// that the store will not give, or a feature poster that does nothing.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

const code = (p: string) => fs.readFileSync(p, "utf8");

/** The premium surfaces: the kit, the apps' paywall, the sheet, Your plan, the web pages and the Plus cards. */
const SURFACES = [
  "components/premium/PremiumUI.tsx",
  "components/premium/FeatureShowcase.tsx",
  "components/premium/PlanScreen.tsx",
  "components/premium/PlanStatus.tsx",
  "components/billing/PlusPaywall.tsx",
  "components/billing/UpgradeModal.tsx",
  "components/billing/KeptPaywall.tsx",
  "components/billing/WebPlusCheckout.tsx",
  "app/(app)/pricing/page.tsx",
  "app/(app)/premium/page.tsx",
  "components/community/CommunitySide.tsx",
  "components/community/profile/ProfileEditor.tsx",
];

describe("the premium surfaces", () => {
  it("wear no gold: no gold classes, no gold hex, no gold star or check", () => {
    const GOLD = [
      /\bpremium-cta\b/,
      /\bpremium-gold-text\b/,
      /\b(?:text|bg|ring|border|decoration|from|to|via)-premium\b/,
      /rgba\(201,\s*162,\s*90/,
      /#c9a25a/i,
      /\bGoldStar\b/,
      /\bGoldCheck\b/,
    ];
    for (const file of SURFACES) {
      const src = code(file);
      for (const gold of GOLD) expect(src, `${file}: ${gold}`).not.toMatch(gold);
    }
  });

  it("draw the scribe the apps carry, not one they must fetch", () => {
    expect(fs.existsSync("public/premium/scribe.v1.webp")).toBe(true);
    // The paywall's two places draw him through KeptPaywall (1.8, R2).
    for (const file of ["components/billing/KeptPaywall.tsx", "components/premium/PlanScreen.tsx"]) {
      expect(code(file), file).toContain('src="/premium/scribe.v1.webp"');
    }
    expect(code("components/billing/PlusPaywall.tsx")).toContain("<KeptHero");
    expect(code("components/billing/UpgradeModal.tsx")).toContain("<KeptHero");
    // A carried picture: the export keeps it (scripts/native-build.mjs sets aside only the streamed folders).
    expect(code("scripts/native-build.mjs")).not.toMatch(/\["public", "premium"\]/);
  });
});

describe("the apps' paywall", () => {
  it("says a free trial only in the store's own words", () => {
    // Its comments may name the trial; its code may not.
    const paywall = code("components/billing/PlusPaywall.tsx").replace(/^\s*\/\/.*$/gm, "");
    expect(paywall).toContain("freeTrialPeriod(pkgs.yearly)");
    expect(paywall).not.toMatch(/["'`]7 days/);
    // 1.8 (R2): the held plans say it from the store's period, in the
    // reader's language, and only when the store granted one.
    const dock = code("components/billing/KeptPaywall.tsx").replace(/^\s*\/\/.*$/gm, "");
    expect(dock).toContain("chosen?.trial ? trialWords(chosen.trial, tn, locale) : null");
    expect(dock).not.toMatch(/["'`]7 days/);
  });

  it("names the store a reader will be billed by", () => {
    const paywall = code("components/billing/PlusPaywall.tsx");
    expect(paywall).toContain('nativePlatform() === "ios" ? "the App Store" : "Google Play"');
    expect(paywall).not.toMatch(/Secure billing through Google Play/);
  });
});

describe("the feature posters", () => {
  const showcase = code("components/premium/FeatureShowcase.tsx");

  it("each open, in the shared movable sheet, to say what the feature does", () => {
    expect(showcase).toContain('aria-haspopup="dialog"');
    expect(showcase).toContain("onClick={() => setAt(i)}");
    expect(showcase).toContain("<Sheet");
    expect(showcase).toContain("item.sub");
  });

  it("step to the posters on either side, so all of them can be read in turn", () => {
    expect(showcase).toContain("setAt(at - 1)");
    expect(showcase).toContain("setAt(at + 1)");
    expect(showcase).toContain("{at + 1} / {items.length}");
  });

  it("scroll sideways in a row that fades where it goes on", () => {
    expect(showcase).toContain("<ScrollRail");
  });

  it("stand on Your plan, where they also lead to the feature", () => {
    const plan = code("components/premium/PlanScreen.tsx");
    expect(plan).toMatch(/<FeatureShowcase[^>]*\bowned\b/);
  });

  it("gave way on the paywall to the features in depth (1.8, the owner's R2)", () => {
    // His locked design shows each feature with its working picture and what
    // it does as the reader scrolls, so nothing has to be opened to be read.
    const paywall = code("components/billing/PlusPaywall.tsx");
    expect(paywall).toContain("<PlusFeatureRows");
    expect(paywall).not.toContain("<FeatureShowcase");
  });
});

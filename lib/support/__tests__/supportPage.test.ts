import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";

/**
 * Support this work, rewritten on his word of 2026-11-11: where what Purify
 * earns goes (the shop's pieces, a part given to the Church as Purify's own
 * giving, the app), and the two ways to help (Purify Plus, or the EIKON
 * shop). One page in the apps and on the website.
 *
 * What would go wrong if this broke: a line that is no longer true comes
 * back ("Nothing in this app is locked behind a payment", untrue since Plus;
 * "a small community that sources the texts, reviews them", when no priest
 * reviews Purify); the giving reads as a donation or as part of a purchase
 * (rules some US states and the stores apply to sales said to benefit a
 * charity); or the page points to an outside payment inside the apps.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const LANGUAGES = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"] as const;
const KEYS = [
  "support.title",
  "support.lead",
  "support.whereItGoes",
  "support.goesShop.title",
  "support.goesShop.body",
  "support.goesChurch.title",
  "support.goesChurch.body",
  "support.goesApp.title",
  "support.goesApp.body",
  "support.twoWays",
  "support.wayPlus.body",
  "support.wayShop.body",
  "support.wayShop.cta",
  "support.coreFree",
];
const words = (code: (typeof LANGUAGES)[number]) => getMessages(code) as Record<string, string>;
/** The page's code without its comments: what it draws and links. */
const drawn = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Support this work", () => {
  it("never says the two lines that stopped being true", () => {
    for (const code of LANGUAGES) {
      const all = Object.values(words(code)).join("\n");
      expect(all, code).not.toMatch(/locked behind a payment/i);
      expect(all, code).not.toMatch(/small community that sources the texts/i);
    }
    expect(drawn("components/support/SupportBody.tsx")).not.toMatch(/locked behind|small community/i);
  });

  it("names the giving as Purify's own, never a donation, a tithe or charity, never tied to a purchase", () => {
    const en = words("en");
    for (const k of KEYS) expect(en[k], k).not.toMatch(/donat|tithe|charit|purchase|every order|you buy/i);
    expect(en["support.goesChurch.body"]).toMatch(/Purify's own giving/);
  });

  it("says where the money goes and the two ways, and that the core stays free (build 93 note 10)", () => {
    const en = words("en");
    expect(en["support.lead"]).toMatch(/free, and they stay free/);
    expect(en["support.lead"]).toMatch(/Purify Plus and from the EIKON shop/);
    expect(en["support.coreFree"]).toMatch(/names its source/);
    expect(en["support.coreFree"]).not.toMatch(/public-domain edition, checked against/);
  });

  it("is one page in the apps and on the website, with both ways the app's own pages", () => {
    const page = drawn("app/(app)/support/page.tsx");
    expect(page).toContain("<SupportBody />");
    expect(page).not.toMatch(/IS_STATIC_EXPORT|isNativeRequest|fetchBmcTotal|getExpenses/);
    const body = drawn("components/support/SupportBody.tsx");
    expect(body).toContain('href: "/pricing"');
    expect(body).toContain('href: "/shop"');
    expect(body).not.toMatch(/https?:\/\/|buymeacoffee|paypal|cash\.app|donateLinks/i);
  });

  it("is in all 21 languages, with no dash", () => {
    for (const code of LANGUAGES) {
      const m = words(code);
      for (const k of KEYS) {
        expect(m[k]?.trim().length, `${code} ${k}`).toBeGreaterThan(0);
        expect(m[k], `${code} ${k}`).not.toMatch(/[–—]/);
      }
    }
  });
});

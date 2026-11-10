// What each language covers, on its row in the language list (1.9, his yes to
// call 17 of 2026-11-10: "the language list saying in each language's own row
// what it covers"). This holds the row to what the app has: a Bible when the
// downloads hold one in that language, prayers when the prayer book has its
// own words in it, and English everything. And each row has its words.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { COVERAGE_WORDS, PRAYER_LANGUAGES, coverageOf, coverageWords } from "@/lib/i18n/coverage";
import { LOCALES } from "@/lib/i18n/locales";
import { libraryRules } from "@/lib/prayers/library";

const EM_DASH = String.fromCharCode(0x2014);

describe("what each language covers", () => {
  it("is said on every language's row, in its own words, never empty", () => {
    for (const l of LOCALES) {
      const words = coverageWords(l.code);
      expect(words, l.code).not.toBe("");
      expect(words, l.code).not.toContain(EM_DASH);
      // Every language can say both the menus alone and the menus with a Bible, so a Bible's arrival needs no new words.
      expect(COVERAGE_WORDS[l.code].menus, l.code).toBeTruthy();
      expect(COVERAGE_WORDS[l.code].menusBible, l.code).toBeTruthy();
    }
    expect(coverageWords("en")).toBe("Menus, the Bible and prayers");
  });

  it("names the Bible only where the downloads hold one in that language", () => {
    const withBible = new Set(DOWNLOADABLE_BIBLES.map((b) => b.language));
    for (const l of LOCALES) {
      if (l.code === "en") continue;
      const c = coverageOf(l.code);
      expect(c === "menusBible" || c === "all", l.code).toBe(withBible.has(l.code));
    }
    // The five of 1.9's first downloads.
    for (const code of ["ru", "el", "sr", "ar", "es"] as const) expect(coverageOf(code), code).toBe("menusBible");
  });

  it("names prayers only where the prayer book has its own words in that language", () => {
    const english = JSON.stringify(libraryRules("en").map((r) => r.lang));
    for (const l of LOCALES) {
      if (l.code === "en") continue;
      const own = JSON.stringify(libraryRules(l.code).map((r) => r.lang)) !== english;
      expect(PRAYER_LANGUAGES.includes(l.code), l.code).toBe(own);
    }
    expect(coverageOf("de")).toBe("menusPrayers");
  });

  it("stands on each row of the language list, under the language's name", () => {
    const menu = fs.readFileSync(path.join(process.cwd(), "components/i18n/LocaleMenu.tsx"), "utf8");
    expect(menu.match(/data-language-covers=\{l\.code\}/g)?.length).toBe(2);
    expect(menu.match(/\{coverageWords\(l\.code\)\}/g)?.length).toBe(2);
  });
});

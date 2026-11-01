import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { reposeDateText } from "@/lib/prayers/storage";

/**
 * The page of Your rule (/prayers/personal), held to what a design round
 * found on it (sheet r3-27, the owner's note 73: "fix all of them"):
 *
 *  1. both lists' lines printed a web address, "/prayers/today";
 *  2. a repose date printed as typed, 2019-03-04;
 *
 * Each fix is measured on the built page by scripts/export-walk.mjs too.
 */

const ROOT = process.cwd();
const catalog = (code: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", `${code}.json`), "utf8"));
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("the lists' lines", () => {
  it("name Today in words, in every language, and print no address", () => {
    for (const { code } of LOCALES) {
      const m = catalog(code);
      for (const key of ["prayers.diptychs.livingIntro", "prayers.diptychs.reposedIntro"]) {
        expect(m[key], `${code} ${key}`).not.toContain("/");
        // The page's name as the catalog writes it on the tab and the page.
        expect(m[key], `${code} ${key}`).toContain(m["nav.today"]);
      }
    }
  });
});

describe("a repose date", () => {
  it("is written as the reader's language writes a date", () => {
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2019-03-04", "de")).toBe("4. März 2019");
    expect(reposeDateText("2019-03-04", "fr")).toBe("4 mars 2019");
    for (const { code } of LOCALES) expect(reposeDateText("2019-03-04", code), code).not.toContain("2019-03");
  });

  it("is the calendar's day wherever the reader is, and kept as typed when it is no day", () => {
    // Written in UTC: a day, not a moment, so no zone moves it to March 3.
    expect(reposeDateText("2019-03-04", "en")).toBe("Mar 4, 2019");
    expect(reposeDateText("2020-02-29", "en")).toBe("Feb 29, 2020");
    expect(reposeDateText("0099-01-01", "en")).toContain("99");
    expect(reposeDateText("0099-01-01", "en")).not.toContain("1999");
    for (const bad of ["2019-02-29", "2019-13-01", "2019-3-4", "", "yesterday"]) expect(reposeDateText(bad, "en")).toBe(bad);
  });

  it("is what the row prints, never the stored text", () => {
    const src = read("components/prayers/Diptychs.tsx");
    expect(src).toContain("reposeDateText(entry.repose, locale)");
    expect(src).not.toMatch(/reposedLabel"\)\} \$\{entry\.repose\}/);
  });
});

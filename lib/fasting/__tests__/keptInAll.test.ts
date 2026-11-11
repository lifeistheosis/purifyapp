import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getMessages, tn } from "@/lib/i18n";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";

/**
 * "1 days kept in all." The fasting tracker's second card draws a number and
 * a line under it, and the line was one string, written for many days, in
 * every language: with one day marked it read "1 days kept in all." Found by
 * the pre-build gate's tap walk on 2026-11-11, the first walk to mark a day.
 *
 * The line is counted now, with the number over it, the way the app's other
 * counts are (lib/i18n/plural.ts): each language has the forms its numbers
 * need. The number is drawn over the line, not in it, so no form prints it.
 *
 * What would go wrong if this broke: "1 days" again; a language handed the
 * English line for one of its forms (a catalog is laid over English, so a
 * form it leaves out is read from English); or 2 to 4 days in the Slavic
 * languages given the case that 5 and more take ("2 дней").
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const own = (code: LocaleCode): Record<string, string> => JSON.parse(read(`lib/i18n/messages/${code}.json`));
const FAMILIES = ["fasting.keptInAll", "fasting.keptInAllPartial"];

describe("days kept in all", () => {
  it("is one day and many days in English", () => {
    const en = getMessages("en");
    expect(tn(en, "en", "fasting.keptInAll", 1)).toBe("day kept in all.");
    expect(tn(en, "en", "fasting.keptInAll", 2)).toBe("days kept in all.");
    expect(tn(en, "en", "fasting.keptInAll", 0)).toBe("days kept in all.");
    expect(tn(en, "en", "fasting.keptInAllPartial", 1, { partial: 1 })).toBe("day kept in all, 1 in part.");
    expect(tn(en, "en", "fasting.keptInAllPartial", 7, { partial: 2 })).toBe("days kept in all, 2 in part.");
  });

  it("has its forms in every language's own catalog, none read from English", () => {
    const en = own("en");
    for (const { code } of LOCALES) {
      const catalog = own(code);
      for (const family of FAMILIES) {
        // The uncounted line is gone, so nothing can draw it.
        expect(catalog[family], `${code}: ${family}`).toBeUndefined();
        for (const form of ["one", "other"]) {
          const value = catalog[`${family}.${form}`];
          expect(value, `${code}: ${family}.${form}`).toBeTruthy();
          if (code !== "en") expect(value, `${code}: ${family}.${form} is the English line`).not.toBe(en[`${family}.${form}`]);
        }
      }
      // The line that adds the days kept in part says how many, in every form.
      for (const [key, value] of Object.entries(catalog)) {
        if (key.startsWith("fasting.keptInAllPartial.")) expect(value, `${code}: ${key}`).toContain("{partial}");
        // The number is drawn over the line, never in it.
        if (FAMILIES.some((f) => key.startsWith(`${f}.`))) expect(value, `${code}: ${key}`).not.toContain("{count}");
      }
    }
  });

  it("gives every count a form of the reader's language, whatever its numbers ask for", () => {
    // Every category each language's numbers can fall in, resolved the way the page resolves it.
    for (const { code } of LOCALES) {
      const messages = getMessages(code);
      const catalog = own(code);
      const theirs = new Set(Object.entries(catalog).filter(([k]) => FAMILIES.some((f) => k.startsWith(`${f}.`))).map(([, v]) => v));
      for (const n of [0, 1, 2, 3, 5, 11, 21, 22, 25, 100, 101]) {
        for (const family of FAMILIES) {
          const line = tn(messages, code, family, n, { partial: "{partial}" });
          expect(theirs.has(line), `${code}: ${family} for ${n} is "${line}", not a line of its own catalog`).toBe(true);
        }
      }
    }
  });

  it("gives 2 to 4 their own case where the language has one, and Arabic its form for 11 to 99", () => {
    for (const code of ["ru", "uk", "pl", "sr", "ro"] as LocaleCode[]) {
      const catalog = own(code);
      for (const family of [...FAMILIES, "fasting.streakKept"]) {
        expect(catalog[`${family}.few`], `${code}: ${family}.few`).toBeTruthy();
        expect(catalog[`${family}.few`], `${code}: ${family}.few`).not.toBe(catalog[`${family}.other`]);
      }
    }
    const ru = getMessages("ru");
    expect(tn(ru, "ru", "fasting.keptInAll", 1)).toBe("день соблюдён всего.");
    expect(tn(ru, "ru", "fasting.keptInAll", 3)).toBe("дня соблюдено всего.");
    expect(tn(ru, "ru", "fasting.keptInAll", 5)).toBe("дней соблюдено всего.");
    // 21 is counted as 1 is, in Russian.
    expect(tn(ru, "ru", "fasting.keptInAll", 21)).toBe("день соблюдён всего.");
    const ar = own("ar");
    for (const family of FAMILIES) expect(ar[`${family}.many`], family).toBeTruthy();
  });

  it("is drawn counted on the page, with the number over it", () => {
    const page = read("components/fasting/FastingTrackerClient.tsx");
    expect(page).toContain("const keptInAll = summary.kept + summary.partial;");
    expect(page).toContain('{tn("fasting.keptInAll", keptInAll)}');
    expect(page).toContain('{tn("fasting.keptInAllPartial", keptInAll, { partial: Math.max(summary.partial, 1) })}');
    expect(page).not.toMatch(/\bt\("fasting\.keptInAll/);
  });
});

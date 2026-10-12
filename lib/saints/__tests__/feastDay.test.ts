// A saint's feast day, in the reader's language.
//
// What a reader would notice if this broke: "Εορτή August 9" on a phone set
// to Greek (which is how it was until 1.6), a date written as "M08 9" on a
// phone whose engine has no data for its language, or, worst, a saint whose
// feast has moved to another day because a date was restated wrongly.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { forgetDeviceDatesForTests } from "@/lib/i18n/deviceDates";
import { LOCALES } from "@/lib/i18n/locales";

import { feastDayIn, feastDaysIn } from "../feastDay";
import { SAINTS } from "../saints";

const every = SAINTS.flatMap((saint) => saint.feastDays.map((feast) => ({ slug: saint.slug, feast })));

afterEach(() => {
  vi.restoreAllMocks();
  forgetDeviceDatesForTests();
});

describe("feastDayIn", () => {
  it("leaves every feast day exactly as written for a reader in English", () => {
    expect(every.length).toBeGreaterThan(200);
    for (const { slug, feast } of every) {
      expect(feastDayIn(feast, "en"), slug).toBe(feast);
      expect(feastDayIn(feast, "en", "short"), slug).toBe(feast);
      expect(feastDayIn(feast, "en-GB"), slug).toBe(feast);
    }
  });

  it("writes a month and a day in the reader's language", () => {
    const greek = feastDayIn("August 9", "el");
    expect(greek).toMatch(/\p{Script=Greek}/u);
    expect(greek).toMatch(/9/);
    expect(greek).not.toMatch(/August/);
    expect(feastDayIn("August 9", "ru")).toMatch(/\p{Script=Cyrillic}/u);
    expect(feastDayIn("August 9", "ro")).toBe("9 august");
    expect(feastDayIn("January 1", "es")).toBe("1 de enero");
  });

  it("abbreviates the month for the card in the saints' list", () => {
    const long = feastDayIn("February 20", "el");
    const short = feastDayIn("February 20", "el", "short");
    expect(short).toMatch(/\p{Script=Greek}/u);
    expect(short).toMatch(/20/);
    expect(short.length).toBeLessThan(long.length);
    expect(feastDayIn("September 24", "ro", "short").length).toBeLessThan(feastDayIn("September 24", "ro").length);
    // No language's short form is longer than its long one, and for the
    // three 1.6 is built around it is shorter than the English it replaces.
    for (const { code } of LOCALES) {
      for (const feast of ["February 20", "September 24", "November 30"]) {
        expect(feastDayIn(feast, code, "short").length, `${code}: ${feast}`).toBeLessThanOrEqual(feastDayIn(feast, code).length);
      }
    }
    for (const code of ["el", "ro", "fil"]) {
      expect(feastDayIn("September 24", code, "short").length, code).toBeLessThan("September 24".length);
    }
  });

  it("keeps every day its own, in every language and both styles", () => {
    // Two different feast days never come out as the same words, in any of
    // the app's languages. Arabic, Urdu and Nepali may write their own
    // digits, so the day's number is not looked for here.
    for (const { code } of LOCALES) {
      for (const style of ["long", "short"] as const) {
        const seen = new Map<string, string>();
        for (const { feast } of every) {
          const out = feastDayIn(feast, code, style);
          expect(out.length, `${code}: ${feast}`).toBeGreaterThan(0);
          const before = seen.get(out);
          if (before !== undefined) expect(before, `${code} ${style}: ${out}`).toBe(feast);
          seen.set(out, feast);
        }
      }
    }
    // February 29 is a real feast day (St. John Cassian), and stays one.
    expect(feastDayIn("February 29", "en")).toBe("February 29");
    expect(feastDayIn("February 29", "ro")).toBe("29 februarie");
  });

  it("returns what is not a plain month and day exactly as written", () => {
    for (const words of [
      "Fifth Sunday of Great Lent",
      "Antipascha (Thomas Sunday)",
      "Third Sunday of Pascha",
      "August 9 (Old Calendar)",
      "August",
      "9 August",
      "august 9",
      "February 30",
      "June 31",
      "August 0",
      "",
    ]) {
      expect(feastDayIn(words, "el"), words).toBe(words);
      expect(feastDayIn(words, "el", "short"), words).toBe(words);
    }
    // Not a language tag at all.
    expect(feastDayIn("August 9", "not a language")).toBe("August 9");
  });

  it("keeps the English on a device that cannot write the reader's language", () => {
    // The test browser has no data for Georgian or Nepali, and wrote April 30
    // as "M04 30" on a phone set to either. Node has both, so the engine's
    // answer is stood in for here.
    expect(feastDayIn("April 30", "ka")).not.toBe("April 30");
    forgetDeviceDatesForTests();
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    expect(feastDayIn("April 30", "ka")).toBe("April 30");
    expect(feastDayIn("April 30", "ka", "short")).toBe("April 30");
    expect(feastDaysIn(["April 30", "January 1"], "ne")).toBe("April 30 · January 1");
  });

  it("joins a saint's days into one line", () => {
    expect(feastDaysIn(["January 30", "November 13"], "en")).toBe("January 30 · November 13");
    expect(feastDaysIn(["November 13", "Fifth Sunday of Great Lent"], "ro")).toBe(
      "13 noiembrie · Fifth Sunday of Great Lent",
    );
    expect(feastDaysIn(["November 13"], "ro", "short")).toBe(feastDayIn("November 13", "ro", "short"));
    expect(feastDaysIn([], "el")).toBe("");
  });
});

describe("the screens that show a feast day", () => {
  // Each of these drew the profile's own string, which is what froze the date
  // in English. They hand the days to the island instead.
  const root = join(__dirname, "..", "..", "..");
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  it("hand the days to the island and draw none of them directly", () => {
    for (const path of [
      "components/saints/SaintCard.tsx",
      "components/saints/SaintHero.tsx",
      "components/saints/SaintStudyRail.tsx",
    ]) {
      const source = read(path);
      expect(source, path).toContain("<FeastDays days={");
      expect(source, path).not.toMatch(/\{saint\.feastDays\[\d+\]\}/);
      expect(source, path).not.toMatch(/feastDays\.join\(/);
    }
  });

  it("the card asks for the short month, and a saint's own screen for the long", () => {
    expect(read("components/saints/SaintCard.tsx")).toMatch(/<FeastDays days=\{[^}]+\} brief \/>/);
    expect(read("components/saints/SaintHero.tsx")).toContain("<FeastDays days={saint.feastDays} />");
  });

  it("the island reads the live language, not the one the page was built in", () => {
    const island = read("components/saints/FeastDays.tsx");
    expect(island.trimStart().startsWith('"use client";')).toBe(true);
    expect(island).toContain("useTranslate()");
    expect(island).toContain("feastDaysIn(days, locale,");
  });
});

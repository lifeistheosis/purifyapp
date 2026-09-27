import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { RULES } from "@/lib/prayers/rules";
import { suggestRules, timeOfDayAt } from "@/lib/prayers/suggest";

const at = (h: number) => new Date(2026, 8, 26, h, 0, 0);

describe("what to pray now", () => {
  it("reads the reader's own hour", () => {
    expect(timeOfDayAt(at(5))).toBe("waking");
    expect(timeOfDayAt(at(9))).toBe("morning");
    expect(timeOfDayAt(at(13))).toBe("midday");
    expect(timeOfDayAt(at(19))).toBe("evening");
    expect(timeOfDayAt(at(23))).toBe("night");
    expect(timeOfDayAt(at(2))).toBe("night");
  });

  it("always fills the row, with no planned rule and no repeat", () => {
    for (const tod of ["waking", "morning", "midday", "evening", "night"] as const) {
      for (const season of ["lent", "pascha", "nativity", "fasting", "any"] as const) {
        for (const isFast of [true, false]) {
          const got = suggestRules({ tod, season, isFast, max: 4 });
          expect(got.length, `${tod} ${season} ${isFast}`).toBe(4);
          expect(new Set(got.map((r) => r.id)).size).toBe(4);
          expect(got.some((r) => r.planned)).toBe(false);
        }
      }
    }
  });

  it("puts the hour first, then the season", () => {
    expect(suggestRules({ tod: "evening", season: "any", isFast: false })[0].id).toBe("evening");
    const lent = suggestRules({ tod: "evening", season: "lent", isFast: false });
    expect(lent.map((r) => r.id)).toContain("lent-ephrem");
  });

  it("leaves out what the Continue card already shows", () => {
    const got = suggestRules({ tod: "evening", season: "any", isFast: false, max: 3, exclude: new Set(["evening"]) });
    expect(got.map((r) => r.id)).not.toContain("evening");
    expect(got).toHaveLength(3);
  });
});

// Every rule the prayer book lists must have its words in the catalog, or the
// page prints the key itself: eight rules did, "prayers.rule.pre-communion
// .title" among them, until 2026-09-26.
describe("the prayer book's words", () => {
  const messages = en as Record<string, string>;
  it("has a title for every rule, and a description wherever the rule has one", () => {
    const missing: string[] = [];
    for (const r of RULES) {
      if (!messages[`prayers.rule.${r.id}.title`]) missing.push(`prayers.rule.${r.id}.title`);
      if (r.description && !messages[`prayers.rule.${r.id}.description`]) missing.push(`prayers.rule.${r.id}.description`);
    }
    expect(missing).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { interpolate, pluralSuffix, resolvePluralKey } from "../plural";
import { tn } from "../index";

describe("pluralSuffix", () => {
  it("resolves Russian one/few/many", () => {
    expect(pluralSuffix("ru", 1)).toBe("one");
    expect(pluralSuffix("ru", 2)).toBe("few");
    expect(pluralSuffix("ru", 5)).toBe("many");
    expect(pluralSuffix("ru", 21)).toBe("one");
    expect(pluralSuffix("ru", 22)).toBe("few");
  });

  it("resolves Polish one/few/many", () => {
    expect(pluralSuffix("pl", 1)).toBe("one");
    expect(pluralSuffix("pl", 3)).toBe("few");
    expect(pluralSuffix("pl", 5)).toBe("many");
  });

  it("resolves all six Arabic categories", () => {
    expect(pluralSuffix("ar", 0)).toBe("zero");
    expect(pluralSuffix("ar", 1)).toBe("one");
    expect(pluralSuffix("ar", 2)).toBe("two");
    expect(pluralSuffix("ar", 3)).toBe("few");
    expect(pluralSuffix("ar", 11)).toBe("many");
    expect(pluralSuffix("ar", 100)).toBe("other");
  });

  it("Indonesian collapses everything to other", () => {
    for (const n of [0, 1, 2, 5, 100]) {
      expect(pluralSuffix("id", n)).toBe("other");
    }
  });

  it("English stays one/other", () => {
    expect(pluralSuffix("en", 1)).toBe("one");
    expect(pluralSuffix("en", 0)).toBe("other");
    expect(pluralSuffix("en", 2)).toBe("other");
  });
});

describe("resolvePluralKey", () => {
  it("prefers new CLDR keys when present", () => {
    const m = {
      "days.one": "{count} день",
      "days.few": "{count} дня",
      "days.many": "{count} дней",
    };
    expect(resolvePluralKey(m, "days", 1, "ru")).toBe("{count} день");
    expect(resolvePluralKey(m, "days", 3, "ru")).toBe("{count} дня");
    expect(resolvePluralKey(m, "days", 7, "ru")).toBe("{count} дней");
  });

  it("falls back to legacy singular/plural keys (existing en/de catalogs)", () => {
    const m = { "saints.count.singular": "{count} saint", "saints.count.plural": "{count} saints" };
    expect(resolvePluralKey(m, "saints.count", 1, "en")).toBe("{count} saint");
    expect(resolvePluralKey(m, "saints.count", 4, "en")).toBe("{count} saints");
  });

  it("maps every non-one category to the legacy plural form", () => {
    const m = { "days.singular": "ein Tag", "days.plural": "{count} Tage" };
    // Arabic count 2 is category "two"; legacy fallback must still land.
    expect(resolvePluralKey(m, "days", 2, "ar")).toBe("{count} Tage");
  });

  it("uses .other as the universal fallback and keyBase as loud failure", () => {
    expect(resolvePluralKey({ "x.other": "X" }, "x", 1, "id")).toBe("X");
    expect(resolvePluralKey({}, "missing.key", 3, "en")).toBe("missing.key");
  });
});

describe("interpolate + server tn", () => {
  it("replaces all placeholder occurrences", () => {
    expect(interpolate("{n} of {n} for {who}", { n: 3, who: "you" })).toBe("3 of 3 for you");
    expect(interpolate("no tokens")).toBe("no tokens");
  });

  it("server tn interpolates count", () => {
    const m = { "days.one": "{count} day", "days.other": "{count} days" };
    expect(tn(m, "en", "days", 1)).toBe("1 day");
    expect(tn(m, "en", "days", 12)).toBe("12 days");
  });
});

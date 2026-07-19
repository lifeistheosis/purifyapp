import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getLocale,
  isLocaleSelectable,
  negotiateFromAcceptLanguage,
  resolveLocale,
  type LocaleCode,
} from "../locales";
import { getMessages, t } from "../index";

const ALL_CODES: LocaleCode[] = [
  "en", "es", "ro", "el", "ru", "fr", "de", "sr", "uk", "it", "pt", "bg", "ar",
  "fil", "tr", "ka", "hu", "id", "ne", "pl", "ur",
];

describe("locale registry", () => {
  it("holds exactly the 21 Beta 2.3 locales, no duplicates", () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual([...ALL_CODES].sort());
    expect(new Set(LOCALES.map((l) => l.code)).size).toBe(21);
  });

  it("resolves every registered code to itself", () => {
    for (const code of ALL_CODES) {
      expect(resolveLocale(code)).toBe(code);
    }
  });

  it("falls back to English for unknown, empty, and legacy inputs", () => {
    expect(resolveLocale("tl")).toBe(DEFAULT_LOCALE); // Filipino is "fil"
    expect(resolveLocale("zz")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("marks only Arabic and Urdu rtl", () => {
    const rtl = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);
    expect(rtl.sort()).toEqual(["ar", "ur"]);
    expect(getLocale("ur").dir).toBe("rtl");
    expect(getLocale("fil").dir).toBe("ltr");
  });

  it("keeps the eight new locales unselectable until their catalogs land", () => {
    for (const code of ["fil", "tr", "ka", "hu", "id", "ne", "pl", "ur"]) {
      expect(isLocaleSelectable(code)).toBe(false);
    }
    expect(isLocaleSelectable("en")).toBe(true);
    expect(isLocaleSelectable("de")).toBe(true);
  });

  it("every locale carries a native label and a comingSoon string", () => {
    for (const l of LOCALES) {
      expect(l.nativeLabel.length).toBeGreaterThan(0);
      expect(l.comingSoon.length).toBeGreaterThan(0);
    }
  });

  it("Accept-Language negotiation never lands on a not-ready locale", () => {
    expect(negotiateFromAcceptLanguage("tr-TR,tr;q=0.9")).toBe(DEFAULT_LOCALE);
    expect(negotiateFromAcceptLanguage("ur-PK")).toBe(DEFAULT_LOCALE);
    expect(negotiateFromAcceptLanguage("de-AT,de;q=0.9")).toBe("de");
  });
});

describe("catalog loading for new locales", () => {
  it("empty catalogs fall back to English for every key", () => {
    const en = getMessages("en");
    for (const code of ["fil", "tr", "ka", "hu", "id", "ne", "pl", "ur"]) {
      const m = getMessages(code);
      expect(m).toEqual(en);
      expect(t(m, "nav.home")).toBe(t(en, "nav.home"));
    }
  });
});

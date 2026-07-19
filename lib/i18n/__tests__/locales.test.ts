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

  it("every locale is selectable (ready or editorial preview)", () => {
    for (const code of ALL_CODES) {
      expect(isLocaleSelectable(code)).toBe(true);
    }
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
  it("core keys are translated and missing keys fall back to English", () => {
    const en = getMessages("en");
    for (const code of ["fil", "tr", "ka", "hu", "id", "ne", "pl", "ur"] as const) {
      const m = getMessages(code);
      // Core chrome translated (differs from English).
      expect(t(m, "nav.today")).not.toBe(t(en, "nav.today"));
      // Long-tail keys fall back to the English value, never the raw key.
      expect(t(m, "shop.purifyShop")).toBe(t(en, "shop.purifyShop"));
    }
  });
});

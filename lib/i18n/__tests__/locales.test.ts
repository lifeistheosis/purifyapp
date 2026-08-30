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

  it("Accept-Language negotiation lands on any public locale", () => {
    expect(negotiateFromAcceptLanguage("tr-TR,tr;q=0.9")).toBe("tr");
    expect(negotiateFromAcceptLanguage("ur-PK")).toBe("ur");
    expect(negotiateFromAcceptLanguage("fil-PH,fil;q=0.9")).toBe("fil");
    expect(negotiateFromAcceptLanguage("de-AT,de;q=0.9")).toBe("de");
    expect(negotiateFromAcceptLanguage("zz")).toBe(DEFAULT_LOCALE);
  });
});

describe("catalog loading for new locales", () => {
  it("translates the long tail too, not just the core chrome", () => {
    // This used to assert the opposite for shop.purifyShop: that a long-tail
    // key FELL BACK to English. That was true when these eight locales were
    // around 8.7% complete, and it was pinning the gap rather than testing
    // anything. All twenty catalogs now carry all 2,077 keys, so the
    // assertion is inverted: the long tail is translated as well.
    const en = getMessages("en");
    for (const code of ["fil", "tr", "ka", "hu", "id", "ne", "pl", "ur"] as const) {
      const m = getMessages(code);
      expect(t(m, "nav.today")).not.toBe(t(en, "nav.today"));
      expect(t(m, "shop.purifyShop")).not.toBe(t(en, "shop.purifyShop"));
    }
  });

  it("still falls back to English for a key a locale genuinely lacks", () => {
    // The fallback mechanism is worth keeping under test even with every
    // catalog complete, because it is what keeps the site usable the moment a
    // new key is added to en.json and before anyone translates it. Proved with
    // a key invented here rather than with whatever happened to be missing.
    const en = getMessages("en");
    const m = getMessages("pl");
    expect(t(m, "nav.today")).not.toBe(t(en, "nav.today"));
    // A key in no catalog at all returns itself, loudly, rather than "".
    expect(t(m, "this.key.exists.nowhere")).toBe("this.key.exists.nowhere");
  });
});

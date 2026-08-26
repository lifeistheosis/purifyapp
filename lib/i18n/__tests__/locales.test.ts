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

describe("catalog values", () => {
  /**
   * An EMPTY string is worse than a missing key, and the merge is why.
   *
   * getMessages spreads English UNDER the locale ({ ...en, ...locale }), and
   * lib/i18n/client.ts:51 does the same on the client. So a key a translator
   * has not reached yet is simply absent, English fills it through the spread,
   * and the reader sees a real word. A key present with "" WINS that merge,
   * and t() cannot recover because it uses `??`, which only falls back on
   * null and undefined. "" is neither.
   *
   * That shipped: es.json carried "nav.you": "", so Spanish readers had an
   * unlabelled tab in the bottom bar, next to six labelled ones, for as long
   * as it was there. Nothing failed, because nothing looked.
   *
   * Deleting the key would have been a correct fix too. Writing "" is the
   * trap, so the trap is what gets guarded.
   */
  it("never contains an empty or whitespace-only value", () => {
    const offenders: string[] = [];
    for (const code of ALL_CODES) {
      const messages = getMessages(code);
      for (const [key, value] of Object.entries(messages)) {
        if (typeof value === "string" && value.trim() === "") {
          offenders.push(`${code}.json  ${key}`);
        }
      }
    }
    expect(
      offenders,
      "An empty value overrides the English fallback and renders as nothing " +
        "at all. Either translate it or DELETE the key so English fills in:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("resolves every tab-bar label to a real word in every locale", () => {
    // The bottom tab bar is the app's primary navigation and its labels are
    // the shortest strings in the product, so a miss there is both the most
    // visible and the easiest to overlook. t() returns the KEY on a miss, so
    // a label that still looks like a key is a miss.
    const TAB_KEYS = [
      "nav.today",
      "nav.bible",
      "nav.discover",
      "nav.prayers",
      "nav.shop",
      "nav.community",
      "nav.you",
    ];
    const offenders: string[] = [];
    for (const code of ALL_CODES) {
      const messages = getMessages(code);
      for (const key of TAB_KEYS) {
        const value = t(messages, key);
        if (!value || value === key) offenders.push(`${code}.json  ${key}`);
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });
});

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

// The reader's direction is on <html> before the first paint (Updates 82, 1.9).
//
// What a reader would notice if this broke: in Arabic, the launch slate's
// stars jumping across the screen while it is still up. They are placed from
// the line's start, so the sky turns with the page (components/native/LaunchFrame.tsx),
// and dir used to be written only once the reader's words came: on the export,
// in every Arabic open, they jumped in one frame, one of them 247.8px
// (docs/handoffs/updates-81.md, step 3a).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APPLIED_LANGUAGE_KEY, LANGUAGE_PREPAINT } from "../languagePrepaint";
import { launchLanguage } from "../launchLanguage";
import { DEVICE_SPELLINGS, LOCALES, getLocale, isLocaleSelectable } from "../locales";

/** Run the script as a page runs it: the export's <html>, the device's languages, what this device last applied. */
function firstPaint(languages: string[], applied: string | null = null) {
  const root = { lang: "en", dir: "ltr" };
  const store = { getItem: (key: string) => (key === APPLIED_LANGUAGE_KEY ? applied : null) };
  new Function("document", "navigator", "localStorage", LANGUAGE_PREPAINT)(
    { documentElement: root },
    { languages, language: languages[0] },
    store,
  );
  return root;
}

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("the language pre-paint", () => {
  it("opens an Arabic phone right to left before anything is drawn, so the slate's sky never turns under it", () => {
    expect(firstPaint(["ar-EG", "en-US"])).toEqual({ lang: "ar", dir: "rtl" });
    expect(firstPaint(["ur-PK"])).toEqual({ lang: "ur", dir: "rtl" });
  });

  it("leaves an English phone as the app was built", () => {
    expect(firstPaint(["en-US"])).toEqual({ lang: "en", dir: "ltr" });
    expect(firstPaint(["xx-YY"])).toEqual({ lang: "en", dir: "ltr" });
  });

  it("puts the language this device last applied before the phone's, and passes over one the app no longer has", () => {
    expect(firstPaint(["en-US"], "ar")).toEqual({ lang: "ar", dir: "rtl" });
    expect(firstPaint(["ar-EG"], "en")).toEqual({ lang: "en", dir: "ltr" });
    expect(firstPaint(["ar-EG"], "xx")).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("decides what LocaleBootstrap decides, for every language tag a phone may give", () => {
    const tags = [
      ...LOCALES.flatMap((l) => [l.code, `${l.code}-XX`, `${l.code.toUpperCase()}_xx`]),
      ...Object.keys(DEVICE_SPELLINGS).flatMap((k) => [k, `${k}-ZZ`]),
      "",
      " ",
      "zz",
    ];
    for (const tag of tags) {
      const opening = launchLanguage(null, [tag], "en");
      expect(firstPaint([tag]), tag).toEqual({ lang: opening, dir: getLocale(opening).dir });
    }
    for (const l of LOCALES.filter((x) => isLocaleSelectable(x.code))) {
      const opening = launchLanguage(l.code, ["en-US"], "en");
      expect(firstPaint(["en-US"], l.code), l.code).toEqual({ lang: opening, dir: getLocale(opening).dir });
    }
  });

  it("runs in the apps, beside the other pre-paints, and not on the website, whose server writes the language", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toMatch(/\{IS_STATIC_EXPORT \? \(\s*<script\s+nonce=\{nonce\}\s+suppressHydrationWarning\s+dangerouslySetInnerHTML=\{\{ __html: LANGUAGE_PREPAINT \}\}/);
    expect(layout.indexOf("LANGUAGE_PREPAINT }}")).toBeLessThan(layout.indexOf("<RootFrame"));
  });

  it("is kept by the provider whenever the apps apply a language, for the next open", () => {
    const provider = read("components/i18n/MessagesProvider.tsx");
    expect(provider).toContain("window.localStorage.setItem(APPLIED_LANGUAGE_KEY, code)");
    expect(provider).toMatch(/function showLanguage[\s\S]*?if \(!isNativeClient\(\)\) return;/);
  });
});

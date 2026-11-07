// Choosing a downloaded Bible (1.9): its row among the translations, the
// offer of the app in its language (the owner's "a pop-up ... and also add a
// button to click never show again", and of its first draw, "make this a pop
// up rather than a pull up bar"), and the chapter shown in it.

import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
const fired: string[] = [];
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: (e: CustomEvent<string>) => {
      fired.push(e.detail);
      return true;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

const { offerLanguageFor, refuseLanguageOffer } = await import("@/lib/bible/downloads/languageOffer");
const { DOWNLOADABLE_BIBLES } = await import("@/lib/bible/downloads/catalog");

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../../..", rel), "utf8");
const [RU, GRC] = DOWNLOADABLE_BIBLES;

beforeEach(() => {
  store.clear();
  fired.length = 0;
});

describe("the offer of the app in a Bible's language", () => {
  it("is made when the Bible's language is not the app's, and not when it is", () => {
    expect(offerLanguageFor(RU, "en")).toBe(true);
    expect(fired).toEqual(["ru-synodal"]);
    expect(offerLanguageFor(RU, "ru")).toBe(false);
    // The Greek is offered as the app's Greek, though its words are Koine.
    expect(GRC.language).toBe("el");
    expect(GRC.textLang).toBe("grc");
    expect(offerLanguageFor(GRC, "el")).toBe(false);
  });

  it("is never made again once the reader says never, for any Bible", () => {
    refuseLanguageOffer();
    expect(offerLanguageFor(RU, "en")).toBe(false);
    expect(offerLanguageFor(GRC, "en")).toBe(false);
    expect(fired).toEqual([]);
  });

  it("is a pop-up in the middle of the screen, not a sheet, with Switch, Not now and Never ask again", () => {
    const offer = read("components/bible/BibleLanguageOffer.tsx");
    expect(offer).not.toMatch(/<Sheet\b/);
    expect(offer).toContain('className="fixed inset-0 z-[80] flex items-center justify-center px-6"');
    expect(offer).toContain('aria-modal="true"');
    for (const key of ["bible.languageOffer.switch", "bible.languageOffer.notNow", "bible.languageOffer.never"]) expect(offer).toContain(key);
    // Never ask again is kept; Switch changes the language as the language setting does.
    expect(offer).toMatch(/refuseLanguageOffer\(\);\s*close\(\);/);
    expect(offer).toContain("void applyLocale(bible.language)");
    // A tap off the card and Android's back are Not now; it moves only on the motion switch.
    expect(offer).toContain("useAndroidBack(open, close);");
    expect(offer).toMatch(/motion-safe:transition-\[opacity,transform,translate,scale\]/);
  });
});

describe("a Bible's row among the translations", () => {
  const row = read("components/bible/BibleRow.tsx");
  const list = read("components/bible/TranslationList.tsx");

  it("downloads in the apps on a tap, with a ring that stops it, and is read straight from the website on the web", () => {
    expect(row).toContain("const ready = !native || onPhone;");
    expect(row).toContain("onClick={ready ? onChoose : download}");
    expect(row).toContain('<SaveOfflineMark look="saving"');
    expect(row).toContain("onClick={() => cancelBibleDownload(bible.id)}");
  });

  it("opens the Bible it downloaded only while the reader is still waiting for it", () => {
    expect(row).toMatch(/if \(result === "saved" && waiting\.current\) onChoose\(\);/);
    expect(row).toMatch(/useEffect\(\s*\(\) => \(\) => \{\s*waiting\.current = false;/);
  });

  it("takes a Bible off the phone from its ••• line, with its size", () => {
    expect(row).toContain('t("bible.downloads.onPhone", { size })');
    expect(row).toContain("void removeBible(bible.id);");
  });

  it("lists the Bibles under their languages after the English, and a choice of the English clears a Bible", () => {
    expect(list).toContain("{bibleGroups.map((group) => (");
    expect(list.indexOf("{groups.map((group) => (")).toBeLessThan(list.indexOf("{bibleGroups.map((group) => ("));
    expect(list).toMatch(/if \(shown\) writeBibleChoice\(null\);/);
    expect(list).toContain("offerLanguageFor(bible, locale);");
  });
});

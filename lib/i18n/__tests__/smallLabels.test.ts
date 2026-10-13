// The forty-five small labels that had no catalog key until 1.6.
//
// The palette names and their one lines, the saints' groups, the four feasts
// that move with Pascha, the FAQ's questions, two lines of the support screen
// and the shop's line for no connection were all written out in English in
// the source. A phone set to Greek drew every one of them in English, in the
// middle of a Greek screen. They are in the catalogs now, and each screen
// asks the catalog for them.
//
// What this holds together, because nothing else does:
//
//  - The data modules still carry the English, as the fallback and for the
//    tests that read it, with the catalog KEY beside it. The screen looks the
//    key up, so most of these keys are never written as a literal `t("...")`
//    and lib/i18n/__tests__/keysExist.test.ts cannot see them. A key that is
//    missing draws as the key itself ("saints.group.martyrs" on a chip).
//  - English in the catalog is the English in the source, letter for letter.
//    Wiring these changed no English word, and a reader in English must see
//    no difference.
//  - Every one of the forty-five has words in all twenty-one languages.
//
// What it does not hold: whether the words are the right ones. The saint and
// feast words were drafted and still wait for a native reader.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { FeastDays } from "@/components/saints/FeastDays";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { READING_THEMES } from "@/lib/reader/readingModes";
import { MOVABLE_FEAST_KEYS, feastDaysIn } from "@/lib/saints/feastDay";
import { SAINT_GROUPS } from "@/lib/saints/groups";
import { SAINTS } from "@/lib/saints/saints";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const catalog = (code: string) => JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;

const EN = catalog("en");
const CODES = LOCALES.map((l) => l.code);

/** A key, the English the source holds for it, and where that English is. */
type Pair = { key: string; english: string; from: string };

// The five everyday palettes. The two collection palettes have no keys yet.
const palettes: Pair[] = READING_THEMES.filter((mode) => !mode.collection).flatMap((mode) => [
  { key: mode.labelKey ?? "", english: mode.label, from: `the ${mode.id} palette's name` },
  { key: mode.blurbKey ?? "", english: mode.blurb, from: `the ${mode.id} palette's one line` },
]);

const groups: Pair[] = SAINT_GROUPS.map((group) => ({
  key: group.labelKey,
  english: group.label,
  from: `the saints' group ${group.id}`,
}));

const feasts: Pair[] = Array.from(MOVABLE_FEAST_KEYS.entries()).map(([feast, key]) => ({
  key,
  english: feast,
  from: "a feast that moves with Pascha",
}));

// The FAQ is a page, not a module a test can import, so it is read as source.
const faqPage = read("app/(app)/faq/page.tsx");
const englishList = faqPage.slice(faqPage.indexOf("const QUESTIONS: QA[]"), faqPage.indexOf("const QUESTIONS_DE"));
const germanList = faqPage.slice(faqPage.indexOf("const QUESTIONS_DE"), faqPage.indexOf("export default"));
const questions: Pair[] = Array.from(englishList.matchAll(/\bq: "([^"]+)",\s*k: "([^"]+)",/g)).map((found) => ({
  key: found[2],
  english: found[1],
  from: "a question in the FAQ",
}));

// These three are no longer written out anywhere in the source: the catalog
// is the only place their English lives, so it is held here.
const writtenOut: Pair[] = [
  { key: "support.workBehindTheApp", english: "The work behind the app.", from: "the support screen in the apps, its heading" },
  { key: "support.gladYouAreHere", english: "We are glad you are here.", from: "the support screen in the apps, its last line" },
  {
    key: "shop.couldntReachTheShop",
    english: "We couldn't reach the shop. Check your connection and try again.",
    from: "the shop with no connection",
  },
];

const ALL: Pair[] = [...palettes, ...groups, ...feasts, ...questions, ...writtenOut];

describe("the small labels", () => {
  it("are forty-five, each with a key of its own", () => {
    expect(palettes.length).toBe(10);
    expect(groups.length).toBe(14);
    expect(feasts.length).toBe(4);
    expect(questions.length).toBe(14);
    expect(ALL.length).toBe(45);
    for (const { key, from } of ALL) expect(key, from).toMatch(/^[a-z]+(\.[A-Za-z]+)+$/);
    expect(new Set(ALL.map((pair) => pair.key)).size).toBe(45);
  });

  it("say in English exactly what the source says", () => {
    for (const { key, english, from } of ALL) expect(EN[key], `${key}: ${from}`).toBe(english);
  });

  it("have words in all twenty-one languages", () => {
    expect(CODES.length).toBe(21);
    const longDash = String.fromCharCode(0x2014);
    const gaps: string[] = [];
    for (const code of CODES) {
      const words = catalog(code);
      for (const { key } of ALL) {
        const value = words[key];
        if (typeof value !== "string" || value.trim() === "") gaps.push(`${code}: ${key} has no words`);
        else if (value.includes(longDash)) gaps.push(`${code}: ${key} has a long dash`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it("leave no FAQ question in the English list without a key", () => {
    const asked = Array.from(englishList.matchAll(/\bq: "/g)).length;
    expect(asked).toBe(questions.length);
  });

  it("say in German what the app's own German already says", () => {
    // The website's German FAQ and support screen are written out in the
    // pages. The apps read German from the catalog. A reader should not meet
    // two wordings of one line.
    const de = catalog("de");
    const inCatalog = new Set(questions.map((pair) => de[pair.key]));
    const written = Array.from(germanList.matchAll(/\bq: "([^"]+)",/g)).map((found) => found[1]);
    expect(written.length).toBe(12);
    for (const question of written) expect(inCatalog.has(question), question).toBe(true);

    const support = read("app/(app)/support/page.tsx");
    expect(support).toContain(`? "${de["support.workBehindTheApp"]}"`);
    expect(support).toContain(`? "${de["support.gladYouAreHere"]}"`);
  });
});

describe("the screens that draw the small labels", () => {
  // Each of these drew the English from the source. Read as source, so that
  // putting the English back is noticed.
  it("ask the catalog, on the device", () => {
    const chips = read("components/reader/ReadingModeChips.tsx");
    expect(chips.trimStart().startsWith('"use client";')).toBe(true);
    expect(chips).toContain("t(mode.labelKey)");
    expect(chips).toContain("t(mode.blurbKey)");

    const browser = read("components/saints/SaintsBrowser.tsx");
    expect(browser.trimStart().startsWith('"use client";')).toBe(true);
    expect(browser).toContain("label={t(g.labelKey)}");

    const days = read("components/saints/FeastDays.tsx");
    expect(days).toContain('feastDaysIn(days, locale, brief ? "short" : "long", t)');

    const shop = read("components/shop/ShopStates.tsx");
    expect(shop).toContain('t("shop.couldntReachTheShop")');
  });

  it("ask through the island where the server writes the page", () => {
    // A server component that looked these up itself would write English
    // into the apps for good (lib/i18n/__tests__/serverWords.test.ts).
    expect(faqPage).toContain("{qa.k ? <T k={qa.k} /> : qa.q}");
    const support = read("app/(app)/support/page.tsx");
    expect(support).toContain('<T k="support.workBehindTheApp" />');
    expect(support).toContain('<T k="support.gladYouAreHere" />');
  });
});

describe("the feasts that move with Pascha", () => {
  const PLAIN_DATE =
    /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/;
  const inWords = SAINTS.flatMap((saint) => saint.feastDays.filter((feast) => !PLAIN_DATE.test(feast)));

  it("each have a key, and no key is left without a feast", () => {
    // A profile that names a fifth movable feast would draw it in English on
    // every phone. This fails until it has a key and words.
    expect(inWords.length).toBeGreaterThan(0);
    for (const feast of inWords) expect(MOVABLE_FEAST_KEYS.has(feast), feast).toBe(true);
    for (const feast of MOVABLE_FEAST_KEYS.keys()) expect(inWords, feast).toContain(feast);
  });

  it("are said in the reader's language when the catalog is handed over", () => {
    const el = catalog("el");
    const line = feastDaysIn(["Third Sunday of Pascha"], "el", "long", (key) => el[key]);
    expect(line).toBe(el["saints.movableFeast.thirdSundayOfPascha"]);
    expect(line).not.toBe("Third Sunday of Pascha");
  });

  it("read to an English reader exactly as they did", () => {
    for (const saint of SAINTS) {
      if (!saint.feastDays.some((feast) => MOVABLE_FEAST_KEYS.has(feast))) continue;
      expect(feastDaysIn(saint.feastDays, "en", "long", (key) => EN[key]), saint.slug).toBe(saint.feastDays.join(" · "));
    }
  });

  it("are drawn by the island in the language of the device", () => {
    // The island itself, inside the provider every screen sits in: a fixed
    // day and a movable one on the same line, as on a saint's own screen.
    type ProviderProps = Parameters<typeof MessagesProvider>[0];
    const draw = (code: string) =>
      renderToString(
        createElement(
          MessagesProvider,
          { locale: code, messages: getMessages(code) } as ProviderProps,
          createElement(FeastDays, { days: ["July 22", "Third Sunday of Pascha"] }),
        ),
      );
    const el = catalog("el");
    expect(draw("el")).toContain(` · ${el["saints.movableFeast.thirdSundayOfPascha"]}`);
    expect(draw("el")).not.toContain("Third Sunday of Pascha");
    expect(draw("el")).not.toContain("July");
    expect(draw("en")).toContain("July 22 · Third Sunday of Pascha");
  });

  it("stay as the profile wrote them when no catalog is handed over", () => {
    expect(feastDaysIn(["Fifth Sunday of Great Lent"], "el")).toBe("Fifth Sunday of Great Lent");
  });
});

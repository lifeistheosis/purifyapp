import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No typed arrow in the words a reader reads. The house rule: "An icon is one
 * from components/ui/icons, never a typed character." In Arabic and Urdu,
 * which read from the right, a typed arrow points the wrong way: it does not
 * mirror, it takes the words' size and colour, and a screen reader says it.
 * Round 2's before export found one in "Learn how to pray it" (5f9b95e9,
 * lib/prayers/__tests__/learnHowToPrayIt.test.ts); this sweep took out the
 * other 45 lines that carried one in all 21 catalogues, and the arrows typed
 * into the pages and components.
 *
 * Where an arrow stood: a back link wears ChevronLeft before its words; a lone
 * way on, whose look was the arrow, wears ChevronRight after them; a link that
 * leaves the app wears ArrowUpLeft turned to point up and to the end; each is
 * mirrored in a right-to-left language. A link among siblings that carry no
 * arrow carries none, and a route in words says "to".
 *
 * The arrows are U+2190 to U+21FF (Arrows) and U+27F5 to U+27FF (the long
 * arrows), typed or escaped. This file holds none of them: each is built from
 * its code.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const MESSAGES = path.join(ROOT, "lib", "i18n", "messages");

const LEFT = String.fromCodePoint(0x2190);
const RIGHT = String.fromCodePoint(0x2192);
const HOOKED_LEFT = String.fromCodePoint(0x21a9);
const LONG_RIGHT = String.fromCodePoint(0x27f6);

const isArrow = (cp: number) => (cp >= 0x2190 && cp <= 0x21ff) || (cp >= 0x27f5 && cp <= 0x27ff);

/** Every arrow in a text: typed, escaped in code (a backslash, u and its code, with or without braces), or written in markup as a number (&#8594;, &#x2192;) or a name (&rarr;). */
function arrowsIn(text: string): string[] {
  const found: string[] = [];
  for (const ch of text) if (isArrow(ch.codePointAt(0)!)) found.push(ch);
  for (const m of text.matchAll(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|&#x([0-9a-f]+);|&#(\d+);/gi)) {
    const hex = m[1] ?? m[2] ?? m[3];
    if (isArrow(hex ? parseInt(hex, 16) : Number(m[4]))) found.push(m[0]);
  }
  for (const m of text.matchAll(/&[a-z]*arr(?:ow)?[a-z]*;/gi)) found.push(m[0]);
  return found;
}

/** Code without its comments (lib/ui/__tests__/lookSurfaces.test.ts): an arrow in a note to the next reader of the code is not on a screen. */
const uncomment = (code: string) =>
  code
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const rel = (file: string) => path.relative(ROOT, file).replace(/\\/g, "/");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else if (/\.tsx?$/.test(name)) out.push(file);
  }
  return out;
}

/** The owner's panel is not a reader's page: what it draws is his. */
const OWNERS = ["app/admin/", "app/api/admin/", "app/owner/", "components/admin/", "components/owner/", "lib/admin/"];

/** The arrows that stay, by name and reason. Each takes away one place where `holds` is written. */
const STAYS: { file: string; holds: string; why: string }[] = [
  {
    file: "components/bible/ChapterScreen.tsx",
    holds: `${LEFT} ${RIGHT} <T k="bible.readerShortcuts" />`,
    why: "the computer's shortcut hint names the keyboard's own two arrow keys: keys, not a way to go",
  },
  {
    file: "components/legal/PrivacyText.tsx",
    holds: "IP&rarr;city",
    why: "the privacy policy, whose words change only at the owner's word; English, read from the left",
  },
  {
    file: "components/legal/PrivacyText.tsx",
    holds: "IP&rarr;Stadt",
    why: "the privacy policy, whose words change only at the owner's word; German, read from the left",
  },
  {
    file: "lib/community/symbols.ts",
    holds: `/[${LEFT}-`,
    why: "the first character of a range in a pattern that finds what a reader typed, to draw it in a face that has it: readers' own text",
  },
  {
    file: "lib/shop/funnel.ts",
    holds: `emoji: "${HOOKED_LEFT}`,
    why: "the owner's panel: the mark of a refunded order on the shop's funnel",
  },
];

/** The 45 lines this sweep took the arrow out of, and the one before it (5f9b95e9). */
const SWEPT = [
  "home.seeToday", "signin.newHere", "signup.alreadyHaveAccount", "prayers.openTodaysPrayer",
  "prayers.today.readPassage", "prayers.today.openRule", "prayers.today.learnHow", "prayers.today.psalter",
  "prayers.today.browseSaints", "prayers.today.learnLink", "prayers.hours.allHours", "prayers.akathists.openAll",
  "study.gatherTheLinesThatStrike", "study.enter", "ui.backToChooser", "ui.accountX", "ui.setAPasswordFirst",
  "ui.manage", "ui.citationsFromTheFathers", "ui.openTheCouncil", "ui.useLocallyX", "ui.createAnAccountX",
  "ui.takingTooLongOpenYour", "ui.seeAll", "shop.allCampaigns", "shop.freeShippingOnEveryOrder", "shop.messagesX",
  "shop.viewTheOrder", "shop.viewYourApplicationStatus", "shop.yourOrdersX", "shop.readTheLife",
  "shop.readTheWritings", "shop.backToTheShopX", "shop.visitTheStore", "shop.requestAnIconX", "shop.sellOnPurifyX",
  "shop.backToTheShopXX", "community.join", "study.florilegium.yoursArrow", "prayers.yourAccountLink",
  "ui.signInArrow", "ui.backToSignIn", "profile.signInLink", "ui.manualLinkingOffGoogle", "ui.manualLinkingOffApple",
  "ui.learnHowToPrayIt",
];

describe("no typed arrow in the catalogues", () => {
  const catalogs = readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).sort();

  it("reads all 21", () => {
    expect(catalogs.length).toBeGreaterThanOrEqual(21);
  });

  for (const file of catalogs) {
    it(`${file}: no line carries one, and none is left with the space that joined it`, () => {
      const said = JSON.parse(readFileSync(path.join(MESSAGES, file), "utf8")) as Record<string, string>;
      const arrows = Object.entries(said)
        .filter(([, words]) => typeof words === "string" && arrowsIn(words).length > 0)
        .map(([key, words]) => `${key}: ${words}`);
      expect(arrows, "a typed arrow; say it in words, and draw the icon beside the words where one is wanted").toEqual([]);
      for (const key of SWEPT) {
        const words = said[key];
        expect(words, `${file} ${key}: the line is there`).toBeTruthy();
        expect(words, `${file} ${key}: no space left where the arrow stood`).toBe(words.trim());
        expect(words, `${file} ${key}: no double space`).not.toMatch(/ {2}/);
      }
      // Another service's screens, named in a row: a comma between them, never a typed mark.
      for (const key of ["ui.manualLinkingOffGoogle", "ui.manualLinkingOffApple"]) {
        expect(said[key], `${file} ${key}`).toContain(file === "en.json" ? "Supabase Dashboard, then Authentication, then Settings" : "Supabase Dashboard, Authentication, Settings");
      }
    });
  }
});

describe("no typed arrow in the pages and components", () => {
  const files = ["app", "components", "lib"]
    .flatMap((dir) => walk(path.join(ROOT, dir)))
    .filter((f) => !OWNERS.some((dir) => rel(f).startsWith(dir)));
  const code = (file: string) => uncomment(readFileSync(path.join(ROOT, file), "utf8"));

  it("reads the app's code", () => {
    expect(files.length).toBeGreaterThan(1000);
  });

  it("draws none in a reader's words, but the arrows named with their reasons", () => {
    const found = files.flatMap((f) => {
      let src = uncomment(readFileSync(f, "utf8"));
      for (const stay of STAYS.filter((s) => s.file === rel(f))) src = src.replace(stay.holds, "");
      const arrows = arrowsIn(src);
      return arrows.length ? [`${rel(f)}: ${arrows.join(" ")}`] : [];
    });
    expect(found, "a typed arrow; draw ChevronLeft, ChevronRight or ArrowUpLeft from components/ui/icons, mirrored with rtl:-scale-x-100, or say it in words").toEqual([]);
  });

  it("names nothing that is gone: each arrow that stays is still where it is named", () => {
    for (const stay of STAYS) {
      expect(code(stay.file).includes(stay.holds), `${stay.file}: "${stay.holds}" is gone; take it off STAYS (${stay.why})`).toBe(true);
      expect(arrowsIn(stay.holds).length, `${stay.file}: STAYS names an arrow`).toBeGreaterThan(0);
    }
  });

  it("the footer no longer strips an arrow the words no longer carry", () => {
    const footer = code("components/layout/Footer.tsx");
    expect(footer.includes('t("prayers.openTodaysPrayer").replace('), "the footer still strips a mark from today's prayer").toBe(false);
    expect(footer.includes('{ label: t("prayers.openTodaysPrayer"), href: "/prayers/today" }'), "today's prayer in the footer, its words as the catalogue says them").toBe(true);
  });
});

describe("the arrow finder", () => {
  it("finds an arrow typed, escaped or named, and nothing else", () => {
    for (const hit of [`See all ${RIGHT}`, `${LEFT} Back`, `a ${LONG_RIGHT} b`, `${HOOKED_LEFT}`, '"\\u2192"', '"\\u{2190}"', "&#8599;", "&#x2192;", "IP&rarr;city", "&LeftArrow;"]) {
      expect(arrowsIn(hit).length, hit).toBeGreaterThan(0);
    }
    for (const miss of ["See all", "a -> b", `${String.fromCodePoint(0xbb)} quoted ${String.fromCodePoint(0xab)}`, String.fromCodePoint(0x203a), "&amp;", "\\u00e9", "&#233;", '"\\u{10000}"']) {
      expect(arrowsIn(miss), miss).toEqual([]);
    }
  });

  it("reads past comments only", () => {
    expect(arrowsIn(uncomment(`// a ${RIGHT} b\nconst x = 1;`))).toEqual([]);
    expect(arrowsIn(uncomment(`/* a ${RIGHT} b */ {/* ${LEFT} */}`))).toEqual([]);
    expect(arrowsIn(uncomment(`<p>See all ${RIGHT}</p> // a note`))).toEqual([RIGHT]);
    expect(arrowsIn(uncomment(`href="https://example.com" ${LEFT}`))).toEqual([LEFT]);
  });
});

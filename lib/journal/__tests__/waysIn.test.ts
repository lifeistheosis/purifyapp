import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The journal and the Florilegium are there to be chosen (build 93 note 9,
 * the owner on 2026-11-11: "Ensure the journal and anything related to that
 * specific journal UI, like the florigelium, ensure it's all available to be
 * chosen on the settings page").
 *
 * The arbiter's word on how: two rows on You, always there, and the same two
 * rows in Settings itself, since he named the settings page. A setting that
 * chooses what You shows is not what he asked.
 *
 * Before: the journal's one door on You was a cover on the shelf, drawn only
 * once something was written, and wearing a Plus lock though writing is free;
 * the Florilegium had no door on You at all; Settings named neither.
 *
 * How the rows are drawn in a built app is sections 28 and 46 of
 * scripts/export-walk.mjs.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const en = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;

describe("on You: two rows, always there (build 93 note 9)", () => {
  const you = code("components/mobile/YouMobile.tsx");
  const list = you.slice(you.indexOf("const settings: YouRow[] = [];"), you.indexOf("const hero ="));
  const rows = list.slice(list.indexOf('href: "/journal"') - 200, list.indexOf('href: "/prayers/personal"'));

  it("the journal and the Florilegium lead the reader's own rows, above Your rule", () => {
    const hrefs = [...list.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.indexOf("/journal")).toBeGreaterThan(-1);
    expect(hrefs.indexOf("/florilegium")).toBe(hrefs.indexOf("/journal") + 1);
    expect(hrefs.indexOf("/prayers/personal")).toBe(hrefs.indexOf("/florilegium") + 1);
  });

  it("they hang on nothing: not on what is written, gathered or bought", () => {
    // One plain push of the two, with no condition before it and none inside it.
    expect(rows).toMatch(/settings\.push\(\s*\{\s*label: t\("journal\.title"\),\s*href: "\/journal",/);
    const push = rows.slice(rows.indexOf("settings.push("));
    expect(push).not.toMatch(/\bif \(|\? \[|\.length|journal\.length|entries/);
    // The one thing that changes with the reader is the mark, never whether the row is there.
    expect(push.match(/plusLocked/g)).toHaveLength(1);
  });

  it("each says what it is in words the catalog has", () => {
    expect(rows).toContain('label: t("journal.title")');
    expect(rows).toContain('hint: t("you.journalHint")');
    expect(rows).toContain('label: t("community.yourFlorilegium")');
    expect(rows).toContain('hint: t("study.florilegium.lead")');
    expect(en["journal.title"]).toBe("Your journal");
    expect(en["community.yourFlorilegium"]).toBe("Your Florilegium");
    expect(en["study.florilegium.lead"]).toBe("The lines you keep");
  });

  it("the journal's line promises only what every reader has", () => {
    expect(en["you.journalHint"]).toBe("What you write, and your notes on verses");
    // Both are free, and the app says so where Plus is offered.
    expect(en["plus.journal.keep"]).toBe("Writing in your journal, and your notes on verses, stay free, whether or not you subscribe.");
  });

  it("every language has the line in its own words", () => {
    const others = ["ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];
    for (const lang of others) {
      const words = (JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>)["you.journalHint"];
      expect(words, lang).toBeTruthy();
      expect(words, lang).not.toBe(en["you.journalHint"]);
    }
  });

  it("without Plus the Florilegium's row wears the padlock alone, and with Plus nothing", () => {
    // The subscription is named once on You, by the pill in the bar: so the padlock, as the verse card wears it, and its name for a screen reader.
    expect(you).toContain("const plusLocked = usePlusFeatures() === false;");
    expect(rows).toMatch(/mark: plusLocked \? \(\s*<span data-you-row-plus="" className="[^"]*">\s*<PlusLock size=\{13\} \/>\s*<span className="sr-only">\{t\("plus\.badge"\)\}<\/span>\s*<\/span>\s*\) : undefined,/);
    expect(you).not.toContain("<PlusMark");
    // The journal's row wears none: writing is free.
    const journalRow = rows.slice(rows.indexOf('href: "/journal"'), rows.indexOf('label: t("community.yourFlorilegium")'));
    expect(journalRow).not.toContain("mark:");
  });

  it("a row draws its mark between its words and its arrow", () => {
    const rowsFile = code("components/you/YouRows.tsx");
    expect(rowsFile).toMatch(/<\/div>\s*\{it\.mark \?\? null\}\s*<span aria-hidden className="shrink-0 text-paper\/30">/);
  });
});

describe("in Settings: the same two rows, under the account (build 93 note 9)", () => {
  const settings = code("components/settings/SettingsClient.tsx");
  const section = settings.slice(settings.indexOf("function JournalSection("), settings.indexOf("function DataSection("));

  it("they stand right under the account, with no heading over them", () => {
    expect(settings).toMatch(/<AccountSection reader=\{reader\} \/>\s*<JournalSection \/>\s*<SpaceSection \/>/);
    expect(section).toContain('<Section id="journal">');
  });

  it("the same names and lines as on You", () => {
    expect(section).toMatch(/<LinkRow href="\/journal" icon=\{<Pen size=\{17\} \/>\} label=\{t\("journal\.title"\)\} description=\{t\("you\.journalHint"\)\} \/>/);
    expect(section).toContain('href="/florilegium"');
    expect(section).toContain('{t("community.yourFlorilegium")}');
    expect(section).toContain('description={t("study.florilegium.lead")}');
  });

  it("without Plus the Florilegium's row wears the mark beside its name, as Candlelight at Vespers does", () => {
    expect(section).toContain("const plusLocked = usePlusFeatures() === false;");
    expect(section).toMatch(/\{t\("community\.yourFlorilegium"\)\}\s*\{plusLocked \? <PlusMark \/> : null\}/);
  });
});

describe("in the app-wide search: both are found under Settings", () => {
  const corpus = read("lib/search/buildCorpus.ts");

  it("each has a row that opens Settings where the two stand", () => {
    expect(corpus).toMatch(/\{ id: "setting-journal", \.\.\.said\("journal\.title", "Your journal"\), sublabel: IN_SETTINGS, sublabelKey: "nav\.settings", href: "\/settings#journal", group: "Settings"/);
    expect(corpus).toMatch(/\{ id: "setting-florilegium", \.\.\.said\("community\.yourFlorilegium", "Your Florilegium"\), sublabel: IN_SETTINGS, sublabelKey: "nav\.settings", href: "\/settings#journal", group: "Settings"/);
    expect(read("components/settings/SettingsClient.tsx")).toContain('id="journal"');
  });

  it("the pages themselves are still found by their names", () => {
    expect(corpus).toContain('{ id: "page-journal", ...said("journal.title", "Your journal"), href: "/journal"');
    expect(corpus).toContain('{ id: "page-florilegium", label: "Florilegium", href: "/florilegium"');
  });
});

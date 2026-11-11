// The language in the house's sheet (1.9, build 93 note 6; the owner, of
// Settings, Language: "clear design flaw here"). The list opened as a floating
// panel over the page, first off the screen's edge, then whole but scrolled
// part way with the page showing round it. What a reader would notice if this
// broke: a floating list again on a phone, a tap on a language that closes the
// list and changes nothing, their own language out of sight when it opens, or
// a row too small for a finger.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { coverageWords } from "@/lib/i18n/coverage";
import { LOCALES } from "@/lib/i18n/locales";

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const picker = code("components/i18n/LanguagePicker.tsx");
const switcher = code("components/i18n/LocaleSwitcher.tsx");
const list = code("components/i18n/LanguageSheetList.tsx");
const when = code("components/i18n/useLanguageSheet.ts");

describe("the language on a phone", () => {
  it("opens the house's sheet from the foot of the screen, in Settings and in the website's footer", () => {
    expect(picker).toContain('<Sheet open={open && asSheet} onClose={() => setOpen(false)} title={t("footer.languageLabel")} openFull>');
    expect(picker).toContain("<LanguageSheetList locale={locale} onSelect={selectLocale} />");
    expect(switcher).toContain('<Sheet open={open && asSheet} onClose={() => setOpen(false)} title={t("footer.languageLabel")} openFull>');
    expect(switcher).toContain("<LanguageSheetList locale={locale} onSelect={setLocale} />");
  });

  it("is a sheet on a phone and in the apps at every width; only a computer's window keeps the dropdown", () => {
    expect(when).toContain('const WIDE = "(min-width: 768px)";');
    expect(when).toContain("return native || narrow;");
    for (const [name, source] of [["LanguagePicker", picker], ["LocaleSwitcher", switcher]] as const) {
      expect(source, name).toContain("const menuOpen = open && !asSheet;");
      expect(source, name).toMatch(/\{menuOpen && \(\s*<LocaleMenu/);
      // The button says what opens, for a screen reader.
      expect(source, name).toContain('aria-haspopup={asSheet ? "dialog" : "listbox"}');
    }
  });

  it("takes no tap on one of its rows for a tap outside the dropdown", () => {
    // The sheet is drawn outside the picker's box: an outside-tap listener
    // left on while it is open would close it before the row's tap arrived.
    for (const [name, source] of [["LanguagePicker", picker], ["LocaleSwitcher", switcher]] as const) {
      expect(source, name).toMatch(/useEffect\(\(\) => \{\s*if \(!menuOpen\) return;[\s\S]*?addEventListener\("mousedown", onDown\)[\s\S]*?\}, \[menuOpen\]\);/);
    }
  });
});

describe("the sheet's rows", () => {
  it("name every language in its own words, its English name beside it and what it covers under it", () => {
    expect(list).toContain("const ready = LOCALES.filter((l) => l.ready);");
    expect(list).toContain("{ready.map(row)}");
    expect(list).toMatch(/<span lang=\{l\.code\} dir=\{textDir\(l\.code\)\}[^>]*>\s*\{l\.nativeLabel\}/);
    expect(list).toMatch(/<span lang="en" dir="ltr"[^>]*>\s*\{l\.englishLabel\}/);
    expect(list).toContain("data-language-covers={l.code}");
    expect(list).toContain("{coverageWords(l.code)}");
    for (const l of LOCALES.filter((x) => x.ready)) {
      expect(l.nativeLabel.trim(), l.code).not.toBe("");
      expect(coverageWords(l.code).trim(), l.code).not.toBe("");
    }
  });

  it("check the reader's own in the house's fill, never in gold letters, and bring it into view as the sheet opens", () => {
    expect(list).toContain("aria-selected={active}");
    expect(list).toContain('active ? "border-gold/45 bg-gold/15"');
    expect(list).toContain('{active ? <Check size={18} className="shrink-0 text-paper" /> : null}');
    expect(list).not.toMatch(/\btext-gold\b/);
    expect(list).toContain("ref={placeList}");
    expect(list).toMatch(/const row = el\?\.querySelector<HTMLElement>\('\[aria-selected="true"\]'\);[\s\S]*?scroller\.scrollTop = /);
    // Opened full, as the books sheet is: at its lower rest a sheet's body does not scroll, and the row could not be brought up.
    expect(picker).toContain('title={t("footer.languageLabel")} openFull>');
  });

  it("are 44px to the touch, and mirror with the page in Arabic and Urdu", () => {
    const button = /<button[\s\S]*?"(flex min-h-11[^"]*)"/.exec(list)?.[1] ?? "";
    expect(button.split(/\s+/)).toContain("min-h-11");
    expect(button).toContain("text-start");
    // A side fixed for one direction of reading would not mirror.
    expect(list).not.toMatch(/\b(?:text-left|text-right|ml-\d|mr-\d|pl-\d|pr-\d|left-0|right-0)\b/);
    // The two names spaced by their line, not by a margin on words that may run the other way (in Arabic,
    // "UkrainianУкраїнська" ran together: the English name's ms-2 fell on its far side).
    expect(list).toContain('<span className="flex flex-wrap items-baseline gap-x-2">');
    expect(list).not.toMatch(/\b(?:ms|me)-\d/);
    // The line under the name is placed by the page's direction; only its words carry their own.
    expect(list).toMatch(/<span className="mt-0\.5 block[^"]*">\s*<span lang=\{l\.code\} dir=\{textDir\(l\.code\)\} data-language-covers=\{l\.code\}>/);
  });
});

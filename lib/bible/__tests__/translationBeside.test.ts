// The translation beside the chapter (1.9, build 93 note 20; the owner:
// "changing the bibles translation or the version of the Bible should be as
// easy as switching your chapter"). What a reader would notice if this broke:
// the translation hidden again behind the ••• menu on a phone, a switch that
// throws them back to the chapter's top, or a book chosen from the title that
// does not open (the Discord report of 2026-10-24, Genesis to John).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { holdPlace, takeHeldPlace } from "@/lib/bible/keepPlace";

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("the translation beside the chapter", () => {
  it("stands under the chapter's title on a phone and a tablet, one tap from the page, outside the one heading", () => {
    const screen = code("components/bible/ChapterScreen.tsx");
    const header = screen.slice(screen.indexOf('<header id="chapter-title"'), screen.indexOf("</header>"));
    expect(header).toMatch(
      /<TitleOpensBooks slug=\{slug\} chapter=\{chapter\} \/>\s*<\/div>\s*\{\/\*[\s\S]*?\*\/\}\s*<TitleTranslation currentSlug=\{slug\} configuredLicensed=\{configuredLicensed\} \/>/,
    );
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(header)?.[1] ?? "";
    expect(h1).not.toContain("TitleTranslation");
    const line = code("components/bible/TitleTranslation.tsx");
    // The phone's and the tablet's; the computer chooses from its toolbar's pill.
    expect(line).toContain('className="page-open-sub mt-0.5 flex justify-center md:hidden native-md-flex"');
    // Focus puts it away with the rest of the reader's chrome.
    expect(line).toContain("<div data-reader-chrome");
    expect(line).toContain("min-h-11");
    expect(line).toContain('aria-haspopup="dialog"');
    expect(line).toContain('aria-label={t("bible.switchTranslationCurrentAria", { name: label })}');
    // The chapter's own small mark.
    expect(line).toContain("<ChevronDown size={17}");
  });

  it("opens the house's sheet with the rows the ••• sheet and the computer's pill show", () => {
    const line = code("components/bible/TitleTranslation.tsx");
    expect(line).toContain('<Sheet open={open} onClose={() => setOpen(false)} title={t("bible.translationLabel")}>');
    expect(line).toContain("useTranslationChoice(currentSlug, configuredLicensed)");
    for (const f of ["components/bible/TitleTranslation.tsx", "components/bible/ReaderMoreSheet.tsx", "components/bible/TranslationSwitcher.tsx"]) {
      expect(code(f), f).toContain("<TranslationList");
    }
  });

  it("keeps the reader's verse through the switch, and never sends the page to its top", () => {
    const choice = code("components/bible/TranslationList.tsx");
    expect(choice).toContain("if (shown || t.id !== current.id) holdPlace(pathname);");
    expect(choice).toMatch(/if \(shown\?\.id === bible\.id\) return;\s*holdPlace\(pathname\);/);
    expect(choice).toContain("router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });");
    expect(choice).toContain("router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });");
    const screen = code("components/bible/ChapterScreen.tsx");
    expect(screen).toMatch(/<KeptPlace\s+textKey=/);
    // A downloaded Bible's words come a moment after the switch: the verse is landed on them, not on the words they replace.
    expect(screen).toContain('ready={downloaded ? downloaded.text.state === "ready" : true}');
  });

  it("holds one verse for the page it was read on, and gives it back once", () => {
    holdPlace("/bible/genesis/1/", 10);
    expect(takeHeldPlace("/bible/exodus/1/")).toBeNull();
    holdPlace("/bible/genesis/1/", 10);
    expect(takeHeldPlace("/bible/genesis/1/")).toBe(10);
    expect(takeHeldPlace("/bible/genesis/1/")).toBeNull();
    holdPlace("/bible/genesis/1/", null);
    expect(takeHeldPlace("/bible/genesis/1/")).toBeNull();
  });
});

describe("the 1.9 tour's stop for the new Bibles", () => {
  it("lights the translation beside the chapter on a phone, and says what is there", () => {
    expect(code("components/bible/TitleTranslation.tsx")).toContain('data-tour="bibles"');
    expect(code("components/bible/MobileReaderActions.tsx")).not.toContain('data-tour="bibles"');
    expect(code("components/bible/TranslationSwitcher.tsx")).toContain('data-tour="bibles"');
    const en = JSON.parse(code("lib/i18n/messages/en.json")) as Record<string, string>;
    expect(en["tour.step.bibles.title"]).toBe("Seven more Bibles");
    expect(en["tour.story.bibles"]).toContain("Portuguese");
    expect(en["tour.story.bibles"]).toContain("English");
  });
});

describe("a book chosen from the title", () => {
  it("opens the book's chapters, and a chapter opens it", () => {
    const sheet = code("components/bible/MobileChapterSheet.tsx");
    expect(sheet).toMatch(/onClick=\{\(e\) => onToggle\(book\.slug, e\.currentTarget\)\}/);
    expect(sheet).toMatch(/onClick=\{\(\) => onPick\(book\.slug, n\)\}/);
    expect(sheet).toContain("router.push(`/bible/${slug}/${chapter}`);");
  });
});

// Build 98 note 7 (the owner, 2026-11-15 about 21:30 UTC, over a screenshot of
// the books sheet: "incorporate the change Bible version with this screen").
// What a reader would notice if this broke: the books sheet with no version in
// it again, a second sheet for the versions under the chapter's title, or a
// switch that throws them back to the chapter's top.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BOOKS_OPEN_EVENT, booksViewOf, openBooks } from "@/lib/bible/booksSheet";

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const sheet = code("components/bible/MobileChapterSheet.tsx");
const line = code("components/bible/TitleTranslation.tsx");
const head = sheet.slice(sheet.indexOf("function VersionHead("), sheet.indexOf("function SheetVersions("));
const versions = sheet.slice(sheet.indexOf("function SheetVersions("));

describe("the version chosen in the books sheet (build 98 note 7)", () => {
  it("carries the version being read at its head, by the chapter, with the chapter's small chevron", () => {
    expect(sheet).toContain('titleExtra={<VersionHead book={currentSlug} view={view} onTurn={() => turn(view === "books" ? "versions" : "books")} />}');
    expect(head).toContain("useTranslationChoice(book, configuredTranslations())");
    expect(head).toContain('aria-label={t("bible.switchTranslationCurrentAria", { name: label })}');
    expect(head).toContain('aria-expanded={view === "versions"}');
    expect(head).toContain("min-h-11");
    expect(head).toMatch(/<ChevronDown\s+size=\{15\}/);
  });

  it("turns to the versions, the rows every version is chosen from, downloads with them", () => {
    expect(sheet).toMatch(/\{view === "versions" \? \(\s*<SheetVersions book=\{currentSlug\}/);
    expect(versions).toContain("<TranslationList");
    expect(versions).toContain("onChooseBible={(bible) => {");
    // The Bible's search and the doors belong to the books.
    expect(sheet).toContain('lead={view === "books" ? <BibleSearch layer onNavigate={onClose}');
    expect(sheet).toContain('foot={view === "books" ? <BooksDoors onClose={onClose} /> : null}');
  });

  it("keeps the reader's verse through a choice and turns back to the books, or closes when opened on the versions", () => {
    expect(versions).toMatch(/onChosen\(\);\s*choose\(tr\);/);
    expect(versions).toMatch(/onChosen\(\);\s*chooseBible\(bible\);/);
    expect(sheet).toContain('onChosen={() => (openedOn === "versions" ? onClose() : turn("books"))}');
    expect(code("components/bible/TranslationList.tsx")).toContain("if (shown || t.id !== current.id) holdPlace(pathname);");
  });

  it("fades only on a turn, on the house curve, and not with Purify's motion off", () => {
    expect(sheet).toContain('const TURN = "motion-safe:animate-[page-open-fade_var(--duration-base)_var(--ease-house)_backwards]";');
    expect(sheet).toContain("className={turned ? TURN : undefined}");
    expect(versions).toContain('className={cn("pt-3", turned && TURN)}');
  });

  it("is the one sheet: the line under the chapter's title opens it on its versions", () => {
    expect(line).toContain('onClick={() => openBooks("versions")}');
    expect(line).not.toContain("<Sheet");
    expect(line).not.toContain("<TranslationList");
    expect(line).toContain("setConfiguredTranslations(");
  });

  it("opens on the view it is asked for; the title's click, handed over as it is, opens the books", () => {
    const seen: Event[] = [];
    const original = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { dispatchEvent: (e: Event) => (seen.push(e), true) };
    try {
      openBooks("versions");
      openBooks();
      openBooks({ type: "click" });
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
    expect(seen.map((e) => e.type)).toEqual([BOOKS_OPEN_EVENT, BOOKS_OPEN_EVENT, BOOKS_OPEN_EVENT]);
    expect(seen.map(booksViewOf)).toEqual(["versions", "books", "books"]);
    expect(booksViewOf(new Event(BOOKS_OPEN_EVENT))).toBe("books");
  });
});

// Build 98 note 7, the choice from the books (Updates 98i, 2026-11-16): the
// versions were drawn in the scroller the books had left part way down (499px
// at 390 with Luke open), so the English rows, the World English Bible among
// them, stood above the sheet's top and a finger met nothing there. A reader
// turning from the books met another list than one coming from the title line.
describe("the versions turned to from the books start where they start from the title line", () => {
  it("start at their top, once as they are drawn, not on every redraw a download makes", () => {
    expect(versions).toMatch(/const fromTop = useCallback\(\(el: HTMLDivElement \| null\) => \{\s*if \(el\?\.parentElement\) el\.parentElement\.scrollTop = 0;\s*\}, \[\]\);/);
    expect(versions).toContain('<div ref={fromTop} id={VERSIONS_ID} data-books-versions=""');
  });
});

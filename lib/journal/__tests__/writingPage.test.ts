// The journal is written on a page of its own, not in a sheet (1.9, Fable
// round 3; build 97 note 2, the owner on 2026-11-14: "journal is still messy
// in terms of UI ... rather than a pop up window for the journal game you
// give it its own simplified optimized UI?"; build 98 note 4: "I wanted this
// system and design revamped").
//
// What his screenshots showed and this holds gone: two layers at the foot at
// once, two Done buttons, the word Close, three segmented choices, More as a
// long panel, and things that came and went with the keyboard.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { JOURNAL_HREF, WRITE_FROM_VERSE_HREF, WRITE_HREF, openedFromVerse, verseNoteDraft, writeHrefFor } from "@/lib/journal/openWriting";
import { keeping, noteVerse } from "@/lib/journal/waiting";
import { shouldShowBack } from "@/lib/nav/backBar";
import { standBeside } from "@/lib/ui/routeMotion";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const code = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = code(read("components/journal/JournalWritePage.tsx"));
const sheet = code(read("components/journal/WriteSheet.tsx"));
const client = code(read("components/journal/JournalClient.tsx"));
const css = read("app/globals.css");

describe("a page, not a sheet", () => {
  it("is a static route under the journal, read on the device", () => {
    const shell = read("app/(app)/journal/write/page.tsx");
    expect(shell).not.toContain('"use client"');
    expect(shell).toContain("export const metadata");
    expect(shell).toContain("<JournalWritePage />");
    expect(shell).not.toMatch(/cookies\(|force-dynamic|searchParams/);
    expect(WRITE_HREF).toBe("/journal/write");
    expect(writeHrefFor("a b")).toBe("/journal/write?entry=a%20b");
    // The page being written is the kept draft, read after the first paint.
    expect(page).toContain("return readDraft() ?? BLANK;");
    expect(page).toContain("new URLSearchParams(window.location.search).get(\"entry\")");
  });

  it("every way the journal opened the sheet goes to the page, and the sheet is not mounted there", () => {
    expect(client).not.toContain("JournalComposer");
    const begin = client.slice(client.indexOf("const begin = useCallback"), client.indexOf("const write = () =>"));
    expect(begin).toContain("if (over) router.replace(WRITE_HREF);");
    expect(begin).toContain("else router.push(WRITE_HREF);");
    // The old sheet is left only to a note written on a text's words, where it is words alone: the
    // journal keeps a verse's note (lib/journal/waiting.ts, noteVerse) but not a work's words, which
    // their own work keeps. A verse's note goes to the page (round 3's apply).
    expect(read("components/reading/WordsNoteSheet.tsx")).toMatch(/editing: `note:words:/);
    expect(existsSync(join(process.cwd(), "components/bible/VerseNoteSheet.tsx"))).toBe(false);
  });

  it("opens as a page deeper than the journal, so it settles in and the way back returns", () => {
    expect(standBeside(JOURNAL_HREF, WRITE_HREF)).toBe(false);
    expect(shouldShowBack(WRITE_HREF)).toBe(false);
    expect(page).toContain("goBack(router, JOURNAL_HREF);");
  });
});

describe("the head: the way back, the day, one Done", () => {
  const head = page.slice(page.indexOf("function Head("), page.indexOf("function Writing("));

  it("has a chevron from the house's icons for the way back, and no Close word", () => {
    expect(head).toContain("<ChevronLeft {...TOP_ICON}");
    expect(head).toContain("${TOP_PLATE}");
    // Close is never a word on the page or its sheet: the sheet's close is the house's glyph, named for a screen reader.
    expect(page + sheet).not.toMatch(/^\s*\{t\("common\.close"\)\}\s*$/m);
    expect(sheet).toContain('aria-label={t("common.close")}');
  });

  it("says the day as the small line", () => {
    expect(head).toContain('{ weekday: "long", month: "long", day: "numeric" }');
    expect(head).toContain("font-sans text-caption font-semibold text-paper/55");
  });

  it("has ONE Done, the only filled button of the page and its sheet", () => {
    expect((page + sheet).match(/t\("common\.done"\)/g)).toHaveLength(1);
    expect((page + sheet).match(/\bbg-paper(?![/\w-])/g)).toHaveLength(1);
    expect(head).toContain('data-journal-done=""');
  });
});

describe("one calm surface", () => {
  it("the kind is the house's track, and the title and the words have no box", () => {
    expect(page).toMatch(/role="radiogroup" aria-label=\{t\("journal\.kindLabel"\)\} data-journal-kinds="" className="set-track/);
    expect(page).toContain('<PageBlocks editor={editor} placeholder={t("journal.composer.placeholder")} onPage');
    const writing = page.slice(page.indexOf("function Writing("));
    expect(writing).not.toMatch(/theology-tray|rounded-\[\d+px\] border|ring-2|focus:ring/);
  });

  it("the cover is a band at the head of the page that scrolls with it, its credit one small line", () => {
    const band = page.slice(page.indexOf('data-page-cover=""'), page.indexOf("{shareable ?"));
    expect(band).toContain("-mx-5");
    expect(band).toMatch(/<figcaption[\s\S]*?className="truncate /);
    expect(band).not.toMatch(/\b(sticky|fixed)\b/);
    // The page draws it, so the blocks do not draw it a second time.
    expect(read("components/journal/PageBlocks.tsx")).toContain("{cover && !onPage ? (");
  });

  it("a library quote lies on the page in italics, cited, marked, with Open, and is never a field", () => {
    const blocks = read("components/journal/PageBlocks.tsx");
    const quote = code(blocks.slice(blocks.indexOf("function PageLibraryQuote(")));
    expect(quote).toContain("font-serif text-body italic");
    expect(quote).toContain("{block.cite}");
    expect(quote).toContain('{t("journal.page.fromLibrary")}');
    expect(quote).toContain('{t("journal.composer.open")}');
    expect(quote).toContain("href={block.href}");
    expect(quote).not.toMatch(/<textarea|<input|theology-tray/);
    // A quote of one's own never wears the library's line.
    const own = code(blocks.slice(blocks.indexOf("function QuoteCard("), blocks.indexOf("// ── Plus's blocks")));
    expect(own).not.toContain("journal.page.fromLibrary");
  });
});

describe("one quiet control, one sheet", () => {
  it("the control is one round button with the plus, and takes no cursor from the words", () => {
    const control = page.slice(page.indexOf('data-journal-add=""') - 200, page.indexOf("<WriteSheet open"));
    expect(control).toContain("<Plus size={20} />");
    expect(control).toContain("h-11 w-11");
    expect(control).toContain("rounded-full");
    expect(control).toContain("onPointerDown={(e) => e.preventDefault()}");
    expect(page.match(/data-journal-add=""/g)).toHaveLength(1);
    expect(page).not.toMatch(/PageToolbar|role="toolbar"/);
  });

  it("with the keyboard up it stands alone just above the keys: it is not one of the bars that step away", () => {
    const rule = css.slice(css.indexOf(".journal-add {"), css.indexOf("@media", css.indexOf(".journal-add {")));
    expect(rule).toMatch(/html\[data-keyboard="up"\] \.journal-add \{\s*bottom: 0\.75rem;/);
    expect(rule).toContain("inset-inline-start");
    // Over the safe area, not over a tab bar: the page does not wear one (below).
    expect(rule).toMatch(/\.journal-add \{[^}]*bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 0\.75rem\);/);
    expect(rule).not.toContain("--tab-bar-h");
    const control = page.slice(page.indexOf('data-journal-add=""') - 200, page.indexOf("<WriteSheet open"));
    expect(control).not.toMatch(/now-playing-lift|data-screen-edge|data-foot-bar/);
    // Nothing on the page asks whether the keyboard is up: nothing appears or goes as it comes.
    expect(page).not.toMatch(/useKeyboardUp|useVisibleFrame/);
  });

  it("the sheet is the app's own, its rows in one tray and the page's settings in a second", () => {
    expect(sheet).toContain("<Sheet open={open} onClose={onClose}");
    const menu = sheet.slice(sheet.indexOf('{view === "menu" ?'), sheet.indexOf('{view === "verse" ?'));
    expect(menu.match(/<ul /g)).toHaveLength(2);
    const [first, second] = menu.split("<ul data-write-sheet-page");
    for (const name of ["NAMES.verse", "NAMES.quote", "NAMES.cover", "NAMES.highlight"]) expect(first).toContain(`<Row name={${name}}`);
    for (const name of ["NAMES.notebook", "NAMES.tags"]) expect(second).toContain(`<Row name={${name}}`);
    expect(second).toContain('<TrackRow\n                  name={t("bible.fontLabel")}');
    expect(second).toContain('name={t("picture.align")}');
    // The notebook's row says which notebook the page is in.
    expect(second).toContain('line={page.notebook || t("journal.page.noNotebook")}');
  });

  it("a row is a name, one line and the chevron, with no icon tile; a small choice is the house's track", () => {
    const row = sheet.slice(sheet.indexOf("function Row("), sheet.indexOf("function TrackRow("));
    expect(row).toContain("<ChevronRight aria-hidden");
    expect(row).toContain("theology-rule");
    expect(row).not.toMatch(/size-\[\d+px\]|place-items-center rounded/);
    const track = sheet.slice(sheet.indexOf("function TrackRow("), sheet.indexOf("function NotebookView("));
    expect(track).toContain('className="set-track');
    expect(track).toContain('role="radio"');
  });

  it("a row does its job in the same sheet, with a way back, or closes it: never a second tray on the first", () => {
    expect(sheet).toContain('onClick={() => (stepBack ? stepBack() : setView("menu"))}');
    expect(sheet).toContain('data-write-sheet-back=""');
    // One Sheet, whose content is one view at a time.
    expect(sheet.match(/<Sheet /g)).toHaveLength(1);
    for (const view of ["verse", "quote", "cover", "highlight", "more", "notebook", "tags"]) expect(sheet).toContain(`{view === "${view}" ?`);
  });

  it("what is Plus's wears the mark for a reader without it, and opens the upgrade sheet named for the journal", () => {
    expect(sheet).toMatch(/const plus = \(act: \(\) => void\) => \(\) => \{\s*if \(!locked\) return act\(\);\s*onClose\(\);\s*upgrade\.open\("journal"\);/);
    for (const name of ["NAMES.cover", "NAMES.more", "NAMES.notebook", "NAMES.tags"]) expect(sheet).toMatch(new RegExp(`<Row[^>]*name=\\{${name.replace(".", "\\.")}\\}[\\s\\S]{0,260}?mark=\\{locked\\}`));
    // Verse, Quote and Highlight are everyone's.
    expect(sheet).toMatch(/<Row name=\{NAMES\.verse\} line=\{[^}]+\} onClick=\{\(\) => setView\("verse"\)\} \/>/);
    expect(sheet).toMatch(/<Row name=\{NAMES\.quote\} line=\{[^}]+\} onClick=\{\(\) => setView\("quote"\)\} \/>/);
  });
});

describe("Quote searches Purify's library, in the page's one sheet (build 98 note 5)", () => {
  const quote = code(read("components/journal/LibraryQuote.tsx"));
  const inSheet = quote.slice(quote.indexOf("if (inSheet) {"), quote.indexOf('<div data-quote-library="" className="px-3 pt-2">'));

  it("is Updates 98c's search and data, not a second one beside it", () => {
    const view = sheet.slice(sheet.indexOf('{view === "quote" ?'), sheet.indexOf('{view === "cover" ?'));
    expect(view).toContain("<LibraryQuote");
    expect(view).toContain("inSheet");
    expect(view).toContain("const at = verseAt(page.blocks, b);");
    expect(view).toContain('else editor.insert({ type: "quote", text: "", by: "" });');
    expect(inSheet).toContain("pages.filter((p) => quoteFrom(p) === f.id)");
    expect(inSheet).toContain("onClick={() => open(p)}");
  });

  it("what answers is grouped by where it is from, each group under a name the catalogue already has", () => {
    expect(quote).toMatch(/const FROM = \[\s*\{ id: "fathers", key: "footer\.theFathers" \},\s*\{ id: "lives", key: "home\.pillars\.saints\.title" \},\s*\{ id: "prayers", key: "nav\.prayers" \},\s*\{ id: "councils", key: "nav\.councils" \},/);
    expect(inSheet).toContain('<GroupName name={t("bible.eyebrow")} />');
    expect(inSheet).toContain("<GroupName name={t(g.key)} mark={locked} />");
    expect(quote).toContain("font-sans text-caption font-semibold text-paper/55");
  });

  it("Scripture is everyone's and never wears the mark; the rest wears it once, beside its group's name", () => {
    expect(quote).toContain("if (locked && quoteNeedsPlus(p.href)) return onLocked();");
    expect(quote).toContain("{mark ? <PlusMark /> : null}");
    // In the sheet a row has no mark of its own, and no glyph: a name, one line, the chevron.
    const row = inSheet.slice(inSheet.indexOf("data-quote-page={p.href}"), inSheet.indexOf("</li>", inSheet.indexOf("data-quote-page={p.href}")));
    expect(row).toContain("<ChevronRight aria-hidden");
    expect(row).not.toMatch(/PlusMark|iconFor/);
  });

  it("words of one's own are the second, quieter choice, under the field, and never a library quote", () => {
    expect(inSheet.indexOf("<SearchField")).toBeLessThan(inSheet.indexOf('data-quote-own=""'));
    expect(inSheet.indexOf('data-quote-own=""')).toBeLessThan(inSheet.indexOf("data-quote-group"));
    expect(inSheet).toContain('{t("journal.page.quoteOwn")}');
    expect(inSheet.slice(inSheet.indexOf('data-quote-own=""'), inSheet.indexOf("</button>", inSheet.indexOf('data-quote-own=""')))).not.toContain("bg-paper");
  });
});

describe("a page for writing only (the designer's two mends, 2026-11-16)", () => {
  it("does not wear the tab bar: it holds the screen as Community's page for a post does, and gives it back", () => {
    const hold = page.slice(page.indexOf("export function JournalWritePage()"), page.indexOf("function Head("));
    expect(hold).toMatch(/useHoldEffect\(\(\) => \{\s*setOverlayOpen\(true\);\s*return \(\) => setOverlayOpen\(false\);\s*\}, \[\]\);/);
    // The same flag the tab bar already steps aside for, and no rule of the page's own on the bar.
    expect(read("components/nav/MobileTabBar.tsx")).toContain("const overlayOpen = useOverlayOpen();");
    expect(read("components/community/ComposePage.tsx")).toContain("setOverlayOpen(true);");
    const mine = css.slice(css.indexOf("/* The journal's writing page"));
    expect(mine).not.toContain("data-tab-bar");
    // The page scrolls as a page does: nothing is locked behind it.
    expect(page).not.toContain("lockBodyScroll");
  });

  it("the control goes behind its own sheet only, since the page itself now holds the overlay flag", () => {
    const mine = css.slice(css.indexOf("/* The journal's writing page"));
    expect(mine).toMatch(/body\[data-sheet-up\] \.journal-add \{\s*visibility: hidden;/);
    expect(mine).not.toContain("data-overlay-covers");
  });

  it("the control never lies over the words: the page keeps room at its foot as tall as the control and its gap", () => {
    const mine = css.slice(css.indexOf("/* The journal's writing page"));
    expect(mine).toMatch(/\.journal-write-room \{\s*padding-bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 2\.75rem \+ 0\.75rem \+ 1\.75rem\);/);
    expect(page).toMatch(/<section data-journal-write="" className="journal-write-room /);
  });
});

// Round 3's apply: a note on a verse, opened from the Bible, is written on this page too.
describe("a verse's note on the page", () => {
  const at = { book: "john", chapter: 1, verse: 47, label: "John 1:47", body: "Come and see." };

  it("is the verse's note as the page to write, kept on its verse by Done", () => {
    const draft = verseNoteDraft(at);
    expect(draft.editing).toBe("note:john:1:47");
    expect(noteVerse(draft.editing)).toEqual({ book: "john", chapter: 1, verse: 47 });
    expect(draft.source).toEqual({ type: "verse", book: "john", chapter: 1, verse: 47, label: "John 1:47" });
    // Done writes the verse's note when the words changed, and nothing when they did not.
    const kept = { record: () => undefined, note: () => "Before." };
    expect(keeping(draft, kept)).toEqual({ do: "note", book: "john", chapter: 1, verse: 47, note: "Come and see." });
    expect(keeping(draft, { ...kept, note: () => "Come and see." })).toEqual({ do: "nothing" });
  });

  it("opens the page from the verse, which then draws no Open back to it", () => {
    expect(WRITE_FROM_VERSE_HREF.startsWith(`${WRITE_HREF}?`)).toBe(true);
    expect(openedFromVerse(new URL(WRITE_FROM_VERSE_HREF, "https://localhost").search)).toBe(true);
    expect(openedFromVerse("")).toBe(false);
    expect(openedFromVerse(new URL(writeHrefFor("abc"), "https://localhost").search)).toBe(false);
  });
});

// The books sheet (1.8, the owner's pick A of r3-20, "Straight into the
// book"; Homebase/boards/purify-master/variants/r3-20-bible). The Bible tab
// opens the chapter itself, so the books are chosen from the chapter: its
// title (with a small chevron) and the name on its pill open one sheet (the
// ••• sheet's Book row went in note 82). In it: the Bible's search, both
// Testaments as one list with no switch, the book being read open at its
// chapters with the chapter being read lit white, and at its foot today's
// readings, the plans and the journal.
//
// What a reader would notice if this broke: the Old and New Testament switch
// back in the sheet, a gold chapter, a sheet that opens on Genesis while they
// read John, a title that does nothing, or a door that leads nowhere.
//
// This reads the source and the catalogs; the built sheet is measured by
// section 27 of scripts/export-walk.mjs.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BOOKS, bibleCanon } from "../books";
import { BOOKS_OPEN_EVENT, openBooks } from "../booksSheet";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SHEET = "components/bible/MobileChapterSheet.tsx";
const PILL = "components/bible/MobileChapterPill.tsx";
const SCREEN = "components/bible/ChapterScreen.tsx";
const MORE = "components/bible/ReaderMoreSheet.tsx";

describe("one list of books, in the Church's order", () => {
  const canon = bibleCanon();

  it("is the Old Testament, then the New, every book once", () => {
    expect(canon.map((t) => t.testament)).toEqual(["OT", "NT"]);
    const slugs = canon.flatMap(({ categories }) => categories.flatMap((c) => c.books.map((b) => b.slug)));
    expect(slugs).toHaveLength(78);
    expect(new Set(slugs)).toEqual(new Set(BOOKS.map((b) => b.slug)));
    // Each Testament holds only its own books.
    for (const { testament, categories } of canon) {
      for (const c of categories) for (const b of c.books) expect(b.testament, b.slug).toBe(testament);
    }
  });

  it("runs from the Pentateuch to the Prophets, then from the Gospels to Revelation", () => {
    expect(canon[0].categories.map((c) => c.label)).toEqual(["Pentateuch", "Historical", "Wisdom", "Prophets"]);
    expect(canon[1].categories.map((c) => c.label)).toEqual(["Gospels", "Acts", "Pauline Epistles", "Catholic Epistles", "Revelation"]);
    expect(canon[0].categories[0].books[0].slug).toBe("genesis");
    expect(canon[1].categories.at(-1)!.books.at(-1)!.slug).toBe("revelation");
  });
});

describe("the sheet", () => {
  const sheet = code(SHEET);

  it("has no switch between the Testaments, and nothing gold", () => {
    for (const gone of ["oldTestamentShort", "newTestamentShort", "setTestament", "getOldTestament()", "getNewTestament()", "gold"]) {
      expect(sheet.includes(gone), gone).toBe(false);
    }
    expect(sheet).toContain("bibleCanon().map(");
    expect(sheet).toContain('t(testament === "OT" ? "bible.theOldTestament" : "bible.theNewTestament")');
  });

  it("opens with the Bible's search over the list, still while it scrolls, and opens full", () => {
    expect(sheet).toContain("lead={<BibleSearch layer onNavigate={onClose}");
    expect(sheet).toContain("foot={<BooksDoors onClose={onClose} />}");
    expect(sheet).toMatch(/<Sheet\b[\s\S]*?\bopenFull\b/);
    // The primitive holds the two still, over and under the part that scrolls.
    const primitive = code("components/ui/Sheet.tsx");
    const body = primitive.indexOf("ref={bodyRef}");
    expect(primitive.lastIndexOf('{lead ? <div className="shrink-0 px-4">{lead}</div> : null}', body)).toBeGreaterThan(-1);
    expect(primitive.indexOf('{foot ? <div className="shrink-0">{foot}</div> : null}', body)).toBeGreaterThan(body);
  });

  it("is titled with the chapter being read, as the ••• sheet is", () => {
    expect(sheet).toContain("title={getBook(currentSlug) ? `${name} ${currentChapter}` : t(\"bible.pickABook\")}");
    expect(code(MORE)).toContain("title={`${name} ${chapter}`}");
  });

  it("opens on the book being read, and a tap on another opens its grid in its place", () => {
    expect(sheet).toContain("const [openBook, setOpenBook] = useState<string | null>(currentSlug);");
    expect(sheet).toMatch(/if \(open !== wasOpen\) \{\s*setWasOpen\(open\);\s*if \(open\) setOpenBook\(currentSlug\);/);
    expect(sheet).toContain("setOpenBook((now) => (now === slug ? null : slug));");
    // The open book in the middle of what the sheet shows as it opens.
    expect(sheet).toContain('el?.querySelector<HTMLElement>("[data-open-book]")?.parentElement');
    // The row stays under the finger when a grid above it closes.
    expect(sheet).toContain('scroller.scrollBy({ top: row.getBoundingClientRect().top - was.top, behavior: "instant" });');
    expect(sheet).toContain("behavior: scrollBehavior()");
  });

  it("draws a book's row in the index's look, and its chapters as a grid of seven", () => {
    expect(sheet).toContain("<ul className={INDEX_LIST_LOOK}>");
    expect(sheet).toContain("aria-expanded={open}");
    expect(sheet).toContain('<ul id={grid} className="grid grid-cols-7 gap-1.5 bg-paper/[0.05] px-3 pb-3.5 pt-1">');
    // Each a 44px box, named "Chapter 3" to a screen reader.
    expect(sheet).toMatch(/"h-11 w-full rounded-xl /);
    expect(sheet).toContain('aria-label={t("bible.chapterN", { n })}');
  });

  it("lights the chapter being read white, and ink with no glow on Parchment", () => {
    expect(sheet).toContain('aria-current={reading ? "page" : undefined}');
    expect(sheet).toContain('? "reader-lit bg-paper text-night"');
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/\.reader-lit \{\s*box-shadow: 0 0 14px -2px rgb\(255 255 255 \/ 0\.42\);\s*\}\s*html\[data-reading-mode="parchment"\] \.reader-lit \{\s*box-shadow: none;\s*\}/);
  });

  it("goes to the chapter tapped, and only closes on the one being read", () => {
    expect(sheet).toMatch(/function go\(slug: string, chapter: number\) \{\s*onClose\(\);\s*if \(slug === currentSlug && chapter === currentChapter\) return;\s*router\.push\(`\/bible\/\$\{slug\}\/\$\{chapter\}`\);/);
  });

  it("holds the three doors the tab's page held at its foot", () => {
    const doors = sheet.slice(sheet.indexOf("function BooksDoors"));
    // Today's readings, walked one after another as Today walks them.
    expect(doors).toMatch(/href=\{hrefOf\(walk\[0\]\)\}\s*onClick=\{\(\) => \{\s*startReadingsFlow\(walk\);\s*onClose\(\);/);
    expect(doors).toContain("[...day.readings, ...day.ordinary, ...day.commemoration]");
    expect(doors).toContain('t("readingsFlow.startLabel")');
    // No door that leads nowhere: with no readings, there is none.
    expect(doors).toContain("{walk.length > 0 ? (");
    expect(doors).toMatch(/<Link href="\/plans" onClick=\{onClose\}[\s\S]*?t\("plans\.title"\)/);
    expect(doors).toMatch(/<Link href="\/journal" onClick=\{onClose\}[\s\S]*?t\("journal\.title"\)/);
    expect(doors).toContain("<Book size={21}");
    expect(doors).toContain("<CalendarCheck size={21}");
    expect(doors).toContain("<Pen size={21}");
  });

  it("says nothing new: every word is in every catalog the app has", () => {
    // Every catalog key the sheet names outright (the books' and the
    // groups' names are built from the canon, and checked below).
    const keys = [...new Set([...sheet.matchAll(/"((?:bible|plans|journal|readingsFlow|search|common)\.[A-Za-z0-9.-]+)"/g)].map((m) => m[1]))];
    expect(keys.sort()).toEqual(
      [
        "bible.chAbbrev",
        "bible.chapterN",
        "bible.pickABook",
        "bible.theNewTestament",
        "bible.theOldTestament",
        "journal.title",
        "plans.studyTools",
        "plans.title",
        "readingsFlow.startLabel",
      ].sort(),
    );
    const dir = join(root, "lib/i18n/messages");
    const catalogs = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(catalogs).toHaveLength(21);
    const dynamic = [...BOOKS.map((b) => `bible.books.${b.slug}`), ...bibleCanon().flatMap((t) => t.categories.map((c) => `bible.category.${c.label.toLowerCase().replace(/ /g, "-")}`))];
    for (const file of catalogs) {
      const messages = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, string>;
      for (const key of [...keys, ...dynamic]) expect(messages[key], `${file} ${key}`).toBeTruthy();
    }
  });
});

describe("the ways to it", () => {
  it("is the title's: a chevron after the chapter, and the heading still the page's one heading", () => {
    const screen = code(SCREEN);
    const header = screen.slice(screen.indexOf('<header id="chapter-title"'), screen.indexOf("</header>"));
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(header)?.[1] ?? "";
    expect(h1).toMatch(/<T k="bible\.chapterN" replacements=\{\{ n: chapter \}\} \/>\s*<span aria-hidden data-reader-chrome className="ms-\[5px\] inline-flex align-\[-3px\] text-paper\/50 md:hidden native-md-inline-flex">\s*<ChevronDown size=\{17\} \/>/);
    // The way to the books lies over the heading, beside it and not in it.
    expect(h1).not.toContain("<button");
    expect(header).toMatch(/<div className="relative">\s*<h1[\s\S]*?<\/h1>\s*<TitleOpensBooks slug=\{slug\} chapter=\{chapter\} \/>\s*<\/div>/);
    const button = screen.slice(screen.indexOf("function TitleOpensBooks"));
    expect(button).toContain("onClick={openBooks}");
    expect(button).toContain('aria-haspopup="dialog"');
    expect(button).toContain('aria-label={t("bible.pickChapterCurrentAria", { book: t(`bible.books.${slug}`), chapter })}');
    // Focus puts the way and its chevron away with the pill (globals.css,
    // html.reader-focus [data-reader-chrome]), so a tap on the title there
    // only brings back the way out.
    expect(button).toMatch(/data-title-books=""\s*data-reader-chrome\s*onClick=\{openBooks\}/);
    // A phone's and a tablet's: the computer chooses from its toolbar.
    expect(button).toContain('className="absolute inset-0 rounded-2xl md:hidden native-md-block"');
  });

  it("is the pill's name, as it always was, and the pill holds the one sheet for both", () => {
    const pill = code(PILL);
    // One label for the pill's name and the dock's (1.9), "Pick a chapter, currently John 1".
    expect(pill).toMatch(/aria-haspopup="dialog"\s*onClick=\{\(\) => setSheetOpen\(true\)\}\s*aria-label=\{pickLabel\}/);
    expect(pill).toMatch(/const pickLabel = t\("bible\.pickChapterCurrentAria"/);
    expect(pill).toMatch(/window\.addEventListener\(BOOKS_OPEN_EVENT, open\);\s*return \(\) => window\.removeEventListener\(BOOKS_OPEN_EVENT, open\);/);
    expect(pill.split("<MobileChapterSheet").length - 1).toBe(1);
  });

  it("is no longer the ••• sheet's Book row, which did what the title does (the owner's note 82)", () => {
    expect(code(MORE)).not.toContain("<MobileChapterSheet");
    expect(code(MORE)).not.toContain('t("bible.bookLabel")');
  });

  it("is asked for by one event on window", () => {
    const seen: string[] = [];
    const original = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { dispatchEvent: (e: Event) => (seen.push(e.type), true) };
    try {
      openBooks();
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
    expect(seen).toEqual([BOOKS_OPEN_EVENT]);
  });
});

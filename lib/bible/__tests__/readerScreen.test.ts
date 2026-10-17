// The Scripture chapter screen on a phone and a tablet (1.7).
//
// The owner's notes 1 to 8 of 2026-10-16 (Homebase/boards/purify-master/r17/
// BRAINSTORM.md) and his picks: the translation picker opens the same sheet
// as the book and the settings; the controls are one clean row of pills; the
// Reader pill goes, because the top bar's settings icon does its job; Listen
// sits at the end of the title's line; the title is one line, "John 1"; the
// chapter strip is slim, with the current chapter filled; on a tablet the text
// is one centred column, and focus mode's way out is at the foot, with nothing
// in the top right.
//
// What a reader would notice if this broke: the Reader pill back beside the
// settings icon, the pills wrapping into two rows, "John" over "Chapter 1"
// again, the iPad's text pushed left by the Fathers' rail or by the
// computer's verse toolbar, or "Exit focus" back on the top bar's buttons.
// This reads the source; the built screens are measured by sections 33 and
// 43 of scripts/export-walk.mjs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old screen is not read as the screen. */
const code = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SCREEN = "components/bible/ChapterScreen.tsx";

describe("the chapter screen on a phone and a tablet", () => {
  const screen = code(SCREEN);
  const column = screen.indexOf('<div className="min-w-0 mx-auto w-full max-w-[680px]">');
  const title = screen.indexOf('id="chapter-title"');
  const phone = screen.indexOf('<div className="md:hidden native-md-block" data-reader-chrome>');

  it("keeps its controls inside the text's column, above the title", () => {
    expect(column).toBeGreaterThan(-1);
    expect(phone).toBeGreaterThan(column);
    expect(title).toBeGreaterThan(phone);
  });

  it("is one row of pills: Translation, Book and, where the Greek is offered, Interlinear; no Reader pill", () => {
    const controls = screen.slice(phone, title);
    const row = /<div className="mb-3 flex items-center gap-2">([\s\S]*?)<\/div>/.exec(controls)?.[1] ?? "";
    const drawn = [...row.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)].map((m) => m[1]);
    expect(drawn).toEqual(["MobileTranslationPill", "MobileBookPill", "InterlinearToggle"]);
    expect(row).not.toMatch(/flex-wrap/);
    expect(controls).not.toMatch(/<ReaderSettingsMenu\b/);
    expect(controls).not.toMatch(/<TranslationSwitcher\b/);
    // The search and the chapter strip follow the row.
    expect(controls.indexOf("<BibleSearch")).toBeGreaterThan(controls.indexOf("<InterlinearToggle"));
    expect(controls.indexOf("<MobileChapterStrip")).toBeGreaterThan(controls.indexOf("<BibleSearch"));
  });

  it("draws every pill of the row, and Listen, as the one reader's pill", () => {
    for (const file of [
      "components/bible/MobileTranslationPill.tsx",
      "components/bible/MobileBookPill.tsx",
      "components/bible/InterlinearToggle.tsx",
      "components/bible/ReadAloud.tsx",
    ]) {
      expect(code(file), file).toMatch(/<ReaderPill\b/);
    }
    // Interlinear says it is on by being filled, not by a dot.
    expect(code("components/bible/InterlinearToggle.tsx")).toMatch(/pressed=\{on\}/);
    expect(code("components/bible/InterlinearToggle.tsx")).not.toMatch(/rounded-full/);
  });

  it("opens the translations in a movable sheet, from the same list as the computer's popover", () => {
    const pill = code("components/bible/MobileTranslationPill.tsx");
    expect(pill).toMatch(/<Sheet\b/);
    expect(pill).toMatch(/<TranslationList\b/);
    const popover = code("components/bible/TranslationSwitcher.tsx");
    expect(popover).toMatch(/<TranslationList\b/);
    // One list, in lib/bible/translations.ts; no copy of it, and no badges.
    for (const file of ["components/bible/TranslationSwitcher.tsx", "components/bible/TranslationList.tsx"]) {
      const src = code(file);
      expect(src, file).not.toMatch(/const TRANSLATIONS\b/);
      expect(src, file).not.toMatch(/translationBadge/);
    }
  });

  it("names the chapter on one line, with Listen at its end", () => {
    const header = screen.slice(title, screen.indexOf("</header>", title));
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(header)?.[1] ?? "";
    expect(h1).toContain("<T k={`bible.books.${slug}`} /> {chapter}");
    expect(screen).not.toContain("bible.chapterN");
    // Listen is the h1's neighbour in one flex row, not a line under it.
    const row = /<div className="flex items-center justify-between gap-4">([\s\S]*?)<\/div>/.exec(header)?.[1] ?? "";
    expect(row).toMatch(/<h1\b[\s\S]*<\/h1>\s*\{!usingLicensed \? <ListenButton\b/);
    expect(code("components/bible/ReadAloud.tsx")).not.toMatch(/\bmt-4\b/);
  });

  it("names the book in the reader's language in the top bar", () => {
    const page = code("app/(app)/bible/[book]/[chapter]/page.tsx");
    expect(page).toMatch(/<MobileTopBar\s+titleKey=\{`bible\.books\.\$\{book\}`\}/);
  });

  it("strips the chapters slim, the current one filled, inside the column", () => {
    const strip = code("components/bible/MobileChapterStrip.tsx");
    expect(strip).toMatch(/<ChipScroller\b[^>]*bleed="phone"/);
    expect(strip).toMatch(/aria-current=\{active \? "page" : undefined\}/);
    expect(strip).toMatch(/bg-gold font-semibold text-night/);
    expect(strip).not.toMatch(/\bborder\b/);
  });

  it("opens search as a screen of its own, over the pill, down to the keyboard", () => {
    // The owner, 1.7.1: search on the Bible screen "conflicts with the bottom
    // and the Matthew one, or like the pill". The phone's and the tablet's
    // field opens a layer; the computer keeps its dropdown.
    expect(screen.slice(phone, title)).toContain("<BibleSearch layer />");
    const search = code("components/bible/BibleSearch.tsx");
    expect(search).toContain("data-bible-search-open");
    // Drawn on the body, so no wrapper of the page holds it under the pill
    // (the pill is z-40 and fixed) or the tab bar.
    expect(search).toMatch(/createPortal\(\s*<div\s+data-bible-search-layer/);
    expect(search).toContain("document.body,");
    expect(search).toContain('className="fixed inset-0 z-[120] bg-night"');
    expect(code("components/bible/MobileChapterPill.tsx")).toMatch(/fixed inset-x-0 z-40 /);
    // The results end where the keyboard begins.
    expect(search).toContain("const frame = useVisibleFrame();");
    expect(search).toContain("style={frame ? { top: frame.top, height: frame.height } : undefined}");
    // The tab bar and the way out of focus step aside, the page holds still,
    // and Cancel and the back button leave it.
    expect(search).toContain("setOverlayOpen(true);");
    expect(search).toContain("lockBodyScroll();");
    expect(search).toContain("useAndroidBack(true, onClose);");
    expect(search).toMatch(/onClick=\{onClose\}[\s\S]*?\{t\("common\.cancel"\)\}/);
    // A tap inside the layer must not close it as a tap outside the dropdown does.
    expect(search).toMatch(/if \(layer\) return;\s*function onDocClick/);
  });

  it("puts play by the sound button on the pill, only where the chapter has a reading", () => {
    // The owner, 1.7.1: "Just add it right next to the volume ... press play".
    const pill = code("components/bible/MobileChapterPill.tsx");
    expect(pill).toContain("const reads = hasReadAloud(slug, chapter);");
    expect(pill).toMatch(/\{reads \? <ReadAloudPillButton book=\{slug\} chapter=\{chapter\} title=\{`\$\{bookName\} \$\{chapter\}`\} \/> : null\}\s*<AmbienceButton variant="pill" \/>/);
    // The name gives way by the button's width, so the pill keeps to the screen.
    expect(pill).toContain('reads ? "max-w-[calc(100vw-13rem)]" : "max-w-[calc(100vw-10rem)]"');
    const read = code("components/bible/ReadAloud.tsx");
    const button = read.slice(read.indexOf("export function ReadAloudPillButton"), read.indexOf("export function ReadAloudFollow"));
    // No reading, no button: never a dead one.
    expect(button).toContain("if (!hasReadAloud(book, chapter)) return null;");
    // The same reading as Listen, played and paused through the one player.
    expect(button).toContain("await startReading(book, chapter, title, t);");
    expect(button).toMatch(/if \(playing\) pause\(\);\s*else play\(\);/);
    expect(button).toContain('aria-label={playing ? t("readAloud.pause") : t("readAloud.listen")}');
    expect(button).toMatch(/<Pause size=\{18\} \/>[\s\S]*<Play size=\{18\}/);
    // The verse being read is lit by the follower the screen already mounts.
    expect(screen).toContain("<ReadAloudFollow book={slug} chapter={chapter} />");
  });
});

describe("the reader's pill and what rises over it", () => {
  // The owner, 1.7.1, a screenshot from the Android app: "pill buttons
  // colliding here", a hold's Copy pill on top of a work's section pill. A
  // hold's Copy pill, a verse's tools and the search screen all stand where
  // the pill is, so the pill steps aside while one is up, as the tab bar does.
  const pills = ["components/bible/MobileChapterPill.tsx", "components/saints/MobileWorkPill.tsx"];
  const PLACE = '"calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)"';

  it("steps aside while anything is up over the reader, and comes back after", () => {
    for (const file of pills) {
      const pill = code(file);
      expect(pill, file).toContain("const covered = useOverlayOpen();");
      expect(pill, file).toContain("aria-hidden={covered || undefined}");
      expect(pill, file).toMatch(/motion-safe:transition-opacity motion-safe:duration-200",\s*covered && "opacity-0",/);
      expect(pill, file).toContain('covered ? "pointer-events-none" : "pointer-events-auto"');
      expect(pill, file).toContain(PLACE);
    }
    // The tab bar has stepped aside the same way since the sheets.
    expect(code("components/nav/MobileTabBar.tsx")).toContain("overlayOpen && \"opacity-0\"");
  });

  it("is what the Copy pill, a verse's tools and search raise the flag for", () => {
    // Each stands in the pill's place, or over the whole screen.
    const copy = code("components/native/PressToCopy.tsx");
    expect(copy).toContain("setOverlayOpen(true);");
    expect(copy).toContain(PLACE);
    const tools = code("components/bible/MobileVerseToolbar.tsx");
    expect(tools).toContain("setOverlayOpen(true);");
    expect(tools).toContain(PLACE);
    expect(code("components/bible/BibleSearch.tsx")).toContain("setOverlayOpen(true);");
  });
});

describe("a tablet in the apps", () => {
  it("reads one centred column: no rail beside the text, the Fathers in the sheet", () => {
    const screen = code(SCREEN);
    expect(screen).toMatch(/"reader-grid native-md-block"/);
    expect(screen).toMatch(/rail && "lg:grid /);
    expect(screen).toMatch(/<aside className="hidden lg:block native-md-hidden" data-reader-chrome>/);
    // The computer's toolbar stays the computer's.
    expect(screen).toMatch(/cn\("hidden md:block native-md-hidden"/);
    const verse = code("components/bible/VerseRow.tsx");
    expect(verse.match(/hidden lg:inline-flex native-md-hidden/g)?.length).toBe(2);
    expect(verse.match(/lg:hidden native-md-inline-flex/g)?.length).toBe(2);
    expect(code("components/bible/MobileCommentarySheet.tsx")).toMatch(/lg:hidden native-md-block fixed inset-0/);
    expect(code("components/bible/LazyStudyRail.tsx")).toMatch(/if \(empty \|\| isNativeClient\(\)\) return;/);
  });

  it("lets the verses fill the column: no computer's toolbar laid out beside each verse", () => {
    // The owner's iPad, 1.7 on TestFlight: the column stood in the middle, but
    // the toolbar beside every verse (hidden md:flex, at opacity 0 until a
    // mouse hovers) was laid out unseen, about 170px wide, and the words
    // filled only the left of the column, 90px left of the screen's middle.
    // Section 43 of scripts/export-walk.mjs measures the words on every iPad.
    const verse = code("components/bible/VerseRow.tsx");
    expect(verse).toContain('"hidden md:flex native-md-hidden items-center gap-1 shrink-0');
    expect(verse).not.toMatch(/"hidden md:flex(?! native-md-hidden)/);
    // A tablet in the apps has the long-press toolbar instead, as a phone does.
    expect(code("components/bible/MobileVerseToolbar.tsx")).toMatch(/"md:hidden native-md-block fixed inset-0/);
  });

  it("gives its sheets a width of their own", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/html\.is-native \[data-sheet-panel\] \{\s*max-width: 560px;\s*margin-inline: auto;/);
    expect(code("components/ui/Sheet.tsx")).toMatch(/data-sheet-panel=\{desktop \? undefined : ""\}/);
    expect(code("components/bible/MobileCommentarySheet.tsx")).toMatch(/data-sheet-panel="wide"/);
  });
});

describe("focus mode", () => {
  const prefs = code("components/reader/ReaderPrefs.tsx");
  const css = read("app/globals.css");

  it("keeps its way out at the foot of the screen, never in the top right", () => {
    const exit = prefs.slice(prefs.indexOf("function FocusExit"), prefs.indexOf("function holdPlace"));
    expect(exit).toMatch(/data-reader-exit/);
    expect(exit).toMatch(/bottom:\s*\n?\s*"calc\(env\(safe-area-inset-bottom, 0px\)/);
    expect(exit).not.toMatch(/\b(top-3|right-3)\b/);
    expect(exit).not.toMatch(/backdrop-blur/);
    // It fades on its own and comes back on a tap, and only through the
    // reader's motion switch.
    expect(exit).toMatch(/motion-safe:transition-opacity/);
    expect(exit).toMatch(/pointercancel/);
    // Escape still leaves focus, from the controller.
    expect(prefs).toMatch(/if \(e\.key === "Escape"\) setFocus\(false\);/);
  });

  it("puts the top bar, the chapter pill and the work pill away", () => {
    expect(css).toMatch(/html\.reader-focus \[data-mobile-topbar\] \{\s*display: none !important;/);
    expect(css).toMatch(/html\.is-native\.reader-focus \{\s*--tab-bar-h: 0px;/);
    for (const file of ["components/bible/MobileChapterPill.tsx", "components/saints/MobileWorkPill.tsx"]) {
      expect(code(file), file).toMatch(/aria-label=\{t\("[a-z.A-Z]+"\)\}\s*data-reader-chrome/);
    }
  });

  it("moves the progress line up to where the bar was, after the rules that place it under the bar", () => {
    const focus = css.indexOf("html.reader-focus .below-topbar");
    expect(focus).toBeGreaterThan(css.lastIndexOf("html:not(.is-native) .below-topbar"));
    expect(focus).toBeGreaterThan(css.indexOf("html.is-native .below-topbar"));
  });
});

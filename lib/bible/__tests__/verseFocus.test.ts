// The verse's focus (1.9, the owner's pick C of 2026-11-08, on build 88):
// a tap on a verse steps the page back and lifts the verse into a card, the
// colours above and the tools below, with the house's motion. It replaced
// the strip under the verse. And the verse's note is written in the
// journal's sheet, its saved note a small pen at the verse's end.
//
// vitest runs in node with no DOM here, so this reads the source and the
// stylesheet, as the house's other guards do.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FOCUS = code("components/bible/VerseFocus.tsx");
const ROW = code("components/bible/VerseRow.tsx");
const NOTE = code("components/bible/VerseNoteSheet.tsx");
const COMPOSER = code("components/journal/JournalComposer.tsx");
const CSS = read("app/globals.css");

describe("the verse's focus", () => {
  it("is a dialog over everything, portaled to the page, named for the verse, for a finger at any width", () => {
    expect(FOCUS).toContain("createPortal(");
    expect(FOCUS).toContain("document.body");
    expect(FOCUS).toMatch(/role="dialog"\s+aria-modal="true"\s+aria-label=\{t\("bible\.verseActionsFor", \{ reference \}\)\}/);
    // Shown whenever it is opened, and only a finger's hold or the verse's
    // door opens it. It was md:hidden (the apps' tablets let in by
    // native-md-block), so on a tablet's browser a hold dimmed the verse and
    // showed nothing (1.9, measured on the export at 820 with touch).
    expect(FOCUS).toMatch(/className="verse-focus fixed inset-0 z-\[60\]"/);
  });

  it("holds the colours above the card and Copy, Share, Image, Note and Study below it, in that order", () => {
    const picker = FOCUS.indexOf("<HighlightPicker");
    const card = FOCUS.indexOf("verse-focus-card");
    const tools = ["common.copy", "common.share", "bible.strip.image", "bible.strip.note", "bible.strip.study"].map((k) => FOCUS.indexOf(`t("${k}")`));
    expect(picker).toBeGreaterThan(0);
    expect(card).toBeGreaterThan(picker);
    expect(tools.every((i) => i > card)).toBe(true);
    expect([...tools].sort((a, b) => a - b)).toEqual(tools);
  });

  it("steps the page back with a token, never a blur", () => {
    expect(FOCUS).toContain("verse-focus-scrim absolute inset-0 bg-night/85");
    expect(FOCUS).not.toMatch(/backdrop-blur|backdrop-filter|backdropFilter/);
  });

  it("lifts the card from where the verse is, measured before the first frame, and starts its motion only then", () => {
    expect(FOCUS).toContain("useLayoutEffect(");
    expect(FOCUS).toContain('style.setProperty("--lift"');
    expect(FOCUS).toContain('setAttribute("data-ready", "")');
  });

  it("closes in its two steps before letting go, faster under reduced motion, on a tap behind, Escape and Android's back", () => {
    expect(FOCUS).toMatch(/const CLOSE_MS = 300;/);
    expect(FOCUS).toMatch(/const CLOSE_MS_REDUCED = 200;/);
    expect(FOCUS).toContain("window.setTimeout(onClose, reduced ? CLOSE_MS_REDUCED : CLOSE_MS)");
    expect(FOCUS).toMatch(/onClick=\{close\} className="verse-focus-scrim/);
    expect(FOCUS).toContain('if (e.key === "Escape") close();');
    expect(FOCUS).toContain("useAndroidBack(");
    expect(FOCUS).toContain("lockBodyScroll()");
  });

  it("opens a word's Greek from the card, as the page's words do", () => {
    expect(FOCUS).toContain('closest<HTMLElement>("[data-word-idx]")');
    expect(FOCUS).toContain("onWord(idx, el)");
    expect(ROW).toContain("onWord={greekAvailable ? (idx, el) => void openEnglishWord(idx, el) : undefined}");
  });

  it("opens Study as cards, two to a row, a Plus tool with the one Plus mark", () => {
    expect(FOCUS).toContain("grid grid-cols-2");
    expect(FOCUS).toContain("{s.locked ? <PlusMark /> : null}");
  });
});

describe("its motion, the house's", () => {
  const block = CSS.slice(CSS.indexOf("The verse's focus (1.9"), CSS.indexOf("@keyframes verse-focus-card-out"));

  it("uses the house's curve, durations and step", () => {
    for (const token of ["var(--ease-house)", "var(--duration-base)", "var(--duration-slow)", "var(--stagger-step-tight)"]) expect(block).toContain(token);
  });

  it("fills backwards on the way in, so nothing holds a transform once arrived", () => {
    expect(block).toMatch(/\.verse-focus\[data-ready\] \.verse-focus-card \{\s*animation: verse-focus-lift [^;]* backwards;/);
    expect(block).toMatch(/\.verse-focus\[data-ready\] \.verse-focus-part \{\s*animation: verse-focus-in [^;]* backwards;/);
  });

  it("closes the tools and the card first, then the page", () => {
    expect(block).toMatch(/\.verse-focus\[data-closing\] \.verse-focus-scrim \{\s*animation: verse-focus-out 180ms var\(--ease-house\) 120ms forwards;/);
  });

  it("only fades under reduced motion, keyed to the data-motion switch", () => {
    const reduce = CSS.slice(CSS.indexOf(':where([data-motion="reduce"]) .verse-focus[data-ready]'));
    expect(reduce).toMatch(/^:where\(\[data-motion="reduce"\]\) \.verse-focus\[data-ready\] :is\(\.verse-focus-scrim, \.verse-focus-card, \.verse-focus-part\) \{\s*animation: verse-focus-in var\(--duration-fast\) linear backwards;/);
  });
});

describe("the verse row", () => {
  it("opens the focus, not the strip, and its card rises from the verse's words", () => {
    expect(ROW).toContain("<VerseFocus");
    expect(ROW).not.toContain("VerseStrip");
    expect(ROW).toContain("anchor={wordsRef}");
    expect(ROW).toMatch(/ref=\{wordsRef\}\s*data-own-press=""/);
  });

  it("writes a note in the journal's sheet, with no box under the verse and no computer's keyboard hints", () => {
    expect(ROW).toContain("<VerseNoteSheet");
    expect(ROW).not.toContain("bible.noteSaveHint");
    expect(ROW).not.toContain("bible.escToClose");
    expect(ROW).not.toContain("<textarea");
  });

  it("marks a saved note with a small pen at the verse's end, which opens it", () => {
    expect(ROW).toMatch(/data-verse-note-mark=""\s+aria-label=\{t\("bible\.yourNote"\)\}/);
    expect(ROW).toMatch(/className="hit-44 relative ms-1\.5 inline-grid/);
  });
});

describe("the note's sheet", () => {
  it("is the journal's composer in its note form, with no Open back to the verse it was opened from", () => {
    expect(NOTE).toContain("<JournalComposer");
    expect(NOTE).toContain("openLink={false}");
    expect(NOTE).toContain("editing: noteKey(book, chapter, verse)");
  });

  it("keeps what was typed and closed, for that verse", () => {
    expect(NOTE).toContain("purify:note-draft:${book}:${chapter}:${verse}");
    expect(NOTE).toContain("window.localStorage.setItem(draftKey, body)");
  });

  it("draws no square frame round its field: the sheet is the field, and its caret shows where typing goes", () => {
    // The page's title and a quote's giver are fields too (1.9, a page): none draws the frame.
    expect(CSS).toMatch(/\[data-journal-composer\] :is\(textarea, input\):focus-visible,\s*\[data-page-props-panel\] input:focus-visible \{\s*outline: none;\s*\}/);
    // The same root says a finger put down in the page never drags the sheet (build 93 note 8).
    expect(read("components/journal/JournalComposer.tsx")).toContain('<div data-journal-composer="" data-sheet-nodrag="">');
  });

  it("asks for a note in a note's form, its placeholder legible, its Open 44px wide", () => {
    // A note's field asks for a note; an entry is a page, whose words ask for what is on the heart.
    expect(COMPOSER).toContain('placeholder={t(draft.editing?.startsWith("note:words:") ? "saints.words.note" : "bible.notePlaceholder")}');
    expect(COMPOSER).toContain('<PageBlocks editor={editor} placeholder={t("journal.composer.placeholder")} />');
    expect(COMPOSER).toContain("placeholder:text-paper/55");
    expect(COMPOSER).not.toContain("placeholder:text-paper/35");
    expect(COMPOSER).toMatch(/\{href && openLink \? \(\s*<Link href=\{href\} className="ms-auto inline-flex min-h-11 shrink-0 items-center px-3 /);
  });
});

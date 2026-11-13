import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The reader's dock shows a book's name whole (the gate's confirm run,
 * 2026-11-12; the arbiter's word of 09:31 UTC). Beside Listen and the sleep
 * timer the chapter's picker gave the name 63px at 390 and 49 at 320, and
 * "1 Corinthians" and twelve more New Testament books ended in an ellipsis,
 * and at 320 eleven more besides. The name is never cut now: where it and the
 * controls do not fit on one line, the controls go down a line (the row
 * wraps, the controls as one group at its end) and the card grows with it,
 * measured into --reader-dock-card-h, which the page's room at its foot reads
 * too. The title at the top, where the chapter goes as the reader reads on,
 * takes a second line where a name needs one.
 *
 * The pill that stands in the dock's place while nothing is loaded cut more:
 * "1 Corinthians" and eleven more New Testament books at 390 in English, and
 * 60 of the 78 books at 320 in Polish (measured on the export). There the
 * name is shown whole in steps, each measured before the pill is painted:
 * Listen's word gives its room first, as it always has on the narrowest
 * phones, and the name may take two lines, broken between words; where it
 * still does not fit, the sound button and Listen go to a row of their own
 * under it, and the reader's foot keeps room for the taller pill.
 *
 * What it cannot see: the screen. The export check opens every book of both
 * Testaments at 390 and 320, in English and in the two languages with the
 * longest names (Polish and Russian), and finds no name cut.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const DOCK = read("components/bible/ReaderDock.tsx");
const PILL = read("components/bible/MobileChapterPill.tsx");
const LISTEN = read("components/bible/ReadAloud.tsx");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the reader's dock, a book's name", () => {
  it("is never cut short in either picker", () => {
    expect(DOCK).not.toMatch(/<span className="[^"]*\btruncate\b[^"]*">\{bookName\}<\/span>/);
    expect(DOCK.match(/<span className="min-w-0 \[overflow-wrap:anywhere\]">\{bookName\}<\/span>/g)).toHaveLength(2);
    // A title of three lines hangs down from the bar's top, never up past it into the status bar.
    expect(DOCK).toContain('<div className="flex h-[52px] min-w-0 max-w-[calc(100%-8rem)] items-center-safe">');
  });

  it("sends the chapter's controls down a line when it needs the room, the controls as one group", () => {
    expect(DOCK).toContain('<div ref={chapterRowRef} className="mt-1.5 flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-2 font-sans text-[14px]">');
    expect(DOCK).toContain('<span className="ms-auto flex shrink-0 items-center gap-2">');
  });

  it("grows the card with its row, and the page's room at its foot with the card", () => {
    expect(DOCK).toContain('root.style.setProperty("--reader-dock-card-h"');
    // Past the row's own one line, in rem as the app's type size makes it (34px at 17, where 32 grew every card by 2).
    expect(DOCK).toContain("const oneLine = parseFloat(getComputedStyle(row).minHeight) || CHAPTER_ROW_PX;");
    expect(CSS.match(/\n\.reader-dock \{([^}]*)\}/)?.[1]).toContain("height: var(--reader-dock-card-h, 112px);");
    expect(CSS).toContain("--reader-dock-room: calc(var(--reader-dock-card-h, 112px) - 56px);");
    expect(CSS).not.toMatch(/\.reader-dock[^{]*\{[^}]*height: 112px;/);
  });
});

describe("the reader's pill, a book's name", () => {
  it("is never left cut: a cut name steps the pill on, before it is painted", () => {
    expect(PILL).toContain('<span ref={nameRef} className="min-w-0 group-data-[fit=0]:truncate group-data-[fit=2]:[overflow-wrap:anywhere]">');
    // Strict: a name one pixel over its room is drawn with an ellipsis.
    expect(PILL).toContain("return name.scrollWidth > name.clientWidth || lines > 2.05;");
    // Stepped on in the layout effect itself, written on the pill (Updates 18:
    // a state set there was rendered only after a View Transition's picture).
    expect(PILL).toContain('pill.dataset.fit = "0";');
    expect(PILL).toContain("while (fit < 2 && tooLong()) pill.dataset.fit = String(++fit);");
    // Measured again for each name, chapter and width, from the pill as drawn.
    expect(PILL).toContain("}, [bookName, chapter, reads, docked]);");
    expect(PILL).toMatch(/new ResizeObserver\(\(\) => \{\s*const now = Math\.round\(frame\.clientWidth\);\s*if \(now !== width\) \{\s*width = now;\s*measure\(\);/);
    expect(PILL).not.toMatch(/setFitFor|setFrameWidth/);
  });

  it("gives Listen's word way first, as on the narrowest phones, its name still the word", () => {
    // Listen stands in the pill, whose data-fit is 1 when its word gives way.
    expect(LISTEN).toContain('<span aria-hidden className={cn("max-[390px]:hidden group-data-[fit=1]:hidden", wordGivesWay && "hidden")}>');
    expect(LISTEN).toContain("aria-label={word}");
  });

  it("sends the sound button and Listen to a row of their own last, and keeps the reader's foot clear of the taller pill", () => {
    expect(PILL).toContain('"group rounded-pill data-[fit=2]:h-auto data-[fit=2]:flex-col data-[fit=2]:rounded-[28px] data-[fit=2]:py-1",');
    // On its own row the name takes as many lines as it needs, its button growing with it.
    expect(PILL).toContain("group-data-[fit=2]:h-auto group-data-[fit=2]:min-h-11 group-data-[fit=2]:py-1");
    expect(PILL).toContain('<span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-paper/15 group-data-[fit=2]:hidden" />');
    expect(PILL).toContain('root.style.setProperty("--reader-pill-extra"');
    expect(PILL).toContain("const oneRow = 3.5 * (parseFloat(getComputedStyle(root).fontSize) || 16);");
    const room = CSS.match(/--reader-pill-extra, 0px\) \+ 68px/g) ?? [];
    expect(room).toHaveLength(2);
  });
});

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

/**
 * The Reading mode section of the reader's own settings
 * (components/reader/ReadingModeChips.tsx; app/globals.css, "The reader's
 * own shelf").
 *
 * The owner's note 4 of build 93, 2026-11-11: "Refine this section and
 * refine the design also." It was a grid of radio-dot chips, the two earned
 * palettes in dashed boxes with a count, one of them alone on its row, and a
 * "See all" row under them. His standing rules for it: minimal, photos over
 * words (each mode shown as itself), no dashed placeholder boxes, no orphan
 * on a row, floating pills only where they belong, 44px to the touch, the
 * house's motion.
 *
 * What a reader would notice if this broke: the dots and dashed boxes back,
 * a page alone on a row, or a sweep on the shelf that drags the whole sheet.
 */
const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const SHELF = read("components/reader/ReadingModeChips.tsx");
const CODE = SHELF.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the one rule with exactly this selector. */
function decls(selector: string): Record<string, string> {
  const at = CSS.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const body = CSS.slice(CSS.indexOf("{", at) + 1, CSS.indexOf("}", at));
  return Object.fromEntries(
    body
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]),
  );
}

describe("the reader's Reading mode section", () => {
  it("shows each mode as itself: the small page Settings draws, not a dot and a name", () => {
    expect(CODE).toContain("<ModeTile");
    expect(CODE).toContain("<GoalTile");
    // The chips are gone: no radio dot, no box per name.
    for (const gone of ["rounded-full border border-paper/25", "h-1.5 w-1.5", "grid grid-cols-2", "rounded-md border px-2.5"]) expect(CODE, gone).not.toContain(gone);
  });

  it("draws no dashed box, here or on the earned palettes' tile anywhere", () => {
    expect(CODE).not.toMatch(/dashed/);
    expect(read("components/settings/ReadingModePages.tsx").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")).not.toMatch(/dashed/);
    // The tile's own rules: unlit until earned, and no outline of any kind.
    const goal = decls(".set-mode-goal .set-mode-page");
    expect(goal.outline).toBeUndefined();
    expect(Number(goal.opacity)).toBeLessThan(1);
    expect(JSON.stringify(goal)).not.toContain("dashed");
    for (const block of [...CSS.matchAll(/\.set-mode-goal[^{]*\{([^}]*)\}/g)]) expect(block[1]).not.toContain("dashed");
    // Tapped, it comes forward, and the move is the house's and stops for a reader who asked for stillness.
    expect(Number(decls('.set-mode-goal[aria-expanded="true"] .set-mode-page').opacity)).toBeGreaterThan(Number(goal.opacity));
    expect(decls(".set-root[data-live] .set-mode-goal .set-mode-page").transition).toBe("opacity 240ms var(--ease-house)");
    expect(CSS).toContain(':where([data-motion="reduce"]) .set-root[data-live] .set-mode-goal .set-mode-page,');
  });

  it("is one shelf: swept sideways in the phone's sheet, with the sheet's own pull kept off it", () => {
    expect(CODE).toMatch(/<div ref=\{shelf\} role="group" aria-label=\{name\} className="reader-shelf" data-touch=\{touch \? "" : undefined\} data-sheet-nodrag="">/);
    expect(CODE.match(/className="reader-shelf"/g)).toHaveLength(1);
    const swept = decls(".reader-shelf[data-touch]");
    expect(swept.display).toBe("flex");
    expect(swept["overflow-x"]).toBe("auto");
    expect(swept["scroll-snap-type"]).toBe("x proximity");
    expect(swept["scrollbar-width"]).toBe("none");
    // It runs to the sheet's edges, its first page under the section's name.
    expect(swept["margin-inline"]).toBe("-1rem");
    expect(swept["padding-inline"]).toBe("1rem 0");
    // The sheet's own drag leaves a surface so marked alone.
    expect(read("lib/ui/useDraggableSheet.ts")).toContain('closest?.("[data-sheet-nodrag]")');
  });

  it("leaves no page alone on a row where it cannot be swept: four columns, for seven or eight pages", () => {
    const wrapped = decls(".reader-shelf");
    expect(wrapped.display).toBe("grid");
    expect(wrapped["grid-template-columns"]).toBe("repeat(4, minmax(0, 1fr))");
    // What stands on it: every palette that is not a look, and one look at most (the reader's own).
    const always = READING_THEMES.filter((mode) => !mode.look).length;
    expect(always).toBe(7);
    for (const pages of [always, always + 1]) expect(pages % 4, String(pages)).not.toBe(1);
    expect(CODE).toContain("READING_THEMES.filter((mode) => !mode.look || mode.id === theme)");
  });

  it("every page is more than a finger wide and tall, and the way to all the modes is a finger tall at the shelf's head", () => {
    for (const selector of [".reader-shelf", ".reader-shelf[data-touch]"]) {
      const k = Number(decls(selector)["--mp-k"]);
      expect(168 * k, selector).toBeGreaterThanOrEqual(44);
      expect(300 * k, selector).toBeGreaterThanOrEqual(44);
    }
    expect(decls(".reader-shelf .set-mode-page").height).toBe("calc(300px * var(--mp-k))");
    // The link stands in the head's row, before the shelf, and nothing follows the shelf but the earned palettes' line.
    const head = CODE.indexOf("data-all-modes");
    const shelf = CODE.indexOf('className="reader-shelf"');
    expect(head).toBeGreaterThan(-1);
    expect(head).toBeLessThan(shelf);
    expect(CODE).toMatch(/data-all-modes=""\s*className="[^"]*\bmin-h-11\b/);
    expect(CODE.match(/<Link/g)).toHaveLength(1);
  });

  it("moves in the house's motion, and only once the section is up", () => {
    expect(CODE).toContain('<div className="set-root reader-modes" data-live={live ? "" : undefined}>');
    expect(decls(".set-root[data-live] .set-mode-page").transition).toBe("translate 320ms var(--ease-house), box-shadow 320ms var(--ease-house)");
  });

  it("keeps the page the app is in in sight: there when the sheet opens, brought whole into view on a tap, and only sideways", () => {
    // Where the check is: the page pressed, among the shelf's pages.
    expect(CODE).toContain('const at = pages.findIndex((page) => page.getAttribute("aria-pressed") === "true");');
    // Left alone when it is already whole in sight.
    expect(CODE).toContain("if (on.left >= edge.left + room - 1 && on.right <= edge.right - room + 1) return true;");
    // Moved to a place the shelf rests at: the start of the page two before it, from the reading side.
    expect(CODE).toContain("const lead = pages[Math.max(0, at - 2)].getBoundingClientRect();");
    expect(CODE).toContain('const by = getComputedStyle(row).direction === "rtl" ? lead.right - (edge.right - room) : lead.left - (edge.left + room);');
    expect(decls(".reader-shelf > .set-mode")["scroll-snap-align"]).toBe("start");
    expect(decls(".reader-shelf[data-touch]")["scroll-padding-inline"]).toBe("1rem");
    // Only the shelf is moved, never the sheet: scrollBy on the row, and no scrollIntoView anywhere.
    expect(CODE).toMatch(/row\.scrollBy\(\{ left: by, behavior: still \? "auto" : "smooth" \}\);/);
    expect(CODE).not.toContain("scrollIntoView");
    // At once as the sheet opens, and for a reader who asked for stillness; the house's own glide after a tap.
    expect(CODE).toContain('const still = !opened.current || document.documentElement.dataset.motion === "reduce";');
    // A sheet still opening has no width yet: the shelf is aligned once it has.
    expect(CODE).toMatch(/const watch = new ResizeObserver\(\(\) => \{\s*if \(!align\(\)\) return;\s*opened\.current = true;\s*watch\.disconnect\(\);\s*\}\);/);
    // Where nothing sweeps (the computer's popover) nothing is moved.
    expect(CODE).toContain("if (!row || !touch) return;");
    expect(CODE).toMatch(/\}, \[worn, theme, touch\]\);/);
  });

  it("checks the palette the app is in, and taps as every picker does", () => {
    expect(CODE).toContain("const { pick, worn, allows, locked } = usePalettePick();");
    expect(CODE).toContain("worn={worn}");
    expect(CODE).toContain("onPick={pick}");
  });

  it("says how a palette is earned under the shelf, and never promises Plus to every reader", () => {
    expect(CODE).toContain('t(goal === "councils" ? "settings.paletteEarnCouncils" : "settings.paletteEarnCappadocian", { count: earned[goal].read, total: earned[goal].of })');
    expect(SHELF).toContain('{locked ? ` ${t("settings.palettePlusNote")}` : null}');
    // The line the tile points a screen reader to.
    expect(CODE).toContain('id="set-palette-goal"');
    expect(read("components/settings/ReadingModePages.tsx")).toContain('aria-controls="set-palette-goal"');
  });
});

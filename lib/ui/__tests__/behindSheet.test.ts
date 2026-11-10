import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { setOverlayOpen, sheetLeaves, sheetRises } from "@/lib/ui/overlay";

/**
 * What stands behind a sheet goes with it (build 89 note 16, his words: "make
 * the objects in the back fade out better when this new screen shows up
 * (bottom UI + player)"). He opened the sleep timer from the reader's dock:
 * the tab bar faded on a clock of its own, the dock went at once (an
 * unlayered rule had left it no fade), and both came back only after the
 * sheet had gone.
 *
 * What would go wrong if this broke: the tab bar, the players and the
 * reader's plates blinking out, or staying, as a sheet rises over them; or
 * coming back late, after the sheet has left, instead of with it; or moving
 * under the motion switch.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const css = read("app/globals.css");
const hook = read("lib/ui/useDraggableSheet.ts");

const CHROME = ':is([data-screen-edge="bottom"], [data-plates-row])';

/** The body of the first rule whose selector is exactly this. */
function rule(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const open = css.indexOf("{", at);
  return css.slice(open + 1, css.indexOf("}", open));
}

const constant = (name: string) => hook.match(new RegExp(`^const ${name} = ([^;]+);`, "m"))?.[1].trim().replace(/^"|"$/g, "");
const variable = (name: string) => css.match(new RegExp(`--${name}: ([^;]+);`))?.[1].trim();

describe("what stands behind a sheet", () => {
  it("goes as it rises and comes back as it leaves, on the sheet's own times", () => {
    expect(variable("sheet-rise-duration")).toBe(`${constant("OPEN_MS")}ms`);
    expect(variable("sheet-leave-duration")).toBe(`${constant("CLOSE_MS")}ms`);
    expect(variable("sheet-leave-ease")).toBe(constant("EASE_OUT"));
    expect(variable("sheet-dissolve-duration")).toBe(`${constant("DISSOLVE_MS")}ms`);
    // The rise is on the house curve, the sheet's own.
    expect(constant("EASE")).toBe(variable("ease-house"));
  });

  it("is one rule for the foot of the screen and the reader's plates, over whatever else they do", () => {
    const up = rule(`body[data-sheet-up] ${CHROME}`);
    expect(up).toContain("opacity: 0 !important;");
    expect(up).toContain("visibility: hidden !important;");
    expect(up).toMatch(/transition:\s*opacity var\(--sheet-rise-duration\) var\(--ease-house\),\s*visibility 0s linear var\(--sheet-rise-duration\) !important;/);
    const leaving = rule(`body[data-sheet-leaving]:not([data-sheet-up]) ${CHROME}`);
    expect(leaving).toMatch(/transition:\s*opacity var\(--sheet-leave-duration\) var\(--sheet-leave-ease\),\s*visibility 0s !important;/);
    // It sets no opacity of its own as they come back: each returns to what
    // it was (the plates and the tab bar stay away while the reader reads on).
    expect(leaving).not.toMatch(/\bopacity:/);
  });

  it("dissolves with the sheet under the motion switch, moving nothing", () => {
    const up = rule(`:where([data-motion="reduce"]) body[data-sheet-up] ${CHROME}`);
    expect(up).toMatch(/transition:\s*opacity var\(--sheet-dissolve-duration\) ease,\s*visibility 0s linear var\(--sheet-dissolve-duration\) !important;/);
    const leaving = rule(`:where([data-motion="reduce"]) body[data-sheet-leaving]:not([data-sheet-up]) ${CHROME}`);
    expect(leaving).toMatch(/transition:\s*opacity var\(--sheet-dissolve-duration\) ease,\s*visibility 0s !important;/);
    for (const r of [up, leaving]) expect(r).not.toMatch(/transform|translate/);
    // And after the plain rules, so it wins them.
    expect(css.indexOf(`:where([data-motion="reduce"]) body[data-sheet-up] ${CHROME}`)).toBeGreaterThan(css.indexOf(`\nbody[data-sheet-up] ${CHROME}`));
  });

  it("is told by every sheet, from the hook every sheet is built on, in the frame the sheet moves", () => {
    expect(hook).toContain('import { sheetLeaves, sheetRises } from "@/lib/ui/overlay";');
    expect(hook).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!mounted\) return;\s*return open \? sheetRises\(\) : sheetLeaves\(\);\s*\}, \[open, mounted\]\);/);
    // The shared sheet is built on it.
    expect(read("components/ui/Sheet.tsx")).toContain("useDraggableSheet({");
  });
});

describe("the flags on <body>", () => {
  type Stub = { documentElement: { style: { overflow: string } }; body: { style: { overflow: string }; dataset: Record<string, string> } };
  const data = () => (globalThis as unknown as { document: Stub }).document.body.dataset;

  beforeEach(() => {
    (globalThis as unknown as { document: Stub }).document = {
      documentElement: { style: { overflow: "" } },
      body: { style: { overflow: "" }, dataset: {} },
    };
  });

  it("say a sheet is up as it rises, and leaving from the moment it begins to go", () => {
    setOverlayOpen(true); // the sheet mounts
    const rise = sheetRises();
    expect(data()).toEqual({ overlayOpen: "1", overlayCovers: "1", sheetUp: "1" });
    rise(); // it begins to leave
    const gone = sheetLeaves();
    // Still open, covering nothing: what stood behind it comes back with it.
    expect(data()).toEqual({ overlayOpen: "1", sheetLeaving: "1" });
    gone(); // it has gone
    setOverlayOpen(false);
    expect(data()).toEqual({});
  });

  it("keep covering while something else is still open", () => {
    setOverlayOpen(true); // a verse's tools
    setOverlayOpen(true); // a sheet from them
    const rise = sheetRises();
    rise();
    const gone = sheetLeaves();
    expect(data()).toEqual({ overlayOpen: "1", overlayCovers: "1", sheetLeaving: "1" });
    gone();
    setOverlayOpen(false);
    expect(data()).toEqual({ overlayOpen: "1", overlayCovers: "1" });
    setOverlayOpen(false);
    expect(data()).toEqual({});
  });

  it("hold through one sheet giving way to the next", () => {
    setOverlayOpen(true);
    const first = sheetRises();
    // ••• gives way to the reader's settings: the first leaves as the second rises.
    first();
    const firstGone = sheetLeaves();
    setOverlayOpen(true);
    const second = sheetRises();
    expect(data()).toEqual({ overlayOpen: "1", overlayCovers: "1", sheetUp: "1", sheetLeaving: "1" });
    firstGone();
    setOverlayOpen(false);
    expect(data()).toEqual({ overlayOpen: "1", overlayCovers: "1", sheetUp: "1" });
    second();
    const secondGone = sheetLeaves();
    secondGone();
    setOverlayOpen(false);
    expect(data()).toEqual({});
  });

  it("let a sheet that never raised the overlay flag leave without giving back what it never took", () => {
    const rise = sheetRises();
    rise();
    const gone = sheetLeaves();
    expect(data()).toEqual({ sheetLeaving: "1" });
    setOverlayOpen(true); // something else opens while it goes
    expect(data().overlayCovers).toBe("1");
    gone();
    setOverlayOpen(false);
    expect(data()).toEqual({});
  });

  it("end once, however often the end is called", () => {
    const rise = sheetRises();
    rise();
    rise();
    const other = sheetRises();
    expect(data().sheetUp).toBe("1");
    other();
    expect(data()).toEqual({});
  });
});

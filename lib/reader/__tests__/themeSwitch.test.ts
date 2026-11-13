import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HALF_IN_MS, HOUSE_CURVE, SWITCH_ATTR, SWITCH_MS, barStep, timeAt } from "../themeSwitch";

/**
 * A palette changing on the whole app, as one change (build 95 note 26). His
 * word, 2026-11-13 about 08:17 UTC: "make the theme switching smoother its
 * buggy". He named no single fault; recorded frame by frame on the export
 * (Settings, the Reading mode page, the Bible's own sheet, motion on and off),
 * these were the faults, and each is held here:
 *
 *   1. Some forty parts of the page ran colour transitions of their own
 *      inside the cross-fade (the page's ground had a 350ms fade of its own),
 *      so they arrived late in their old colours; with motion off the ground
 *      still faded, so the change was not instant.
 *   2. The tab bar, pictured apart from the page, faded on the browser's own
 *      250ms and curve while the page took 420ms on the house curve.
 *   3. The status bar's strip changed the moment the palette did, before the
 *      cross-fade had begun.
 *   4. In the Bible's own sheet the shelf of modes glided back to the old
 *      page under the finger as a new one was chosen (154px to 0).
 *
 * vitest here has no browser, so the timing and the bar's steps are tested as
 * the pure rules they are (lib/reader/themeSwitch.ts), and the wiring is read
 * as source, as themeDissolve.test.ts does.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const controller = code("components/theme/AppThemeController.tsx");
const bar = code("components/native/statusBar.ts");
const shelf = code("components/reader/ReadingModeChips.tsx");

describe("a palette lands whole", () => {
  it("says so on the root while it changes, pictured or at once, and only the latest change may end it", () => {
    expect(SWITCH_ATTR).toBe("data-theme-switch");
    expect(controller).toContain('import { HALF_IN_MS, SWITCH_ATTR } from "@/lib/reader/themeSwitch";');
    // Each change takes its turn and says how it lands; only the latest may end it.
    expect(controller).toMatch(
      /const begin = \(how: "pictured" \| "instant"\) => \{\s*const mine = \+\+switchTurn\.current;\s*el\.setAttribute\(SWITCH_ATTR, how\);\s*return \{ mine, landed: \(\) => \(switchTurn\.current === mine \? el\.removeAttribute\(SWITCH_ATTR\) : undefined\) \};\s*\};/,
    );
    // Pictured: said before the first picture is taken, ended when the cross-fade is over.
    expect(controller).toMatch(/const \{ mine, landed \} = begin\("pictured"\);\s*const fade = moving\.startViewTransition\(wear\);/);
    expect(controller).toContain("fade.finished.then(landed, landed);");
    // At once: said around the change, ended once it has been painted.
    expect(controller).toMatch(/const atOnce = \(\) => \{\s*const \{ landed \} = begin\("instant"\);\s*wear\(\);\s*afterPaint\(landed\);\s*\};/);
    // An apply that changes nothing takes no turn, so it cannot leave a change unended.
    expect(controller).toMatch(/\} else if \(differs\) atOnce\(\);\s*else wear\(\);/);
    expect(controller.match(/\+\+switchTurn\.current/g)).toHaveLength(1);
    // A palette differs from what the page wears now, whoever put it there.
    expect(controller).toContain('const differs = el.getAttribute("data-reading-mode") !== mode || el.getAttribute("data-look") !== look;');
  });

  it("stops every part of the page from fading on its own while the palette changes", () => {
    expect(CSS).toMatch(
      /:root\[data-theme-switch\],\s*:root\[data-theme-switch\] \*,\s*:root\[data-theme-switch\] \*::before,\s*:root\[data-theme-switch\] \*::after \{\s*transition: none !important;\s*\}/,
    );
    // The page's ground had a fade of its own from before the cross-fade; it is gone, so with motion off the change is instant.
    expect(CSS).not.toMatch(/html\[data-reading-mode\] body \{[^}]*transition/);
  });

  it("changes every part pictured apart from the page with it, on the page's curve and in its time", () => {
    const root = /::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation-duration: (\d+)ms;\s*animation-timing-function: ([^;]+);\s*\}/.exec(CSS);
    expect(root).not.toBeNull();
    const parts = /:root\[data-theme-switch\]::view-transition-group\(\*\),\s*:root\[data-theme-switch\]::view-transition-old\(\*\),\s*:root\[data-theme-switch\]::view-transition-new\(\*\) \{\s*animation-duration: (\d+)ms;\s*animation-timing-function: ([^;]+);\s*\}/.exec(CSS);
    expect(parts).not.toBeNull();
    expect(parts?.[1]).toBe(root?.[1]);
    expect(parts?.[2]).toBe(root?.[2]);
    // And the length the rules know is the one the page's own fade has.
    expect(Number(root?.[1])).toBe(SWITCH_MS);
  });
});

describe("the status bar changes with the page", () => {
  it("knows the house curve as the stylesheet draws it", () => {
    const house = /--ease-house:\s*cubic-bezier\(([^)]+)\);/.exec(CSS)?.[1].split(",").map(Number);
    expect(house).toEqual([...HOUSE_CURVE]);
  });

  it("is painted when the new picture is half in: 55ms into the cross-fade, where the curve is at a half", () => {
    expect(HALF_IN_MS).toBe(55);
    // The curve at that moment, by its own arithmetic: x is time, y how far in.
    const [x1, y1, x2, y2] = HOUSE_CURVE;
    const bez = (s: number, a: number, b: number) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
    let s = 0;
    while (bez(s, x1, x2) < HALF_IN_MS / SWITCH_MS) s += 0.0001;
    expect(bez(s, y1, y2)).toBeGreaterThan(0.48);
    expect(bez(s, y1, y2)).toBeLessThan(0.52);
    expect(timeAt(1, HOUSE_CURVE)).toBeCloseTo(1, 4);
    expect(timeAt(0, HOUSE_CURVE)).toBeCloseTo(0, 4);
  });

  it("waits while the page cross-fades into a palette, and paints when it is half in", () => {
    // The switch begins: nothing has changed yet.
    let step = barStep(false, { palette: false, switching: "pictured" });
    expect(step).toEqual({ paint: false, pending: false });
    // The palette lands under the cross-fade: kept.
    step = barStep(step.pending, { palette: true, switching: "pictured" });
    expect(step).toEqual({ paint: false, pending: true });
    // Half in: painted now.
    step = barStep(step.pending, { palette: false, switching: "landing" });
    expect(step).toEqual({ paint: true, pending: false });
    // The switch over: nothing more to paint.
    step = barStep(step.pending, { palette: false, switching: null });
    expect(step).toEqual({ paint: false, pending: false });
  });

  it("paints at once where nothing is pictured, and at the end where a cross-fade was refused", () => {
    expect(barStep(false, { palette: true, switching: null })).toEqual({ paint: true, pending: false });
    expect(barStep(false, { palette: true, switching: "instant" })).toEqual({ paint: true, pending: false });
    // A cross-fade the browser skipped never says it is half in: its end paints.
    const kept = barStep(false, { palette: true, switching: "pictured" });
    expect(barStep(kept.pending, { palette: false, switching: null })).toEqual({ paint: true, pending: false });
  });

  it("is wired that way: the follower reads the switch, and the controller says when it is half in", () => {
    expect(bar).toContain('import { SWITCH_ATTR, barStep } from "@/lib/reader/themeSwitch";');
    expect(bar).toContain('worn.observe(root, { attributes: true, attributeFilter: ["data-reading-mode", "data-look", SWITCH_ATTR] });');
    expect(bar).toMatch(/const step = barStep\(pending, \{ palette: changes\.some\(\(c\) => c\.attributeName !== SWITCH_ATTR\), switching: root\.getAttribute\(SWITCH_ATTR\) \}\);\s*pending = step\.pending;\s*if \(step\.paint\) void paint\(\);/);
    expect(controller).toMatch(/fade\.ready\s*\.then\(\(\) => \{\s*window\.setTimeout\(\(\) => \{\s*if \(switchTurn\.current === mine\) el\.setAttribute\(SWITCH_ATTR, "landing"\);\s*\}, HALF_IN_MS\);\s*\}\)/);
  });
});

describe("the chooser does not move under the finger", () => {
  it("keeps the page that is on in sight by what the page wears, never by the choice as stored", () => {
    // A tap stores the choice a moment before the page wears it; following the stored
    // choice, the shelf looked for the old page and glided back to it.
    expect(shelf).toContain("}, [worn, touch]);");
    expect(shelf).not.toContain("}, [worn, theme, touch]);");
  });
});

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The verse picture's sheet within a finger's reach at every text size (build
 * 97, the sheets' rest). Two faults measured in one panel, mended together:
 *
 *  - The Words tab's Text size slider (`.picture-range`) was 36px tall:
 *    checkMock found it 311.2 by 36 at 390 and 359.2 by 36 at 800 (Updates 51,
 *    18 specs, English and Arabic). Its box is 44px now, the track and the
 *    knob drawn as before, and its margins give the 8px back, so nothing
 *    round it moves: what hit-44 does for the app's other small controls,
 *    which an input cannot take (it draws no ::after).
 *  - At the phone's largest text (1.3x) Save and Share stood 46px below the
 *    fold on every tab (Updates 47). They stand in the sheet's foot now, under
 *    the part that scrolls: at the sheet's 85% cap the body above them
 *    scrolls, and the picture keeps its size.
 *
 * scripts/picture-tabs-walk.mjs measures both on a phone's screen, in every
 * language, at the phone's own text size and at its largest.
 *
 * What would go wrong if this broke: a reader at the largest text sees no
 * Save or Share without scrolling, and may not know the picture can be sent;
 * or a finger lands just over or under the thin slider and misses it.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css");
const src = read("components/share/PictureSheet.tsx");

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}
const px = (block: string, prop: string) => {
  const m = block.match(new RegExp(`\\n\\s*${prop}:\\s*(-?[\\d.]+)px;`));
  return m ? Number(m[1]) : null;
};

describe("the verse picture's Text size slider", () => {
  const box = rule(".picture-range");

  it("is 44px tall to a finger", () => {
    expect(px(box, "height")).toBeGreaterThanOrEqual(44);
  });

  it("takes no more room than the 36px it was drawn in, so the sheet does not grow", () => {
    const height = px(box, "height") ?? 0;
    const margin = px(box, "margin-block") ?? 0;
    expect(height + 2 * margin).toBe(36);
  });

  it("draws its track and knob as before: a 3px line and an 18px knob on its middle", () => {
    expect(px(rule(".picture-range::-webkit-slider-runnable-track"), "height")).toBe(3);
    const knob = rule(".picture-range::-webkit-slider-thumb");
    expect(px(knob, "height")).toBe(18);
    expect(px(knob, "margin-top")).toBe(-7.5);
  });
});

describe("the verse picture's Save and Share", () => {
  const open = src.slice(src.indexOf("<Sheet open={open}"), src.indexOf("{/* The picture, as it will be sent. */}"));
  const actions = src.slice(src.indexOf("const actions = ("), src.indexOf("return (", src.indexOf("const actions = (")));
  const body = src.slice(src.indexOf("{/* The picture, as it will be sent. */}"), src.indexOf("</Sheet>"));

  it("stand in the sheet's foot, which stays put while the body above it scrolls", () => {
    expect(open).toMatch(/\bfoot=\{actions\}/);
    expect(actions).toContain('void send("save")');
    expect(actions).toContain('void send("share")');
    // What a save says stands with them, in view as they are.
    expect(actions).toMatch(/role="status" aria-live="polite"/);
    expect(body).not.toContain("void send(");
    expect(body).not.toContain('role="status" aria-live="polite"');
  });

  it("keep the room the sheet drew round them: 14px over them, 20px under the line that reports a save", () => {
    // 4px of the 14 are the body's: the Words tab's switches are hit-44 on 36px, and their reach under
    // the panel would otherwise make the body scroll by 3px at the phone's own text size.
    expect(open).toMatch(/bodyClassName="!pb-1"/);
    expect(actions).toMatch(/^const actions = \(\s*<div className="px-4 pb-5 pt-2\.5">/);
  });

  it("leave the picture its size", () => {
    expect(body).toContain("h-[min(348px,36dvh)]");
  });
});

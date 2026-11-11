import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A list windows its rows only where the browser anchors the screen (the
 * arbiter, 2026-11-11 14:00 UTC: "a jump under the finger fails the gate,
 * and Back now returns readers deep into that list, where the cards above
 * have never been drawn. Window the cards only where the browser anchors the
 * screen: wrap .cv-card's content-visibility in @supports (overflow-anchor:
 * auto), so a browser without anchoring (Safari, as far as we know) draws
 * every card and nothing above can change size ... and the same @supports
 * for any other list that windows the same way").
 *
 * Three lists draw only the rows near the screen (`content-visibility:
 * auto`) and give every other row a height to stand in for it: the saints'
 * cards, History's rows, Community's posts. A row is seldom the height it is
 * given. A reader whom Back has returned deep into the list has every row
 * above still undrawn, and each one that draws in as they scroll up changes
 * by its own difference. A browser that anchors its scroll moves the page by
 * as much, and the screen stays still. One that does not lets the screen
 * jump: measured on the saints' list at 320 wide with anchoring turned off,
 * 55 of 150 steps up moved the screen more than 2px, up to 83px in a step;
 * with every card drawn, none of 500 did.
 *
 * So each list asks the browser whether it anchors, and windows only if it
 * does. This reads every page, component and stylesheet for a row that is
 * windowed without the question.
 *
 * What it cannot see: a browser. The measure is on the export
 * (docs/1.9-build/notes/themes-fable.md, section 65), and an iPhone is the
 * owner's walk.
 *
 * What would go wrong if this broke: on an iPhone, the saints' list jumps
 * under the thumb as the reader scrolls back up it.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

function files(dir: string, endings: string[]): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) return ["__tests__", "node_modules"].includes(d.name) ? [] : files(rel, endings);
    return endings.some((e) => d.name.endsWith(e)) ? [rel] : [];
  });
}

/** The code without its comments, each line kept where it was. */
const blank = (m: string) => m.replace(/[^\n]/g, " ");
const cssCode = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, blank);
const tsxCode = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, lead: string) => lead + " ".repeat(m.length - lead.length));

const ASKS = "@supports (overflow-anchor: auto) {";

/** The stretches of a stylesheet that stand inside the question, each from its brace to the brace that closes it. */
function asked(css: string): [number, number][] {
  const out: [number, number][] = [];
  for (let at = css.indexOf(ASKS); at >= 0; at = css.indexOf(ASKS, at + 1)) {
    let depth = 0;
    for (let i = at + ASKS.length - 1; i < css.length; i++) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}" && --depth === 0) {
        out.push([at, i]);
        break;
      }
    }
  }
  return out;
}

type Found = { file: string; line: number; what: string; asks: boolean };

function windowed(): Found[] {
  const out: Found[] = [];
  for (const file of [...files("app", [".css"]), ...files("components", [".css"])]) {
    const css = cssCode(read(file));
    const inside = asked(css);
    for (const m of css.matchAll(/content-visibility:\s*auto\b/g)) {
      const open = css.lastIndexOf("{", m.index);
      const from = Math.max(css.lastIndexOf("}", open), css.lastIndexOf("{", open - 1)) + 1;
      out.push({ file, line: css.slice(0, m.index).split("\n").length, what: css.slice(from, open).replace(/\s+/g, " ").trim(), asks: inside.some(([a, b]) => m.index > a && m.index < b) });
    }
  }
  for (const file of [...files("app", [".tsx", ".ts"]), ...files("components", [".tsx", ".ts"])]) {
    const src = tsxCode(read(file));
    // As a class, with or without the question before it.
    for (const m of src.matchAll(/(\S*)\[content-visibility:auto\]/g)) {
      out.push({ file, line: src.slice(0, m.index).split("\n").length, what: m[0], asks: m[1] === "supports-[overflow-anchor:auto]:" });
    }
    // As a style written on the element: there is no asking in a style.
    for (const m of src.matchAll(/contentVisibility\s*:\s*["'`]auto["'`]/g)) {
      out.push({ file, line: src.slice(0, m.index).split("\n").length, what: m[0], asks: false });
    }
  }
  return out;
}

describe("a list that draws only the rows near the screen", () => {
  const found = windowed();

  it("is one of three, each named: a fourth is thought about before it is added here", () => {
    expect(found.map((f) => `${f.file} ${f.what}`).sort()).toEqual([
      "app/globals.css .cv-card",
      "app/globals.css .history-cv",
      "components/community/CommunityClient.tsx supports-[overflow-anchor:auto]:[content-visibility:auto]",
    ]);
  });

  it("windows only where the browser anchors the screen", () => {
    expect(found.filter((f) => !f.asks).map((f) => `${f.file}:${f.line} ${f.what}`)).toEqual([]);
  });

  it("tells a row inside the question from one outside it: the reading is not broken", () => {
    const css = cssCode(
      [
        ".a {\n content-visibility: auto;\n}",
        "@supports (overflow-anchor: auto) {\n .b {\n  content-visibility: auto;\n }\n}",
        "/* content-visibility: auto in a note is no rule */",
        "@supports (display: grid) {\n .c {\n  content-visibility: auto;\n }\n}",
      ].join("\n"),
    );
    const inside = asked(css);
    const each = [...css.matchAll(/content-visibility:\s*auto\b/g)].map((m) => inside.some(([a, b]) => m.index > a && m.index < b));
    expect(each).toEqual([false, true, false]);
    // And it read the house's stylesheet and its pages: there are hundreds of them.
    expect(files("components", [".tsx"]).length).toBeGreaterThan(500);
    expect(asked(cssCode(read("app/globals.css")))).toHaveLength(2);
  });

  it("keeps the room it gives a row outside the question, where it does nothing alone", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\n\.cv-card \{\n contain-intrinsic-size: auto \d+px;\n\}\n@supports \(overflow-anchor: auto\) \{\n \.cv-card \{\n  content-visibility: auto;\n \}\n\}\n/);
    // Whatever the room is: its number is History's to set (lib/history/__tests__/calmHistory.test.ts).
    expect(css).toMatch(/\n\.history-cv \{\n contain-intrinsic-size: auto \d+px;\n/);
    expect(read("components/community/CommunityClient.tsx")).toContain("[contain-intrinsic-size:auto_320px] supports-[overflow-anchor:auto]:[content-visibility:auto]");
  });

  it("leaves what draws a row for a moment working either way", () => {
    // History draws every row while it puts a reader back, whichever browser it is.
    expect(read("app/globals.css")).toMatch(/\nhtml\[data-history-whole\] \.history-cv \{\n content-visibility: visible;\n\}/);
    // A card that takes a picture back is drawn for the change only if the list had left it undrawn.
    expect(read("lib/ui/routeMotion.ts")).toContain('if (getComputedStyle(node).contentVisibility !== "auto") continue;');
  });
});

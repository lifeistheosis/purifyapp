// checkMock's palette rule compares each painted element on Dark with the same
// element on Light: a colour typed in shows by staying the same. It paired them
// by their place in a list of every element in the part, and the pixels pass,
// between the two palettes, loads every picture and brings each word to the
// middle of the screen; a long page that drew more as it did moved every place
// after the change. Behind the reading filter in Arabic, the reading list's
// screen-reader lines were compared with a cover's own white words on Light and
// failed as "white kept on Light" (Updates 33's find, 2026-11-14). Each element
// now carries its own mark from the first palette it is measured on, and Light's
// paint is found by it. The self-test proves both ways (PAIR: a line drawn at the
// part's head as Light is worn, in Dark's own ink typed in).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const tool = fs.readFileSync(path.join(process.cwd(), "scripts/mock-check.mjs"), "utf8");

describe("checkMock pairs Dark's paints with Light's by element, not by place", () => {
  it("marks each element once, on the first palette it is measured on, and reads the mark on the others", () => {
    expect(tool).toContain('let k = e.getAttribute("data-mock-pair");');
    expect(tool).toContain('k = String((window.__mockPairNext = (window.__mockPairNext ?? 0) + 1));');
    expect(tool).toContain("const p = { name: nameOf(e), pair: pairOf(e), allowPalette: allowance(e, \"palette\"), allowGold: allowance(e, \"gold\") };");
  });

  it("finds Light's paint by the mark, and compares nothing by its index", () => {
    expect(tool).toContain("const onLight = new Map((light?.paints ?? []).filter(Boolean).map((q) => [q.pair, q]));");
    expect(tool).toContain("const q = p ? onLight.get(p.pair) : null;");
    expect(tool).not.toContain("light?.paints[i]");
  });

  it("clears the marks before a measure and after it, so one measure's marks never pair another's", () => {
    const starts = tool.indexOf('for (const e of document.querySelectorAll("[data-mock-pair]")) e.removeAttribute("data-mock-pair");');
    expect(starts).toBeGreaterThan(0);
    expect(tool.slice(starts, starts + 200)).toContain("window.__mockPairNext = 0;");
    expect(tool).toContain('for (const el of document.querySelectorAll("[data-mock-pair]")) el.removeAttribute("data-mock-pair");');
  });

  it("is proved by the self-test: a line drawn mid-measure fails no good words and hides no colour typed in", () => {
    expect(tool).toContain('const PAIR = `<div data-mock-fixture="pair"');
    expect(tool).toMatch(/const pairRight =\s*!typedIn\("Words that follow the palette"\) &&\s*typedIn\("Words typed in white"\) &&\s*!typedIn\("A line drawn while it is measured"\)/);
    // The verdict holds it (the self-test's later proofs follow it in the same line, Updates 39's dirRight first).
    expect(tool).toMatch(/hyphenRead && shapesOnce && pairRight(?: && \w+)*;/);
  });
});

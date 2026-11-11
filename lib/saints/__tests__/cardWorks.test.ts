import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SAINTS } from "@/lib/saints/saints";

/**
 * A saint's card says how many works he left only when he left one (the
 * arbiter, 2026-11-11 13:39 UTC: "Show the count only when there is at
 * least one work; the feast and Read stay where they are, the row's spacing
 * whole either way").
 *
 * The foot of every card in the saints' list is one row: the feast, the
 * count of works, and Read. The count was always printed, so a saint who
 * left no writing, a martyr most often, was given "0 works" between his
 * feast and Read: 124 of the 270 cards that day, seen by the arbiter on the
 * Fathers of Sinai and Raithu. Nothing is said there now. The row spreads its parts
 * between its two ends, so the feast keeps the start and Read the end with
 * two parts as with three, and the row is one line of small type either
 * way, so no card changes height.
 *
 * The list is walked on the export at 390 wide for the same thing (the
 * record, docs/1.9-build/notes/themes-fable.md, section 64); this holds the
 * card to it.
 *
 * What would go wrong if this broke: a martyr's card that reads "0 works",
 * as though the list were counting something he lacks.
 */

const ROOT = process.cwd();
const src = fs
  .readFileSync(path.join(ROOT, "components/saints/SaintCard.tsx"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** The card's foot: from the row's own opening tag to the row's end. */
const foot = (() => {
  const at = src.indexOf('<T k="saints.feastLabel" />');
  const open = src.lastIndexOf("<div ", at);
  return src.slice(open, src.indexOf("</div>", at) + "</div>".length);
})();

describe("the foot of a saint's card", () => {
  it("says how many works only when there is at least one", () => {
    // The count stands inside a guard on the saint's works, and is printed nowhere outside it.
    expect(foot).toMatch(/\{saint\.works\.length > 0 && \(\s*<span className="font-sans text-paper\/55 tabular-nums">\s*<T k="saints\.workCount" count=\{saint\.works\.length\} \/>\s*<\/span>\s*\)\}/);
    expect(src.match(/saints\.workCount/g)).toHaveLength(1);
  });

  it("keeps the feast at the row's start and Read at its end, whether the count is there or not", () => {
    // The row spreads its parts between its ends: with two, the first and last stand where they stood with three.
    expect(foot.startsWith('<div className="mt-5 pt-4 border-t border-paper/8 flex items-center justify-between gap-3 text-caption">')).toBe(true);
    const feast = foot.indexOf('<T k="saints.feastLabel" />');
    const count = foot.indexOf("saints.workCount");
    const read = foot.indexOf('<T k="saints.read" />');
    expect(feast).toBeGreaterThan(0);
    expect(feast).toBeLessThan(count);
    expect(count).toBeLessThan(read);
    // Neither is inside the guard: each is a part of the row itself, always there.
    const guard = foot.slice(foot.indexOf("{saint.works.length > 0 && ("), foot.indexOf(")}", foot.indexOf("{saint.works.length > 0 && (")));
    expect(guard).not.toContain("saints.feastLabel");
    expect(guard).not.toContain("saints.read");
    expect(foot.match(/<span /g)).toHaveLength(3);
  });

  it("keeps the row one line of small type, so a card with no count is no shorter", () => {
    // The row's type is set once, on the row; no part of it sets a size or a height of its own.
    for (const span of foot.match(/<span [^>]*>/g) ?? []) expect(span).not.toMatch(/\btext-(?:detail|ui|lede|body|\[)|\bh-\d|\bmin-h-|\bleading-/);
    expect(foot).toContain("text-caption");
  });

  it("matters: the saints with no work are many, and so are those with one", () => {
    // 124 of the 270 when this was written. The Fathers of Sinai and Raithu, on whose card the arbiter saw
    // it, were given their Life from Butler the same afternoon with eight more, so the number falls as the
    // library grows; it is a long way from none.
    const none = SAINTS.filter((s) => s.works.length === 0);
    expect(none.length).toBeGreaterThan(50);
    // And the count is still said for the saints who have works.
    expect(SAINTS.length - none.length).toBeGreaterThan(100);
  });

  it("has no words for a count of none to fall back on: the catalog speaks of one or of many", () => {
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages/en.json"), "utf8")) as Record<string, string>;
    expect(en["saints.workCount.one"]).toBe("{count} work");
    expect(en["saints.workCount.other"]).toBe("{count} works");
    expect(en["saints.workCount.zero"]).toBeUndefined();
  });
});

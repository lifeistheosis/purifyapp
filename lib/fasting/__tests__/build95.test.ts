import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Fast, redrawn (build 95 note 3, the owner on 2026-11-13: "the fast is
 * clearly outdated"). His screenshot showed two bordered tiles of uneven
 * height with a 0 in each, three outlined pills on today's card, and the
 * same three pills on every recent day. What stands there now is the house's
 * own: a chapter's opening, today on the night, one switch, two quiet lines,
 * and rows in one tray. This holds the shape; the walk on the export holds
 * the rest (scripts/guardrail-walk.mjs --only /fasting).
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const code = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const page = code(read("components/fasting/FastingTrackerClient.tsx"));

describe("the Fast opens as a chapter opens", () => {
  it("the mark, the small line, the title and the short rule, with the house's own motion", () => {
    expect(page).toMatch(/<header className="text-center">/);
    expect(page).toMatch(/<PurifyMark aria-hidden size=\{22\} className="page-open-sub /);
    expect(page).toMatch(/<h1 className="page-open-title [^"]*font-heading/);
    expect(page).toMatch(/className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper\/25"/);
  });
});

describe("today leads, on the night", () => {
  it("is the one dark island of the page, named with the calendar's own mark", () => {
    expect(page.match(/\bdark-island\b/g)).toHaveLength(1);
    expect(page).toMatch(/data-fast-today=""\s+className="dark-island [^"]*rounded-\[22px\] border border-paper\/12 bg-night-deep/);
    expect(page).toContain("<FastGlyph kind={todayFast.kind} size={22} />");
    // The day's own words, as the calendar has them, and what the day keeps from.
    expect(page).toContain("t(`calendar.fast.${todayFast.ruleId}.rule`)");
    expect(page).toContain("fastNotAllowedKey(todayFast.kind)");
  });

  it("keeps the pastoral line, whole, under the mark, and gives no counsel of its own", () => {
    expect(page).toMatch(/data-fast-pastoral=""[^>]*>\s*\{t\("fasting\.pastoralNote"\)\}/);
    // Every word on the page is a key the app already had: nothing is written here.
    const drawn = page.slice(page.lastIndexOf("  return (\n    <section"));
    const said = [...drawn.matchAll(/>\s*([A-Za-z][^<>{}=]*[a-z.])\s*<\//g)].map((m) => m[1]);
    expect(said).toEqual([]);
  });
});

describe("one switch, not rows of pills", () => {
  it("draws no pill for a mark: the house's carved track, once for today and once under each day", () => {
    expect(page).not.toMatch(/rounded-pill/);
    expect(page.match(/<MarkSwitch\b/g)).toHaveLength(2);
  });

  it("a recent day is one row: its day, its fast, its mark, and a tap opens its switch", () => {
    expect(page).toMatch(/<ul data-fast-days="" className="theology-tray /);
    expect(page).toMatch(/aria-expanded=\{open\}\s+aria-controls=\{`\$\{ids\}-\$\{r\.key\}`\}/);
    // Shut, the switch is out of reach of a finger, a keyboard and a screen reader.
    expect(page).toMatch(/inert=\{!open\}/);
    // It opens on the house curve, and stands still with motion off.
    expect(page).toContain("ease-[var(--ease-house)] motion-safe:transition-[grid-template-rows]");
  });
});

describe("the count is two quiet lines, not two tiles", () => {
  it("has no bordered tile and no pair of boxes side by side", () => {
    expect(page).not.toMatch(/flex items-stretch gap-3/);
    expect(page).not.toMatch(/rounded-2xl border/);
    expect(page).toMatch(/<div data-fast-count="" className=\{cn\("reveal-rise mt-5 divide-y px-1"/);
  });

  it("a new reader meets one sentence: the second line waits, unseen, for a day kept", () => {
    expect(page).toMatch(/aria-hidden=\{keptInAll === 0\}/);
  });
});

describe("the way to the calendar", () => {
  it("is a line of its own, 44px to the touch, not a word inside the sentence", () => {
    expect(page).toMatch(/<Link href="\/calendar" data-fast-calendar="" className="[^"]*\bmin-h-11\b[^"]*\bunderline\b/);
  });
});

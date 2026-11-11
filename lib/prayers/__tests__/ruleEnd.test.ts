// Build 93 note 14, his words: "Again, refine the prayer system and the
// actual UX experience. Like, instead of just a generic amen button, make it
// so that when you scroll past the bottom, it creates like an animation
// saying, you know, like a, just make an animation for when they complete the
// prayers." The arbiter's yes of 2026-11-11 04:05 UTC to the plan and its
// still (docs/1.9-build/notes/build-93/14b-rule-complete-plan.png): the
// lampada's soft pool, "Glory to God. The rule is complete for today."
// settling in, Reset, no Amen button, motion off set at once.
// scripts/export-walk.mjs, section 72, walks it on the export.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const READER = code("components/prayers/PrayerRuleReader.tsx");
const END = code("components/prayers/service/RuleEnd.tsx");
const CSS = read("app/globals.css");
const BLOCK = CSS.slice(CSS.indexOf("/* The end of a rule (1.9, build 93 note 14"), CSS.indexOf(':where([data-motion="reduce"]) [data-rule-end]'));

describe("the end of a rule", () => {
  it("is reached, not pressed: no Amen button, the last prayer counted as it is carried past", () => {
    expect(READER).not.toContain("data-amen");
    expect(READER).not.toContain("community.respond.amen");
    expect(READER).toContain("<RuleEnd");
    // Room after the last prayer, so a hand can carry it past the reading
    // place on any rule, however short.
    expect(READER).toContain('<div data-rule-room="" className="min-h-[62svh]">');
  });

  it("answers once, as the rule becomes complete during the visit, and never on opening a rule already complete", () => {
    // Set where the completion happens, and only then.
    expect(READER).toContain("const completes = !allDone;");
    expect(READER).toMatch(/if \(completes\) \{\s*if \(felt\) softTick\(\);\s*setMoment\(true\);/);
    expect(READER.match(/setMoment\(true\)/g)).toHaveLength(1);
    expect(READER).toContain("const [moment, setMoment] = useState(false);");
    // Reset takes the day back and the moment with it.
    expect(READER).toMatch(/onReset=\{\(\) => \{\s*window\.clearTimeout\(letGo\.current\);\s*setMoment\(false\);\s*persist\(new Set\(\)\);/);
    expect(END).toContain('data-moment={moment ? "" : undefined}');
  });

  it("lets the moment go once it has played, so nothing plays it again", () => {
    // The checker's palette switch found it: a pool shown again (a palette
    // changed at the end) grew in a second time while the moment was held.
    const held = Number(/const MOMENT_MS = (\d+);/.exec(READER)?.[1]);
    const motions = [...BLOCK.matchAll(/animation: [\w-]+ (\d+)ms var\(--ease-house\)(?: (\d+)ms)? both;/g)].map((m) => Number(m[1]) + Number(m[2] ?? 0));
    expect(motions).toHaveLength(4);
    expect(held).toBeGreaterThan(Math.max(...motions));
    expect(READER).toContain("letGo.current = window.setTimeout(() => setMoment(false), MOMENT_MS);");
  });

  it("with Clicks as you scroll off, the completion is still, and so is the day it keeps", () => {
    // The day's tick comes from inside the mark (lib/streak/useStreak.ts), so
    // the moment is quieted before the mark, not after it.
    expect(READER).toMatch(
      /const felt = completes && clicksOn\(\);\s*if \(completes && !felt\) quietMoment\(\);\s*markRuleCompletedToday\(rule\.id\);\s*if \(completes\) \{\s*if \(felt\) softTick\(\);/,
    );
  });

  it("draws the lampada from the house's icons in a soft pool, the closing line, and Reset", () => {
    expect(END).toContain('import { Lampada } from "@/components/ui/icons/Lampada";');
    expect(END).toContain('<div aria-hidden className="rule-complete-lamp">');
    expect(END).toContain('<div className="rule-complete-pool" />');
    expect(END).toContain('t("prayers.reader.complete")');
    expect(END).toContain('t("prayers.rope.reset")');
    // Its height kept from the first paint, so nothing under it moves when its words come.
    expect(END).toContain("min-h-[15rem]");
  });

  it("moves once in the house's motion: a soft pool, never rays, no loop, still with motion off", () => {
    expect(BLOCK).toContain("background: radial-gradient(closest-side, color-mix(in srgb, var(--color-paper) 11%, transparent), transparent);");
    expect(BLOCK).not.toMatch(/conic-gradient|repeating-/);
    expect(BLOCK).not.toMatch(/infinite|alternate/);
    for (const name of ["rule-pool-in", "rule-lamp-lit", "rule-words-settle", "page-open-fade"]) {
      expect(BLOCK, name).toMatch(new RegExp(`animation: ${name} \\d+ms var\\(--ease-house\\)`));
    }
    // An escape weighs what the rules it quiets weigh (globals.css, the
    // motion doctrine): written lighter, the walk found the end still moving
    // with motion off.
    expect(CSS).toContain(':where([data-motion="reduce"]) [data-rule-end][data-moment] :is(.rule-complete-pool, .rule-complete-lamp > svg, [data-rule-complete-words], [data-rule-complete-after]) {\n animation: none;');
    // No pool on paper, nor on a look.
    expect(BLOCK).toMatch(/html\[data-reading-mode="parchment"\] \.rule-complete-pool,\s*html\[data-look\] \.rule-complete-pool \{\s*display: none;/);
    // No sparkle anywhere in it.
    expect(END).not.toMatch(/Sparkle|✦|✧|✨/);
  });
});

// A guard on the drift that useChurchDay was created to end.
//
// Purify supports two reckonings, and they differ in only one of the two
// cycles. The menaion (the fixed cycle: each date's saints and feasts, the
// fixed fasts) falls 13 days later for an Old Calendar reader, so a
// commemoration is looked up on the day `shiftForStyle` moves back. The
// Paschal cycle (Lent, Holy Week, Pascha, Pentecost, the readings counted from
// Pascha) and the weekday do NOT move: both reckonings keep Pascha on the same
// civil day, and a Wednesday is a Wednesday in both.
//
// So there are two mistakes to guard against, and both have happened:
//
// 1. A commemoration looked up on the civil day. /fasting did this until
//    2026-08-02, and the month grid after it, so an Old Calendar reader was
//    shown New Calendar saints on one screen and their own on the next.
//    Every file that calls commemorationsOn must shift (or go through
//    useChurchDay, which owns the shift).
//
// 2. A Paschal-cycle function handed the shifted day. Until 2026-10-29 every
//    surface handed fastingStatus the shifted day, and it read the weekday and
//    Lent from it: an Old Calendar reader's Wednesday and Friday fast showed
//    on Tuesday and Thursday, and Lent and Bright Week came 13 days late. A
//    reader reported it. fastingStatus and currentSeason now take the civil
//    day and the style and move only their fixed dates themselves, and none
//    of the functions below may be given a shifted day.
//
// This reads source because there is no type that can express "you passed
// the wrong one of two dates". If it fails, pass the civil day (and the
// style, where the function takes one).

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
// "lib" is scanned too. Without it useChurchDay.ts was never checked, and
// neither was lib/prayers/season.ts.
const SURFACES = ["app", "components", "lib"];

/** Calling the fixed-cycle lookup directly, rather than via useChurchDay. */
const RAW_COMMEMORATIONS = /\bcommemorationsOn\s*\(/;
// A CALL, not a mention. This was /\bshiftForStyle\b/, which an unused import
// satisfies: deleting the shift from a lookup while leaving the symbol in the
// import block kept this guard green. Found by planting exactly that
// regression in lib/prayers/season.ts and watching the suite stay green.
const HAS_SHIFT = /\bshiftForStyle\s*\(/;
const VIA_HOOK = /\buseChurchDay\b/;

/** Functions that read the Paschal cycle or the weekday: civil day only. */
const CIVIL_ONLY = [
  "fastingStatus",
  "currentSeason",
  "dayReadings",
  "readingsOn",
  "readingsSourceOn",
  "movableLabelOn",
  "paschaInfo",
];
/** `const lookup = shiftForStyle(...)`: a name that holds a shifted day. */
const SHIFTED_NAME = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*shiftForStyle\s*\(/g;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const entry of fs.readdirSync(path.join(ROOT, cur), {
      withFileTypes: true,
    })) {
      const rel = path.posix.join(cur, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules") continue;
        stack.push(rel);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(rel);
      }
    }
  }
  return out;
}

function sources(): { rel: string; src: string }[] {
  const all: { rel: string; src: string }[] = [];
  for (const dir of SURFACES) {
    for (const rel of walk(dir)) {
      const src = fs
        .readFileSync(path.join(ROOT, rel), "utf8")
        // Prose about the rule must not satisfy the rule.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      all.push({ rel, src });
    }
  }
  return all;
}

/** The calls in `src` that hand a CIVIL_ONLY function a shifted day. */
function shiftedCivilCalls(src: string): string[] {
  const names = [...src.matchAll(SHIFTED_NAME)].map((m) => m[1]);
  const found: string[] = [];
  for (const fn of CIVIL_ONLY) {
    const direct = new RegExp(`\\b${fn}\\s*\\(\\s*shiftForStyle\\s*\\(`);
    if (direct.test(src)) found.push(`${fn}(shiftForStyle(...))`);
    for (const name of names) {
      const viaName = new RegExp(`\\b${fn}\\s*\\(\\s*${name.replace(/\$/g, "\\$")}\\b`);
      if (viaName.test(src)) found.push(`${fn}(${name})`);
    }
  }
  return found;
}

describe("one reckoning per reader", () => {
  it("every surface that looks up a commemoration applies the shift", () => {
    const offenders: string[] = [];
    for (const { rel, src } of sources()) {
      if (!RAW_COMMEMORATIONS.test(src)) continue;
      if (VIA_HOOK.test(src) || HAS_SHIFT.test(src)) continue;
      offenders.push(rel);
    }
    expect(
      offenders,
      `These call commemorationsOn without shiftForStyle and without ` +
        `useChurchDay, so an Old (Julian) Calendar reader sees the New ` +
        `Calendar saints here and their own everywhere else:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("no surface hands a Paschal-cycle function the shifted day", () => {
    const offenders: string[] = [];
    for (const { rel, src } of sources()) {
      for (const call of shiftedCivilCalls(src)) offenders.push(`${rel}: ${call}`);
    }
    expect(
      offenders,
      `These hand a shifted day to a function that reads the weekday or the ` +
        `Paschal cycle, which moves both 13 days for an Old Calendar reader. ` +
        `Pass the civil day (and the style):\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("would catch the mistake it was written for", () => {
    // The guard itself, on the exact shapes the 2026-10-29 bug had.
    expect(shiftedCivilCalls("const lookup = shiftForStyle(today, style); fastingStatus(lookup);")).toEqual([
      "fastingStatus(lookup)",
    ]);
    expect(shiftedCivilCalls("fastingStatus(shiftForStyle(localDayToUtcNoon(d), style));")).toEqual([
      "fastingStatus(shiftForStyle(...))",
    ]);
    expect(shiftedCivilCalls("const todayLookup = shiftForStyle(day, style); dayReadings(todayLookup, o);")).toEqual([
      "dayReadings(todayLookup)",
    ]);
    // The right shape passes.
    expect(
      shiftedCivilCalls("const lookup = shiftForStyle(d, s); commemorationsOn(lookup); fastingStatus(d, s);"),
    ).toEqual([]);
  });
});

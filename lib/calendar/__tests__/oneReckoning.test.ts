// A guard on the drift that useChurchDay was created to end.
//
// Purify supports two reckonings. `shiftForStyle` moves the lookup date back
// 13 days for Julian readers, and it must be applied by EVERY surface that
// names a commemoration or a fasting rule. Miss it on one screen and an Old
// Calendar reader is shown two different fasts, one second apart, by the same
// app: this is not hypothetical, it is what /fasting did until 2026-08-02,
// while Today and /prayers/today (both on useChurchDay) showed the shifted
// rule correctly.
//
// The safe path is `useChurchDay()`, which owns the shift and its deliberate
// asymmetry (commemorations and the fast shift; readings and Pascha do not,
// because both styles derive Pascha from the same algorithm). A surface that
// calls `fastingStatus` or `commemorationsOn` directly has opted out of that
// and must do the shift itself.
//
// This reads source because there is no type that can express "you forgot a
// transform". If it fails: either route the surface through useChurchDay, or
// wrap its lookup date in shiftForStyle with the reader's style. Do not add
// it to EXEMPT unless the surface genuinely shows a fixed historical date
// rather than the reader's today.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
// "lib" is scanned too. Without it useChurchDay.ts was never checked, and
// neither was lib/prayers/season.ts, which feeds an unshifted fast into the
// prayer suggestions. lib/calendar/orthodox.ts passes because it references
// shiftForStyle, which is right: it is the module that defines the shift.
const SURFACES = ["app", "components", "lib"];

/**
 * Files that call the raw lookups but are NOT showing "today in the reader's
 * reckoning", so the shift would be wrong rather than missing.
 */
const EXEMPT = new Set<string>([
  // Deliberately empty.
  //
  // "app/(app)/calendar/page.tsx" was exempted here because the month grid
  // "does its own per-cell shifting". It did not: monthGrid passed the civil
  // date to both lookups for all 42 cells, so an Old Calendar reader was shown
  // New Calendar names and fasts in the grid while the panel above it was
  // shifted correctly. The exemption was not covering a special case, it was
  // describing behaviour that did not exist, which is the failure mode an
  // exemption list has. monthGrid now takes a style.
]);

/** Calling the fixed-date lookups directly, rather than via useChurchDay. */
const RAW_LOOKUP = /\b(fastingStatus|commemorationsOn)\s*\(/;
// A CALL, not a mention. This was /\bshiftForStyle\b/, which an unused import
// satisfies: deleting the shift from a lookup while leaving the symbol in the
// import block kept this guard green. Found by planting exactly that
// regression in lib/prayers/season.ts and watching the suite stay green.
const HAS_SHIFT = /\bshiftForStyle\s*\(/;
const VIA_HOOK = /\buseChurchDay\b/;

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

describe("one reckoning per reader", () => {
  it("every surface that looks up a fast or a commemoration applies the shift", () => {
    const offenders: string[] = [];
    for (const dir of SURFACES) {
      for (const rel of walk(dir)) {
        if (EXEMPT.has(rel)) continue;
        const src = fs
          .readFileSync(path.join(ROOT, rel), "utf8")
          // Prose about the rule must not satisfy the rule.
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        if (!RAW_LOOKUP.test(src)) continue;
        if (VIA_HOOK.test(src) || HAS_SHIFT.test(src)) continue;
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `These call fastingStatus/commemorationsOn without shiftForStyle and ` +
        `without useChurchDay, so an Old (Julian) Calendar reader sees the ` +
        `New Calendar answer here and the shifted one everywhere else:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });
});

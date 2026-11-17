import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Gate 6c, the motion walk at CPU 4x as a new reader, in both lanes (the app's
 * motion on, and reduced), 2026-11-17: the transitions that fell to Updates
 * 98t. The walk on the export measures them; this holds each mend in the code,
 * so the next edit to one of these files cannot put its finding back before a
 * walk is run. Each case fails on the code the gate walked.
 *
 * What a reader would notice if this broke: on a prayer (Morning, Compline,
 * Evening, After meals, the Theotokos akathist), Chant opened a sheet that
 * rose with no chants in it and grew 251px a moment later as they came, its
 * top drawn at 745 and then at 494 (at 520 and then at 269 with motion
 * reduced). The reading room's case is in lib/reading/__tests__/room.test.ts.
 */

const ROOT = process.cwd();
/** The code without its comments, so a note is not read as the code. */
const code = (rel: string) =>
  fs
    .readFileSync(path.join(ROOT, rel), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The body of a function, from its signature to the brace that closes it at the start of a line. */
function body(src: string, signature: RegExp): string {
  const at = src.search(signature);
  expect(at, String(signature)).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("\n}", at);
  return src.slice(at, end + 2);
}

describe("Pray with chant opens whole (Gate 6c, the prayers' Chant)", () => {
  const picker = body(code("components/player/PrayWithChant.tsx"), /export function ChantPicker\(/);

  it("reads the library's index as the prayer opens, not at the tap", () => {
    // The read that waited for the tap: `if (!open || index) return;`.
    expect(picker).not.toMatch(/if \(!open \|\| index\) return;/);
    expect(picker).toMatch(/useEffect\(\(\) => \{\s*if \(index\) return;\s*let alive = true;\s*void loadChantIndex\(\)/);
    // Opening reads it again after a miss.
    expect(picker).toMatch(/\}, \[open, index\]\);/);
  });

  it("rises only once its chants are in it, or the read came back with nothing", () => {
    expect(picker).toMatch(/<Sheet open=\{open && \(index !== null \|\| missed\)\}/);
    expect(picker).not.toMatch(/<Sheet open=\{open\}/);
    expect(picker).toMatch(/if \(rows\) setIndex\(rows\);\s*else setMissed\(true\);/);
    // A miss is forgotten when the sheet is put away, so the next open waits for its read.
    expect(picker).toMatch(/const close = \(\) => \{\s*stop\(\);\s*setMissed\(false\);\s*onClose\(\);/);
  });
});

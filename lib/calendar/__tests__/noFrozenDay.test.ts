// A guard against the bug that has now been introduced twice.
//
// Day-dependent UI computed in a SERVER component is frozen at build time
// under `output: "export"`, which is how the Android app shipped a stale
// date, saint, fast and readings for the life of each APK. Beta 2.7 fixed
// Today, Discover, Prayers and /prayers/today, and MISSED the Bible tab,
// which then contradicted the Today tab one tap away.
//
// The rule: a file that resolves "now" for the reader must be a client
// component, so it resolves on the device. This test enforces it by reading
// the source, because there is no type that can express it.
//
// If this fails, do not delete the assertion. Move the computation into a
// client child using `useToday()` (lib/calendar/useToday.ts), the way
// components/mobile/BibleAppointedToday.tsx and
// components/today/ChurchTodayRail.tsx do.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/**
 * Surfaces that render in the native shell and show something derived from
 * the current day. These are the ones an APK freezes.
 */
const NATIVE_DAY_SURFACES = [
  "components/today",
  "components/mobile",
  "components/prayers",
];

/** Resolving "now" rather than normalising a date handed in. */
const RESOLVES_NOW = /(startOfDayUtc|startOfDayLocal|localDayToUtcNoon)\(\s*new Date\(\)\s*\)/;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe("no day-dependent UI in a server component", () => {
  it("every native surface that resolves today is a client component", () => {
    const offenders: string[] = [];

    for (const dir of NATIVE_DAY_SURFACES) {
      for (const rel of walk(dir)) {
        const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
        if (!RESOLVES_NOW.test(src)) continue;
        // A comment explaining the old bug is not the bug.
        const codeOnly = src
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        if (!RESOLVES_NOW.test(codeOnly)) continue;
        const isClient = /^\s*["']use client["']/.test(src);
        if (!isClient) offenders.push(rel);
      }
    }

    expect(
      offenders,
      `These resolve the current day in a SERVER component, so the Android ` +
        `static export freezes them at build time. Move the computation into ` +
        `a client child using useToday(). Offenders:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("knows what it is guarding, so a rename cannot silently disable it", () => {
    // If useToday is renamed or removed, this test's advice is stale and the
    // failure message would send someone to a file that does not exist.
    expect(fs.existsSync(path.join(ROOT, "lib/calendar/useToday.ts"))).toBe(true);
    const rail = fs.readFileSync(
      path.join(ROOT, "components/today/ChurchTodayRail.tsx"),
      "utf8",
    );
    expect(rail).toContain("useToday");
  });
});

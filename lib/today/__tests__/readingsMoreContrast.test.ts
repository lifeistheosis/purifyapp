// "· 2 more" beside For today's saints, on Today's readings card, is read at the
// house's secondary strength. At half strength (text-paper/50) German's
// "2 weitere" stood at 4.44 to 4.47:1 on Light, Councils and Cappadocian, and
// Urdu's at 4.50 on Light, where 4.5 is needed (the guardrail walk, 2026-11-23).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rail = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components/today/ChurchTodayRail.tsx"), "utf8");

describe("Today's readings card, the count of the rest", () => {
  it("stands at the house's secondary strength, not half", () => {
    const line = rail.split("\n").find((l) => l.includes('tn("today.readings.more"'));
    expect(line).toBeDefined();
    const strength = Number(line!.match(/text-paper\/(\d+)/)?.[1]);
    expect(strength).toBeGreaterThanOrEqual(65);
  });
});

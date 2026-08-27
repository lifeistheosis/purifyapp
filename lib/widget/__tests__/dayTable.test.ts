import { describe, expect, it } from "vitest";

import { buildDayTable } from "../dayTable";
import {
  commemorationsOn,
  fastingStatus,
  JULIAN_OFFSET_DAYS,
} from "@/lib/calendar/orthodox";

/**
 * The table a home screen widget reads.
 *
 * This is the only part of the widget stack that can be tested here. The Swift
 * and Kotlin cannot run in vitest, and a widget is a surface nobody looks at
 * closely once it works, so a wrong saint could sit on somebody's home screen
 * for weeks. What CAN be pinned is that the table says the same thing the app
 * says, and that is what these do.
 *
 * `now` is pinned in every case. A date helper tested against the real clock
 * passes in August and fails in Lent.
 */

const START = new Date(Date.UTC(2026, 7, 27, 12)); // 2026-08-27
const key = (d: Date) => d.toISOString().slice(0, 10);

describe("buildDayTable", () => {
  it("returns exactly the days asked for, keyed by UTC date", () => {
    const t = buildDayTable(START, 400);
    const keys = Object.keys(t.days);
    expect(keys).toHaveLength(400);
    expect(keys[0]).toBe("2026-08-27");
    expect(keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true);
  });

  it("gives every day a headline and a fast, with no empty strings", () => {
    // An empty headline renders as a blank widget, which reads as broken
    // rather than as a quiet day.
    const t = buildDayTable(START, 400);
    const bad = Object.entries(t.days).filter(
      ([, d]) => !d.saint.trim() || !d.fastLabel.trim(),
    );
    expect(bad.map(([k]) => k)).toEqual([]);
  });

  it("AGREES WITH THE APP about which commemoration leads", () => {
    /**
     * useChurchDay picks `commemorations.find(c => c.kind === "feast") ??
     * commemorations[0]`. The widget must not disagree with the screen it sits
     * beside. Checked across a full year rather than on one example, because
     * the interesting case is a day whose feast is not listed first.
     */
    const t = buildDayTable(START, 366);
    const disagreements: string[] = [];
    for (const [k, day] of Object.entries(t.days)) {
      const c = commemorationsOn(new Date(`${k}T12:00:00Z`));
      const expected = c.find((x) => x.kind === "feast") ?? c[0];
      if (expected && day.saint !== expected.name) {
        disagreements.push(`${k}: table "${day.saint}" vs app "${expected.name}"`);
      }
    }
    expect(disagreements, disagreements.join("\n  ")).toEqual([]);
  });

  it("prefers a feast even when it is not the first entry", () => {
    // The rule that actually matters, asserted directly: on any day carrying a
    // feast, the feast leads.
    const t = buildDayTable(START, 366);
    let feastDays = 0;
    for (const [k, day] of Object.entries(t.days)) {
      const c = commemorationsOn(new Date(`${k}T12:00:00Z`));
      const feast = c.find((x) => x.kind === "feast");
      if (!feast) continue;
      feastDays++;
      expect(day.saint, `${k} should lead with its feast`).toBe(feast.name);
    }
    // If this ever hits zero the assertion above is vacuous.
    expect(feastDays).toBeGreaterThan(10);
  });

  it("carries the fast exactly as the app computes it", () => {
    const t = buildDayTable(START, 90);
    for (const [k, day] of Object.entries(t.days)) {
      const f = fastingStatus(new Date(`${k}T12:00:00Z`));
      expect(day.fastLabel, k).toBe(f.label);
      expect(day.fastKind, k).toBe(f.kind);
    }
  });

  it("ships the Julian offset rather than letting native code hardcode it", () => {
    // The Old Calendar reader's day is found by subtracting this before
    // indexing. Hardcoding 13 in Swift and again in Kotlin is how the two
    // drift from the TypeScript.
    expect(buildDayTable(START, 3).julianOffsetDays).toBe(JULIAN_OFFSET_DAYS);
  });

  it("is keyed so the Old Calendar reader lands on the right entry", () => {
    /**
     * shiftForStyle subtracts the offset from the LOOKUP date, so the table is
     * keyed by lookup date and the widget subtracts the same amount. This
     * pins that contract: an Old Calendar reader on civil day D must see what
     * the app shows, which is the commemoration of D minus the offset.
     */
    const t = buildDayTable(new Date(Date.UTC(2026, 0, 1, 12)), 400);
    const civil = new Date(Date.UTC(2026, 5, 15, 12));
    const lookup = new Date(civil.getTime() - JULIAN_OFFSET_DAYS * 86_400_000);
    const app = commemorationsOn(lookup);
    const expected = app.find((c) => c.kind === "feast") ?? app[0];
    expect(t.days[key(lookup)].saint).toBe(expected.name);
  });

  it("never returns zero days", () => {
    expect(Object.keys(buildDayTable(START, 0).days)).toHaveLength(1);
    expect(Object.keys(buildDayTable(START, -5).days)).toHaveLength(1);
  });

  it("crosses a year boundary without a gap", () => {
    const t = buildDayTable(new Date(Date.UTC(2026, 11, 30, 12)), 4);
    expect(Object.keys(t.days)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

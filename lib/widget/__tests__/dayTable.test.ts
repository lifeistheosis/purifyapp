import { describe, expect, it } from "vitest";

import { buildDayTable } from "../dayTable";
import {
  commemorationsOn,
  fastingStatus,
  shiftForStyle,
} from "@/lib/calendar/orthodox";

/**
 * The table a home screen widget reads.
 *
 * This is the only part of the widget stack testable here: the Swift and the
 * Kotlin cannot run in vitest. A widget is also a surface nobody looks at
 * closely once it works, so a wrong saint could sit on a home screen for
 * weeks. What CAN be pinned is that the table says exactly what the app says,
 * in both reckonings, and that is what these do.
 *
 * Dates are pinned. A calendar helper tested against the real clock passes in
 * August and fails in Lent.
 */

const START = new Date(Date.UTC(2026, 7, 27, 12)); // 2026-08-27
const at = (k: string) => new Date(`${k}T12:00:00Z`);

/** The app's own answer for a civil day, in one reckoning. */
function appAnswer(civilKey: string, style: "new" | "old") {
  const lookup = shiftForStyle(at(civilKey), style);
  const c = commemorationsOn(lookup);
  return {
    headline: c.find((x) => x.kind === "feast") ?? c[0],
    fast: fastingStatus(lookup),
  };
}

describe("buildDayTable", () => {
  it("returns exactly the days asked for, keyed by civil UTC date", () => {
    const t = buildDayTable(START, 400);
    const keys = Object.keys(t.days);
    expect(keys).toHaveLength(400);
    expect(keys[0]).toBe("2026-08-27");
    expect(keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true);
  });

  it("gives every day both reckonings, with nothing blank", () => {
    // An empty headline renders as a blank widget, which reads as broken
    // rather than as a quiet day.
    const t = buildDayTable(START, 400);
    const bad: string[] = [];
    for (const [k, e] of Object.entries(t.days)) {
      for (const style of ["new", "old"] as const) {
        const d = e[style];
        if (!d?.saint?.trim() || !d?.fastLabel?.trim()) bad.push(`${k}.${style}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("AGREES WITH THE APP in both reckonings, across a year", () => {
    /**
     * useChurchDay picks the feast if the day has one, else the first
     * commemoration, having first shifted the lookup date for the reader's
     * calendar style. The widget must not disagree with the screen beside it.
     */
    const t = buildDayTable(START, 366);
    const off: string[] = [];
    for (const [k, e] of Object.entries(t.days)) {
      for (const style of ["new", "old"] as const) {
        const { headline, fast } = appAnswer(k, style);
        if (headline && e[style].saint !== headline.name) {
          off.push(`${k} ${style}: table "${e[style].saint}" vs app "${headline.name}"`);
        }
        if (e[style].fastLabel !== fast.label) {
          off.push(`${k} ${style}: fast "${e[style].fastLabel}" vs app "${fast.label}"`);
        }
      }
    }
    expect(off, off.slice(0, 8).join("\n  ")).toEqual([]);
  });

  it("prefers a feast even when it is not the first entry", () => {
    const t = buildDayTable(START, 366);
    let feastDays = 0;
    for (const [k, e] of Object.entries(t.days)) {
      const lookup = shiftForStyle(at(k), "new");
      const feast = commemorationsOn(lookup).find((x) => x.kind === "feast");
      if (!feast) continue;
      feastDays++;
      expect(e.new.saint, `${k} should lead with its feast`).toBe(feast.name);
    }
    // If this hits zero the assertion above is vacuous.
    expect(feastDays).toBeGreaterThan(10);
  });

  it("THE TWO RECKONINGS ACTUALLY DIFFER, which is the whole point", () => {
    // If old and new were identical the shift would be doing nothing and every
    // other assertion here would still pass.
    const t = buildDayTable(START, 60);
    const differing = Object.values(t.days).filter((e) => e.new.saint !== e.old.saint);
    expect(differing.length).toBeGreaterThan(40);
  });

  it("puts NO date arithmetic on the native side", () => {
    // The Old Calendar answer is precomputed against the shifted lookup, so a
    // widget reads today's civil date and picks a side. An earlier version
    // shipped a julianOffsetDays field and expected Swift and Kotlin to
    // subtract it, which oneReckoning.test.ts rightly rejected.
    const t = buildDayTable(START, 3);
    expect(t).not.toHaveProperty("julianOffsetDays");
    expect(t.version).toBe(2);
    const k = Object.keys(t.days)[0];
    expect(t.days[k].old.saint).toBe(appAnswer(k, "old").headline?.name);
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

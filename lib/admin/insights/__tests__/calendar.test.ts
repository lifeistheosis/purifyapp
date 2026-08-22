import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cellMetrics,
  dailyTargetFor,
  dateOf,
  daysInMonth,
  lastMeasuredDay,
  monthCells,
  monthLabel,
  rangeOf,
  shiftKey,
  shortDayLabel,
  startOfMonth,
  startOfWeek,
  weekCells,
} from "../calendar";
import type { Forecast, Goal, Series } from "../types";

const TODAY = "2026-08-22";

function series(over: Partial<Series> = {}): Series {
  return {
    id: "s",
    label: "Series",
    kind: "flow",
    source: "test",
    points: [],
    ...over,
  };
}

/**
 * The whole grid is date arithmetic, and date arithmetic fails in exactly the
 * places nobody clicks: the ends of months, February, and whatever timezone the
 * machine running the tests happens to be in.
 *
 * The timezone is pinned rather than trusted, the way
 * lib/calendar/__tests__/startOfDayLocal.test.ts does, so these fail on a US
 * laptop and on a UTC runner alike rather than passing on one and shipping a
 * bug to the other.
 */
const ORIGINAL_TZ = process.env.TZ;

describe("date arithmetic holds in a western timezone", () => {
  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it("does not slide a day backwards", () => {
    // The noon anchor earns its keep here. At midnight, a date built in one
    // frame and read in another lands on the previous day for anyone west of
    // Greenwich, which silently relabels an entire series.
    expect(shiftKey("2026-08-18", 0)).toBe("2026-08-18");
    expect(shiftKey("2026-08-18", 1)).toBe("2026-08-19");
    expect(shiftKey("2026-08-18", -1)).toBe("2026-08-17");
  });

  it("keys a cell to the day it says it is", () => {
    const cells = monthCells(2026, 7, TODAY); // August
    const eighteenth = cells.find((c) => c.day === 18 && c.inMonth);
    expect(eighteenth?.key).toBe("2026-08-18");
  });

  it("steps across a DST boundary without repeating or skipping", () => {
    // US DST ends 2026-11-01. Walking through it must produce 31 distinct days.
    const keys = Array.from({ length: 31 }, (_, i) => shiftKey("2026-10-20", i));
    expect(new Set(keys).size).toBe(31);
    expect(keys[12]).toBe("2026-11-01");
    expect(keys[13]).toBe("2026-11-02");
  });
});

describe("shiftKey", () => {
  it("crosses a month boundary", () => {
    expect(shiftKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftKey("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("crosses a year boundary", () => {
    expect(shiftKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftKey("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("handles February in a leap year and a common year", () => {
    expect(shiftKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftKey("2028-02-29", 1)).toBe("2028-03-01");
    expect(shiftKey("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("daysInMonth", () => {
  it("knows the real length of every awkward month", () => {
    expect(daysInMonth("2026-02-10")).toBe(28);
    expect(daysInMonth("2028-02-10")).toBe(29);
    expect(daysInMonth("2026-04-10")).toBe(30);
    expect(daysInMonth("2026-08-10")).toBe(31);
    expect(daysInMonth("2026-12-31")).toBe(31);
  });
});

describe("startOfWeek", () => {
  it("returns the Sunday of that week", () => {
    // 2026-08-18 is a Tuesday; its Sunday is the 16th.
    expect(startOfWeek("2026-08-18")).toBe("2026-08-16");
    expect(dateOf("2026-08-16").getUTCDay()).toBe(0);
  });

  it("is idempotent on a Sunday", () => {
    expect(startOfWeek("2026-08-16")).toBe("2026-08-16");
  });

  it("reaches back into the previous month when it has to", () => {
    // 2026-09-01 is a Tuesday, so its week starts in August.
    expect(startOfWeek("2026-09-01")).toBe("2026-08-30");
  });
});

describe("monthCells", () => {
  it("always returns exactly 42 cells, so the grid never changes height", () => {
    for (const [y, m] of [[2026, 0], [2026, 1], [2026, 7], [2028, 1], [2027, 11]] as const) {
      expect(monthCells(y, m, TODAY)).toHaveLength(42);
    }
  });

  it("starts on a Sunday and runs six unbroken weeks", () => {
    const cells = monthCells(2026, 7, TODAY);
    expect(dateOf(cells[0].key).getUTCDay()).toBe(0);
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].key).toBe(shiftKey(cells[i - 1].key, 1));
    }
  });

  it("marks days outside the month, on both ends", () => {
    // August 2026 starts on a Saturday, so the grid opens with six July days.
    const cells = monthCells(2026, 7, TODAY);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
    expect(cells[0].inMonth).toBe(false);
    expect(cells[0].key).toBe("2026-07-26");
    expect(cells[41].inMonth).toBe(false);
  });

  it("marks exactly one cell as today, and only when today is on the grid", () => {
    const august = monthCells(2026, 7, TODAY);
    expect(august.filter((c) => c.isToday)).toHaveLength(1);
    expect(august.find((c) => c.isToday)?.key).toBe(TODAY);

    // A month far from today has no today cell at all.
    const january = monthCells(2027, 0, TODAY);
    expect(january.filter((c) => c.isToday)).toHaveLength(0);
  });

  it("covers a 29 day February without losing a day", () => {
    const cells = monthCells(2028, 1, TODAY);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(29);
    expect(cells.find((c) => c.inMonth && c.day === 29)?.key).toBe("2028-02-29");
  });
});

describe("weekCells", () => {
  it("returns seven consecutive days from Sunday", () => {
    const week = weekCells("2026-08-18", TODAY);
    expect(week).toHaveLength(7);
    expect(week[0].key).toBe("2026-08-16");
    expect(week[6].key).toBe("2026-08-22");
    expect(week[6].isToday).toBe(true);
  });
});

describe("rangeOf", () => {
  it("covers one day, one week, and the real length of a month", () => {
    expect(rangeOf({ kind: "daily", anchor: "2026-08-18" })).toEqual({
      from: "2026-08-18",
      to: "2026-08-18",
    });
    expect(rangeOf({ kind: "weekly", anchor: "2026-08-18" })).toEqual({
      from: "2026-08-16",
      to: "2026-08-22",
    });
    expect(rangeOf({ kind: "monthly", anchor: "2026-08-18" })).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("does not give February 31 days", () => {
    expect(rangeOf({ kind: "monthly", anchor: "2026-02-10" }).to).toBe("2026-02-28");
    expect(rangeOf({ kind: "monthly", anchor: "2028-02-10" }).to).toBe("2028-02-29");
  });
});

describe("dailyTargetFor", () => {
  const goal = (over: Partial<Goal> = {}): Goal => ({
    id: "g",
    seriesId: "s",
    label: "Goal",
    period: "monthly",
    target: 3100,
    paused: false,
    createdAt: "2026-08-01T00:00:00Z",
    ...over,
  });

  it("divides a flow's monthly target by the real length of that month", () => {
    const flow = series({ kind: "flow" });
    expect(dailyTargetFor(goal(), flow, "2026-08-15")).toBeCloseTo(100, 6); // 31 days
    expect(dailyTargetFor(goal(), flow, "2026-02-15")).toBeCloseTo(3100 / 28, 6);
  });

  it("divides a flow's weekly target by seven, and passes a daily one through", () => {
    const flow = series({ kind: "flow" });
    expect(dailyTargetFor(goal({ period: "weekly", target: 700 }), flow, "2026-08-15")).toBe(100);
    expect(dailyTargetFor(goal({ period: "daily", target: 42 }), flow, "2026-08-15")).toBe(42);
  });

  it("never divides a STOCK, because a level is not accumulated", () => {
    // The load-bearing case. An installed audience of 1,000 is a level to reach,
    // and 1000/31 is not a target for anything. Dividing it would paint every
    // day green against a number that means nothing.
    const stock = series({ kind: "stock" });
    expect(dailyTargetFor(goal({ target: 1000 }), stock, "2026-08-15")).toBe(1000);
    expect(dailyTargetFor(goal({ period: "weekly", target: 1000 }), stock, "2026-08-15")).toBe(1000);
  });

  it("returns null when there is nothing to measure against", () => {
    const flow = series({ kind: "flow" });
    expect(dailyTargetFor(null, flow, "2026-08-15")).toBeNull();
    expect(dailyTargetFor(goal(), null, "2026-08-15")).toBeNull();
    expect(dailyTargetFor(goal({ paused: true }), flow, "2026-08-15")).toBeNull();
    expect(dailyTargetFor(goal({ target: 0 }), flow, "2026-08-15")).toBeNull();
    expect(dailyTargetFor(goal({ seriesId: "other" }), flow, "2026-08-15")).toBeNull();
  });
});

describe("cellMetrics", () => {
  const measured = series({
    kind: "flow",
    points: [
      { day: "2026-08-16", value: 100 },
      { day: "2026-08-17", value: 0 },
      { day: "2026-08-18", value: 200 },
    ],
  });

  const forecast: Forecast = {
    seriesId: "s",
    points: [
      { day: "2026-08-19", value: 210 },
      { day: "2026-08-20", value: 220 },
    ],
    slopePerDay: 10,
    fit: 0.9,
    basisDays: 14,
  };

  it("reports a measured day, with a standing against its target", () => {
    const c = cellMetrics(measured, forecast, "2026-08-18", 100);
    expect(c.actual).toBe(200);
    expect(c.hasData).toBe(true);
    expect(c.isFuture).toBe(false);
    expect(c.standing).toBe("ahead");
  });

  it("keeps a measured ZERO apart from a day with no data", () => {
    // These are different facts and the tile paints them differently. A day the
    // report covered with no activity is 0; a day it never covered is blank.
    const zero = cellMetrics(measured, forecast, "2026-08-17", 100);
    expect(zero.actual).toBe(0);
    expect(zero.hasData).toBe(true);
    expect(zero.standing).toBe("behind");

    const gap = cellMetrics(measured, forecast, "2026-08-01", 100);
    expect(gap.actual).toBeNull();
    expect(gap.hasData).toBe(false);
    expect(gap.isFuture).toBe(false);
  });

  it("reports a forecast on days past the last measurement", () => {
    const c = cellMetrics(measured, forecast, "2026-08-19", 100);
    expect(c.predicted).toBe(210);
    expect(c.actual).toBeNull();
    expect(c.isFuture).toBe(true);
    expect(c.hasData).toBe(false);
  });

  it("never gives a forecast a standing", () => {
    // Colouring a projected cell green would make a guess look like an
    // achievement, which is the one thing this engine is built not to do.
    const c = cellMetrics(measured, forecast, "2026-08-19", 1);
    expect(c.predicted).toBe(210);
    expect(c.standing).toBeNull();
  });

  it("treats future as relative to the last measurement, not to the clock", () => {
    // A report that stops on the 18th makes the 19th a forecast even though the
    // 19th is in the past. Nothing measured it, so nothing may claim it.
    const c = cellMetrics(measured, forecast, "2026-08-20", null);
    expect(c.isFuture).toBe(true);
    expect(c.actual).toBeNull();
  });

  it("survives a missing series or forecast", () => {
    expect(cellMetrics(null, null, "2026-08-18", 100).hasData).toBe(false);
    expect(cellMetrics(measured, null, "2026-08-19", 100).predicted).toBeNull();
  });

  it("gives no standing when there is no target", () => {
    const c = cellMetrics(measured, forecast, "2026-08-18", null);
    expect(c.actual).toBe(200);
    expect(c.standing).toBeNull();
  });
});

describe("lastMeasuredDay", () => {
  it("ignores trailing nulls", () => {
    const s = series({
      points: [
        { day: "2026-08-16", value: 5 },
        { day: "2026-08-17", value: null },
      ],
    });
    expect(lastMeasuredDay(s)).toBe("2026-08-16");
  });

  it("is null when nothing was measured", () => {
    expect(lastMeasuredDay(series({ points: [{ day: "2026-08-16", value: null }] }))).toBeNull();
  });
});

describe("labels", () => {
  it("names months and days without a locale Date", () => {
    expect(monthLabel(2026, 7)).toBe("August 2026");
    expect(monthLabel(2026, 0)).toBe("January 2026");
    expect(shortDayLabel("2026-08-18")).toBe("18 Aug");
    expect(startOfMonth("2026-08-18")).toBe("2026-08-01");
  });
});

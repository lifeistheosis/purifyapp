import { describe, expect, it } from "vitest";
import { deltaSeries, withDerived } from "../derive";
import { dayResults, recordsFor } from "../records";
import type { Goal, Series } from "../types";

function series(over: Partial<Series> = {}): Series {
  return { id: "s", label: "S", kind: "stock", source: "Installed audience (Daily): X", points: [], ...over };
}

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g",
  seriesId: "s",
  label: "G",
  period: "daily",
  target: 10,
  paused: false,
  createdAt: "2026-08-01T00:00:00Z",
  ...over,
});

describe("deltaSeries", () => {
  it("turns a level into the daily change hiding inside it", () => {
    const s = series({
      points: [
        { day: "2026-08-16", value: 100 },
        { day: "2026-08-17", value: 141 },
        { day: "2026-08-18", value: 136 },
      ],
    });
    const d = deltaSeries(s)!;
    expect(d.kind).toBe("flow");
    expect(d.points).toEqual([
      { day: "2026-08-17", value: 41 },
      { day: "2026-08-18", value: -5 },
    ]);
  });

  it("keeps a negative day negative", () => {
    // Gains go negative about one day in five in the real export. Clamping
    // them at zero would turn a bad day into an average one.
    const d = deltaSeries(
      series({ points: [{ day: "2026-08-17", value: 50 }, { day: "2026-08-18", value: 34 }] }),
    )!;
    expect(d.points[0].value).toBe(-16);
  });

  it("emits NO point across a gap, rather than a fake daily change", () => {
    // The 1st to the 5th is four days of movement. Labelling it a daily change
    // would invent a number four times too large.
    const d = deltaSeries(
      series({
        points: [
          { day: "2026-08-01", value: 10 },
          { day: "2026-08-05", value: 50 },
          { day: "2026-08-06", value: 55 },
        ],
      }),
    )!;
    expect(d.points).toEqual([{ day: "2026-08-06", value: 5 }]);
  });

  it("refuses a flow, which already is one", () => {
    expect(deltaSeries(series({ kind: "flow" }))).toBeNull();
  });

  it("refuses a series with nothing to difference", () => {
    expect(deltaSeries(series({ points: [] }))).toBeNull();
    expect(deltaSeries(series({ points: [{ day: "2026-08-18", value: 1 }] }))).toBeNull();
  });

  it("names the derived series for a human", () => {
    const d = deltaSeries(series({ label: "Installed audience, total", points: [
      { day: "2026-08-17", value: 1 }, { day: "2026-08-18", value: 2 },
    ] }))!;
    expect(d.label).toBe("Net new installs, total");
  });

  it("withDerived adds a companion for each stock and leaves flows alone", () => {
    const stock = series({ id: "a", points: [
      { day: "2026-08-17", value: 1 }, { day: "2026-08-18", value: 3 },
    ] });
    const flow = series({ id: "b", kind: "flow", source: "Device impressions (Daily): X", points: [
      { day: "2026-08-18", value: 5 },
    ] });
    const out = withDerived([stock, flow]);
    expect(out).toHaveLength(3);
    expect(out[1].kind).toBe("flow");
    expect(out[2].id).toBe("b");
  });
});

describe("recordsFor", () => {
  /** Ten consecutive days, the last three below target. */
  const flow = series({
    kind: "flow",
    points: [
      { day: "2026-08-09", value: 20 },
      { day: "2026-08-10", value: 15 },
      { day: "2026-08-11", value: 30 },
      { day: "2026-08-12", value: 12 },
      { day: "2026-08-13", value: 11 },
      { day: "2026-08-14", value: 40 },
      { day: "2026-08-15", value: 25 },
      { day: "2026-08-16", value: 1 },
      { day: "2026-08-17", value: 2 },
      { day: "2026-08-18", value: 3 },
    ],
  });

  it("anchors on the last measured day, not the clock", () => {
    // THE adaptation. The export ends on the 18th and is read days later. Using
    // the real today would walk back through dayless days and return zero for
    // every goal, for ever.
    const r = recordsFor(flow, goal());
    expect(r.asOf).toBe("2026-08-18");
  });

  it("reports a zero streak when the last day missed", () => {
    const r = recordsFor(flow, goal());
    expect(r.streak).toBe(0);
    // The history is still there, which is what stops a zero reading as
    // "you have never done well".
    expect(r.bestRun).toBe(7);
  });

  it("counts a live streak when the last days met", () => {
    const rising = series({
      kind: "flow",
      points: [
        { day: "2026-08-16", value: 1 },
        { day: "2026-08-17", value: 50 },
        { day: "2026-08-18", value: 60 },
      ],
    });
    const r = recordsFor(rising, goal());
    expect(r.streak).toBe(2);
  });

  it("breaks a streak on a gap, not just on a miss", () => {
    const gappy = series({
      kind: "flow",
      points: [
        { day: "2026-08-10", value: 50 },
        { day: "2026-08-11", value: 50 },
        // 12th missing entirely
        { day: "2026-08-13", value: 50 },
      ],
    });
    expect(recordsFor(gappy, goal()).streak).toBe(1);
  });

  it("returns a 14 day rhythm strip ending on the anchor", () => {
    const r = recordsFor(flow, goal());
    expect(r.rhythm).toHaveLength(14);
    expect(r.rhythm[13].key).toBe("2026-08-18");
    expect(r.rhythm[13].kept).toBe(false);
    expect(r.rhythm.filter((d) => d.kept).length).toBe(7);
  });

  it("finds the best day with its date", () => {
    expect(recordsFor(flow, goal()).bestDay).toEqual({ day: "2026-08-14", value: 40 });
  });

  it("counts days met against days measured", () => {
    const r = recordsFor(flow, goal());
    expect(r.met).toBe(7);
    expect(r.measured).toBe(10);
  });

  it("produces nothing for a weekly or monthly goal", () => {
    // A weekly target has no per-day truth to be consecutive about. Dividing it
    // to manufacture one would invent a threshold nobody set.
    expect(recordsFor(flow, goal({ period: "weekly" })).measured).toBe(0);
    expect(recordsFor(flow, goal({ period: "monthly" })).streak).toBe(0);
  });

  it("produces nothing for a paused goal or a missing series", () => {
    expect(dayResults(flow, goal({ paused: true }))).toEqual([]);
    expect(recordsFor(null, goal()).asOf).toBeNull();
    expect(recordsFor(flow, null).asOf).toBeNull();
  });
});

describe("the owner's real numbers", () => {
  /**
   * The last fourteen days of net new installs, read straight off the export
   * on 2026-08-22. These are the figures the panel has to reproduce, so a
   * refactor that quietly changes the arithmetic fails here rather than on
   * screen.
   */
  const REAL = [
    ["2026-08-05", 4], ["2026-08-06", 11], ["2026-08-07", 39], ["2026-08-08", 6],
    ["2026-08-09", 18], ["2026-08-10", 20], ["2026-08-11", 15], ["2026-08-12", -16],
    ["2026-08-13", 8], ["2026-08-14", 35], ["2026-08-15", 10], ["2026-08-16", 3],
    ["2026-08-17", 41], ["2026-08-18", -5],
  ] as const;

  const netNew = series({
    id: "net",
    kind: "flow",
    label: "Net new installs, total",
    points: REAL.map(([day, value]) => ({ day, value })),
  });

  it("ends on a down day, so the streak is zero", () => {
    const r = recordsFor(netNew, goal({ seriesId: "net", target: 10 }));
    expect(r.asOf).toBe("2026-08-18");
    expect(r.streak).toBe(0);
  });

  it("has its best day on the 17th, at +41", () => {
    expect(recordsFor(netNew, goal({ seriesId: "net", target: 10 })).bestDay).toEqual({
      day: "2026-08-17",
      value: 41,
    });
  });

  it("met the +10 target on 8 of these 14 days", () => {
    const r = recordsFor(netNew, goal({ seriesId: "net", target: 10 }));
    expect(r.met).toBe(8);
    expect(r.measured).toBe(14);
  });

  it("has a best run of 3, on the 9th to the 11th", () => {
    expect(recordsFor(netNew, goal({ seriesId: "net", target: 10 })).bestRun).toBe(3);
  });
});

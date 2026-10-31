import { describe, expect, it } from "vitest";

import {
  MARK_SEEN,
  VISIT_GAP_MS,
  agoWords,
  dayPartLabel,
  groupFeed,
  lastMarkSeen,
  lastVisitEnd,
  lineFrom,
  paceWord,
  readerRows,
  sinceTotals,
  type SinceEvent,
} from "../since";

// The owner's pick for Home on sheet r3-15 (2026-10-30), B and A mixed: the
// feed of what changed since he last looked, the line taken from his own use
// log, Thursday 21:40 in the sheet's drawing.

const MIN = 60_000;
const at = (iso: string) => Date.parse(iso);

describe("where he last looked", () => {
  const now = at("2026-10-30T09:41:00Z");

  it("is the end of his previous visit, across a pause of half an hour or more", () => {
    const rows = [
      "2026-10-29T21:40:00Z", // the end of Thursday's visit
      "2026-10-29T21:31:00Z",
      "2026-10-29T21:12:00Z",
    ];
    expect(lastVisitEnd(rows, now)).toBe("2026-10-29T21:40:00.000Z");
  });

  it("skips the visit he is on now, however many rows it has written", () => {
    const rows = [
      "2026-10-30T09:39:00Z",
      "2026-10-30T09:20:00Z",
      "2026-10-30T09:02:00Z",
      "2026-10-29T21:40:00Z",
    ];
    expect(lastVisitEnd(rows, now)).toBe("2026-10-29T21:40:00.000Z");
  });

  it("has no line for a first visit, or rows in any order", () => {
    expect(lastVisitEnd([], now)).toBeNull();
    expect(lastVisitEnd(["2026-10-30T09:30:00Z"], now)).toBeNull();
    expect(lastVisitEnd(["2026-10-29T21:12:00Z", "2026-10-29T21:40:00Z"], now)).toBe("2026-10-29T21:40:00.000Z");
    expect(VISIT_GAP_MS).toBe(30 * MIN);
  });

  it("moves to a later Mark all as seen", () => {
    const rows = [
      { at: "2026-10-30T09:20:00Z", kind: "action", label: MARK_SEEN },
      { at: "2026-10-30T09:21:00Z", kind: "view", label: null },
      { at: "2026-10-29T21:40:00Z", kind: "view", label: null },
      { at: "2026-10-30T09:25:00Z", kind: "action", label: "Retry" },
    ];
    expect(lastMarkSeen(rows)).toBe("2026-10-30T09:20:00.000Z");
    expect(lineFrom(rows, now)).toEqual({ at: "2026-10-30T09:20:00.000Z", basis: "mark" });
  });

  it("keeps the line the page asks for, when it is a sane time", () => {
    expect(lineFrom(null, now, "2026-10-30T09:00:00.000Z")).toEqual({ at: "2026-10-30T09:00:00.000Z", basis: "asked" });
    // In the future, older than the log, or not a time: not taken.
    expect(lineFrom([], now, "2026-11-30T09:00:00Z").basis).toBe("day");
    expect(lineFrom([], now, "2026-08-01T09:00:00Z").basis).toBe("day");
    expect(lineFrom([], now, "soon").basis).toBe("day");
  });

  it("says it is showing the last day when the log cannot give a line", () => {
    const day = lineFrom(null, now);
    expect(day.basis).toBe("day");
    expect(now - Date.parse(day.at)).toBe(86_400_000);
    expect(lineFrom([], now).basis).toBe("day");
    expect(lineFrom([{ at: "2026-10-30T09:30:00Z", kind: "view", label: null }], now).basis).toBe("day");
  });
});

describe("the feed", () => {
  // Local times, as the admin reads them.
  const now = new Date(2026, 9, 30, 9, 41); // a Friday

  it("groups the day as the sheet wrote it", () => {
    expect(dayPartLabel(new Date(2026, 9, 30, 9, 38), now)).toBe("This morning");
    expect(dayPartLabel(new Date(2026, 9, 30, 3, 40), now)).toBe("Overnight");
    expect(dayPartLabel(new Date(2026, 9, 29, 23, 15), now)).toBe("Thursday evening");
    expect(dayPartLabel(new Date(2026, 9, 29, 2, 15), now)).toBe("Thursday night");
    expect(dayPartLabel(new Date(2026, 9, 27, 14, 0), now)).toBe("Tuesday afternoon");
    expect(dayPartLabel(new Date(2026, 9, 20, 14, 0), now)).toBe("Oct 20");
  });

  const ev = (iso: Date, kind: SinceEvent["kind"], mark: SinceEvent["mark"] = "good"): SinceEvent => ({
    at: iso.toISOString(),
    kind,
    mark,
    title: kind,
    detail: "",
    tab: "orders",
    go: "Orders",
  });

  it("puts the newest first, each under its part of the day", () => {
    const groups = groupFeed(
      [
        ev(new Date(2026, 9, 29, 23, 15), "order"),
        ev(new Date(2026, 9, 30, 9, 38), "order"),
        ev(new Date(2026, 9, 30, 3, 40), "ticket", "wait"),
        ev(new Date(2026, 9, 30, 7, 2), "order"),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.rows.length])).toEqual([
      ["This morning", 2],
      ["Overnight", 1],
      ["Thursday evening", 1],
    ]);
    expect(groups[0].rows[0].at).toBe(new Date(2026, 9, 30, 9, 38).toISOString());
  });

  it("folds new readers into one row per part of the day", () => {
    const rows = readerRows(
      [
        new Date(2026, 9, 30, 9, 31).toISOString(),
        new Date(2026, 9, 30, 9, 2).toISOString(),
        new Date(2026, 9, 30, 2, 0).toISOString(),
        "not a time",
      ],
      now,
    );
    expect(rows.map((r) => r.title).sort()).toEqual(["2 new readers", "A new reader"]);
    const morning = rows.find((r) => r.title === "2 new readers")!;
    expect(morning.detail).toBe("the newest at 09:31");
    expect(morning.tab).toBe("users");
  });

  it("totals what came in, who joined, and who is waiting", () => {
    const t = sinceTotals(
      [ev(now, "order"), ev(now, "order"), ev(now, "member"), ev(now, "check", "wait"), ev(now, "seal", "wait"), ev(now, "ticket", "wait")],
      41,
      9_600,
    );
    expect(t).toEqual({ orderCents: 9_600, orders: 2, readers: 41, members: 1, requests: 2, tickets: 1 });
  });

  it("says how long ago in words", () => {
    const n = Date.parse("2026-10-30T09:41:00Z");
    expect(agoWords("2026-10-29T21:40:00Z", n)).toBe("12 hours ago");
    expect(agoWords("2026-10-30T09:38:00Z", n)).toBe("a few minutes ago");
    expect(agoWords("2026-10-27T09:41:00Z", n)).toBe("3 days ago");
  });
});

describe("the hour's pace", () => {
  it("says where a goal stands against where the hour usually is by now", () => {
    expect(paceWord(46, 58, 41)).toBe("ahead of where this hour usually is by now");
    expect(paceWord(141, 230, 41)).toBe("a little behind");
    expect(paceWord(3, 4, 41)).toBe("on pace");
    expect(paceWord(42, 25, 41)).toBe("reached");
    expect(paceWord(2, 40, 41)).toBe("behind");
    expect(paceWord(1, 58, 5)).toBe("too early in the hour to say");
    expect(paceWord(3, null, 41)).toBe("no target yet: this hour has too little history");
  });
});

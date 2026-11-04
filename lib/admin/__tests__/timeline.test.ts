import { describe, expect, it } from "vitest";

import type { SinceEvent } from "../since";
import { TIMELINE_FLOOR, eventKey, lineIndex, mergeEvents, mergeTimes, newerThan, timelineWindow } from "../timeline";

/** The log that never resets (lib/admin/timeline.ts): its windows and pages. */

const NOW = Date.parse("2026-11-04T15:00:00.000Z");
const ev = (at: string, title = "An order came in, $24.00"): SinceEvent => ({
  at,
  kind: "order",
  mark: "good",
  title,
  detail: "1 item",
  tab: "orders",
  go: "Orders",
});

describe("timelineWindow", () => {
  it("gives the newest week, a minute past now, as the first page", () => {
    const w = timelineWindow({}, NOW)!;
    expect(w.first).toBe(true);
    expect(w.to).toBe("2026-11-04T15:01:00.000Z");
    expect(w.from).toBe("2026-10-28T15:01:00.000Z");
    expect(w.more).toBe(true);
    expect(w.empty).toBe(false);
  });

  it("gives the week before a page's start, and stops at the floor", () => {
    const w = timelineWindow({ before: "2026-10-28T15:01:00.000Z" }, NOW)!;
    expect(w.first).toBe(false);
    expect([w.from, w.to]).toEqual(["2026-10-21T15:01:00.000Z", "2026-10-28T15:01:00.000Z"]);
    const last = timelineWindow({ before: "2026-05-04T00:00:00.000Z" }, NOW)!;
    expect(last.from).toBe(TIMELINE_FLOOR);
    expect(last.more).toBe(false);
    const past = timelineWindow({ before: "2026-04-01T00:00:00.000Z" }, NOW)!;
    expect(past.empty).toBe(true);
  });

  it("gives from a moment to now for a refresh, and takes a length of 1 to 31 days", () => {
    const r = timelineWindow({ after: "2026-11-04T14:55:00.000Z" }, NOW)!;
    expect([r.from, r.to, r.first]).toEqual(["2026-11-04T14:55:00.000Z", "2026-11-04T15:01:00.000Z", false]);
    expect(timelineWindow({ days: "1" }, NOW)!.from).toBe("2026-11-03T15:01:00.000Z");
    expect(timelineWindow({ days: "90" }, NOW)!.from).toBe("2026-10-28T15:01:00.000Z");
  });

  it("refuses a time that is not one", () => {
    expect(timelineWindow({ before: "yesterday" }, NOW)).toBeNull();
    expect(timelineWindow({ after: "soon" }, NOW)).toBeNull();
  });
});

describe("pages", () => {
  it("keeps each row once, newest first, across pages and refreshes", () => {
    const a = [ev("2026-11-04T14:00:00Z"), ev("2026-11-03T10:00:00Z")];
    const b = [ev("2026-11-04T14:00:00Z"), ev("2026-11-04T14:58:00Z", "An order came in, $32.00")];
    const merged = mergeEvents([a, b]);
    expect(merged.map((e) => e.at)).toEqual(["2026-11-04T14:58:00Z", "2026-11-04T14:00:00Z", "2026-11-03T10:00:00Z"]);
    expect(new Set(merged.map(eventKey)).size).toBe(3);
    expect(mergeTimes([["a", "b"], ["b", "c"]])).toEqual(["a", "b", "c"]);
  });

  it("puts the line before the first row he has seen, and counts what is newer", () => {
    const rows = mergeEvents([[ev("2026-11-04T14:00:00Z"), ev("2026-11-04T09:00:00Z"), ev("2026-11-03T22:00:00Z")]]);
    expect(lineIndex(rows, "2026-11-04T04:10:00Z")).toBe(2);
    expect(lineIndex(rows, "2026-11-04T15:00:00Z")).toBe(0);
    expect(lineIndex(rows, "2026-11-01T00:00:00Z")).toBe(3);
    expect(newerThan(rows, "2026-11-04T04:10:00Z")).toBe(2);
    expect(newerThan(rows, null)).toBe(0);
  });
});

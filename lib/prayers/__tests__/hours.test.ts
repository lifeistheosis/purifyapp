// The Hours registry and the "which Hour is it now" helper.
//
// currentHourSlug shipped with zero callers, and the file's own header claimed
// it was "used by the /prayers landing page to highlight which Hour the day is
// closest to", which was true of no page. It has a caller now (it lights
// the Hour on the Hours' timeline, lib/prayers/dayTimeline.ts, since 1.7), so
// its behaviour is worth pinning:
// every hour of the day must resolve to exactly one Hour, and the small hours
// before the First Hour must resolve backwards to it rather than to nothing.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { currentHourSlug, getHour, listHours } from "@/lib/prayers/hours";
import { HOUR_STARTS, currentHourSlug as hourNow } from "@/lib/prayers/hourNow";

describe("the Hours' own hours, apart from their texts (1.8, note 72)", () => {
  it("are one list: the registry reads them from lib/prayers/hourNow.ts", () => {
    expect(listHours().map((h) => [h.slug, h.approxHour])).toEqual(HOUR_STARTS.map((h) => [h.slug, h.approxHour]));
    expect(currentHourSlug).toBe(hourNow);
  });

  it("carry none of the five services, so a screen that lights the Hour does not download them", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "lib/prayers/hourNow.ts"), "utf8");
    expect(src).not.toMatch(/^import\b/m);
  });
});

describe("listHours", () => {
  it("returns the five canonical Hours in clock order", () => {
    const hours = listHours();
    expect(hours.map((h) => h.slug)).toEqual([
      "first-hour",
      "third-hour",
      "sixth-hour",
      "ninth-hour",
      "compline",
    ]);
    const times = hours.map((h) => h.approxHour);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("gives every Hour a title, a resolvable rule and its length", () => {
    for (const h of listHours()) {
      expect(h.title.trim(), h.slug).not.toBe("");
      expect(getHour(h.slug), h.slug).not.toBeNull();
      expect(h.estimatedMinutes, h.slug).toBeGreaterThan(0);
    }
  });
});

describe("currentHourSlug", () => {
  it("resolves every hour of the day to exactly one Hour", () => {
    const slugs = new Set(listHours().map((h) => h.slug));
    for (let h = 0; h < 24; h += 1) {
      const slug = currentHourSlug(h);
      expect(slugs.has(slug), `hour ${h} resolved to ${slug}`).toBe(true);
    }
  });

  it("falls back to the First Hour before dawn rather than to nothing", () => {
    // Midnight through 5am precede the First Hour at 6. A reader awake then
    // must still be told which Hour is theirs.
    for (const h of [0, 1, 2, 3, 4, 5]) {
      expect(currentHourSlug(h), `hour ${h}`).toBe("first-hour");
    }
  });

  it("holds each Hour until the next one begins", () => {
    const cases: [number, string][] = [
      [6, "first-hour"],
      [8, "first-hour"],
      [9, "third-hour"],
      [11, "third-hour"],
      [12, "sixth-hour"],
      [14, "sixth-hour"],
      [15, "ninth-hour"],
      [20, "ninth-hour"],
      [21, "compline"],
      [23, "compline"],
    ];
    for (const [hour, slug] of cases) {
      expect(currentHourSlug(hour), `hour ${hour}`).toBe(slug);
    }
  });

  it("never changes answer within the same clock hour", () => {
    // The index reads the clock once on mount. If this were minute-sensitive
    // the mark could move under a reader mid-page.
    for (let h = 0; h < 24; h += 1) {
      expect(currentHourSlug(h)).toBe(currentHourSlug(h));
    }
  });
});

// Candlelight at Vespers (1.9, s2-02): which palette, from which night, and
// the night kept for the pre-paint script.

import { describe, expect, it, vi } from "vitest";

import { THEME_PREPAINT } from "@/lib/reader/prepaint";
import { VESPERS_KEY, VESPERS_WINDOW_KEY, nightHolds, placeOf, readWindow, vespersTheme } from "@/lib/reader/vespers";

const night = { start: 1_000, end: 5_000, now: true };

describe("Candlelight at Vespers", () => {
  it("reads in Candlelight through the night while the switch is on, and in the reader's palette otherwise", () => {
    expect(vespersTheme("parchment", true, night)).toBe("candlelight");
    expect(vespersTheme("parchment", true, { ...night, now: false })).toBe("parchment");
    expect(vespersTheme("parchment", false, night)).toBe("parchment");
    expect(vespersTheme("monastery", true, null)).toBe("monastery");
  });

  it("takes the city of the phone's time zone, never its location, and the zone's meridian when the table has no city", () => {
    const zones = { "Europe/Bucharest": [44.43, 26.1] as [number, number] };
    expect(placeOf("Europe/Bucharest", zones, -120)).toEqual([44.43, 26.1]);
    expect(placeOf("Etc/GMT-3", zones, -180)).toEqual([45, 45]);
    expect(placeOf(undefined, zones, 300)).toEqual([45, -75]);
  });

  it("knows the zones a phone reports, the old spellings among them", async () => {
    const { zones } = (await import("@/data/calendar/zone-coords.json")).default as { zones: Record<string, number[]> };
    for (const z of ["Europe/Bucharest", "Europe/Athens", "Europe/Moscow", "Asia/Tbilisi", "Europe/Belgrade", "America/New_York", "Asia/Calcutta", "Europe/Kiev", "Africa/Cairo", "Australia/Sydney"]) {
      expect(zones[z], z).toBeDefined();
    }
  });

  it("asks the night again once it is over, or once day or night has turned", () => {
    expect(nightHolds(night, 2_000)).toBe(true);
    expect(nightHolds(night, 5_000)).toBe(false);
    expect(nightHolds({ ...night, now: false }, 2_000)).toBe(false);
    expect(nightHolds(null, 2_000)).toBe(false);
  });

  it("keeps the night where the pre-paint script reads it, and the script turns Candlelight on inside it", () => {
    const store = new Map<string, string>([[VESPERS_WINDOW_KEY, "1000,5000"]]);
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null } });
    expect(readWindow(2_000)).toEqual({ start: 1_000, end: 5_000, now: true });
    expect(readWindow(500)).toEqual({ start: 1_000, end: 5_000, now: false });
    expect(readWindow(6_000)).toBeNull();
    vi.unstubAllGlobals();

    // The script itself, run against a stand-in page.
    const run = (stored: Record<string, string>, now: number) => {
      const attrs: Record<string, string> = {};
      const fn = new Function("localStorage", "document", "Date", THEME_PREPAINT);
      fn(
        { getItem: (k: string) => stored[k] ?? null },
        { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
        { now: () => now },
      );
      return attrs["data-reading-mode"] ?? null;
    };
    const on = { [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: "1000,5000", "purify.reader.theme": "parchment" };
    expect(run(on, 2_000)).toBe("candlelight");
    expect(run(on, 6_000)).toBe("parchment");
    expect(run({ ...on, [VESPERS_KEY]: "0" }, 2_000)).toBe("parchment");
    expect(run({ [VESPERS_KEY]: "1", [VESPERS_WINDOW_KEY]: "1000,5000" }, 2_000)).toBe("candlelight");
  });
});

// Find a parish: the reader's own region first (lib/parishes/regionFirst.ts),
// and the way the page keeps to it (components/parishes/RegionOrder.tsx).

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { PARISH_REGIONS } from "@/lib/parishes/finders";
import { regionOfTimeZone, regionOrder } from "@/lib/parishes/regionFirst";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (...segments: string[]) => fs.readFileSync(path.join(ROOT, ...segments), "utf8");
const withoutComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const IDS = PARISH_REGIONS.map((r) => r.id);

describe("the region a time zone belongs to", () => {
  it("knows the page's four regions", () => {
    expect(regionOfTimeZone("America/New_York")).toBe("north-america");
    expect(regionOfTimeZone("America/Toronto")).toBe("north-america");
    expect(regionOfTimeZone("Europe/London")).toBe("uk-ireland");
    expect(regionOfTimeZone("Europe/Dublin")).toBe("uk-ireland");
    expect(regionOfTimeZone("Europe/Paris")).toBe("western-europe");
    expect(regionOfTimeZone("Europe/Berlin")).toBe("western-europe");
    expect(regionOfTimeZone("Australia/Sydney")).toBe("australia-nz");
    expect(regionOfTimeZone("Pacific/Auckland")).toBe("australia-nz");
  });

  it("gives none for a part of the world the page has no region for, or no zone at all", () => {
    for (const zone of ["Asia/Tokyo", "Africa/Nairobi", "Pacific/Honolulu", "UTC", "", null, undefined]) {
      expect(regionOfTimeZone(zone), String(zone)).toBeNull();
    }
  });

  it("answers with a region the page has", () => {
    for (const zone of ["America/Chicago", "Europe/London", "Europe/Athens", "Australia/Perth"]) {
      expect(IDS).toContain(regionOfTimeZone(zone));
    }
  });
});

describe("the regions' order", () => {
  it("moves the reader's region to the front and leaves the rest as they stood", () => {
    expect(regionOrder(IDS, "uk-ireland").map((i) => IDS[i])).toEqual(["uk-ireland", "north-america", "western-europe", "australia-nz"]);
    expect(regionOrder(IDS, "australia-nz").map((i) => IDS[i])).toEqual(["australia-nz", "north-america", "uk-ireland", "western-europe"]);
  });

  it("leaves the page's own order for the first region, for none, and for one the page does not have", () => {
    const own = IDS.map((_, i) => i);
    expect(regionOrder(IDS, "north-america")).toEqual(own);
    expect(regionOrder(IDS, null)).toEqual(own);
    expect(regionOrder(IDS.slice(0, 2), "australia-nz")).toEqual([0, 1]);
  });

  it("draws every region once, whichever is first", () => {
    for (const first of [...IDS, null]) expect([...regionOrder(IDS, first)].sort()).toEqual(IDS.map((_, i) => i));
  });
});

describe("the page keeps to it", () => {
  const list = read("components", "parishes", "ParishFinderList.tsx");
  const order = withoutComments(read("components", "parishes", "RegionOrder.tsx"));

  it("hands its regions to the one piece that orders them, still drawn by the server", () => {
    expect(list).toContain("<RegionOrder ids={groups.map((g) => g.region.id)}>");
    expect(withoutComments(list)).not.toContain('"use client"');
  });

  it("reads the device's time zone and nothing else: no location is asked", () => {
    expect(order).toContain("Intl.DateTimeFormat().resolvedOptions().timeZone");
    expect(order).not.toMatch(/geolocation|navigator\.language|localStorage|fetch\(|cookie/i);
  });

  it("never reorders a page the server drew: a hydration keeps the page's own order", () => {
    // The server's answer is null, and so is the device's on the page the document was loaded on.
    expect(order).toContain("useSyncExternalStore(never, deviceRegion, () => null)");
    expect(order).toContain("return loadedOnThisPage() ? null : regionOfTimeZone(");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

import { geoFromCloudflare, geoForRequest } from "@/lib/analytics/geo";

// A visit's place comes from Cloudflare's headers first, with no outside
// call; the free lookup services are only a fallback (2026-11-25, the
// ipwho.is warning on the admin's Readers page).

afterEach(() => vi.unstubAllGlobals());

describe("geoFromCloudflare", () => {
  it("takes the country, and region, city and place when Cloudflare sends them", () => {
    const h = new Headers({
      "cf-ipcountry": "gr",
      "cf-region": "Attica",
      "cf-ipcity": "Athens",
      "cf-iplatitude": "37.98",
      "cf-iplongitude": "23.73",
    });
    expect(geoFromCloudflare(h)).toEqual({
      country: "Greece",
      country_code: "GR",
      region: "Attica",
      city: "Athens",
      lat: 37.98,
      lng: 23.73,
    });
  });

  it("takes the country alone when only IP Geolocation is on", () => {
    const g = geoFromCloudflare(new Headers({ "cf-ipcountry": "US" }));
    expect(g).toMatchObject({ country: "United States", country_code: "US", region: null, city: null, lat: null });
  });

  it("is null with no header, unknown (XX), Tor (T1) or junk", () => {
    for (const v of [null, "XX", "T1", "", "USA", "1"]) {
      const h = new Headers(v === null ? {} : { "cf-ipcountry": v });
      expect(geoFromCloudflare(h), String(v)).toBeNull();
    }
  });
});

describe("geoForRequest", () => {
  it("makes no outside call when Cloudflare sends the country", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const g = await geoForRequest(new Headers({ "cf-ipcountry": "RO", "x-forwarded-for": "8.8.8.8" }));
    expect(g?.country_code).toBe("RO");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the lookup services by IP when Cloudflare sends nothing", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, country: "Serbia", country_code: "RS" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const g = await geoForRequest(new Headers({ "x-forwarded-for": "8.8.4.4" }));
    expect(g?.country_code).toBe("RS");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("the tracker", () => {
  it("takes a new visit's place through geoForRequest, Cloudflare first", () => {
    const src = readFileSync("app/api/track/route.ts", "utf8");
    expect(src).toMatch(/geoForRequest\(req\.headers\)/);
    expect(src).not.toMatch(/geolocate\(/);
  });
});

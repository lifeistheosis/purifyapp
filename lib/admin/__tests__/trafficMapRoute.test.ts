import { beforeEach, describe, expect, it, vi } from "vitest";

import { appsLine, liveFigures, mapTitle, PERIOD_WORD, periodSums, share, topSearch } from "../trafficFigures";

/**
 * /api/admin/traffic/map over sessions held in memory, and Traffic's four
 * numbers (sheet r3-15, Traffic A with C's zoom).
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  rows: [] as Record<string, unknown>[],
  fail: null as string | null,
  reads: 0,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from() {
      let window: [number, number] = [0, Infinity];
      const query = {
        select: () => query,
        gte: () => query,
        order: () => query,
        range: (from: number, to: number) => ((window = [from, to]), query),
        then: <T>(resolve: (r: { data: Row[] | null; error: { message: string } | null }) => T) => {
          state.reads++;
          if (state.fail) return Promise.resolve({ data: null, error: { message: state.fail } }).then(resolve);
          return Promise.resolve({ data: state.rows.slice(window[0], window[1] + 1), error: null }).then(resolve);
        },
      };
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/traffic/map/route";

const GOOGLE = "https://www.google.com/";
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

function session(code: string | null, region: string | null, city: string | null, referrer: string | null, ua: string): Row {
  return { country: code === "RO" ? "Romania" : code === "US" ? "United States" : null, country_code: code, region, city, referrer, user_agent: ua };
}

async function call(qs: string) {
  const res = await GET(new Request(`http://x/api/admin/traffic/map${qs}`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.fail = null;
  state.reads = 0;
  state.rows = [
    session("RO", "Bucuresti", "Bucharest", GOOGLE, PHONE),
    session("RO", "Iasi", "Iasi", null, PHONE),
    session("US", "California", "Los Angeles", GOOGLE, PHONE),
    session("US", "California", "San Diego", null, PHONE),
    session("US", "Texas", "Houston", null, PHONE),
    session(null, null, null, null, PHONE),
  ];
});

describe("/api/admin/traffic/map", () => {
  it("answers 403 to anyone who is not an admin, and reads nothing", async () => {
    state.admin = null;
    const { status } = await call("?range=7d");
    expect(status).toBe(403);
    expect(state.reads).toBe(0);
  });

  it("counts every country with a visit, the most first, and only the counts leave", async () => {
    const { status, body } = await call("?range=7d");
    expect(status).toBe(200);
    expect(body.range).toBe("7d");
    expect(body.total).toBe(6);
    expect(body.unplaced).toBe(1);
    const countries = body.countries as { key: string; visits: number; from: { name: string }[] }[];
    expect(countries.map((c) => [c.key, c.visits])).toEqual([
      ["US", 3],
      ["RO", 2],
    ]);
    expect(countries[0].from[0].name).toBe("Direct");
    // No referrer, no user agent, in any form.
    expect(JSON.stringify(body)).not.toContain("google.com");
    expect(JSON.stringify(body)).not.toContain("Mozilla");
    expect(body.regions).toBeNull();
  });

  it("opens one country into its regions with in=", async () => {
    const { body } = await call("?range=30d&in=us");
    expect(body.in).toBe("US");
    expect((body.regions as { key: string; visits: number }[]).map((r) => [r.key, r.visits])).toEqual([
      ["California", 2],
      ["Texas", 1],
    ]);
  });

  it("takes only a known range and a two letter code", async () => {
    const { body } = await call("?range=forever&in=USA");
    expect(body.range).toBe("1d");
    expect(body.in).toBeNull();
  });

  it("says the sessions could not be read rather than drawing an empty world", async () => {
    state.fail = "boom";
    const { status, body } = await call("?range=7d");
    expect(status).toBe(200);
    expect(body.unavailable).toBe("The sessions could not be read just now.");
    expect(body.countries).toBeUndefined();
  });
});

describe("Traffic's four numbers", () => {
  it("names the period the way a sentence reads it, and the map's heading with it", () => {
    expect(PERIOD_WORD["7d"]).toBe("over 7 days");
    expect(mapTitle("1d")).toBe("Where readers are today");
    expect(mapTitle("now")).toBe("Where readers are now");
    expect(mapTitle("30d")).toBe("Where readers were, the last 30 days");
  });

  it("says a share in words, never a bare zero for something that happened", () => {
    expect(share(31, 100)).toBe("31%");
    expect(share(1, 400)).toBe("under 1%");
    expect(share(0, 10)).toBe("0%");
    expect(share(3, 0)).toBe("0%");
  });

  it("sums the period's days and the same number before them", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({ visitors: i + 1 }));
    expect(periodSums(days, 7)).toEqual({ now: 8 + 9 + 10 + 11 + 12 + 13 + 14, before: 1 + 2 + 3 + 4 + 5 + 6 + 7, complete: true });
    expect(periodSums(days.slice(0, 10), 7).complete).toBe(false);
  });

  it("names the apps, the most read first, as shares of every visit", () => {
    const platforms = [
      { key: "android-app", label: "Android app", count: 41 },
      { key: "web-phone", label: "Website, phone", count: 24 },
      { key: "ios-app", label: "iPhone app", count: 17 },
      { key: "desktop-app", label: "Windows app", count: 1 },
    ];
    expect(appsLine(platforms, 100)).toBe("Android 41%, iPhone 17%, Windows 1%");
    expect(appsLine([], 100)).toBe("none in the apps");
  });

  it("names the search engine that sent the most", () => {
    expect(
      topSearch([
        { key: "Bing", label: "Bing", kind: "search", count: 3 },
        { key: "Google", label: "Google", kind: "search", count: 40 },
        { key: "TikTok", label: "TikTok", kind: "social", count: 90 },
      ]),
    ).toBe("Google");
    expect(topSearch([])).toBeNull();
  });

  it("counts the readers on the site now the same way", () => {
    const f = liveFigures([
      { fromKind: "search", from: "Google", onKind: "web-phone" },
      { fromKind: "direct", from: "Direct", onKind: "web-computer" },
      { fromKind: "direct", from: "Opened the app", onKind: "android-app" },
    ]);
    expect(f).toMatchObject({ total: 3, website: 2, search: 1, topSearch: "Google" });
    expect(f.platforms.find((p) => p.key === "android-app")?.count).toBe(1);
  });
});

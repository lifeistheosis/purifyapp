import { describe, expect, it } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { inTurn, planLanes, readScreenEvents, readTabPlaces, readTabs } from "../screensRead";
import type { Step } from "../screensSummary";

// Reading the Screens view's rows (1.8) against a stand-in for the API that,
// like the real one, gives at most 1,000 rows a request: every row is read,
// in pages, and none twice.

const SINCE = "2026-11-01T00:00:00.000Z";
const T0 = Date.parse(SINCE);

describe("the lanes", () => {
  it("cuts the window's ids into runs", () => {
    expect(planLanes(1, 50_000, 400_000, 20_000)).toEqual({
      lanes: [
        [1, 20_000],
        [20_001, 40_000],
        [40_001, 50_000],
      ],
      cut: false,
    });
  });

  it("keeps the newest past the cap, and says so", () => {
    expect(planLanes(1, 1_000_000, 400_000, 200_000)).toEqual({
      lanes: [
        [600_001, 800_000],
        [800_001, 1_000_000],
      ],
      cut: true,
    });
  });

  it("reads nothing from an empty window", () => {
    expect(planLanes(Number.NaN, 5)).toEqual({ lanes: [], cut: false });
    expect(planLanes(10, 5)).toEqual({ lanes: [], cut: false });
  });

  it("runs jobs a few at a time and keeps their order", async () => {
    let running = 0;
    let most = 0;
    const jobs = Array.from({ length: 9 }, (_, i) => async () => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 9 - i));
      running -= 1;
      return i;
    });
    expect(await inTurn(jobs, 3)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(most).toBe(3);
  });
});

describe("the page views", () => {
  // 100 rows from before the window, then 2,600 in it from three tabs.
  const TABS = ["tab-aaaaaaaaaaaaaaaa", "tab-bbbbbbbbbbbbbbbb", "tab-cccccccccccccccc"];
  const rows = [
    ...Array.from({ length: 100 }, (_, i) => ({ id: i + 1, session_id: TABS[0], path: "/old", ts: new Date(T0 - 86_400_000 + i * 1000).toISOString() })),
    ...Array.from({ length: 2600 }, (_, i) => ({
      id: i + 101,
      session_id: TABS[i % 3],
      path: i % 2 ? "/prayers/morning/" : "/saints/john-chrysostom",
      ts: new Date(T0 + 60_000 + i * 1000).toISOString(),
    })),
  ];

  it("reads every row in the window, a page at a time, each tab in order", async () => {
    const { client, requests } = cappedApi({ analytics_pageviews: rows });
    const read = await readTabs(client, SINCE);
    expect(read.rows).toBe(2600);
    expect(read.cutAt).toBeNull();
    const seen = new Map<string, Step[]>();
    read.eachTab((tab, steps) => seen.set(tab, steps));
    expect([...seen.keys()].sort()).toEqual(TABS);
    expect(seen.get(TABS[0])?.length).toBe(867);
    for (const steps of seen.values()) {
      for (let i = 1; i < steps.length; i++) expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
      // The address as a reader says it: the export's trailing slash dropped.
      expect(steps.some((s) => s.path === "/prayers/morning")).toBe(true);
      expect(steps.some((s) => s.path === "/old")).toBe(false);
    }
    // Two reads for the window's ends, then three pages.
    expect(requests.filter((r) => r.rows === 1000)).toHaveLength(2);
    expect(requests.every((r) => r.ordered)).toBe(true);
  });

  it("answers an empty window with nothing", async () => {
    const { client } = cappedApi({ analytics_pageviews: rows.slice(0, 100) });
    const read = await readTabs(client, SINCE);
    expect(read.rows).toBe(0);
    let called = false;
    read.eachTab(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it("puts a page that came in out of step back in time order", async () => {
    const { client } = cappedApi({
      analytics_pageviews: [
        { id: 1, session_id: TABS[0], path: "/", ts: new Date(T0 + 2000).toISOString() },
        { id: 2, session_id: TABS[0], path: "/bible", ts: new Date(T0 + 1000).toISOString() },
      ],
    });
    const read = await readTabs(client, SINCE);
    const seen: Step[][] = [];
    read.eachTab((_, steps) => seen.push(steps));
    expect(seen[0].map((s) => s.path)).toEqual(["/bible", "/"]);
  });

  it("says when the tables are not there", async () => {
    const { client } = cappedApi({});
    await expect(readTabs(client, SINCE)).rejects.toMatchObject({ code: "PGRST205" });
  });
});

describe("where each tab was read", () => {
  const ANDROID_APP = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 PurifyNative";
  const IPHONE_WEB = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
  // 1,200 tabs in one of the four runs, so it takes two pages; one from before the window.
  const sessions = [
    ...Array.from({ length: 1200 }, (_, i) => ({
      session_id: `a${String(i).padStart(5, "0")}`,
      user_agent: i % 2 ? ANDROID_APP : IPHONE_WEB,
      last_seen: new Date(T0 + 3_600_000).toISOString(),
    })),
    { session_id: "0first", user_agent: IPHONE_WEB, last_seen: new Date(T0 + 1000).toISOString() },
    { session_id: "5silent", user_agent: "", last_seen: new Date(T0 + 1000).toISOString() },
    { session_id: "e-before", user_agent: ANDROID_APP, last_seen: new Date(T0 - 1000).toISOString() },
  ];

  it("reads every tab seen in the window, and tells the apps from the website", async () => {
    const { client } = cappedApi({ analytics_sessions: sessions });
    const places = await readTabPlaces(client, SINCE, 2);
    expect(places.size).toBe(1201);
    expect(places.get("a00001")).toBe("apps");
    expect(places.get("a00002")).toBe("web");
    expect(places.get("0first")).toBe("web");
    // A user agent that says nothing counts only under "both".
    expect(places.has("5silent")).toBe(false);
    expect(places.has("e-before")).toBe(false);
  });
});

describe("the screens' own counts", () => {
  const NOW = new Date("2026-12-01T12:00:00Z");
  const FROM = new Date("2026-10-02T12:00:00Z");
  const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const day = (i: number) => `2026-${i < 30 ? "10" : "11"}-${String((i % 30) + 1).padStart(2, "0")}T00:00:00Z`;
  const events = [
    ...Array.from({ length: 2500 }, (_, i) => ({
      id: id(i),
      name: "screen_closed",
      ts: day(5 + (i % 50)),
      props: { screen: "saint", open: "1m-5m", platform: "ios" },
    })),
    { id: id(9001), name: "first_open", ts: day(40), props: { platform: "web" } },
    { id: id(9002), name: "came_back", ts: day(41), props: { day: 1, platform: "web" } },
    // Not the screens' own: left alone.
    { id: id(9003), name: "onboarding_step", ts: day(40), props: { step: "welcome" } },
    { id: id(9004), name: "catechism_started", ts: day(40), props: {} },
    // Before the read.
    { id: id(9005), name: "first_open", ts: "2026-09-20T00:00:00Z", props: { platform: "web" } },
  ];

  it("reads every one from the start on, a week at a time, and nothing else", async () => {
    const { client, requests } = cappedApi({ analytics_events: events });
    const read = await readScreenEvents(client, FROM, NOW, 2);
    expect(read.truncated).toBe(false);
    expect(read.rows).toHaveLength(2502);
    expect(read.rows.filter((r) => r.name === "screen_closed")).toHaveLength(2500);
    expect(read.rows.some((r) => r.name.startsWith("onboarding_") || r.name.startsWith("catechism_"))).toBe(false);
    expect(requests.every((r) => r.ordered && r.rows <= 1000)).toBe(true);
  });
});

// The Engagement, Content and Audience tabs are counted by two database
// functions, and tallied here in the same way when those are absent. This
// holds the tally to its rules. rollupsMigration.test.ts holds the SQL file to
// what the code calls.
//
// The bug it exists for: three admin routes asked the API for 50,000 or
// 200,000 rows and counted what came back, and the API returns at most 1,000.
// Engagement reported exactly 1,000 views for every range.

import { describe, expect, it } from "vitest";

import {
  FALLBACK_PAGEVIEW_ROWS,
  ROLLUP_MIGRATION,
  audienceRollup,
  browserOf,
  cleanPath,
  isFunctionAbsent,
  isMobileAgent,
  pageviewRollup,
  rollupAudience,
  rollupPageviews,
} from "../rollups";

describe("cleanPath", () => {
  it("drops the query, the fragment and one trailing slash", () => {
    expect(cleanPath("/prayers/evening/")).toBe("/prayers/evening");
    expect(cleanPath("/bible/john/3?v=16#top")).toBe("/bible/john/3");
    expect(cleanPath("/saints/theotokos#life")).toBe("/saints/theotokos");
  });

  it("leaves the home page as a slash", () => {
    expect(cleanPath("/")).toBe("/");
    expect(cleanPath("")).toBe("/");
    expect(cleanPath(null)).toBe("/");
  });
});

describe("rollupPageviews", () => {
  const pv = [
    { session_id: "a", path: "/" },
    { session_id: "a", path: "/prayers/evening/" },
    { session_id: "a", path: "/prayers/evening" },
    { session_id: "b", path: "/prayers/evening?x=1" },
    { session_id: "b", path: "/bible/john/3" },
    { session_id: "c", path: "/bible/john/17/" },
    { session_id: "c", path: "/saints/theotokos" },
    { session_id: "c", path: "/saints" },
  ];
  const sessions = [
    { first_seen: "2026-10-01T23:50:00+00:00", last_seen: "2026-10-02T00:10:00+00:00" },
    { first_seen: "2026-10-02T08:00:00+00:00", last_seen: "2026-10-02T09:00:00+00:00" },
    { first_seen: null, last_seen: "2026-10-02T09:00:00+00:00" },
  ];
  const r = rollupPageviews(pv, sessions);

  it("counts every view and each session once", () => {
    expect(r.totals).toEqual({ views: 8, visitors: 3 });
  });

  it("treats a trailing slash and a query as the same page", () => {
    const evening = r.topByViews.find((p) => p.path === "/prayers/evening");
    expect(evening).toEqual({ path: "/prayers/evening", views: 3, visitors: 2 });
    expect(r.topByViews.some((p) => p.path === "/prayers/evening/")).toBe(false);
  });

  it("groups by the first segment, with the home page as null", () => {
    const by = Object.fromEntries(r.sections.map((s) => [String(s.segment), s]));
    expect(by.null).toMatchObject({ views: 1, visitors: 1 });
    expect(by.prayers).toMatchObject({ views: 3, visitors: 2 });
    expect(by.bible).toMatchObject({ views: 2, visitors: 2 });
    expect(by.saints).toMatchObject({ views: 2, visitors: 1 });
    // most views first
    expect(r.sections[0].segment).toBe("prayers");
  });

  it("counts a saint, a book, a council or a topic by its second segment", () => {
    expect(r.slugs).toEqual([
      { section: "bible", slug: "john", views: 2 },
      { section: "saints", slug: "theotokos", views: 1 },
    ]);
  });

  it("calls a session returning only when it spans two calendar days", () => {
    expect(r.sessions).toEqual({ total: 3, returning: 1 });
  });

  it("lists a page as revisited only once five sessions have reached it", () => {
    const rows = [
      ...["a", "b", "c", "d"].map((s) => ({ session_id: s, path: "/four" })),
      ...["a", "a", "a", "b", "c", "d", "e"].map((s) => ({ session_id: s, path: "/five" })),
    ];
    const out = rollupPageviews(rows, []);
    expect(out.revisited).toEqual([{ path: "/five", views: 7, visitors: 5 }]);
  });

  it("does not stop at a thousand rows", () => {
    const many = Array.from({ length: 2500 }, (_, i) => ({ session_id: `s${i % 700}`, path: `/bible/john/${i % 21}` }));
    const out = rollupPageviews(many, []);
    expect(out.totals).toEqual({ views: 2500, visitors: 700 });
    expect(out.slugs).toEqual([{ section: "bible", slug: "john", views: 2500 }]);
  });
});

describe("rollupAudience", () => {
  it("names the browser by the first test that matches, in order", () => {
    // Edge announces Chrome and Safari too; Chrome announces Safari.
    expect(browserOf("Mozilla/5.0 AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0")).toBe("Edge");
    expect(browserOf("Mozilla/5.0 AppleWebKit/537.36 Chrome/126.0 Safari/537.36")).toBe("Chrome");
    expect(browserOf("Mozilla/5.0 Gecko/20100101 Firefox/128.0")).toBe("Firefox");
    expect(browserOf("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1")).toBe("Safari");
    expect(browserOf("Googlebot/2.1")).toBe("Bot");
    expect(browserOf("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148")).toBe("Other");
    expect(browserOf(null)).toBe("Other");
  });

  it("tells a phone from a desktop", () => {
    expect(isMobileAgent("Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36")).toBe(true);
    expect(isMobileAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0 Safari/537.36")).toBe(false);
  });

  it("counts countries, regions and languages, skipping blanks", () => {
    const rows = [
      { country: "United States", country_code: "US", region: "Texas", accept_language: "en", user_agent: "Chrome/1 Mobile" },
      { country: "United States", country_code: "US", region: "", accept_language: "en", user_agent: "Chrome/1" },
      { country: null, country_code: null, region: null, accept_language: null, user_agent: null },
      { country: "Germany", country_code: "DE", region: "Bavaria", accept_language: "de", user_agent: "Firefox/1" },
    ];
    const r = rollupAudience(rows);
    expect(r.total).toBe(4);
    expect(r.countries[0]).toEqual({ name: "United States", code: "US", count: 2 });
    expect(r.countries.map((c) => c.name)).toContain("Unknown");
    expect(r.regions).toEqual([
      { country: "Germany", region: "Bavaria", code: "DE", count: 1 },
      { country: "United States", region: "Texas", code: "US", count: 1 },
    ]);
    expect(r.languages).toEqual([{ code: "en", count: 2 }, { code: "de", count: 1 }]);
    expect(r.devices).toEqual({ mobile: 1, desktop: 3 });
  });
});

describe("isFunctionAbsent", () => {
  it("knows PostgREST's answer and Postgres's", () => {
    expect(isFunctionAbsent({ code: "PGRST202", message: "Could not find the function public.x(p_since) in the schema cache" })).toBe(true);
    expect(isFunctionAbsent({ code: "42883", message: "function public.x(timestamptz) does not exist" })).toBe(true);
    expect(isFunctionAbsent({ code: "42501", message: "permission denied for function x" })).toBe(false);
    expect(isFunctionAbsent(null)).toBe(false);
  });
});

// A stand-in for the admin client: rpc answers as told, and a table read
// hands back the rows it was given, page by page, as the real one does.
function fakeAdmin(opts: {
  rpc: (name: string) => { data: unknown; error: { code?: string; message: string } | null };
  tables?: Record<string, unknown[]>;
}) {
  const asked: string[] = [];
  const client = {
    rpc: async (name: string) => {
      asked.push(`rpc:${name}`);
      return opts.rpc(name);
    },
    from: (table: string) => {
      const rows = opts.tables?.[table] ?? [];
      const q = {
        select: () => q,
        gte: () => q,
        order: () => q,
        range: async (from: number, to: number) => {
          asked.push(`${table}:${from}-${to}`);
          return { data: rows.slice(from, to + 1), error: null };
        },
      };
      return q;
    },
  };
  return { client: client as never, asked };
}

describe("pageviewRollup", () => {
  it("returns what the database counted, whole", async () => {
    const counted = { totals: { views: 230_040, visitors: 13_000 }, sessions: { total: 14_000, returning: 900 }, sections: [], topByVisitors: [], topByViews: [], revisited: [], slugs: [] };
    const { client, asked } = fakeAdmin({ rpc: () => ({ data: counted, error: null }) });
    const out = await pageviewRollup(client, "2026-09-03T00:00:00.000Z");
    expect(out.totals.views).toBe(230_040);
    expect(out.partial).toBeNull();
    expect(asked).toEqual(["rpc:admin_pageview_rollup"]);
  });

  it("reads in pages when the function is not there, and passes a thousand", async () => {
    const pageviews = Array.from({ length: 2300 }, (_, i) => ({ session_id: `s${i % 300}`, path: "/prayers" }));
    const { client, asked } = fakeAdmin({
      rpc: () => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }),
      tables: { analytics_pageviews: pageviews, analytics_sessions: [] },
    });
    const out = await pageviewRollup(client, "2026-09-03T00:00:00.000Z");
    expect(out.totals).toEqual({ views: 2300, visitors: 300 });
    expect(out.partial).toBeNull();
    expect(asked.filter((a) => a.startsWith("analytics_pageviews:"))).toHaveLength(3);
  });

  it("says so when the cap cut the read short", async () => {
    const pageviews = Array.from({ length: FALLBACK_PAGEVIEW_ROWS + 500 }, (_, i) => ({ session_id: `s${i}`, path: "/" }));
    const { client } = fakeAdmin({
      rpc: () => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }),
      tables: { analytics_pageviews: pageviews, analytics_sessions: [] },
    });
    const out = await pageviewRollup(client, "2026-09-03T00:00:00.000Z");
    expect(out.totals.views).toBe(FALLBACK_PAGEVIEW_ROWS);
    expect(out.partial).toEqual({ rows: FALLBACK_PAGEVIEW_ROWS, needs: ROLLUP_MIGRATION });
  });

  it("throws on any other failure rather than reporting zeros", async () => {
    const { client } = fakeAdmin({ rpc: () => ({ data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } }) });
    await expect(pageviewRollup(client, "2026-09-03T00:00:00.000Z")).rejects.toThrow(/statement timeout/);
  });
});

describe("audienceRollup", () => {
  it("reads every session in pages when the function is not there", async () => {
    const sessions = Array.from({ length: 1400 }, () => ({ country: "Lebanon", country_code: "LB", region: null, accept_language: "ar", user_agent: "Chrome/1 Mobile" }));
    const { client } = fakeAdmin({
      rpc: () => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }),
      tables: { analytics_sessions: sessions },
    });
    const out = await audienceRollup(client, "2026-09-03T00:00:00.000Z");
    expect(out.total).toBe(1400);
    expect(out.countries).toEqual([{ name: "Lebanon", code: "LB", count: 1400 }]);
    expect(out.partial).toBeNull();
  });
});

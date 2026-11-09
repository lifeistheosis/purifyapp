// The metrics client sits in front of money, so what it does when the third
// party misbehaves matters more than what it does when everything works.
// Every case here is a failure mode that must degrade to the estimate rather
// than to a blank panel or a thrown request.
//
// The fixtures are the shape RevenueCat documents (OverviewMetrics and
// RevenueMetric in its OpenAPI schema). Until 2026-11-09 they were a flat
// object RevenueCat never sends, so the suite was green while every real
// answer was thrown away; the first test below holds that line.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProjectMetrics,
  getRevenueBetween,
  parseOverview,
  parseRevenue,
  realArpuAnnual,
  revenuecatMetricsConfigured,
  __resetMetricsCache,
} from "../revenuecatMetrics";

const metric = (id: string, value: number, period: "P0D" | "P28D" = "P0D", iso: string | null = "2026-11-09 09:45:00.123000+00:00") => ({
  object: "overview_metric",
  id,
  name: id,
  description: period === "P28D" ? "Last 28 days" : "In total",
  unit: id === "mrr" || id === "revenue" ? "$" : "#",
  period,
  value,
  last_updated_at: iso ? Date.parse(iso.replace(" ", "T")) : null,
  last_updated_at_iso8601: iso,
});

const OK = {
  object: "overview_metrics",
  metrics: [
    metric("active_trials", 2),
    metric("active_subscriptions", 9),
    metric("mrr", 412.5),
    metric("revenue", 388.1, "P28D", "2026-11-09 10:00:00.000000+00:00"),
    metric("new_customers", 140, "P28D"),
    metric("active_users", 2310, "P28D"),
  ],
};

function mockFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

beforeEach(() => {
  __resetMetricsCache();
  process.env.REVENUECAT_V2_API_KEY = "sk_test";
  process.env.REVENUECAT_PROJECT_ID = "proj_test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.REVENUECAT_V2_API_KEY;
  delete process.env.REVENUECAT_PROJECT_ID;
});

describe("configuration", () => {
  it("needs both the key and the project", () => {
    expect(revenuecatMetricsConfigured()).toBe(true);
    delete process.env.REVENUECAT_PROJECT_ID;
    expect(revenuecatMetricsConfigured()).toBe(false);
  });

  it("does not call out at all when unconfigured", async () => {
    delete process.env.REVENUECAT_V2_API_KEY;
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await getProjectMetrics()).toBeNull();
    expect(await getRevenueBetween("2026-11-01", "2026-11-09")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("the overview's shape", () => {
  it("refuses the flat shape the old parser expected, which RevenueCat never sends", () => {
    // The bug of record: mrr, arr and total_revenue read off the top of the
    // body. A body like this is not RevenueCat's, so it is not a reading.
    expect(parseOverview({ mrr: 412.5, arr: 4950, total_revenue: 1830.25, active_subscriptions: 9 })).toBeNull();
  });

  it("reads the documented list of metrics by id", () => {
    expect(parseOverview(OK)).toEqual({
      mrr: 412.5,
      activeSubscriptions: 9,
      activeTrials: 2,
      revenue28d: 388.1,
      newCustomers28d: 140,
      activeCustomers28d: 2310,
      currency: "USD",
      // The newest of the metrics' own stamps.
      lastUpdatedAt: "2026-11-09T10:00:00.000Z",
    });
  });

  it("takes a currency the body names, and the one asked for when it names none", () => {
    expect(parseOverview({ ...OK, currency: "eur" })?.currency).toBe("EUR");
    expect(parseOverview(OK, "USD")?.currency).toBe("USD");
  });

  it("refuses a list with no core metric in it", () => {
    expect(parseOverview({ object: "overview_metrics", metrics: [metric("new_customers", 3, "P28D")] })).toBeNull();
    expect(parseOverview({ object: "overview_metrics", metrics: [] })).toBeNull();
    expect(parseOverview({ currency: "EUR" })).toBeNull();
    expect(parseOverview(null)).toBeNull();
  });

  it("still maps a list carrying one core metric, the rest genuinely absent", () => {
    const m = parseOverview({ object: "overview_metrics", metrics: [metric("mrr", 12.5)] });
    expect(m).toMatchObject({ mrr: 12.5, activeSubscriptions: 0, activeTrials: 0, revenue28d: null });
  });

  it("skips entries without an id or a finite value rather than reading them as zero", () => {
    const m = parseOverview({
      metrics: [metric("mrr", 10), { id: "active_subscriptions", value: "9" }, { value: 4 }, { id: "revenue", value: Number.NaN }],
    });
    expect(m).toMatchObject({ mrr: 10, activeSubscriptions: 0, revenue28d: null });
  });
});

describe("reading the overview", () => {
  it("asks the project's own endpoint, in dollars, with the bearer key", async () => {
    const f = vi.fn(() => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const m = await getProjectMetrics();
    expect(m?.mrr).toBe(412.5);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v2/projects/proj_test/metrics/overview");
    expect(url).toContain("currency=USD");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
  });

  it("returns null for a 200 it does not recognise", async () => {
    mockFetch(() => new Response(JSON.stringify({ currency: "EUR" }), { status: 200 }));
    expect(await getProjectMetrics()).toBeNull();
  });
});

describe("degrading", () => {
  it("returns null on 403, which is the missing-permission case", async () => {
    // charts_metrics:overview:read is a separate scope and easy to forget when
    // minting the key. It must read as "no data", never as an outage.
    mockFetch(() => new Response("{}", { status: 403 }));
    expect(await getProjectMetrics()).toBeNull();
  });

  it("returns null on 429 rather than throwing", async () => {
    mockFetch(() => new Response("{}", { status: 429 }));
    expect(await getProjectMetrics()).toBeNull();
  });

  it("returns null when the network fails", async () => {
    mockFetch(() => Promise.reject(new Error("ECONNRESET")));
    expect(await getProjectMetrics()).toBeNull();
    expect(await getRevenueBetween("2026-11-01", "2026-11-09")).toBeNull();
  });

  it("returns null on a body that is not JSON", async () => {
    mockFetch(() => new Response("<html>maintenance</html>", { status: 200 }));
    expect(await getProjectMetrics()).toBeNull();
  });
});

describe("caching", () => {
  it("does not hammer a working endpoint", async () => {
    const f = vi.fn(() => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await getProjectMetrics();
    await getProjectMetrics();
    await getProjectMetrics();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("caches the failure too, so a bad key is not retried every render", async () => {
    const f = vi.fn(() => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", f);
    await getProjectMetrics();
    await getProjectMetrics();
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("revenue for a span of days", () => {
  const BODY = { object: "revenue_metric", start_date: "2026-11-01", end_date: "2026-11-09", currency: "USD", value: 123.45 };

  it("parses the documented body", () => {
    expect(parseRevenue(BODY, "2026-11-01", "2026-11-09")).toEqual({
      value: 123.45,
      currency: "USD",
      startDate: "2026-11-01",
      endDate: "2026-11-09",
    });
    expect(parseRevenue({ value: "123" }, "2026-11-01", "2026-11-09")).toBeNull();
    expect(parseRevenue({}, "2026-11-01", "2026-11-09")).toBeNull();
  });

  it("asks for the inclusive range in dollars", async () => {
    const f = vi.fn(() => new Response(JSON.stringify(BODY), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await getRevenueBetween("2026-11-01", "2026-11-09");
    expect(r?.value).toBe(123.45);
    const [url] = f.mock.calls[0] as unknown as [string];
    expect(url).toContain("/v2/projects/proj_test/metrics/revenue?");
    expect(url).toContain("start_date=2026-11-01");
    expect(url).toContain("end_date=2026-11-09");
    expect(url).toContain("currency=USD");
  });

  it("caches each range, and asks again for a different one", async () => {
    const f = vi.fn(() => new Response(JSON.stringify(BODY), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await getRevenueBetween("2026-11-01", "2026-11-09");
    await getRevenueBetween("2026-11-01", "2026-11-09");
    expect(f).toHaveBeenCalledTimes(1);
    await getRevenueBetween("2026-11-09", "2026-11-09");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("never asks with a malformed or backwards range", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await getRevenueBetween("2026-11-09", "2026-11-01")).toBeNull();
    expect(await getRevenueBetween("2026-11-1", "2026-11-09")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null on a refusal", async () => {
    mockFetch(() => new Response("{}", { status: 403 }));
    expect(await getRevenueBetween("2026-11-01", "2026-11-09")).toBeNull();
  });
});

describe("real ARPU", () => {
  it("annualises MRR per subscriber", () => {
    expect(realArpuAnnual({ mrr: 412.5, activeSubscriptions: 9 })).toBeCloseTo(550, 6);
  });

  it("refuses to divide by no subscribers", () => {
    expect(realArpuAnnual({ mrr: 412.5, activeSubscriptions: 0 })).toBeNull();
  });
});

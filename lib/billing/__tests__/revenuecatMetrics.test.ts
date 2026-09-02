// The metrics client sits in front of money, so what it does when the third
// party misbehaves matters more than what it does when everything works.
// Every case here is a failure mode that must degrade to the estimate rather
// than to a blank panel or a thrown request.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProjectMetrics,
  realArpuAnnual,
  revenuecatMetricsConfigured,
  __resetMetricsCache,
} from "../revenuecatMetrics";

const OK = {
  mrr: 412.5,
  arr: 4950,
  active_subscriptions: 9,
  active_trials: 2,
  total_revenue: 1830.25,
  currency: "USD",
  last_updated_at: "2026-08-21T00:00:00Z",
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
    expect(f).not.toHaveBeenCalled();
  });
});

describe("reading", () => {
  it("maps the payload", async () => {
    mockFetch(() => new Response(JSON.stringify(OK), { status: 200 }));
    const m = await getProjectMetrics();
    expect(m).toEqual({
      mrr: 412.5,
      arr: 4950,
      activeSubscriptions: 9,
      activeTrials: 2,
      totalRevenue: 1830.25,
      currency: "USD",
      lastUpdatedAt: "2026-08-21T00:00:00Z",
    });
  });

  it("sends the bearer key to the project's own endpoint", async () => {
    const f = vi.fn(() => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await getProjectMetrics();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v2/projects/proj_test/metrics/overview");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
  });

  it("refuses a 200 whose body carries no recognised metric", async () => {
    // THIS TEST USED TO ASSERT THE BUG. It required {currency:"EUR"} to come
    // back as a complete all-zero metrics object, on the reasoning that a
    // vendor shape change must not put NaN into a money column. Avoiding NaN
    // was right; reaching zero was not.
    //
    // A non-null result means "real, billed figures", and the revenue route
    // reads it as such: estimated:false, source:"revenuecat", and the panel
    // prints "Subs MRR - real $0.00" with prose asserting the zero is billed
    // truth. Null is the honest answer, and every caller already falls back
    // to the clearly-labelled list-price estimate.
    mockFetch(() => new Response(JSON.stringify({ currency: "EUR" }), { status: 200 }));
    expect(await getProjectMetrics()).toBeNull();
  });

  it("still maps a body carrying even one recognised metric", async () => {
    // The guard rejects unrecognised shapes, not partial ones. A payload with
    // a real mrr and nothing else is a vendor that dropped a field, and the
    // zeros around it are then genuinely zero.
    mockFetch(() =>
      new Response(JSON.stringify({ mrr: 12.5, currency: "EUR" }), { status: 200 }),
    );
    const m = await getProjectMetrics();
    expect(m).toMatchObject({ mrr: 12.5, arr: 0, activeSubscriptions: 0, currency: "EUR" });
    expect(Number.isNaN(m!.mrr)).toBe(false);
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
    // 25 requests a minute, and the revenue tab polls.
    mockFetch(() => new Response("{}", { status: 429 }));
    expect(await getProjectMetrics()).toBeNull();
  });

  it("returns null when the network fails", async () => {
    mockFetch(() => Promise.reject(new Error("ECONNRESET")));
    expect(await getProjectMetrics()).toBeNull();
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

describe("real ARPU", () => {
  it("annualises MRR per subscriber", () => {
    expect(realArpuAnnual({ ...OK, mrr: 412.5, activeSubscriptions: 9 } as never)).toBeCloseTo(
      550,
      6,
    );
  });

  it("refuses to divide by no subscribers", () => {
    expect(realArpuAnnual({ ...OK, activeSubscriptions: 0 } as never)).toBeNull();
  });
});

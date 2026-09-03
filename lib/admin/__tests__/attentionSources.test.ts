import { describe, expect, it } from "vitest";

import {
  readApiLimitsSlice,
  readCommunitySlice,
  readOverviewSlice,
  readProbeSlice,
  readSupportSlice,
  readVerificationSlice,
  toSourceState,
} from "../attentionSources";

/**
 * Each reader gets the real payload shape and a wrong one. The wrong one must
 * come back null, never a zero: null is "not answering" in the strip, and zero
 * is a measurement the panel would be standing behind.
 */
describe("readOverviewSlice", () => {
  const real = {
    revenueTodayCents: 1200,
    ordersDegraded: false,
    ordersPending: 31,
    ordersPendingStale: 31,
    ordersPendingUnchecked: 31,
    pendingNewestStaleAt: "2026-08-30T12:00:00Z",
    lastWebhookAt: null,
    lastWebhookLogReadable: false,
    lastWebhookLogMissing: true,
    lastReconcileAt: null,
  };

  it("reads the real shape", () => {
    expect(readOverviewSlice(real)).toEqual({
      ordersDegraded: false,
      ordersPending: 31,
      staleMeasured: true,
      ordersPendingStale: 31,
      ordersPendingUnchecked: 31,
      pendingNewestStaleAt: "2026-08-30T12:00:00Z",
      lastWebhookAt: null,
      lastWebhookLogReadable: false,
      lastWebhookLogMissing: true,
      lastReconcileAt: null,
    });
  });

  it("reads a server that predates the stale fields as unmeasured, not unstale", () => {
    const old = { ordersDegraded: false, ordersPending: 2 };
    const r = readOverviewSlice(old);
    expect(r?.staleMeasured).toBe(false);
    expect(r?.lastWebhookLogReadable).toBe(false);
  });

  it("reads null stale fields as unmeasured", () => {
    const r = readOverviewSlice({ ...real, ordersPendingStale: null, ordersPendingUnchecked: null });
    expect(r?.staleMeasured).toBe(false);
  });

  it("accepts a null pending count as a documented value", () => {
    const r = readOverviewSlice({ ...real, ordersPending: null });
    expect(r).not.toBeNull();
    expect(r?.ordersPending).toBeNull();
  });

  it("refuses a body with no order count, or one that is not a number", () => {
    expect(readOverviewSlice({ error: "Forbidden" })).toBeNull();
    expect(readOverviewSlice(null)).toBeNull();
    expect(readOverviewSlice({ ordersPending: "31", ordersDegraded: false })).toBeNull();
    expect(readOverviewSlice({ ordersDegraded: false })).toBeNull();
  });
});

describe("readProbeSlice", () => {
  it("reads probes and keeps skipped ones", () => {
    const r = readProbeSlice({
      probes: [
        { service: "Supabase Postgres", status: "ok", detail: "x", latencyMs: 12 },
        { service: "Render (deploys)", status: "skipped", detail: "unset", latencyMs: null },
      ],
    });
    expect(r?.probes).toHaveLength(2);
    expect(r?.probes[1].status).toBe("skipped");
  });

  it("refuses an empty list, an unknown status, or a missing service", () => {
    expect(readProbeSlice({ probes: [] })).toBeNull();
    expect(readProbeSlice({ probes: [{ service: "x", status: "meh", detail: "" }] })).toBeNull();
    expect(readProbeSlice({ probes: [{ status: "ok", detail: "" }] })).toBeNull();
    expect(readProbeSlice({ error: "Forbidden" })).toBeNull();
  });
});

describe("queue readers", () => {
  it("counts open tickets only", () => {
    const r = readSupportSlice({
      tickets: [{ status: "open" }, { status: "pending" }, { status: "open" }, { status: "closed" }],
    });
    expect(r).toEqual({ open: 2 });
  });

  it("reads the counts-only shapes the strip asks for", () => {
    expect(readSupportSlice({ open: 3 })).toEqual({ open: 3 });
    expect(readCommunitySlice({ recipes: 2, reports: 5 })).toEqual({ recipes: 2, reports: 5 });
  });

  it("counts requested verifications only", () => {
    const r = readVerificationSlice({
      requests: [{ status: "requested" }, { status: "verified" }, { status: "declined" }],
    });
    expect(r).toEqual({ requested: 1 });
  });

  it("splits moderation into recipes and reports", () => {
    const r = readCommunitySlice({
      pendingRecipes: [{}, {}],
      campaignReports: [{}],
      recipeReports: [],
      conversationReports: [{}, {}],
      recentPosts: [{}],
    });
    expect(r).toEqual({ recipes: 2, reports: 3 });
  });

  it("refuses an error body for each", () => {
    expect(readSupportSlice({ error: "Forbidden" })).toBeNull();
    expect(readVerificationSlice({ error: "Forbidden" })).toBeNull();
    expect(readCommunitySlice({ error: "Forbidden" })).toBeNull();
    // A community body missing one of its four arrays is not a smaller queue.
    expect(readCommunitySlice({ pendingRecipes: [], campaignReports: [] })).toBeNull();
  });
});

describe("readApiLimitsSlice", () => {
  it("reads the ceiling, not the floor, and turns a null count into unmeasured", () => {
    const r = readApiLimitsSlice({ monthlyCalls: null, mau: { ceiling: 500, floor: 0 } });
    expect(r?.calls.status).toBe("unmeasured");
    expect(r?.mau.used).toBe(500);
    expect(r?.mau.status).toBe("ok");
  });

  it("refuses a body without mau", () => {
    expect(readApiLimitsSlice({ monthlyCalls: 5 })).toBeNull();
  });
});

describe("toSourceState", () => {
  const at = new Date("2026-09-01T12:00:00Z");
  const read = (d: unknown) => (typeof d === "object" && d && "n" in d ? { n: (d as { n: number }).n } : null);

  it("is loading before the first answer", () => {
    expect(toSourceState({ data: null, loading: true, failing: false, lastSynced: null }, read)).toEqual({
      status: "loading",
      data: null,
      at: null,
    });
  });

  it("is failed when the read is failing, even with a stale value in hand", () => {
    // A count from an hour ago is a claim the panel cannot stand behind.
    const s = toSourceState({ data: { n: 3 }, loading: false, failing: true, lastSynced: at }, read);
    expect(s.status).toBe("failed");
    expect(s.data).toBeNull();
  });

  it("is failed on a shape it cannot read", () => {
    expect(toSourceState({ data: { error: "Forbidden" }, loading: false, failing: false, lastSynced: at }, read).status).toBe("failed");
  });

  it("is ok with the parsed slice and the read time", () => {
    expect(toSourceState({ data: { n: 3 }, loading: false, failing: false, lastSynced: at }, read)).toEqual({
      status: "ok",
      data: { n: 3 },
      at: at.getTime(),
    });
  });
});

import { describe, expect, it } from "vitest";

import { badgeFor, deriveAttention, type AttentionInputs, type SourceState } from "../attention";
import { readCommunitySlice, readProbeSlice } from "../attentionSources";
import { readUsageLimit, API_BIBLE_LIMITS } from "../insights/apiLimits";

/**
 * What the Tools pages (r3-17, his picks of 2026-10-30) add to the summary
 * the strip, Home and the rail all read: a failed Render deploy said as
 * what it is.
 */

const NOW = Date.parse("2026-10-30T18:00:00Z");
const ok = <T,>(data: T): SourceState<T> => ({ status: "ok", data, at: NOW - 30_000 });

const calm = (): AttentionInputs => ({
  overview: ok({
    ordersDegraded: false,
    ordersPending: 0,
    staleMeasured: true,
    ordersPendingStale: 0,
    ordersPendingUnchecked: 0,
    pendingNewestStaleAt: null,
    lastWebhookAt: new Date(NOW - 60_000).toISOString(),
    lastWebhookLogReadable: true,
    lastWebhookLogMissing: false,
    lastReconcileAt: null,
  }),
  internal: ok({ probes: [{ service: "Supabase Postgres", status: "ok", detail: "" }] }),
  outbound: ok({ probes: [{ service: "Render (deploys)", status: "ok", detail: "" }] }),
  support: ok({ open: 0 }),
  verification: ok({ requested: 0 }),
  community: ok({ recipes: 0, reports: 0 }),
  planner: ok({ overdue: 0, today: 0 }),
  apiLimits: ok({
    calls: readUsageLimit("calls", "Monthly API calls", 1000, API_BIBLE_LIMITS.monthlyCalls),
    mau: readUsageLimit("mau", "Monthly active users", 500, API_BIBLE_LIMITS.monthlyActiveUsers),
  }),
  overviewMisses: 0,
  localReconcileAt: null,
});

describe("a failed Render deploy", () => {
  it("is read through the probe slice with its commit", () => {
    const slice = readProbeSlice({
      probes: [
        { service: "Render (deploys)", status: "fail", detail: "x", deploy: { failed: true, commit: "1a2b3c4", status: "build_failed" } },
        { service: "ipwho.is (geo enrichment)", status: "ok", detail: "", deploy: "junk" },
      ],
    });
    expect(slice?.probes[0].deploy).toEqual({ failed: true, commit: "1a2b3c4" });
    expect(slice?.probes[1]).not.toHaveProperty("deploy");
  });

  it("is a warning that says the site still serves the deploy before it", () => {
    const i = calm();
    i.outbound = ok({ probes: [{ service: "Render (deploys)", status: "fail", detail: "x", deploy: { failed: true, commit: "1a2b3c4" } }] });
    const s = deriveAttention(i);
    expect(s.faults).toHaveLength(1);
    expect(s.faults[0]).toMatchObject({
      level: "warn",
      label: "Render: the latest deploy failed",
      title: "The latest deploy failed",
      go: { tab: "health" },
    });
    expect(s.faults[0].body).toContain("Build 1a2b3c4 failed.");
    expect(s.faults[0].body).toContain("still serves the deploy before it");
  });

  it("keeps the old words for a Render that did not answer", () => {
    const i = calm();
    i.outbound = ok({ probes: [{ service: "Render (deploys)", status: "fail", detail: "HTTP 503" }] });
    expect(deriveAttention(i).faults[0].label).toBe("Render probe failed");
  });
});

describe("the rail's count for Community (one queue)", () => {
  it("reads held and waiting from the counts-only payload", () => {
    expect(readCommunitySlice({ recipes: 1, reports: 4, held: 2, waiting: 4 })).toEqual({ recipes: 1, reports: 4, held: 2, waiting: 4 });
    expect(readCommunitySlice({ recipes: 1, reports: 4 })).toEqual({ recipes: 1, reports: 4 });
  });

  it("wears the number of rows the page shows, held posts counted", () => {
    const i = calm();
    i.community = ok({ recipes: 1, reports: 4, held: 2, waiting: 4 });
    const s = deriveAttention(i);
    expect(badgeFor(s, "community")).toEqual({ count: 4, title: "4 awaiting moderation" });
    const q = s.queues.find((x) => x.source === "community")!;
    expect(q.body).toBe("2 posts held, 4 reports and 1 recipe are waiting for a decision.");
  });

  it("counts held posts even from a payload without the row count", () => {
    const i = calm();
    i.community = ok({ recipes: 0, reports: 0, held: 1 });
    const s = deriveAttention(i);
    expect(badgeFor(s, "community")?.count).toBe(1);
    expect(s.queues.find((x) => x.source === "community")!.body).toBe("1 post held is waiting for a decision.");
  });
});

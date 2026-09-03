import { describe, expect, it } from "vitest";

import {
  attentionTabs,
  badgeFor,
  deriveAttention,
  headline,
  probeLevel,
  rankItems,
  stalePending,
  type AttentionInputs,
  type AttentionSummary,
  type OverviewAlertFields,
  type SourceState,
} from "../attention";
import { readUsageLimit, API_BIBLE_LIMITS } from "../insights/apiLimits";

const NOW = Date.parse("2026-09-01T12:00:00Z");
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const ok = <T,>(data: T, at = NOW - 30_000): SourceState<T> => ({ status: "ok", data, at });
const failed = <T,>(): SourceState<T> => ({ status: "failed", data: null, at: null });
const loading = <T,>(): SourceState<T> => ({ status: "loading", data: null, at: null });

const calmOverview: OverviewAlertFields = {
  ordersDegraded: false,
  ordersPending: 0,
  staleMeasured: true,
  ordersPendingStale: 0,
  ordersPendingUnchecked: 0,
  pendingNewestStaleAt: null,
  lastWebhookAt: iso(60_000),
  lastWebhookLogReadable: true,
  lastWebhookLogMissing: false,
  lastReconcileAt: null,
};

const probesOk = {
  probes: [
    { service: "Supabase Postgres", status: "ok" as const, detail: "" },
    { service: "Rate limiter (rate_limit_hit)", status: "ok" as const, detail: "" },
  ],
};
const outboundOk = {
  probes: [
    { service: "API.Bible (licensed Scripture)", status: "ok" as const, detail: "" },
    { service: "Buy Me a Coffee", status: "skipped" as const, detail: "BMC_ACCESS_TOKEN not set" },
    { service: "ipwho.is (geo enrichment)", status: "ok" as const, detail: "" },
    { service: "Render (deploys)", status: "skipped" as const, detail: "" },
  ],
};
const limitsOk = {
  calls: readUsageLimit("calls", "Monthly API calls", 1000, API_BIBLE_LIMITS.monthlyCalls),
  mau: readUsageLimit("mau", "Monthly active users", 500, API_BIBLE_LIMITS.monthlyActiveUsers),
};

/** Everything answered, nothing wrong, nobody waiting. */
const calm = (): AttentionInputs => ({
  overview: ok(calmOverview),
  internal: ok(probesOk),
  outbound: ok(outboundOk),
  support: ok({ open: 0 }),
  verification: ok({ requested: 0 }),
  community: ok({ recipes: 0, reports: 0 }),
  apiLimits: ok(limitsOk),
  overviewMisses: 0,
  localReconcileAt: null,
});

/** What /admin/shell-preview produces: every route answers 403. */
const allFailed = (): AttentionInputs => ({
  overview: failed(),
  internal: failed(),
  outbound: failed(),
  support: failed(),
  verification: failed(),
  community: failed(),
  apiLimits: failed(),
  overviewMisses: 1,
  localReconcileAt: null,
});

const allStrings = (s: AttentionSummary, now: number): string[] => {
  const h = headline(s, now);
  return [
    h.text,
    h.meta ?? "",
    ...s.items.flatMap((it) => [it.word, it.label, it.title, it.body, it.go.label, it.also?.label ?? ""]),
  ];
};

describe("what must never fire", () => {
  it("is checking, not clear, before anything has answered", () => {
    const i = calm();
    i.support = loading();
    const s = deriveAttention(i);
    expect(s.state).toBe("checking");
    expect(headline(s, NOW).text).toBe("Checking");
  });

  it("can never say clear while any source has failed", () => {
    const i = calm();
    i.community = failed();
    const s = deriveAttention(i);
    expect(s.state).toBe("unknown");
    expect(s.unanswered).toBe(1);
    expect(s.unmeasured[0].label).toBe("Community");
    expect(headline(s, NOW).text).toBe("Cannot tell. 1 check did not answer.");
  });

  it("shows the shell-preview replay as unknown with seven chips and no clear anywhere", () => {
    const s = deriveAttention(allFailed());
    expect(s.state).toBe("unknown");
    expect(s.unmeasured).toHaveLength(7);
    expect(s.faults).toHaveLength(0);
    expect(s.queues).toHaveLength(0);
    expect(s.answered).toBe(0);
    expect(headline(s, NOW).text).toBe("Cannot tell. 7 checks did not answer.");
    for (const str of allStrings(s, NOW)) expect(str.toLowerCase()).not.toContain("clear");
  });

  it("never turns a failed overview into 0 awaiting payment", () => {
    const i = calm();
    i.overview = failed();
    const s = deriveAttention(i);
    expect(s.queues).toHaveLength(0);
    expect(badgeFor(s, "orders")).toBeNull();
    expect(s.unmeasured.map((u) => u.label)).toContain("Orders and revenue");
  });

  it("never lets a queue into the faults, whatever its size", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersPending: 400 });
    i.support = ok({ open: 90 });
    const s = deriveAttention(i);
    expect(s.state).toBe("clear");
    expect(s.faults).toHaveLength(0);
    expect(s.queues).toHaveLength(2);
    expect(s.worst).toBeNull();
  });

  it("never reports a skipped probe", () => {
    const s = deriveAttention(calm());
    expect(s.faults).toHaveLength(0);
  });

  it("never says passed while something did not answer", () => {
    const i = calm();
    i.verification = failed();
    const s = deriveAttention(i);
    expect(headline(s, NOW).text).not.toContain("passed");
  });

  it("counts an unmeasured API.Bible ceiling as unchecked, not clear", () => {
    const i = calm();
    i.apiLimits = ok({
      calls: readUsageLimit("calls", "Monthly API calls", null, API_BIBLE_LIMITS.monthlyCalls),
      mau: limitsOk.mau,
    });
    const s = deriveAttention(i);
    expect(s.state).toBe("unknown");
    expect(s.unmeasured[0].label).toBe("API.Bible usage");
  });
});

describe("the calm day", () => {
  it("is clear, and says how many checks passed and when", () => {
    const i = calm();
    const s = deriveAttention(i);
    expect(s.state).toBe("clear");
    expect(s.answered).toBe(7);
    const h = headline(s, NOW);
    expect(h.text).toBe("Nothing is broken. 7 checks passed.");
    // The clock is meta, never text: text feeds a live region, and a clock
    // in it would re-announce the band once a minute.
    expect(h.meta).toBe("checked 30s ago");
  });

  it("dates itself by the OLDEST successful read", () => {
    const i = calm();
    i.support = ok({ open: 0 }, NOW - 9 * 60_000);
    const s = deriveAttention(i);
    expect(s.checkedAt).toBe(NOW - 9 * 60_000);
    expect(headline(s, NOW).meta).toContain("9m ago");
  });

  it("lists which sources have not answered yet", () => {
    const i = calm();
    i.support = loading();
    i.community = loading();
    const s = deriveAttention(i);
    expect(s.state).toBe("checking");
    expect(s.loading).toEqual(["support", "community"]);
  });

  it("treats a pending count the route could not take as unmeasured, never as a queue of zero", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersPending: null, staleMeasured: false });
    const s = deriveAttention(i);
    expect(s.queues).toHaveLength(0);
    expect(s.faults).toHaveLength(0);
    expect(s.unmeasured.map((u) => u.source)).toEqual(["overview"]);
    expect(s.state).toBe("unknown");
  });

  it("skips the stale rule, and says so, when staleness was not measured", () => {
    const i = calm();
    i.overview = ok({
      ...calmOverview,
      ordersPending: 31,
      staleMeasured: false,
      ordersPendingStale: 0,
      ordersPendingUnchecked: 0,
      lastWebhookAt: null,
    });
    const s = deriveAttention(i);
    expect(s.faults).toHaveLength(0);
    expect(s.unmeasured.map((u) => u.source)).toEqual(["overview"]);
    // The queue is still a fact.
    expect(s.queues[0].count).toBe(31);
  });
});

describe("the stale-orders rule", () => {
  const stale = (over: Partial<OverviewAlertFields>): OverviewAlertFields => ({
    ...calmOverview,
    ordersPending: 31,
    ordersPendingStale: 31,
    ordersPendingUnchecked: 31,
    pendingNewestStaleAt: iso(2 * DAY),
    ...over,
  });

  it("replays 2026-09-01 on the production of that day as exactly one serious finding naming the migration", () => {
    // Log table absent: the panel cannot tell whether Stripe called.
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: null, lastWebhookLogReadable: false, lastWebhookLogMissing: true }));
    const s = deriveAttention(i);
    expect(s.state).toBe("findings");
    expect(s.faults).toHaveLength(1);
    const f = s.faults[0];
    expect(f.level).toBe("serious");
    expect(f.go.tab).toBe("revenue");
    expect(f.label).toBe("31 orders unpaid over a day, cannot tell whether Stripe called");
    expect(f.body).toContain("20260823_admin_activity_log.sql");
    expect(headline(s, NOW).text).toBe("1 thing needs attention");
  });

  it("is serious when the log is readable and holds no webhook at all, and says no record rather than silent", () => {
    // On the day the log migration lands the log is empty whatever Stripe has
    // been doing, so an empty log must not be stated as Stripe going quiet.
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: null }));
    const f = deriveAttention(i).faults[0];
    expect(f.level).toBe("serious");
    expect(f.label).toBe("31 orders unpaid over a day, no Stripe webhook on record");
    expect(f.body).toContain("log is younger");
    expect(f.also?.tab).toBe("orders");
  });

  it("is serious when Stripe last called BEFORE the newest stale order", () => {
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: iso(3 * DAY) }));
    const f = deriveAttention(i).faults[0];
    expect(f.level).toBe("serious");
    expect(f.label).toBe("31 orders unpaid over a day, Stripe silent");
  });

  it("drops to a warning when Stripe has called since the newest stale order", () => {
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: iso(DAY) }));
    const f = deriveAttention(i).faults[0];
    expect(f.level).toBe("warn");
    expect(f.label).toBe("31 orders unpaid over a day");
    expect(f.body).toContain("abandoned");
  });

  it("is silent once every stale order has been checked", () => {
    const i = calm();
    i.overview = ok(stale({ ordersPendingUnchecked: 0 }));
    const s = deriveAttention(i);
    expect(s.faults).toHaveLength(0);
    // The queue still shows they are pending; that is a fact, not a fault.
    expect(s.queues[0].count).toBe(31);
  });

  it("is cleared by a reconcile this browser applied after the newest stale order", () => {
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: null, lastReconcileAt: null }));
    i.localReconcileAt = iso(DAY);
    expect(deriveAttention(i).faults).toHaveLength(0);
  });

  it("is not cleared by a local reconcile OLDER than the newest stale order", () => {
    const i = calm();
    i.overview = ok(stale({ lastWebhookAt: null }));
    i.localReconcileAt = iso(5 * DAY);
    expect(deriveAttention(i).faults).toHaveLength(1);
  });

  it("agrees its verbs with one order", () => {
    const one = { ordersPending: 1, ordersPendingStale: 1, ordersPendingUnchecked: 1 };
    const i = calm();
    i.overview = ok(stale({ ...one, lastWebhookAt: null }));
    let f = deriveAttention(i).faults[0];
    expect(f.label).toBe("1 order unpaid over a day, no Stripe webhook on record");
    expect(f.body).toContain("1 order has sat pending");
    expect(f.body).not.toContain("have sat");

    i.overview = ok(stale({ ...one, lastWebhookAt: iso(3 * DAY) }));
    f = deriveAttention(i).faults[0];
    expect(f.body).toContain("1 order has sat pending");

    i.overview = ok(stale({ ...one, lastWebhookLogReadable: false, lastWebhookLogMissing: true }));
    f = deriveAttention(i).faults[0];
    expect(f.body).toContain("1 order has sat pending");

    i.overview = ok(stale({ ...one, lastWebhookAt: iso(DAY) }));
    f = deriveAttention(i).faults[0];
    expect(f.body).toContain("1 checkout started");
    expect(f.body).toContain("it is probably abandoned");
  });

  it("stalePending reads the webhook state the three ways", () => {
    expect(stalePending(stale({ lastWebhookLogReadable: false }), null).webhook).toBe("unreadable");
    expect(stalePending(stale({ lastWebhookAt: null }), null).webhook).toBe("silent");
    expect(stalePending(stale({ lastWebhookAt: iso(DAY) }), null).webhook).toBe("alive");
  });
});

describe("severity", () => {
  it("makes an unreadable orders table critical and drops every money queue with it", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersDegraded: true, ordersPending: 5 });
    const s = deriveAttention(i);
    expect(s.faults[0].level).toBe("critical");
    expect(s.faults[0].label).toContain("unmeasured");
    expect(s.queues).toHaveLength(0);
  });

  it("makes a failing rate limiter critical, and it outranks a serious", () => {
    const i = calm();
    i.internal = ok({
      probes: [
        { service: "Supabase Postgres", status: "ok", detail: "" },
        { service: "Rate limiter (rate_limit_hit)", status: "fail", detail: "rpc error" },
      ],
    });
    i.overview = ok({ ...calmOverview, ordersPending: 3, ordersPendingStale: 3, ordersPendingUnchecked: 3, pendingNewestStaleAt: iso(2 * DAY), lastWebhookAt: null });
    const s = deriveAttention(i);
    expect(s.faults[0].label).toBe("Rate limiter down, write routes unthrottled");
    expect(s.faults[0].level).toBe("critical");
    expect(s.faults[1].level).toBe("serious");
    expect(s.worst).toBe("critical");
  });

  it("grades outbound probes by what they protect", () => {
    expect(probeLevel("API.Bible (licensed Scripture)")).toBe("serious");
    expect(probeLevel("Buy Me a Coffee")).toBe("warn");
    expect(probeLevel("ipwho.is (geo enrichment)")).toBe("warn");
    expect(probeLevel("Render (deploys)")).toBe("warn");
    expect(probeLevel("Supabase Postgres")).toBe("critical");
    expect(probeLevel("Something new")).toBe("serious");
  });

  it("makes the panel critical after two consecutive missed overview polls, with a retry", () => {
    const i = calm();
    i.overview = failed();
    i.overviewMisses = 2;
    const s = deriveAttention(i);
    expect(s.faults[0].level).toBe("critical");
    expect(s.faults[0].retryUrl).toBe("/api/admin/overview");
    // Not ALSO an unmeasured chip for the same source.
    expect(s.unmeasured.map((u) => u.source)).not.toContain("overview");
  });

  it("reads API.Bible ceilings through the licence thresholds", () => {
    const i = calm();
    i.apiLimits = ok({
      calls: readUsageLimit("calls", "Monthly API calls", 0.85 * API_BIBLE_LIMITS.monthlyCalls, API_BIBLE_LIMITS.monthlyCalls),
      mau: readUsageLimit("mau", "Monthly active users", 0.97 * API_BIBLE_LIMITS.monthlyActiveUsers, API_BIBLE_LIMITS.monthlyActiveUsers),
    });
    const s = deriveAttention(i);
    expect(s.faults.map((f) => f.level)).toEqual(["serious", "warn"]);
    expect(s.faults[0].label).toBe("API.Bible active users at 97% of the monthly ceiling");
    expect(s.faults[1].label).toBe("API.Bible calls at 85% of the monthly ceiling");
    expect(s.faults[0].go.tab).toBe("goals");
  });
});

describe("ranking", () => {
  it("is fixed by level then source, never by count", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersPending: 1 });
    i.support = ok({ open: 50 });
    i.verification = ok({ requested: 9 });
    i.community = ok({ recipes: 2, reports: 1 });
    const s = deriveAttention(i);
    expect(s.queues.map((q) => q.source)).toEqual(["overview", "support", "verification", "community"]);
    // Bump the smallest to the largest: order must not move.
    i.overview = ok({ ...calmOverview, ordersPending: 900 });
    expect(deriveAttention(i).queues.map((q) => q.source)).toEqual(["overview", "support", "verification", "community"]);
  });

  it("puts unmeasured after measured faults and before queues", () => {
    const i = calm();
    i.outbound = failed();
    i.support = ok({ open: 2 });
    i.internal = ok({ probes: [{ service: "Rate limiter (rate_limit_hit)", status: "fail", detail: "" }] });
    const s = deriveAttention(i);
    expect(s.items.map((x) => x.level)).toEqual(["critical", "unmeasured", "queue"]);
  });

  it("rankItems is stable for equal keys", () => {
    const s = deriveAttention(calm());
    expect(rankItems(s.items)).toEqual(s.items);
  });
});

describe("badges and dots", () => {
  it("badges each queue with its count and a titled tooltip", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersPending: 4 });
    i.support = ok({ open: 1 });
    i.verification = ok({ requested: 2 });
    i.community = ok({ recipes: 1, reports: 2 });
    const s = deriveAttention(i);
    expect(badgeFor(s, "orders")).toEqual({ count: 4, title: "4 orders awaiting payment" });
    expect(badgeFor(s, "messages")).toEqual({ count: 1, title: "1 open ticket" });
    expect(badgeFor(s, "verification")).toEqual({ count: 2, title: "2 verification requests" });
    expect(badgeFor(s, "community")).toEqual({ count: 3, title: "3 awaiting moderation" });
    expect(badgeFor(s, "revenue")).toBeNull();
  });

  it("badges nothing for zero", () => {
    expect(badgeFor(deriveAttention(calm()), "orders")).toBeNull();
  });

  it("lights a rail row for a fault or a queue, never for an unmeasured chip", () => {
    const i = calm();
    i.overview = ok({ ...calmOverview, ordersPending: 2, ordersPendingStale: 2, ordersPendingUnchecked: 2, pendingNewestStaleAt: iso(2 * DAY), lastWebhookAt: null });
    i.community = failed();
    const tabs = attentionTabs(deriveAttention(i));
    expect(tabs.has("revenue")).toBe(true);
    expect(tabs.has("orders")).toBe(true);
    expect(tabs.has("community")).toBe(false);
    expect(tabs.has("health")).toBe(false);
  });
});

describe("copy", () => {
  it("carries no em dash anywhere, in any state", () => {
    const states = [calm(), allFailed()];
    const busy = calm();
    busy.overview = ok({ ...calmOverview, ordersPending: 3, ordersPendingStale: 3, ordersPendingUnchecked: 3, pendingNewestStaleAt: iso(2 * DAY), lastWebhookAt: null, lastWebhookLogReadable: false, lastWebhookLogMissing: true });
    busy.internal = ok({ probes: [{ service: "Rate limiter (rate_limit_hit)", status: "fail", detail: "" }, { service: "Supabase Postgres", status: "fail", detail: "x" }] });
    busy.outbound = ok({ probes: [{ service: "API.Bible (licensed Scripture)", status: "fail", detail: "" }, { service: "Buy Me a Coffee", status: "fail", detail: "HTTP 500" }, { service: "Unknown thing", status: "fail", detail: "" }] });
    busy.support = ok({ open: 2 });
    busy.verification = ok({ requested: 1 });
    busy.community = ok({ recipes: 1, reports: 1 });
    busy.apiLimits = ok({
      calls: readUsageLimit("calls", "Monthly API calls", 2 * API_BIBLE_LIMITS.monthlyCalls, API_BIBLE_LIMITS.monthlyCalls),
      mau: limitsOk.mau,
    });
    states.push(busy);
    for (const i of states) {
      const s = deriveAttention(i);
      for (const str of allStrings(s, NOW)) expect(str).not.toMatch(/—/);
    }
  });

  it("pairs every level with its word on the item itself", () => {
    const i = calm();
    i.internal = ok({ probes: [{ service: "Rate limiter (rate_limit_hit)", status: "fail", detail: "" }] });
    i.support = failed();
    i.verification = ok({ requested: 1 });
    const s = deriveAttention(i);
    const words = Object.fromEntries(s.items.map((x) => [x.level, x.word]));
    expect(words).toEqual({ critical: "Critical", unmeasured: "Not answering", queue: "Waiting" });
  });
});

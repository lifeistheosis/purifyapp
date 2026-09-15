import { describe, expect, it } from "vitest";

import { drain, quotaStopMessage, type DrainOutcome } from "../drain";
import type { SendOnceResult } from "../sendOnce";

/**
 * The loop every bulk sender shares. Two promises: a capped kind never makes
 * more real attempts than its cap, and a spent Resend quota ends the run instead
 * of feeding the rest of the queue to refusals.
 */

type Item = { id: string; kind: "welcome" | "account" };

const items = (n: number, kind: Item["kind"], prefix = kind): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, kind }));

function harness(resultFor: (item: Item, attempt: number) => SendOnceResult) {
  const sent: string[] = [];
  const recorded = new Map<string, DrainOutcome>();
  let attempts = 0;
  return {
    sent,
    recorded,
    send: async (item: Item) => {
      attempts += 1;
      const r = resultFor(item, attempts);
      // A real send takes a moment, so the four workers genuinely overlap.
      await new Promise((resolve) => setTimeout(resolve, 1));
      sent.push(item.id);
      return r;
    },
    record: (item: Item, outcome: DrainOutcome) => {
      expect(recorded.has(item.id)).toBe(false);
      recorded.set(item.id, outcome);
    },
    count: (outcome: DrainOutcome) => [...recorded.values()].filter((o) => o === outcome).length,
  };
}

const ok = (): SendOnceResult => ({ status: "sent" });

describe("drain", () => {
  it("sends every item once and records each exactly once", async () => {
    const h = harness(ok);
    const queue = items(25, "account");
    const report = await drain(queue, { concurrency: 4, send: h.send, record: h.record });
    expect(h.sent.sort()).toEqual(queue.map((i) => i.id).sort());
    expect(h.count("sent")).toBe(25);
    expect(report).toEqual({ quotaStop: null, deferredByQuota: 0, deferredByCap: 0 });
  });

  it("makes at most the cap in real attempts, and defers the rest", async () => {
    const h = harness(ok);
    const queue = [...items(3, "account"), ...items(172, "welcome")];
    const report = await drain(queue, {
      concurrency: 4,
      send: h.send,
      record: h.record,
      cap: { applies: (i) => i.kind === "welcome", limit: 40 },
    });
    expect(h.sent.filter((id) => id.startsWith("welcome"))).toHaveLength(40);
    expect(h.sent.filter((id) => id.startsWith("account"))).toHaveLength(3);
    expect(h.count("deferred")).toBe(132);
    expect(report.deferredByCap).toBe(132);
    // The earliest in the queue are the ones sent: the planner puts the newest there.
    expect(h.recorded.get("welcome-0")).toBe("sent");
    expect(h.recorded.get("welcome-171")).toBe("deferred");
  });

  it("gives a slot back when the attempt cost nothing: a duplicate or a skip", async () => {
    // The first 30 welcomes already went at sign-up, so they come back duplicate.
    const h = harness((item) => {
      const n = Number(item.id.split("-")[1]);
      return n < 30 ? { status: "duplicate" } : { status: "sent" };
    });
    await drain(items(100, "welcome"), {
      concurrency: 4,
      send: h.send,
      record: h.record,
      cap: { applies: () => true, limit: 40 },
    });
    expect(h.count("duplicate")).toBe(30);
    expect(h.count("sent")).toBe(40);
    expect(h.count("deferred")).toBe(30);
  });

  it("counts a failure against the cap, since it reached Resend", async () => {
    const h = harness(() => ({ status: "failed", error: "Invalid from address", code: "invalid_from_address" }));
    await drain(items(10, "welcome"), {
      concurrency: 4,
      send: h.send,
      record: h.record,
      cap: { applies: () => true, limit: 5 },
    });
    expect(h.count("failed")).toBe(5);
    expect(h.count("deferred")).toBe(5);
  });

  it("stops on a spent daily quota and defers everything after it", async () => {
    const h = harness((_, attempt) =>
      attempt <= 10
        ? { status: "sent" }
        : { status: "failed", error: "You have reached your daily email quota", code: "daily_quota_exceeded" },
    );
    const report = await drain(items(200, "account"), { concurrency: 4, send: h.send, record: h.record });
    expect(report.quotaStop).toBe("daily_quota_exceeded");
    expect(h.count("sent")).toBe(10);
    // Only the attempts already in flight when the first refusal came back can fail.
    expect(h.count("failed")).toBeGreaterThanOrEqual(1);
    expect(h.count("failed")).toBeLessThanOrEqual(4);
    expect(h.sent.length).toBeLessThanOrEqual(14);
    expect(h.count("deferred")).toBe(200 - h.sent.length);
    expect(report.deferredByQuota).toBe(200 - h.sent.length);
  });

  it("keeps going past an ordinary failure", async () => {
    const h = harness((item) =>
      item.id === "account-3" ? { status: "failed", error: "Invalid to address", code: "validation_error" } : { status: "sent" },
    );
    const report = await drain(items(12, "account"), { concurrency: 4, send: h.send, record: h.record });
    expect(report.quotaStop).toBeNull();
    expect(h.count("sent")).toBe(11);
    expect(h.count("failed")).toBe(1);
  });

  it("says what the quota stop means, and nothing when there was none", () => {
    expect(quotaStopMessage({ quotaStop: null, deferredByQuota: 0, deferredByCap: 9 })).toBeNull();
    const daily = quotaStopMessage({ quotaStop: "daily_quota_exceeded", deferredByQuota: 72, deferredByCap: 0 });
    expect(daily).toContain("daily");
    expect(daily).toContain("72 emails");
    expect(daily).toContain("midnight UTC");
    const monthly = quotaStopMessage({ quotaStop: "monthly_quota_exceeded", deferredByQuota: 1, deferredByCap: 0 });
    expect(monthly).toContain("monthly");
    expect(monthly).toContain("1 email ");
    expect(`${daily} ${monthly}`).not.toMatch(/[—!]/);
  });
});

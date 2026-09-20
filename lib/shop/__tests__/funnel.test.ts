import { describe, expect, it } from "vitest";

import {
  ageText,
  buildFunnel,
  isLate,
  medianStageHours,
  nextStage,
  prevStage,
  workQueue,
  type FunnelOrder,
  type StageEvent,
} from "../funnel";

const NOW = new Date("2026-09-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const order = (o: Partial<FunnelOrder> & Pick<FunnelOrder, "id">): FunnelOrder => ({
  payment_status: "paid",
  fulfillment_status: "supplier_order_needed",
  total_cents: 4900,
  created_at: hoursAgo(50),
  updated_at: hoursAgo(50),
  ...o,
});

describe("the ladder", () => {
  it("knows what comes next and what came before", () => {
    expect(nextStage("pending")).toBe("supplier_order_needed");
    expect(nextStage("packaged")).toBe("shipped");
    expect(nextStage("delivered")).toBeNull();
    expect(prevStage("pending")).toBeNull();
    expect(prevStage("shipped")).toBe("packaged");
  });

  it("has no next stage for a terminal state", () => {
    expect(nextStage("cancelled")).toBeNull();
    expect(nextStage("refunded")).toBeNull();
  });
});

describe("buildFunnel", () => {
  const orders: FunnelOrder[] = [
    order({ id: "a", fulfillment_status: "supplier_order_needed", updated_at: hoursAgo(50) }),
    order({ id: "b", fulfillment_status: "supplier_order_needed", updated_at: hoursAgo(2) }),
    order({ id: "c", fulfillment_status: "packaged", updated_at: hoursAgo(3), total_cents: 12000 }),
    order({ id: "d", fulfillment_status: "shipped", updated_at: hoursAgo(20) }),
    order({ id: "e", fulfillment_status: "delivered", updated_at: hoursAgo(400) }),
    // Never paid: an unfinished checkout, not an order.
    order({ id: "f", payment_status: "pending", fulfillment_status: "pending" }),
    order({ id: "g", payment_status: "refunded", fulfillment_status: "refunded" }),
  ];
  const f = buildFunnel(orders, NOW);
  const stage = (s: string) => f.stages.find((r) => r.stage === s)!;

  it("counts paid orders only, by the stage they sit in", () => {
    expect(stage("supplier_order_needed").count).toBe(2);
    expect(stage("packaged").count).toBe(1);
    expect(stage("pending").count).toBe(0);
    expect(f.paid).toBe(5);
  });

  it("adds up what each stage is holding", () => {
    expect(stage("supplier_order_needed").cents).toBe(9800);
    expect(stage("packaged").cents).toBe(12000);
    expect(f.openCents).toBe(4900 * 4 + 12000 - 4900);
  });

  it("marks what has waited too long, and says how long the worst has waited", () => {
    // 24h target on sourcing: "a" at 50h is late, "b" at 2h is not.
    expect(stage("supplier_order_needed").late).toBe(1);
    expect(Math.round(stage("supplier_order_needed").oldestHours)).toBe(50);
    expect(f.lateCount).toBe(1);
  });

  it("does not count a delivered order as open work", () => {
    expect(f.openCount).toBe(4);
    expect(f.delivered).toBe(1);
  });

  it("counts the terminal states separately", () => {
    expect(f.refunded).toBe(1);
    expect(f.cancelled).toBe(0);
  });
});

describe("isLate", () => {
  it("is measured from the last move, not the order date", () => {
    const o = order({ id: "x", created_at: hoursAgo(500), updated_at: hoursAgo(1) });
    expect(isLate(o, NOW)).toBe(false);
  });

  it("never fires on a stage with nothing owed, or on an unpaid row", () => {
    expect(isLate(order({ id: "y", fulfillment_status: "delivered", updated_at: hoursAgo(9000) }), NOW)).toBe(false);
    expect(
      isLate(order({ id: "z", payment_status: "pending", updated_at: hoursAgo(9000) }), NOW),
    ).toBe(false);
  });
});

describe("workQueue", () => {
  it("puts the most overdue first", () => {
    const q = workQueue(
      [
        order({ id: "slightly", fulfillment_status: "packaged", updated_at: hoursAgo(30) }),
        order({ id: "badly", fulfillment_status: "supplier_order_needed", updated_at: hoursAgo(200) }),
        order({ id: "fine", fulfillment_status: "packaged", updated_at: hoursAgo(1) }),
      ],
      NOW,
    );
    expect(q.map((o) => o.id)).toEqual(["badly", "slightly"]);
  });
});

describe("ageText", () => {
  it("is coarse on purpose", () => {
    expect(ageText(0.2)).toBe("just now");
    expect(ageText(5)).toBe("5h");
    expect(ageText(50)).toBe("2 days");
    expect(ageText(24 * 21)).toBe("3 weeks");
  });
});

describe("medianStageHours", () => {
  const events: StageEvent[] = [
    { order_id: "1", from_status: null, to_status: "supplier_order_needed", at: "2026-09-01T00:00:00Z" },
    { order_id: "1", from_status: "supplier_order_needed", to_status: "supplier_order_placed", at: "2026-09-01T10:00:00Z" },
    { order_id: "2", from_status: null, to_status: "supplier_order_needed", at: "2026-09-02T00:00:00Z" },
    { order_id: "2", from_status: "supplier_order_needed", to_status: "supplier_order_placed", at: "2026-09-02T20:00:00Z" },
  ];

  it("measures how long a stage actually took, as a median", () => {
    expect(medianStageHours(events).supplier_order_needed).toBe(15);
  });

  it("says nothing from a single pass", () => {
    expect(medianStageHours(events.slice(0, 2)).supplier_order_needed).toBeUndefined();
  });

  it("ignores a clock that ran backwards", () => {
    const backwards: StageEvent[] = [
      { order_id: "3", from_status: null, to_status: "packaged", at: "2026-09-03T10:00:00Z" },
      { order_id: "3", from_status: "packaged", to_status: "shipped", at: "2026-09-03T09:00:00Z" },
    ];
    expect(medianStageHours([...events, ...backwards]).packaged).toBeUndefined();
  });
});

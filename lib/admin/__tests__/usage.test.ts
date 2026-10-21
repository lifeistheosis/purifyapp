import { describe, expect, it } from "vitest";

import { USAGE_BATCH, scrubLabel, summarizeUsage, type UsageRow } from "../usage";

const view = (tab: string, ms: number, from: string | null, at = "2026-10-20T10:00:00Z"): UsageRow => ({
  kind: "view",
  tab,
  ms,
  from_tab: from,
  label: null,
  at,
});

describe("scrubLabel", () => {
  it("keeps the verb and blanks numbers", () => {
    expect(scrubLabel("  Refund   order 4417 ")).toBe("Refund order #");
  });
  it("drops anything holding an email", () => {
    expect(scrubLabel("Message reader@example.com")).toBeNull();
  });
  it("drops empty words and cuts long ones", () => {
    expect(scrubLabel("   ")).toBeNull();
    expect(scrubLabel("x".repeat(80))?.length).toBe(48);
  });
});

describe("USAGE_BATCH", () => {
  it("accepts views and actions, and refuses odd tab ids", () => {
    expect(
      USAGE_BATCH.safeParse({
        events: [
          { kind: "view", tab: "orders", ms: 1200, from: "today" },
          { kind: "action", tab: "orders", label: "Mark posted" },
        ],
      }).success,
    ).toBe(true);
    expect(USAGE_BATCH.safeParse({ events: [{ kind: "view", tab: "Orders!", ms: 1, from: null }] }).success).toBe(false);
    expect(USAGE_BATCH.safeParse({ events: [] }).success).toBe(false);
  });
});

describe("summarizeUsage", () => {
  const rows: UsageRow[] = [
    view("today", 60_000, null, "2026-10-19T09:00:00Z"),
    view("orders", 2_000, "today"),
    view("orders", 3_000, "today"),
    view("orders", 90_000, "today"),
    view("messages", 40_000, "orders"),
    { kind: "action", tab: "orders", ms: null, from_tab: null, label: "Mark posted", at: "2026-10-20T10:01:00Z" },
    { kind: "action", tab: "orders", ms: null, from_tab: null, label: "Mark posted", at: "2026-10-20T10:02:00Z" },
  ];
  const s = summarizeUsage(rows, ["today", "orders", "messages", "traffic"]);

  it("ranks by opens and counts quick exits", () => {
    expect(s.views[0]).toEqual({ tab: "orders", opens: 3, totalMs: 95_000, quickExits: 2 });
  });
  it("lists the pages never opened", () => {
    expect(s.never).toEqual(["traffic"]);
  });
  it("keeps only paths walked at least twice", () => {
    expect(s.paths).toEqual([{ from: "today", to: "orders", count: 3 }]);
  });
  it("counts buttons and dates the readout from the oldest row", () => {
    expect(s.actions).toEqual([{ tab: "orders", label: "Mark posted", count: 2 }]);
    expect(s.since).toBe("2026-10-19T09:00:00Z");
  });
});

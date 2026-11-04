import { describe, expect, it } from "vitest";

import { USAGE_BATCH, scrubLabel, summarizeUsage, withoutPhantomHome, type UsageRow } from "../usage";

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

describe("withoutPhantomHome", () => {
  // Rows as the route returns them: newest first.
  const at = (s: number) => `2026-11-03T15:00:${String(s).padStart(2, "0")}Z`;
  const row = (id: number, tab: string, ms: number, from: string | null): UsageRow => ({ id, ...view(tab, ms, from, at(id)) });

  it("drops the Home a saved link drew for a moment, and the page it handed on to keeps no view before it", () => {
    const rows = [row(3, "traffic", 9_000, "overview"), row(2, "overview", 4_000, "today"), row(1, "today", 0, null)];
    const out = withoutPhantomHome(rows);
    expect(out.map((r) => r.id)).toEqual([3, 2]);
    expect(out.find((r) => r.id === 2)?.from_tab).toBeNull();
    expect(out.find((r) => r.id === 3)?.from_tab).toBe("overview");
  });

  it("keeps a Home he looked at, and a short Home he reached from another page", () => {
    const looked = [row(2, "overview", 4_000, "today"), row(1, "today", 6_000, null)];
    expect(withoutPhantomHome(looked)).toHaveLength(2);
    const reached = [row(3, "users", 4_000, "today"), row(2, "today", 400, "overview"), row(1, "overview", 5_000, null)];
    expect(withoutPhantomHome(reached)).toHaveLength(3);
  });

  it("keeps a short Home when the next view did not come from it", () => {
    const rows = [row(2, "today", 30_000, null), row(1, "today", 300, null)];
    expect(withoutPhantomHome(rows)).toHaveLength(2);
  });

  it("leaves the phantom out of the readout's opens and paths", () => {
    const rows = [
      row(6, "traffic", 9_000, "overview"),
      row(5, "overview", 4_000, "today"),
      row(4, "today", 0, null),
      row(3, "traffic", 9_000, "overview"),
      row(2, "overview", 4_000, "today"),
      row(1, "today", 0, null),
    ];
    const s = summarizeUsage(rows, ["today", "overview", "traffic"]);
    expect(s.views.find((v) => v.tab === "today")).toBeUndefined();
    expect(s.never).toEqual(["today"]);
    expect(s.paths).toEqual([{ from: "overview", to: "traffic", count: 2 }]);
  });
});

import { describe, expect, it } from "vitest";

import {
  addDays,
  dueSummary,
  mergeBoard,
  plannedTasks,
  weekDays,
  weekStart,
  type StoredTask,
} from "../planner";

// The week of Monday 2026-09-14 to Sunday 2026-09-20.
const MON = "2026-09-14";
const SUN = "2026-09-20";

describe("the week", () => {
  it("starts on Monday, whatever day it is handed", () => {
    expect(weekStart("2026-09-14")).toBe(MON);
    expect(weekStart("2026-09-17")).toBe(MON);
    expect(weekStart("2026-09-20")).toBe(MON);
    expect(weekStart("2026-09-21")).toBe("2026-09-21");
  });

  it("runs seven days", () => {
    expect(weekDays(MON)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ]);
  });

  it("counts days across a month end", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("plannedTasks", () => {
  const week = plannedTasks(MON, SUN);
  const keys = week.map((t) => t.ruleKey);

  // Two, from 2026-11-12: shipping the update and writing its note are steps
  // of a release now (docs/RELEASE.md; his word that day, docs/plans/owner-desk.md
  // section 1), so they left the week.
  it("puts the week's two rhythms on their own days", () => {
    expect(keys).toContain("board:2026-W38");
    expect(keys).toContain("email-weekly:2026-W38");
    expect(keys.some((k) => k.startsWith("notes:") || k.startsWith("update:"))).toBe(false);
    const byKey = Object.fromEntries(week.map((t) => [t.ruleKey, t.dueOn]));
    expect(byKey["board:2026-W38"]).toBe(MON);
    expect(byKey["email-weekly:2026-W38"]).toBe(SUN);
  });

  it("asks for next month's drop on the 20th", () => {
    const t = plannedTasks("2026-09-20", "2026-09-20").find((x) => x.ruleKey === "eikon-create:2026-10");
    expect(t?.title).toContain("October 2026");
  });

  it("opens the drop and sends the monthly note on the first", () => {
    const first = plannedTasks("2026-10-01", "2026-10-01").map((t) => t.ruleKey);
    expect(first).toContain("eikon-open:2026-10");
    expect(first).toContain("email-monthly:2026-10");
  });

  it("puts the feast shop email a week before the fast opens", () => {
    const t = plannedTasks("2026-11-01", "2026-11-14").find((x) => x.ruleKey === "shop-feast:nativity-2026");
    expect(t?.dueOn).toBe("2026-11-08");
  });

  it("gives every task a day inside the range it was asked for", () => {
    for (const t of plannedTasks("2026-09-01", "2026-12-31")) {
      expect(t.dueOn >= "2026-09-01" && t.dueOn <= "2026-12-31").toBe(true);
    }
  });

  it("generates nothing before the week the board shipped", () => {
    expect(plannedTasks("2026-08-01", "2026-09-13")).toEqual([]);
    const spanning = plannedTasks("2026-08-01", "2026-09-20");
    expect(spanning.every((t) => t.dueOn >= "2026-09-14")).toBe(true);
  });

  it("is ordered by day", () => {
    const days = week.map((t) => t.dueOn);
    expect([...days].sort()).toEqual(days);
  });
});

describe("mergeBoard", () => {
  const planned = plannedTasks(MON, SUN);
  const stored: StoredTask[] = [
    {
      id: "own-1",
      title: "Call the supplier",
      notes: null,
      category: "task",
      due_on: "2026-09-16",
      status: "open",
      rule_key: null,
      auto: false,
    },
  ];

  it("ticks a generated task when the work itself is there", () => {
    const board = mergeBoard({ planned, stored: [], evidence: new Set(["board:2026-W38"]) });
    const posted = board.find((t) => t.ruleKey === "board:2026-W38")!;
    expect(posted.status).toBe("done");
    expect(posted.byItself).toBe(true);
  });

  it("keeps a task somebody added beside the generated ones", () => {
    const board = mergeBoard({ planned, stored, evidence: new Set() });
    const mine = board.find((t) => t.id === "own-1")!;
    expect(mine.auto).toBe(false);
    expect(board.length).toBe(planned.length + 1);
  });

  it("lets a stored mark override the rule, and never shows it twice", () => {
    const skipped: StoredTask[] = [
      {
        id: "row-1",
        title: "Send the Sunday calendar email",
        notes: null,
        category: "email",
        due_on: SUN,
        status: "skipped",
        rule_key: "email-weekly:2026-W38",
        auto: true,
      },
    ];
    const board = mergeBoard({ planned, stored: skipped, evidence: new Set() });
    const rows = board.filter((t) => t.ruleKey === "email-weekly:2026-W38");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("skipped");
    expect(rows[0].id).toBe("row-1");
  });

  it("takes a stored row's day over the rule's: a task given a later day is due on it", () => {
    const later: StoredTask[] = [
      {
        id: "row-3",
        title: "Post this week's board message",
        notes: null,
        category: "board",
        due_on: "2026-09-30",
        status: "open",
        rule_key: "board:2026-W38",
        auto: true,
      },
    ];
    const board = mergeBoard({ planned, stored: later, evidence: new Set() });
    expect(board.find((t) => t.ruleKey === "board:2026-W38")!.dueOn).toBe("2026-09-30");
  });

  it("still ticks a stored task left open once the work appears", () => {
    const open: StoredTask[] = [
      {
        id: "row-2",
        title: "Post this week's board message",
        notes: null,
        category: "board",
        due_on: MON,
        status: "open",
        rule_key: "board:2026-W38",
        auto: true,
      },
    ];
    const board = mergeBoard({ planned, stored: open, evidence: new Set(["board:2026-W38"]) });
    expect(board.find((t) => t.ruleKey === "board:2026-W38")!.status).toBe("done");
  });
});

describe("dueSummary", () => {
  it("splits late, today and later, and never counts a done one", () => {
    const board = mergeBoard({
      planned: plannedTasks(MON, SUN),
      stored: [],
      evidence: new Set(["eikon-create:2026-10"]),
    });
    // The 20th is this week's Sunday, so next month's drop lands on it too.
    const s = dueSummary(board, SUN);
    expect(s.done.map((t) => t.ruleKey)).toEqual(["eikon-create:2026-10"]);
    expect(s.overdue.map((t) => t.ruleKey)).toEqual(["board:2026-W38"]);
    expect(s.today.map((t) => t.ruleKey)).toEqual(["email-weekly:2026-W38"]);
    expect(s.later).toHaveLength(0);
    expect(dueSummary(board, "2026-09-17").later.map((t) => t.ruleKey)).toEqual(["email-weekly:2026-W38"]);
  });
});

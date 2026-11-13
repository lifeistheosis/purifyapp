import { describe, expect, it } from "vitest";

import { fastOn } from "../fasts";
import {
  chooseLine,
  oneEach,
  parseRetentionKey,
  planFasting,
  planFirstWeek,
  planFirstWeekForOwner,
  planPickUp,
  planPickUpForOwner,
  type PersonalLine,
  type PlannedRetention,
} from "../plan";

/**
 * Who is due which email: each window, each "only if", and "nothing honest
 * to say means no send" (the arbiter's brief of 2026-11-13).
 */

const DAY = 86_400_000;
const NOW = new Date("2026-11-20T11:05:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

describe("the first-week guide", () => {
  it("sends the morning prayers from day 1, the calendar from day 3 and a verse from day 7, one at a time", () => {
    const plan = planFirstWeek(
      [
        { userId: "today", joinedAt: ago(0.5), done: {} },
        { userId: "d1", joinedAt: ago(1.2), done: {} },
        { userId: "d2", joinedAt: ago(2.9), done: {} },
        { userId: "d3", joinedAt: ago(3), done: {} },
        { userId: "d7", joinedAt: ago(7.5), done: {} },
        { userId: "d9", joinedAt: ago(9.9), done: {} },
        { userId: "d10", joinedAt: ago(10), done: {} },
        { userId: "nodate", joinedAt: null, done: {} },
      ],
      NOW,
    );
    expect(plan.map((p) => [p.userId, p.step])).toEqual([
      ["d1", "morning"],
      ["d2", "morning"],
      ["d3", "calendar"],
      ["d7", "verse"],
      ["d9", "verse"],
    ]);
    expect(plan[0].dedupeKey).toBe("first_week:morning:d1");
  });

  it("sends a step only if the account does not show it done", () => {
    const plan = planFirstWeek(
      [
        { userId: "prayed", joinedAt: ago(1.5), done: { morning: true } },
        { userId: "old", joinedAt: ago(4), done: { calendar: true } },
        { userId: "kept", joinedAt: ago(8), done: { verse: true } },
        // A step that cannot be known is sent: its words claim nothing.
        { userId: "unknown", joinedAt: ago(8), done: {} },
      ],
      NOW,
    );
    expect(plan.map((p) => p.userId)).toEqual(["unknown"]);
  });

  it("gives the owner each step once, in order, one a run, whatever his account's age", () => {
    expect(planFirstWeekForOwner([{ userId: "o", sent: new Set() }]).map((p) => [p.step, p.dedupeKey, p.owner])).toEqual([
      ["morning", "first_week:owner:morning:o", true],
    ]);
    expect(planFirstWeekForOwner([{ userId: "o", sent: new Set(["morning"]) }])[0].step).toBe("calendar");
    expect(planFirstWeekForOwner([{ userId: "o", sent: new Set(["morning", "calendar", "verse"]) }])).toEqual([]);
  });
});

const romans: PersonalLine = { kind: "bible", book: "romans", bookName: "Romans", chapter: 8, verse: 1, at: Date.parse(ago(16)) };

describe("where you left off", () => {
  it("is due after 14 quiet days and after 30, each for a week, and not between", () => {
    const reader = (userId: string, quiet: number) => ({ userId, lastActiveAt: Date.parse(ago(quiet)), lines: [romans], sentSince: new Set<14 | 30>() });
    const plan = planPickUp([reader("q13", 13), reader("q14", 14), reader("q20", 20.9), reader("q25", 25), reader("q30", 30), reader("q37", 37)], NOW);
    expect(plan.map((p) => [p.userId, p.step])).toEqual([
      ["q14", 14],
      ["q20", 14],
      ["q30", 30],
    ]);
    // The key never holds the day a reader went quiet: only the day it was sent.
    expect(plan[0].dedupeKey).toBe("pick_up:14:q14:2026-11-20");
  });

  it("is sent once in a quiet spell", () => {
    const plan = planPickUp([{ userId: "a", lastActiveAt: Date.parse(ago(15)), lines: [romans], sentSince: new Set([14 as const]) }], NOW);
    expect(plan).toEqual([]);
  });

  it("is never sent without a line of the reader's own", () => {
    expect(planPickUp([{ userId: "a", lastActiveAt: Date.parse(ago(15)), lines: [], sentSince: new Set() }], NOW)).toEqual([]);
    expect(planPickUp([{ userId: "a", lastActiveAt: null, lines: [romans], sentSince: new Set() }], NOW)).toEqual([]);
  });

  it("takes the place kept last, and a patron saint's feast only within the coming week", () => {
    const work: PersonalLine = {
      kind: "work",
      saintSlug: "john-chrysostom",
      saintName: "St. John Chrysostom",
      workSlug: "on-the-priesthood",
      workTitle: "On the Priesthood",
      sectionN: 2,
      paragraph: 4,
      at: romans.at + DAY,
    };
    const patron = (on: string): PersonalLine => ({ kind: "patron", saintSlug: "nicholas-of-myra", saintName: "St. Nicholas", on });
    expect(chooseLine([romans, work, patron("2026-11-22")], NOW)).toBe(work);
    expect(chooseLine([patron("2026-11-22")], NOW)).toEqual(patron("2026-11-22"));
    expect(chooseLine([patron("2026-11-27")], NOW)).toEqual(patron("2026-11-27"));
    expect(chooseLine([patron("2026-11-20")], NOW)).toBeNull();
    expect(chooseLine([patron("2026-11-28")], NOW)).toBeNull();
  });

  it("goes to the owner once, with a line from his own account, however recently he read", () => {
    const plan = planPickUpForOwner([{ userId: "o", lines: [romans], sent: false }], NOW);
    expect(plan.map((p) => [p.dedupeKey, p.owner])).toEqual([["pick_up:owner:14:o", true]]);
    expect(planPickUpForOwner([{ userId: "o", lines: [romans], sent: true }], NOW)).toEqual([]);
    expect(planPickUpForOwner([{ userId: "o", lines: [], sent: false }], NOW)).toEqual([]);
  });
});

describe("the fasting companion", () => {
  const nativityDay = (iso: string) => new Date(`${iso}T11:05:00Z`);

  it("opens on the fast's first run for a reader, then sends one note each week from the second", () => {
    const first = planFasting([{ userId: "a", style: "new", sent: new Map() }], nativityDay("2026-11-15"), ["nativity"]);
    expect(first.map((p) => [p.piece, p.dedupeKey])).toEqual([["open", "fasting_companion:nativity-2026:open:a"]]);

    const opened = new Map([["nativity-2026:open", Date.parse("2026-11-15T11:05:00Z")]]);
    expect(planFasting([{ userId: "a", style: "new", sent: opened }], nativityDay("2026-11-18"), ["nativity"])).toEqual([]);
    const week2 = planFasting([{ userId: "a", style: "new", sent: opened }], nativityDay("2026-11-22"), ["nativity"]);
    expect(week2.map((p) => [p.piece, p.dedupeKey])).toEqual([[1, "fasting_companion:nativity-2026:week-1:a"]]);

    const both = new Map([...opened, ["nativity-2026:week-1", Date.parse("2026-11-22T11:05:00Z")]]);
    expect(planFasting([{ userId: "a", style: "new", sent: both }], nativityDay("2026-11-25"), ["nativity"])).toEqual([]);
  });

  it("sends a late reader the opening, and not that week's note on top of it", () => {
    const late = planFasting([{ userId: "a", style: "new", sent: new Map() }], nativityDay("2026-12-02"), ["nativity"]);
    expect(late.map((p) => p.piece)).toEqual(["open"]);
    const opened = new Map([["nativity-2026:open", Date.parse("2026-12-02T11:05:00Z")]]);
    expect(planFasting([{ userId: "a", style: "new", sent: opened }], nativityDay("2026-12-04"), ["nativity"])).toEqual([]);
    expect(planFasting([{ userId: "a", style: "new", sent: opened }], nativityDay("2026-12-06"), ["nativity"]).map((p) => p.piece)).toEqual([3]);
  });

  it("follows the reader's own reckoning", () => {
    const plan = planFasting(
      [
        { userId: "new", style: "new", sent: new Map() },
        { userId: "old", style: "old", sent: new Map() },
      ],
      nativityDay("2026-11-20"),
      ["nativity"],
    );
    expect(plan.map((p) => p.userId)).toEqual(["new"]);
  });

  it("is silent outside a fast, and in a fast it does not cover yet", () => {
    expect(planFasting([{ userId: "a", style: "new", sent: new Map() }], nativityDay("2026-11-10"), ["nativity"])).toEqual([]);
    // Great Lent 2027, before it is added to FASTS_ON.
    expect(planFasting([{ userId: "a", style: "new", sent: new Map() }], nativityDay("2027-03-16"), ["nativity"])).toEqual([]);
    expect(planFasting([{ userId: "a", style: "new", sent: new Map() }], nativityDay("2027-03-16"), ["nativity", "great_lent"])).toHaveLength(1);
  });

  it("marks the owner's first sends apart from readers'", () => {
    const plan = planFasting([{ userId: "o", style: "new", sent: new Map() }], nativityDay("2026-11-16"), ["nativity"], { owner: true });
    expect(plan[0].dedupeKey).toBe("fasting_companion:owner:nativity-2026:open:o");
  });
});

describe("one email a reader a run", () => {
  it("takes the fast first, then the first week, then where you left off", () => {
    const fast = fastOn(new Date("2026-11-20T12:00:00Z"), "new")!;
    const planned: PlannedRetention[] = [
      { kind: "pick_up", userId: "a", step: 14, line: romans, dedupeKey: "p", owner: false },
      { kind: "first_week", userId: "a", step: "verse", dedupeKey: "f", owner: false },
      { kind: "fasting_companion", userId: "a", style: "new", fast, piece: "open", dedupeKey: "c", owner: false },
      { kind: "pick_up", userId: "b", step: 14, line: romans, dedupeKey: "p2", owner: false },
      { kind: "first_week", userId: "b", step: "verse", dedupeKey: "f2", owner: false },
    ];
    expect(oneEach(planned).map((p) => p.dedupeKey)).toEqual(["c", "f2"]);
  });
});

describe("reading the send log back", () => {
  it("reads every key the planners write, and no other", () => {
    expect(parseRetentionKey("first_week:calendar:u1")).toEqual({ kind: "first_week", owner: false, step: "calendar", userId: "u1" });
    expect(parseRetentionKey("first_week:owner:verse:u1")).toEqual({ kind: "first_week", owner: true, step: "verse", userId: "u1" });
    expect(parseRetentionKey("pick_up:30:u1:2026-11-20")).toEqual({ kind: "pick_up", owner: false, step: 30, userId: "u1" });
    expect(parseRetentionKey("pick_up:owner:14:u1")).toEqual({ kind: "pick_up", owner: true, step: 14, userId: "u1" });
    expect(parseRetentionKey("fasting_companion:nativity-2026:week-2:u1")).toEqual({
      kind: "fasting_companion",
      owner: false,
      fastKey: "nativity-2026",
      piece: "week-2",
      userId: "u1",
    });
    expect(parseRetentionKey("fasting_companion:owner:great_lent-2027:open:u1")).toMatchObject({ owner: true, fastKey: "great_lent-2027", piece: "open" });
    for (const other of ["welcome:u1", "first_week:noon:u1", "pick_up:21:u1:2026-11-20", "fasting_companion:nativity:open:u1", "weekly:2026-W47:u1"]) {
      expect(parseRetentionKey(other), other).toBeNull();
    }
  });
});

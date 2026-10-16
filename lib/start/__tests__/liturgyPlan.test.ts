import { describe, expect, it } from "vitest";

import {
  EMPTY_PLAN,
  REMINDER_DAYS,
  STEP_IDS,
  addDays,
  daysBetween,
  formatDay,
  parsePlan,
  pathFor,
  reminderFor,
  reminderStarts,
  stepAfter,
  stepBefore,
  sundaysFrom,
  upcomingDate,
  type LiturgyPlan,
} from "@/lib/start/liturgyPlan";

// The reader's own plan for a first Liturgy (lib/start/liturgyPlan.ts): read
// leniently, walked in order, and turned into a reminder on Today for the
// week of the day they chose, on the device's own calendar.

const plan = (over: Partial<LiturgyPlan>): LiturgyPlan => ({ ...EMPTY_PLAN, ...over });

describe("a stored plan", () => {
  it("reads as the empty plan when it is missing or broken", () => {
    expect(parsePlan(null)).toEqual(EMPTY_PLAN);
    expect(parsePlan("not json")).toEqual(EMPTY_PLAN);
    expect(parsePlan("[1,2]")).toEqual(EMPTY_PLAN);
    expect(parsePlan('"text"')).toEqual(EMPTY_PLAN);
  });

  it("keeps what is sound and drops what is not, field by field", () => {
    const p = parsePlan(
      JSON.stringify({
        going: true,
        kind: "coptic",
        date: "2026-10-18",
        step: "during",
        furthest: 99,
        done: "yes",
        checked: ["time", "time", "nonsense", "stay"],
        hiddenFor: "18 October",
      }),
    );
    expect(p).toEqual({
      v: 1,
      going: true,
      kind: null,
      date: "2026-10-18",
      step: "during",
      furthest: STEP_IDS.length - 1,
      done: false,
      checked: ["time", "stay"],
      hiddenFor: null,
    });
    expect(parsePlan(JSON.stringify({ kind: "serbian", step: "nowhere", furthest: -3 }))).toMatchObject({
      kind: "serbian",
      step: "intro",
      furthest: 0,
    });
  });
});

describe("the way through", () => {
  it("asks the day only of a reader who is going", () => {
    expect(pathFor({ going: true })).toEqual([...STEP_IDS]);
    expect(pathFor({ going: null })).toEqual([...STEP_IDS]);
    expect(pathFor({ going: false })).not.toContain("when");
    expect(stepAfter({ going: false }, "kind")).toBe("before");
    expect(stepAfter({ going: true }, "kind")).toBe("when");
    expect(stepBefore({ going: false }, "before")).toBe("kind");
  });

  it("starts at the question and ends at the overview", () => {
    expect(stepBefore({ going: true }, "intro")).toBeNull();
    expect(stepAfter({ going: true }, "customs")).toBe("ready");
    expect(stepAfter({ going: true }, "ready")).toBeNull();
  });
});

describe("days, on the reader's own calendar", () => {
  it("count whole days, across a change of the clocks", () => {
    expect(daysBetween("2026-10-14", "2026-10-18")).toBe(4);
    expect(daysBetween("2026-10-18", "2026-10-14")).toBe(-4);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("offer this Sunday and the next, and the day itself on a Sunday", () => {
    // Wednesday 14 October 2026.
    expect(sundaysFrom("2026-10-14")).toEqual({ first: "2026-10-18", second: "2026-10-25", todayIsSunday: false });
    // Saturday: tomorrow is this Sunday.
    expect(sundaysFrom("2026-10-17")).toEqual({ first: "2026-10-18", second: "2026-10-25", todayIsSunday: false });
    // Sunday 18 October: today.
    expect(sundaysFrom("2026-10-18")).toEqual({ first: "2026-10-18", second: "2026-10-25", todayIsSunday: true });
  });

  it("write a day as a reader says it, with a capital", () => {
    const en = formatDay("2026-10-18", "en");
    expect(en).toMatch(/^Sunday/);
    expect(en).toMatch(/18/);
    expect(en).toMatch(/October/);
    const es = formatDay("2026-10-18", "es");
    expect(es.charAt(0)).toBe(es.charAt(0).toLocaleUpperCase("es"));
    expect(es.toLowerCase()).toMatch(/domingo/);
  });
});

describe("the reminder on Today", () => {
  const going = plan({ going: true, date: "2026-10-18" });

  it("waits from six days before the day until the day itself", () => {
    expect(REMINDER_DAYS).toBe(6);
    expect(reminderFor(going, "2026-10-11")).toBeNull();
    expect(reminderFor(going, "2026-10-12")).toEqual({ date: "2026-10-18", daysAway: 6 });
    expect(reminderFor(going, "2026-10-17")).toEqual({ date: "2026-10-18", daysAway: 1 });
    expect(reminderFor(going, "2026-10-18")).toEqual({ date: "2026-10-18", daysAway: 0 });
    expect(reminderFor(going, "2026-10-19")).toBeNull();
    expect(reminderStarts("2026-10-18")).toBe("2026-10-12");
  });

  it("stays away for a reader only reading, with no day, or who put that day's reminder away", () => {
    expect(reminderFor(plan({ going: false, date: "2026-10-18" }), "2026-10-17")).toBeNull();
    expect(reminderFor(plan({ going: true, date: null }), "2026-10-17")).toBeNull();
    expect(reminderFor(plan({ going: true, date: "2026-10-18", hiddenFor: "2026-10-18" }), "2026-10-17")).toBeNull();
    // Put away for one day, it still comes for the next one chosen.
    expect(reminderFor(plan({ going: true, date: "2026-10-25", hiddenFor: "2026-10-18" }), "2026-10-24")).toEqual({
      date: "2026-10-25",
      daysAway: 1,
    });
  });

  it("forgets a day that has passed", () => {
    expect(upcomingDate(going, "2026-10-18")).toBe("2026-10-18");
    expect(upcomingDate(going, "2026-10-19")).toBeNull();
  });
});

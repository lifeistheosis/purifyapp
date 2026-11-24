import { describe, expect, it } from "vitest";

import { goalsToMail, milestones, payingAt, periodOf, weeklyValueCents, type GoalStep, type MilestonesInput } from "../milestones";
import type { PlusFact } from "../plusHistory";

/**
 * His milestones, counted (lib/admin/milestones.ts). Every figure here is made
 * up; his marks and his numbers live in the database, never in the repository.
 */

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const fact = (f: Partial<PlusFact> & Pick<PlusFact, "type" | "event_at">): PlusFact => ({
  user_id: "u1",
  store: "PLAY_STORE",
  product_id: "purify_plus:monthly",
  environment: "PRODUCTION",
  period_type: "NORMAL",
  price_usd: 9.99,
  takehome: 0.85,
  trial_conversion: null,
  reason: null,
  expires_at: null,
  ...f,
});

/** A monthly Plus member who joins at `start` and renews every 30 days until `until` (or for good). */
function monthly(user: string, start: number, until: number, price = 9.99): PlusFact[] {
  const out: PlusFact[] = [];
  for (let t = start, first = true; t < until; t += 30 * DAY, first = false) {
    out.push(fact({ user_id: user, type: first ? "INITIAL_PURCHASE" : "RENEWAL", event_at: iso(t), expires_at: iso(t + 30 * DAY), price_usd: price }));
  }
  return out;
}

const MON = Date.parse("2027-01-04T00:00:00Z"); // a Monday

const base = (over: Partial<MilestonesInput>): MilestonesInput => ({
  facts: [],
  since: iso(MON),
  now: new Date(MON + 10 * DAY),
  ownerIds: new Set(),
  marks: [],
  monthlyCostsCents: 0,
  releases: [],
  signupsByDay: null,
  rating: null,
  extra: null,
  ...over,
});

describe("the period, read from the product's name", () => {
  it("reads monthly and yearly word by word, and guesses nothing", () => {
    expect(periodOf("purify_plus:monthly")).toBe("monthly");
    expect(periodOf("net.purifyapp.purify.plus.monthly")).toBe("monthly");
    expect(periodOf("Plus Annual")).toBe("yearly");
    expect(periodOf("purify_plus:p1y")).toBe("yearly");
    expect(periodOf("purify_plus")).toBeNull();
    expect(periodOf("monthly annual")).toBeNull();
    expect(periodOf(null)).toBeNull();
  });
});

describe("what a member is worth a week", () => {
  it("counts a monthly member's own price times 12 over 52, a yearly member's over 52, after the store's share", () => {
    expect(weeklyValueCents(fact({ type: "RENEWAL", event_at: iso(MON), price_usd: 9.99, takehome: 0.85 }))).toBe(Math.round((849 * 12) / 52));
    expect(weeklyValueCents(fact({ type: "INITIAL_PURCHASE", event_at: iso(MON), product_id: "Plus Annual", price_usd: 71.99, takehome: 0.85 }))).toBe(Math.round(6119 / 52));
  });
  it("counts nothing for a product whose period its name does not say", () => {
    expect(weeklyValueCents(fact({ type: "RENEWAL", event_at: iso(MON), product_id: "purify_plus" }))).toBe(0);
  });
});

describe("who is paying", () => {
  const t = MON + 5 * DAY;
  it("leaves out trials, refunds, Pro, test money and his own account", () => {
    const facts = [
      fact({ user_id: "trial", type: "INITIAL_PURCHASE", period_type: "TRIAL", event_at: iso(MON), expires_at: iso(MON + 7 * DAY), price_usd: 0 }),
      fact({ user_id: "paid", type: "INITIAL_PURCHASE", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
      fact({ user_id: "refunded", type: "INITIAL_PURCHASE", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
      fact({ user_id: "refunded", type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", event_at: iso(MON + DAY), price_usd: -9.99 }),
      fact({ user_id: "pro", type: "INITIAL_PURCHASE", product_id: "purify_pro:monthly", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
      fact({ user_id: "sandbox", type: "INITIAL_PURCHASE", environment: "SANDBOX", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
      fact({ user_id: "owner", type: "INITIAL_PURCHASE", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
    ];
    expect([...payingAt(facts, t, new Set(["owner"])).keys()]).toEqual(["paid"]);
  });
  it("ends a membership when it runs out, and counts a trial that paid", () => {
    const facts = [
      fact({ user_id: "left", type: "INITIAL_PURCHASE", event_at: iso(MON), expires_at: iso(MON + 30 * DAY) }),
      fact({ user_id: "left", type: "EXPIRATION", event_at: iso(MON + 2 * DAY) }),
      fact({ user_id: "converted", type: "INITIAL_PURCHASE", period_type: "TRIAL", event_at: iso(MON), price_usd: 0, expires_at: iso(MON + 3 * DAY) }),
      fact({ user_id: "converted", type: "RENEWAL", trial_conversion: true, event_at: iso(MON + 3 * DAY), expires_at: iso(MON + 33 * DAY) }),
    ];
    expect([...payingAt(facts, t, new Set()).keys()]).toEqual(["converted"]);
  });
});

describe("the number, the steps and the levels", () => {
  const members = Array.from({ length: 40 }, (_, i) => monthly(`m${i}`, MON + i * 3600_000, MON + 400 * DAY)).flat();

  it("stands every step on the app's own costs, his marks after them", () => {
    const d = milestones(base({ facts: members, monthlyCostsCents: 26_000, marks: [{ name: "Mark one", weeklyCents: 100_000 }, { name: "Mark two", weeklyCents: 200_000 }] }));
    const costs = Math.round((26_000 * 12) / 52);
    expect(d.steps.map((s) => [s.id, s.weeklyCents])).toEqual([
      ["bills", costs],
      ["tenth", costs + 10_000],
      ["quarter", costs + 25_000],
      ["half", costs + 50_000],
      ["first", costs + 100_000],
      ["second", costs + 200_000],
    ]);
    expect(d.steps[4].name).toBe("Mark one");
  });

  it("has one step, the bills, until his marks are set", () => {
    expect(milestones(base({ facts: members, monthlyCostsCents: 10_000 })).steps.map((s) => s.id)).toEqual(["bills"]);
  });

  it("counts forty monthly members at their own worth", () => {
    const d = milestones(base({ facts: members }));
    expect(d.paying).toEqual({ monthly: 40, yearly: 0 });
    expect(d.weeklyCents).toBe(40 * Math.round((849 * 12) / 52));
  });

  it("before four full weeks: no rate, no day and no aim, and says when there will be", () => {
    const d = milestones(base({ facts: members, now: new Date(MON + 15 * DAY), marks: [{ name: "Mark", weeklyCents: 500_000 }] }));
    expect(d.enoughOn).toBe("2027-02-01");
    expect(d.paceCents).toBeNull();
    expect(d.movers).toBeNull();
    expect(d.steps.every((s) => s.byFive === null)).toBe(true);
  });

  it("reaches a level only when the number has held it at the end of four weeks running, and keeps it", () => {
    const three = milestones(base({ facts: members, now: new Date(MON + 21 * DAY + 3600_000), monthlyCostsCents: 1_000 }));
    expect(three.steps[0].reachedOn).toBeNull();
    expect(three.steps[0].heldWeeks).toBe(3);
    const four = milestones(base({ facts: members, now: new Date(MON + 28 * DAY + 3600_000), monthlyCostsCents: 1_000 }));
    expect(four.steps[0].reachedOn).toBe("2027-02-01");
    expect(four.justReached).toBe("bills");
  });
});

describe("the four quests", () => {
  it("aims at his own last four weeks, bettered by 5%, and lower for the share who leave", () => {
    const members = Array.from({ length: 50 }, (_, i) => monthly(`m${i}`, MON - 40 * DAY, MON + 400 * DAY)).flat();
    const leavers = [0, 1, 2, 3, 4].map((w) => [
      fact({ user_id: `l${w}`, type: "INITIAL_PURCHASE", event_at: iso(MON - 20 * DAY), expires_at: iso(MON + 60 * DAY) }),
      fact({ user_id: `l${w}`, type: "EXPIRATION", event_at: iso(MON + w * 7 * DAY + DAY) }),
    ]).flat();
    const signupsByDay = new Map(Array.from({ length: 40 }, (_, i) => [iso(MON + i * DAY).slice(0, 10), 10]));
    const d = milestones(base({ facts: [...members, ...leavers], since: iso(MON - 40 * DAY), now: new Date(MON + 30 * DAY), signupsByDay }));
    const readers = d.movers?.find((m) => m.id === "readers");
    const leave = d.movers?.find((m) => m.id === "leave");
    expect(readers?.aim).toBeCloseTo(70 * 1.05, 6);
    expect(leave && leave.aim).toBeGreaterThan(0);
    // One left in each of the four weeks before: a quarter of the share each time, bettered by 5% the other way.
    const weeks = [0, 1, 2, 3].map((w) => 1 / (55 - w));
    expect(leave?.aim).toBeCloseTo((weeks.reduce((a, b) => a + b, 0) / 4) * 0.95, 6);
  });
});

describe("which goals the email is for", () => {
  const step = (id: GoalStep["id"], reachedOn: string | null): GoalStep => ({ id, name: id, weeklyCents: 1, reachedOn, heldWeeks: 0, moreMembers: null, byPace: null, byFive: null });
  it("mails a goal reached in the last fortnight, never an old one, never one not reached", () => {
    const now = new Date("2027-03-04T12:00:00Z");
    const steps = [step("bills", "2026-12-14"), step("tenth", "2027-02-22"), step("quarter", "2027-03-01"), step("half", null)];
    expect(goalsToMail(steps, now).map((s) => s.id)).toEqual(["tenth", "quarter"]);
  });
});

describe("members carried over from before 1.9 (his yes, 2026-11-24)", () => {
  const kept = monthly("u1", MON, MON + 200 * DAY);
  it("counts paying accounts with no kept event at list price, est., and not in growth", () => {
    const without = milestones(base({ facts: kept }));
    const withCarried = milestones(base({ facts: kept, payingIds: ["u1", "old1", "old2"] }));
    // u1 has events, so only the two older members are carried.
    expect(withCarried.carried.members).toBe(2);
    expect(withCarried.carried.weeklyCents).toBe(2 * 196);
    expect(withCarried.weeklyCents).toBe(without.weeklyCents + 2 * 196);
    expect(withCarried.growth).toBe(without.growth);
  });
  it("stops carrying a member once an event of theirs is kept, and never his own", () => {
    const later = [...kept, ...monthly("old1", MON + 2 * DAY, MON + 200 * DAY)];
    const d = milestones(base({ facts: later, payingIds: ["old1", "mine"], ownerIds: new Set(["mine"]) }));
    expect(d.carried.members).toBe(0);
  });
});

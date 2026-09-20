import { describe, expect, it } from "vitest";

import { orderAudience, planBatch, type Candidate } from "../audienceOrder";

const p = (id: string, createdAt: string, lastSignInAt: string | null, received = 0): Candidate => ({
  id,
  createdAt,
  lastSignInAt,
  received,
});

const people = [
  p("b", "2026-06-01T00:00:00Z", "2026-09-18T00:00:00Z", 3),
  p("a", "2026-05-19T00:00:00Z", null, 1),
  p("d", "2026-09-19T00:00:00Z", "2026-09-19T00:00:00Z", 0),
  p("c", "2026-08-01T00:00:00Z", "2026-07-01T00:00:00Z", 1),
];

const ids = (list: { id: string }[]) => list.map((x) => x.id).join("");

describe("orderAudience", () => {
  it("puts the oldest accounts, or the newest, first", () => {
    expect(ids(orderAudience(people, "oldest"))).toBe("abcd");
    expect(ids(orderAudience(people, "newest"))).toBe("dcba");
  });

  it("puts whoever signed in most recently first, and never-signed-in last", () => {
    expect(ids(orderAudience(people, "active"))).toBe("dbca");
  });

  it("puts the people Purify has written to least first, oldest breaking the tie", () => {
    expect(ids(orderAudience(people, "least_emailed"))).toBe("dacb");
  });

  it("does not touch the array it is given", () => {
    const copy = [...people];
    orderAudience(people, "newest");
    expect(people).toEqual(copy);
  });
});

describe("planBatch", () => {
  it("takes today's share off the front of the chosen order", () => {
    const plan = planBatch({ candidates: people, done: new Set(), order: "oldest", room: 2 });
    expect(ids(plan.batch)).toBe("ab");
    expect(plan.owed).toBe(4);
  });

  it("skips the people who already have it", () => {
    const plan = planBatch({ candidates: people, done: new Set(["a", "b"]), order: "oldest", room: 10 });
    expect(ids(plan.batch)).toBe("cd");
    expect(plan.owed).toBe(2);
  });

  it("leaves the resting ones owed, but not in today's batch", () => {
    const plan = planBatch({
      candidates: people,
      done: new Set(),
      resting: new Set(["a", "b"]),
      order: "oldest",
      room: 10,
    });
    expect(ids(plan.batch)).toBe("cd");
    expect(plan.owed).toBe(4);
    expect(plan.resting).toBe(2);
  });

  it("sends nothing when the day has no room", () => {
    expect(planBatch({ candidates: people, done: new Set(), order: "oldest", room: 0 }).batch).toEqual([]);
    expect(planBatch({ candidates: people, done: new Set(), order: "oldest", room: -5 }).batch).toEqual([]);
  });
});

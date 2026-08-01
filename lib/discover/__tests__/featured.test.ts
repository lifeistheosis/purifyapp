// The "Featured today" rotation on Discover.
//
// Both halves of the page pick from this, and the pick used to be made in
// a server component, which froze it for the life of an APK. These hold
// the rotation to what its label claims: it moves, every day, and it comes
// back round.

import { describe, expect, it } from "vitest";

import { dayOfYear, pickFeatured } from "@/lib/discover/featured";

const topics = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
const councils = [{ slug: "nicaea" }, { slug: "ephesus" }];

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("dayOfYear", () => {
  it("counts from 1 on the first of January", () => {
    expect(dayOfYear(day("2026-01-01"))).toBe(1);
  });

  it("reaches 365 on the last day of a common year", () => {
    expect(dayOfYear(day("2026-12-31"))).toBe(365);
  });

  it("reaches 366 on the last day of a leap year", () => {
    expect(dayOfYear(day("2028-12-31"))).toBe(366);
  });
});

describe("pickFeatured", () => {
  it("is stable for a given day", () => {
    const a = pickFeatured(topics, councils, day("2026-03-14"));
    const b = pickFeatured(topics, councils, day("2026-03-14"));
    expect(a).toEqual(b);
  });

  it("moves to the next candidate the following day", () => {
    const a = pickFeatured(topics, councils, day("2026-03-14"));
    const b = pickFeatured(topics, councils, day("2026-03-15"));
    expect(a.topic?.slug).not.toBe(b.topic?.slug);
    expect(a.council?.slug).not.toBe(b.council?.slug);
  });

  it("visits every candidate across a run of days", () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 10; i++) {
      const d = day(`2026-01-${String(i).padStart(2, "0")}`);
      seen.add(pickFeatured(topics, councils, d).topic!.slug);
    }
    expect([...seen].sort()).toEqual(["a", "b", "c"]);
  });

  it("returns nulls rather than throwing when there is nothing to feature", () => {
    expect(pickFeatured([], [], day("2026-03-14"))).toEqual({
      topic: null,
      council: null,
    });
  });
});

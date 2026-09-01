import { describe, expect, it } from "vitest";

import {
  diffActivity,
  dwellMs,
  flagFor,
  MAX_VISIBLE,
  trim,
  type ActivitySnapshot,
} from "../activity";

const base: ActivitySnapshot = {
  todayVisitors: 100,
  todaySignups: 5,
  yesterdayVisitors: 120,
  revenueTodayCents: 1000,
  paidPlus: 2,
  paidPro: 1,
  countries: ["gb", "us"],
};
const at = (over: Partial<ActivitySnapshot>): ActivitySnapshot => ({ ...base, ...over });

/**
 * The whole value of this feed is that every row is true. A dashboard that
 * announced plausible activity would be worse than one that announced none,
 * and the failure would be invisible: a fabricated row looks exactly like a
 * real one. So the rules about when NOT to fire matter more than the copy.
 */
describe("what must never fire", () => {
  it("says nothing on the first poll", () => {
    // Otherwise opening the panel announces the whole day at once, as though
    // all of it had just happened.
    expect(diffActivity(null, base, 1)).toEqual([]);
  });

  it("says nothing when nothing moved", () => {
    expect(diffActivity(base, at({}), 1)).toEqual([]);
  });

  it("never reports a number going DOWN as news", () => {
    const out = diffActivity(
      base,
      at({ todaySignups: 2, revenueTodayCents: 0, paidPlus: 0, paidPro: 0 }),
      1,
    );
    // A refund, a cancelled subscription and a corrected count are all real,
    // and none of them is "an order came in".
    expect(out).toEqual([]);
  });

  it("does not re-announce a country that is still here", () => {
    const out = diffActivity(base, at({ countries: ["gb", "us"] }), 1);
    expect(out).toEqual([]);
  });
});

describe("crossing yesterday", () => {
  const kinds = (s: ActivitySnapshot, n: ActivitySnapshot) =>
    diffActivity(s, n, 1).map((e) => e.kind);

  it("fires on the poll that crosses, once", () => {
    const before = at({ todayVisitors: 119, yesterdayVisitors: 120 });
    const after = at({ todayVisitors: 121, yesterdayVisitors: 120 });
    expect(kinds(before, after)).toContain("milestone");
  });

  it("does NOT fire again on every later poll", () => {
    // This is the bug the previous-value check exists to stop: once past, the
    // condition stays true all day, so a naive test would announce it on every
    // poll until midnight.
    const after = at({ todayVisitors: 121, yesterdayVisitors: 120 });
    const later = at({ todayVisitors: 130, yesterdayVisitors: 120 });
    expect(kinds(after, later)).not.toContain("milestone");
  });

  it("does not fire when there is no yesterday to beat", () => {
    const a = at({ todayVisitors: 0, yesterdayVisitors: 0 });
    const b = at({ todayVisitors: 5, yesterdayVisitors: 0 });
    expect(kinds(a, b)).not.toContain("milestone");
  });
});

describe("what it reports", () => {
  it("announces a country that has just appeared, with its flag", () => {
    const out = diffActivity(base, at({ countries: ["gb", "us", "gr"] }), 1);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("visitor");
    expect(out[0].badge).toBe("🇬🇷");
  });

  it("counts a burst of sign-ups as one row, not five", () => {
    const out = diffActivity(base, at({ todaySignups: 10 }), 1);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("5 new accounts");
  });

  it("says account, singular, for one", () => {
    expect(diffActivity(base, at({ todaySignups: 6 }), 1)[0].text).toBe("1 new account");
  });

  it("shows the amount of the order, not the running total", () => {
    const out = diffActivity(base, at({ revenueTodayCents: 3498 }), 1);
    expect(out[0].kind).toBe("sale");
    expect(out[0].badge).toBe("$24.98");
  });

  it("counts Plus and Pro together as subscribers", () => {
    const out = diffActivity(base, at({ paidPlus: 3, paidPro: 2 }), 1);
    expect(out[0].kind).toBe("subscriber");
    expect(out[0].text).toBe("2 new subscribers");
  });

  it("gives every row an id unique across polls", () => {
    const a = diffActivity(base, at({ todaySignups: 6 }), 1);
    const b = diffActivity(base, at({ todaySignups: 6 }), 2);
    expect(a[0].id).not.toBe(b[0].id);
  });
});

describe("flags", () => {
  it("maps a country code to its flag", () => {
    expect(flagFor("gb")).toBe("🇬🇧");
    expect(flagFor("US")).toBe("🇺🇸");
  });

  it("falls back to a globe rather than rendering junk", () => {
    for (const bad of [null, undefined, "", "x", "usa", "12"]) {
      expect(flagFor(bad), String(bad)).toBe("🌐");
    }
  });
});

describe("the bar's limits", () => {
  it("keeps the newest and drops the rest", () => {
    const rows = Array.from({ length: 9 }, (_, i) => i);
    expect(trim(rows)).toEqual([5, 6, 7, 8]);
    expect(trim(rows)).toHaveLength(MAX_VISIBLE);
  });

  it("lets the rare things sit longer than the common ones", () => {
    expect(dwellMs("sale")).toBeGreaterThan(dwellMs("visitor"));
    expect(dwellMs("milestone")).toBeGreaterThan(dwellMs("visitor"));
  });
});

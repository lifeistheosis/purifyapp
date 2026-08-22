import { describe, expect, it } from "vitest";
import {
  API_BIBLE_LIMITS,
  API_BIBLE_SUPPORT_EMAIL,
  enterpriseAdvice,
  needsEnterprise,
  projectMonthEnd,
  readMonetization,
  readUsageLimit,
  worstStatus,
} from "../apiLimits";

const CALLS = API_BIBLE_LIMITS.monthlyCalls; // 150,000
const MAU = API_BIBLE_LIMITS.monthlyActiveUsers; // 100,000

describe("the limits are the ones in the agreement", () => {
  it("holds 150,000 calls and 100,000 monthly active users", () => {
    expect(CALLS).toBe(150_000);
    expect(MAU).toBe(100_000);
  });

  it("names the address to negotiate at", () => {
    expect(API_BIBLE_SUPPORT_EMAIL).toBe("support@api.bible");
  });
});

describe("readUsageLimit", () => {
  it("is comfortable well under the ceiling", () => {
    const r = readUsageLimit("calls", "Calls", 10_000, CALLS);
    expect(r.status).toBe("ok");
    expect(r.ratio).toBeCloseTo(10_000 / 150_000, 6);
  });

  it("warns at 80 percent and escalates at 95", () => {
    expect(readUsageLimit("calls", "Calls", 120_000, CALLS).status).toBe("approaching");
    expect(readUsageLimit("calls", "Calls", 142_500, CALLS).status).toBe("urgent");
  });

  it("reports a breach at exactly the limit, not only past it", () => {
    // The agreement says "meet or exceed". Landing exactly on 150,000 is a
    // breach, and an off-by-one here is the difference between a warning and
    // a licence problem.
    expect(readUsageLimit("calls", "Calls", CALLS, CALLS).status).toBe("breached");
    expect(readUsageLimit("calls", "Calls", CALLS + 1, CALLS).status).toBe("breached");
  });

  it("reports UNMEASURED rather than ok when nothing counted it", () => {
    // The load-bearing case. A tracker that paints a comfortable green bar for
    // a number nobody counted turns an unknown into a false reassurance, which
    // is worse than having no tracker at all.
    const r = readUsageLimit("calls", "Calls", null, CALLS);
    expect(r.status).toBe("unmeasured");
    expect(r.status).not.toBe("ok");
    expect(r.ratio).toBeNull();
    expect(r.detail).toContain("not a limit you are under");
  });

  it("keeps a measured zero apart from an unmeasured one", () => {
    expect(readUsageLimit("mau", "MAU", 0, MAU).status).toBe("ok");
    expect(readUsageLimit("mau", "MAU", null, MAU).status).toBe("unmeasured");
  });
});

describe("readMonetization", () => {
  it("is a breach the moment the app takes money", () => {
    const r = readMonetization(true);
    expect(r.status).toBe("breached");
    expect(r.ratio).toBeNull();
  });

  it("is fine when nothing is sold", () => {
    expect(readMonetization(false).status).toBe("ok");
  });

  it("never expresses itself as a ratio", () => {
    // Rendering monetization as "1 of 1" beside two usage bars would invite
    // reading it as a meter with headroom. It has none; it is a yes or no.
    for (const v of [true, false]) {
      const r = readMonetization(v);
      expect(r.ratio).toBeNull();
      expect(r.limit).toBeNull();
    }
  });
});

describe("worstStatus and needsEnterprise", () => {
  it("lets a breach outrank two comfortable meters", () => {
    // Purify's real shape: plenty of headroom on calls and users, and money
    // changing hands. A panel that averaged these would report health.
    const readings = [
      readUsageLimit("calls", "Calls", 1_000, CALLS),
      readUsageLimit("mau", "MAU", 6_919, MAU),
      readMonetization(true),
    ];
    expect(worstStatus(readings)).toBe("breached");
    expect(needsEnterprise(readings)).toBe(true);
  });

  it("ranks unmeasured above ok but below approaching", () => {
    expect(
      worstStatus([readUsageLimit("calls", "Calls", null, CALLS), readMonetization(false)]),
    ).toBe("unmeasured");
    expect(
      worstStatus([
        readUsageLimit("calls", "Calls", null, CALLS),
        readUsageLimit("mau", "MAU", 90_000, MAU),
      ]),
    ).toBe("approaching");
  });

  it("does not demand enterprise terms for a healthy project", () => {
    const readings = [
      readUsageLimit("calls", "Calls", 100, CALLS),
      readUsageLimit("mau", "MAU", 100, MAU),
      readMonetization(false),
    ];
    expect(needsEnterprise(readings)).toBe(false);
    expect(enterpriseAdvice(readings)).toBeNull();
  });
});

describe("enterpriseAdvice", () => {
  it("names the breached limit and the address", () => {
    const advice = enterpriseAdvice([readMonetization(true)]);
    expect(advice).toContain("Monetization");
    expect(advice).toContain("support@api.bible");
  });

  it("names every breach, not just the first", () => {
    const advice = enterpriseAdvice([
      readUsageLimit("calls", "Calls", CALLS, CALLS),
      readMonetization(true),
    ]);
    expect(advice).toContain("Calls");
    expect(advice).toContain("Monetization");
  });
});

describe("projectMonthEnd", () => {
  it("extrapolates the pace so far", () => {
    // 30,000 calls by the 10th of a 30 day month projects to 90,000.
    expect(projectMonthEnd(30_000, 10, 30)).toBe(90_000);
  });

  it("refuses to project off the first day or two", () => {
    // A projection from two days is noise with a decimal point, and it is the
    // kind of number that gets screenshotted.
    expect(projectMonthEnd(5_000, 1, 31)).toBeNull();
    expect(projectMonthEnd(5_000, 2, 31)).toBeNull();
    expect(projectMonthEnd(5_000, 3, 31)).not.toBeNull();
  });

  it("passes an unmeasured figure through as unmeasured", () => {
    expect(projectMonthEnd(null, 15, 30)).toBeNull();
  });
});

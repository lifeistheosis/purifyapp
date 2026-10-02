import { describe, expect, it } from "vitest";

import { AUTO_HIDE_WEIGHT, TRUST_LIMITS, reportWeight, trustLevel, type TrustFacts } from "../trust";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const base: TrustFacts = { accountAgeMs: 5 * DAY, contributions: 0, removals30d: 0, removals90d: 0, staff: false };

describe("trustLevel", () => {
  it("starts an account made today as new", () => {
    expect(trustLevel({ ...base, accountAgeMs: 2 * HOUR })).toBe("new");
  });

  it("makes it a member after a day", () => {
    expect(trustLevel(base)).toBe("member");
  });

  it("trusts a month, ten contributions and nothing removed", () => {
    expect(trustLevel({ ...base, accountAgeMs: 40 * DAY, contributions: 12 })).toBe("trusted");
    expect(trustLevel({ ...base, accountAgeMs: 40 * DAY, contributions: 12, removals90d: 1 })).toBe("member");
    expect(trustLevel({ ...base, accountAgeMs: 40 * DAY, contributions: 4 })).toBe("member");
  });

  it("puts an account with two recent removals back on new-account limits", () => {
    expect(trustLevel({ ...base, accountAgeMs: 400 * DAY, contributions: 300, removals30d: 2, removals90d: 2 })).toBe("restricted");
  });

  it("never limits the team", () => {
    expect(trustLevel({ ...base, accountAgeMs: HOUR, removals30d: 5, staff: true })).toBe("staff");
  });

  it("gives each level tighter limits than the one above it", () => {
    expect(TRUST_LIMITS.new.postsPerHour).toBeLessThan(TRUST_LIMITS.member.postsPerHour);
    expect(TRUST_LIMITS.member.postsPerHour).toBeLessThan(TRUST_LIMITS.trusted.postsPerHour);
    expect(TRUST_LIMITS.new.linksHeld).toBe(true);
    expect(TRUST_LIMITS.member.linksHeld).toBe(false);
  });
});

describe("reportWeight", () => {
  it("lets three readers, or one moderator, hide something, and not two fresh accounts", () => {
    expect(3 * reportWeight(30 * DAY, false)).toBeGreaterThanOrEqual(AUTO_HIDE_WEIGHT);
    expect(reportWeight(DAY * 2, true)).toBeGreaterThanOrEqual(AUTO_HIDE_WEIGHT);
    expect(2 * reportWeight(HOUR, false)).toBeLessThan(AUTO_HIDE_WEIGHT);
    expect(5 * reportWeight(HOUR, false)).toBeLessThan(AUTO_HIDE_WEIGHT);
  });
});

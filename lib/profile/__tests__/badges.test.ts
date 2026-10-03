import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  BADGE_ORDER,
  EARLY_READER_BEFORE,
  GRANTED_BADGES,
  STANDING_BADGES,
  deriveBadges,
  isEarlyReader,
  isGrantedBadge,
  shownBadges,
} from "../badges";

// The latest migration to define the user_badges check is the one in force.
const SQL = ["20261005000000_community_three.sql", "20261002000000_community_social.sql", "20261001000000_profiles_badges.sql"]
  .map((f) => fs.readFileSync(path.join(process.cwd(), "supabase/migrations", f), "utf8"))
  .find((sql) => /badge in \(/.test(sql)) as string;

const base = { joinedAt: "2027-01-01T00:00:00Z", tier: null, verified: false, ambassador: false, granted: [] } as const;

describe("granted badges", () => {
  it("match the user_badges check constraint, word for word", () => {
    const m = /badge in \(([^)]*)\)/.exec(SQL);
    expect(m, "user_badges badge check").not.toBeNull();
    const sqlList = [...m![1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
    expect(sqlList).toEqual([...GRANTED_BADGES]);
  });

  it("are all in the profile order", () => {
    for (const b of GRANTED_BADGES) expect(BADGE_ORDER).toContain(b);
  });

  it("refuses anything else", () => {
    expect(isGrantedBadge("plus")).toBe(false);
    expect(isGrantedBadge("beta_tester")).toBe(true);
    // Clergy is a verification now (clergy_verifications), not a grant.
    expect(isGrantedBadge("clergy")).toBe(false);
  });
});

describe("deriveBadges", () => {
  it("gives a new reader nothing", () => {
    expect(deriveBadges({ ...base, granted: [] })).toEqual([]);
  });

  it("works out the automatic ones, in profile order", () => {
    const badges = deriveBadges({
      joinedAt: "2026-09-01T00:00:00Z",
      tier: "plus",
      verified: true,
      ambassador: true,
      granted: [
        { badge: "bug_hunter", granted_at: "2026-09-20T00:00:00Z" },
        { badge: "team", granted_at: "2026-08-01T00:00:00Z" },
      ],
    }).map((b) => b.id);
    expect(badges).toEqual(["team", "verified", "plus", "early_reader", "bug_hunter", "ambassador"]);
  });

  it("adds what the reader earned, in its place in the row", () => {
    const ids = deriveBadges({
      ...base,
      granted: [{ badge: "clergy", granted_at: null }],
      earned: [
        { id: "lent", since: "2026-04-04" },
        { id: "psalter", since: "2026-05-01" },
      ],
    }).map((b) => b.id);
    expect(ids).toEqual(["clergy", "psalter", "lent"]);
  });

  it("derives Clergy from a verification, dated by the decision", () => {
    const ids = deriveBadges({ ...base, granted: [], clergy: { since: "2026-10-03T00:00:00Z" } });
    expect(ids).toEqual([{ id: "clergy", since: "2026-10-03T00:00:00Z" }]);
  });

  it("shows Pro in place of Plus, never both", () => {
    const ids = deriveBadges({ ...base, tier: "pro", granted: [] }).map((b) => b.id);
    expect(ids).toContain("pro");
    expect(ids).not.toContain("plus");
  });

  it("drops a grant the app does not know", () => {
    expect(deriveBadges({ ...base, granted: [{ badge: "admin", granted_at: null }] })).toEqual([]);
  });

  it("dates a granted badge from its grant and Early Reader from the account", () => {
    const [team, early] = deriveBadges({
      ...base,
      joinedAt: "2026-07-04T00:00:00Z",
      granted: [{ badge: "team", granted_at: "2026-08-01T00:00:00Z" }],
    });
    expect(team).toEqual({ id: "team", since: "2026-08-01T00:00:00Z" });
    expect(early).toEqual({ id: "early_reader", since: "2026-07-04T00:00:00Z" });
  });
});

describe("Early Reader", () => {
  it("is everyone who joined before the cut-off, and nobody after", () => {
    const cut = new Date(EARLY_READER_BEFORE).getTime();
    expect(isEarlyReader(new Date(cut - 1).toISOString())).toBe(true);
    expect(isEarlyReader(new Date(cut).toISOString())).toBe(false);
    expect(isEarlyReader(null)).toBe(false);
    expect(isEarlyReader("not a date")).toBe(false);
  });
});

describe("shownBadges", () => {
  const all = deriveBadges({
    ...base,
    joinedAt: "2026-09-01T00:00:00Z",
    tier: "plus",
    verified: true,
    clergy: { since: null },
    granted: [{ badge: "beta_tester", granted_at: null }],
  });

  it("keeps a Plus reader's hidden badges off the profile", () => {
    expect(shownBadges(all, ["early_reader", "beta_tester"], true).map((b) => b.id)).toEqual(["clergy", "verified", "plus"]);
  });

  it("never hides the standing badges", () => {
    const ids = shownBadges(all, [...STANDING_BADGES, "plus"], true).map((b) => b.id);
    for (const id of ["clergy", "verified"] as const) expect(ids).toContain(id);
    expect(ids).not.toContain("plus");
  });

  it("lets the choice lapse with the subscription", () => {
    expect(shownBadges(all, ["early_reader"], false)).toEqual(all);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { recordDate } from "../dates";

// The share page is rendered in UTC on the server and hydrated on a device
// in any zone, so a date of record must read the same in both or React
// throws a hydration error. Node re-reads process.env.TZ when it is set.
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const JOINED = "2026-05-19T00:11:27.057Z"; // @purify, the live case
const DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

describe("recordDate", () => {
  it("is the same date in every zone the server or a reader may be in", () => {
    for (const zone of ["UTC", "America/Los_Angeles", "America/Chicago", "Asia/Tokyo", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      expect(recordDate(JOINED, "en", DAY), zone).toBe("May 19, 2026");
      expect(recordDate(JOINED, "en", { month: "long", year: "numeric" }), zone).toBe("May 2026");
    }
  });

  it("would differ without it, so the test can tell (positive control)", () => {
    process.env.TZ = "America/Chicago";
    expect(new Intl.DateTimeFormat("en", DAY).format(new Date(JOINED))).toBe("May 18, 2026");
  });

  it("is what the profile card and the badge list use", () => {
    for (const file of ["components/community/profile/ProfileCard.tsx", "components/community/profile/ProfileBadges.tsx"]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src, file).toContain("recordDate(");
      expect(src, file).not.toMatch(/new Intl\.DateTimeFormat\(/);
    }
  });
});

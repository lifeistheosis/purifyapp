import { describe, expect, it } from "vitest";

import { checkEmailCopy } from "@/lib/email/doctrine";

import { communityDay, feastThreadText } from "../feastText";

describe("communityDay", () => {
  it("turns at midnight in New York, not in London", () => {
    // 03:30 UTC on Oct 3 is still Oct 2 in New York (EDT, UTC-4).
    expect(communityDay(new Date("2026-10-03T03:30:00Z"))).toBe("2026-10-02");
    expect(communityDay(new Date("2026-10-03T04:30:00Z"))).toBe("2026-10-03");
    // And in winter (EST, UTC-5).
    expect(communityDay(new Date("2027-01-07T04:30:00Z"))).toBe("2027-01-06");
  });
});

describe("feastThreadText", () => {
  it("names a feast as itself and a saint as remembered", () => {
    expect(feastThreadText({ name: "The Elevation of the Cross", kind: "feast" }).title).toBe("The Elevation of the Cross");
    const saint = feastThreadText({ name: "St. Dionysius", kind: "saint", saint: { name: "St. Dionysius the Areopagite", slug: "dionysius" } as never });
    expect(saint.title).toBe("Today we remember St. Dionysius the Areopagite");
    expect(saint.slug).toBe("dionysius");
  });

  it("asks for the readers' words and says nothing a moderator or the editors would need to check", () => {
    for (const kind of ["feast", "saint"] as const) {
      const t = feastThreadText({ name: "X", kind });
      expect(checkEmailCopy({ subject: t.title, body: t.body })).toEqual([]);
      expect(t.body).not.toMatch(/—/);
    }
  });
});

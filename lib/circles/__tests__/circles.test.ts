import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { circlesEnabled, readByDay } from "../circles";

// Read together (1.8): who in a circle read which day, and the routes that
// answer to the one switch.

describe("who read which day", () => {
  const members = [
    { user_id: "a", member_name: "Maria" },
    { user_id: "b", member_name: "Nicholas" },
    { user_id: "c", member_name: "Anna" },
  ];

  it("names the members who read each day, in a steady order", () => {
    const rows = [
      { user_id: "b", day: 1 },
      { user_id: "a", day: 1 },
      { user_id: "c", day: 1 },
      { user_id: "a", day: 2 },
    ];
    expect(readByDay(rows, members)).toEqual({ 1: ["Anna", "Maria", "Nicholas"], 2: ["Maria"] });
  });

  it("no longer names a reader who has left the circle", () => {
    expect(readByDay([{ user_id: "gone", day: 3 }, { user_id: "a", day: 3 }], members)).toEqual({ 3: ["Maria"] });
  });

  it("carries no count of anyone's days, only names under a day", () => {
    const out = readByDay([{ user_id: "a", day: 1 }], members);
    expect(Object.values(out).every((names) => names.every((n) => typeof n === "string"))).toBe(true);
  });
});

describe("the switch", () => {
  // On since the owner ran the circle's SQL (2026-10-26). Every route still
  // asks it first, so turning it off again shuts them all.
  it("is on, and every circle route answers to it", () => {
    expect(circlesEnabled()).toBe(true);
    for (const route of ["app/api/circles/route.ts", "app/api/circles/join/route.ts", "app/api/circles/read/route.ts", "app/api/circles/[id]/route.ts"]) {
      expect(fs.readFileSync(route, "utf8"), route).toMatch(/if \(!circlesEnabled\(\)/);
    }
  });
});

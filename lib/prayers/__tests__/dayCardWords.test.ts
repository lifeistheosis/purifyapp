// The website's day card on /prayers/ (components/prayers/PrayersDayCard.tsx,
// shown at a tablet's width and up; the apps hide that tree) draws its fast
// and the count to Pascha on one line, with a dot between them.
//
// Updates 98q (2026-11-16), checkMock with pixels on the card on every palette
// and look: the dot between them was text-paper/30, 1.82 to 2.69:1 where words
// need 4.5:1, on all 21. It now takes the line's own colour (text-paper/55,
// which passes there) and is hidden from a screen reader, as TodayMasthead
// draws its own dot between two words.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const card = readFileSync(join(__dirname, "..", "..", "..", "components", "prayers", "PrayersDayCard.tsx"), "utf8");

describe("the day card's line under the date", () => {
  it("draws the dot between the fast and the count to Pascha in the line's own colour", () => {
    expect(card).toContain("<span aria-hidden> · </span>");
  });

  it("has no words fainter than the line they stand in", () => {
    expect(card).not.toMatch(/text-paper\/30\b/);
  });
});

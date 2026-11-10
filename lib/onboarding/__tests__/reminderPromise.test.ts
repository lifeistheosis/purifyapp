import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REMINDERS_SEEN_ARRIVING, mayPromiseReminders } from "../reminderPromise";

describe("the account card's word on reminders", () => {
  it("is said only where a reminder has been seen to arrive", () => {
    expect(mayPromiseReminders("ios")).toBe(true);
    // Not yet on Android: his word of 2026-11-10 is that none has come there.
    expect(mayPromiseReminders("android")).toBe(false);
    // A browser: his word of the same day, "web notification pops up for me".
    expect(mayPromiseReminders(null)).toBe(true);
    expect(Object.keys(REMINDERS_SEEN_ARRIVING).sort()).toEqual(["android", "ios", "web"]);
  });

  it("is asked by the card before it says the line", () => {
    const card = readFileSync("components/onboarding/RoadCards.tsx", "utf8");
    const uses = card.split('t("onboard.reminders.needsAccount")').length - 1;
    expect(uses).toBe(1);
    expect(card).toContain('mayPromiseReminders(nativePlatform()) ? t("onboard.reminders.needsAccount") : null');
  });
});

describe("each yes carries whose word it is, and the day", () => {
  it("names the owner's own words and their day for every platform that is true", () => {
    const file = readFileSync("lib/onboarding/reminderPromise.ts", "utf8");
    expect(file).toContain('the owner\'s own word, 2026-10-14: "On iOS, I do."');
    expect(file).toContain("the owner's own word, 2026-11-10, of his own browser");
    expect(file.replace(/\n\/\/\s+/g, " ")).toContain('"Though web notification pops up for me, but not the Android app itself."');
  });
});


import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REMINDERS_SEEN_ARRIVING, mayPromiseReminders } from "../reminderPromise";

describe("the account card's word on reminders", () => {
  it("is said only where a reminder has been seen to arrive", () => {
    expect(mayPromiseReminders("ios")).toBe(true);
    expect(mayPromiseReminders("android")).toBe(false);
    // A browser.
    expect(mayPromiseReminders(null)).toBe(false);
    expect(Object.keys(REMINDERS_SEEN_ARRIVING).sort()).toEqual(["android", "ios", "web"]);
  });

  it("is asked by the card before it says the line", () => {
    const card = readFileSync("components/onboarding/RoadCards.tsx", "utf8");
    const uses = card.split('t("onboard.reminders.needsAccount")').length - 1;
    expect(uses).toBe(1);
    expect(card).toContain('mayPromiseReminders(nativePlatform()) ? t("onboard.reminders.needsAccount") : null');
  });
});

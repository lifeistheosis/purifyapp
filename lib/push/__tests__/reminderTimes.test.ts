import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EVENING_DEFAULT,
  MORNING_DEFAULT,
  isReminderTime,
  reminderChange,
  shownTimes,
  timeChange,
} from "../times";

/**
 * The account screen's prayer reminder times (components/profile/PushOptIn.tsx).
 *
 * Until 2026-10-30 the screen showed 07:00 and 21:00 after every reload,
 * whatever the reader had saved, because it never asked for the saved times;
 * and leaving either field saved both, the other as it was shown. So a reader
 * who moved their evening had their morning put back to 07:00, on the server
 * and, on a phone, in the copy the phone sends at every launch. Found while
 * building the onboarding's reminders moment, before a reader reported it.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const saved = { morning: "06:15", evening: "22:30" };

describe("what leaving a time field saves", () => {
  it("saves the time that changed, and not the other", () => {
    expect(timeChange(saved, "evening", "23:00")).toEqual({ evening: "23:00" });
    expect(timeChange(saved, "morning", "05:45")).toEqual({ morning: "05:45" });
  });

  it("saves nothing when the field is left as it was", () => {
    expect(timeChange(saved, "morning", "06:15")).toBeNull();
    expect(timeChange(saved, "evening", "22:30")).toBeNull();
  });

  it("saves nothing for a field that does not hold a time", () => {
    // A cleared field gives "", and the route refuses anything but HH:MM.
    expect(timeChange(saved, "morning", "")).toBeNull();
    expect(timeChange(saved, "evening", "7pm")).toBeNull();
    expect(timeChange(saved, "evening", "24:00")).toBeNull();
  });
});

describe("what the screen shows", () => {
  it("shows what waits to be sent over what is saved, one time at a time", () => {
    expect(shownTimes({ evening: "23:00" }, saved)).toEqual({ morning: "06:15", evening: "23:00" });
    expect(shownTimes(null, saved)).toEqual(saved);
  });

  it("falls back to the defaults only where nothing is known", () => {
    expect(shownTimes()).toEqual({ morning: MORNING_DEFAULT, evening: EVENING_DEFAULT });
    expect(shownTimes(null, { evening: "22:30" })).toEqual({ morning: MORNING_DEFAULT, evening: "22:30" });
  });

  it("passes on no broken time from a stored copy or a row", () => {
    expect(reminderChange({ morning: "06:15", evening: null })).toEqual({ morning: "06:15" });
    expect(reminderChange({ morning: "", evening: 2130 })).toEqual({});
    expect(reminderChange(null)).toEqual({});
    expect(isReminderTime("21:30")).toBe(true);
    expect(isReminderTime("21:30:00")).toBe(false);
  });
});

describe("the account screen", () => {
  const src = fs.readFileSync(path.join(ROOT, "components/profile/PushOptIn.tsx"), "utf8");

  it("draws the fields at the saved times, read before they are shown", () => {
    expect(src).toMatch(/const times = await reminderTimes\(\);\s*if \(alive\) setState\(\{ kind: "subscribed", times \}\)/);
    expect(src).toContain("defaultValue={state.times.morning}");
    expect(src).toContain("defaultValue={state.times.evening}");
  });

  it("never stands a default in for a saved time", () => {
    expect(src).not.toMatch(/\?\?\s*"(07:00|21:00)"/);
    expect(src).not.toMatch(/morningTime:\s*null|eveningTime:\s*null/);
  });

  it("saves from each field that field's time only", () => {
    expect(src).toContain('onBlur={(e) => saveTime("morning", e.target.value)}');
    expect(src).toContain('onBlur={(e) => saveTime("evening", e.target.value)}');
    expect(src).toMatch(/const change = timeChange\(state\.times, which, value\);\s*if \(!change\) return;/);
    expect(src).toContain("await updateReminderTimes(change)");
  });
});

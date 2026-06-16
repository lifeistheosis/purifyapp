// The reminder cron drives every transport (Web Push, APNs, FCM) off these
// pure helpers, so the timezone/hour matching must be provably correct.

import { describe, it, expect } from "vitest";
import { dueKind, reminderPayload, nowInTz } from "@/lib/push/schedule";

describe("dueKind", () => {
  // 12:00 UTC. In New York (UTC-4 in June) that's 08:00 local; in Athens
  // (UTC+3) it's 15:00 local.
  const noonUtc = new Date("2026-06-15T12:00:00Z");

  it("fires the morning rule on a local-hour match", () => {
    const row = { morning_time: "08:00", evening_time: "21:00", timezone: "America/New_York" };
    expect(dueKind(row, noonUtc)).toBe("morning");
  });

  it("fires the evening rule on a local-hour match", () => {
    const row = { morning_time: "07:00", evening_time: "15:00", timezone: "Europe/Athens" };
    expect(dueKind(row, noonUtc)).toBe("evening");
  });

  it("matches on the hour regardless of the stored minutes", () => {
    const row = { morning_time: "08:30", evening_time: null, timezone: "America/New_York" };
    expect(dueKind(row, noonUtc)).toBe("morning");
  });

  it("returns null when neither rule matches the local hour", () => {
    const row = { morning_time: "06:00", evening_time: "21:00", timezone: "America/New_York" };
    expect(dueKind(row, noonUtc)).toBeNull();
  });

  it("ignores a null time", () => {
    const row = { morning_time: null, evening_time: null, timezone: "UTC" };
    expect(dueKind(row, noonUtc)).toBeNull();
  });

  it("falls back to UTC when timezone is null", () => {
    const row = { morning_time: "12:00", evening_time: null, timezone: null };
    expect(dueKind(row, noonUtc)).toBe("morning");
  });

  it("morning wins when both somehow match the same hour", () => {
    const row = { morning_time: "12:00", evening_time: "12:00", timezone: "UTC" };
    expect(dueKind(row, noonUtc)).toBe("morning");
  });
});

describe("reminderPayload", () => {
  it("points the morning nudge at the morning rule", () => {
    expect(reminderPayload("morning").url).toBe("/prayers/morning");
  });
  it("points the evening nudge at the evening rule", () => {
    expect(reminderPayload("evening").url).toBe("/prayers/evening");
  });
});

describe("nowInTz", () => {
  it("shifts UTC into the target zone's wall clock", () => {
    const noonUtc = new Date("2026-06-15T12:00:00Z");
    expect(nowInTz(noonUtc, "America/New_York").getUTCHours()).toBe(8);
    expect(nowInTz(noonUtc, "Europe/Athens").getUTCHours()).toBe(15);
  });
  it("returns the input on a bad zone instead of throwing", () => {
    const d = new Date("2026-06-15T12:00:00Z");
    expect(nowInTz(d, "Not/AZone")).toEqual(d);
  });
});

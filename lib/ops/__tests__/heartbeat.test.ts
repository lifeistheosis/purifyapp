// The heartbeat alert (his item 84): the newest ten-minute claim the
// reminders made is the cron's last call, and a silence of more than three
// calls is said, with what stopped because of it.

import { describe, expect, it } from "vitest";

import { HEARTBEAT_LATE_MINUTES, heartbeatVerdict, stepOfKey } from "../heartbeat";

const NOW = new Date("2026-11-10T02:05:00Z");

describe("the heartbeat", () => {
  it("reads a step's key, and nothing else", () => {
    expect(stepOfKey("push-deliver:2026-11-10T01:20")?.toISOString()).toBe("2026-11-10T01:20:00.000Z");
    expect(stepOfKey("push-deliver:2026-11-10T01")).toBeNull(); // the old hourly claim, never written now
    expect(stepOfKey("health:probe")).toBeNull();
    expect(stepOfKey("push-deliver:not-a-time")).toBeNull();
  });

  it("is on time while the newest call is within three calls", () => {
    const v = heartbeatVerdict(["push-deliver:2026-11-10T01:50", "push-deliver:2026-11-10T02:00", "push-deliver:2026-11-10T01:40"], NOW);
    expect(v.late).toBe(false);
    expect(v.lastAt).toBe("2026-11-10T02:00:00.000Z");
    expect(v.minutes).toBe(5);
    expect(v.line).toContain("02:00 UTC");
  });

  it("is late past three missed calls, and says what stopped", () => {
    const v = heartbeatVerdict(["push-deliver:2026-11-10T01:20"], NOW);
    expect(HEARTBEAT_LATE_MINUTES).toBe(30);
    expect(v.late).toBe(true);
    expect(v.minutes).toBe(45);
    expect(v.line).toContain("01:20 UTC, 45 minutes ago");
    expect(v.line).toContain("prayer reminders");
  });

  it("is late when no claim is left, which is an hour of silence or more", () => {
    const v = heartbeatVerdict([], NOW);
    expect(v.late).toBe(true);
    expect(v.lastAt).toBeNull();
    expect(v.line).toContain("CRON_SECRET");
  });

  it("takes the newest step whatever order the keys come in, and ignores the old hourly ones", () => {
    const v = heartbeatVerdict(["push-deliver:2026-11-10T02", "push-deliver:2026-11-10T01:30", "push-deliver:2026-11-10T01:50"], NOW);
    expect(v.lastAt).toBe("2026-11-10T01:50:00.000Z");
    expect(v.late).toBe(false);
  });
});

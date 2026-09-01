import { describe, expect, it } from "vitest";

import {
  PACE_MIN_MINUTES,
  evaluateHourly,
  formatMetric,
  hourKeyUtc,
  isQuietHour,
  minutesIntoHour,
  shouldNotify,
  type HourlyGoal,
} from "../hourlyGoals";

const goal = (over: Partial<HourlyGoal> = {}): HourlyGoal => ({
  id: "g1",
  metric: "pageviews",
  target: 20,
  paused: false,
  notifyOnHit: true,
  notifyOnMiss: true,
  quietFromHour: 22,
  quietToHour: 7,
  ...over,
});

describe("isQuietHour", () => {
  it("handles a window that crosses midnight", () => {
    // THE CASE NAIVE RANGE CHECKS GET WRONG. 22 to 7 is how quiet hours are
    // always written, and `h >= from && h < to` is false for every hour of it.
    expect(isQuietHour(23, 22, 7)).toBe(true);
    expect(isQuietHour(3, 22, 7)).toBe(true);
    expect(isQuietHour(22, 22, 7)).toBe(true);
    expect(isQuietHour(7, 22, 7)).toBe(false);
    expect(isQuietHour(12, 22, 7)).toBe(false);
  });

  it("handles a window inside one day", () => {
    expect(isQuietHour(13, 12, 14)).toBe(true);
    expect(isQuietHour(14, 12, 14)).toBe(false);
    expect(isQuietHour(11, 12, 14)).toBe(false);
  });

  it("treats from === to as never quiet, not always quiet", () => {
    // Guessing the other way would disable every notification with no visible
    // cause, which is the worse of the two failures.
    for (let h = 0; h < 24; h++) expect(isQuietHour(h, 9, 9)).toBe(false);
  });
});

describe("evaluateHourly", () => {
  it("projects the hour once enough of it has run", () => {
    // 10 in 30 minutes projects to 20.
    const e = evaluateHourly({ target: 20 }, 10, 30);
    expect(e.pace).toBe(20);
    expect(e.behind).toBe(false);
  });

  it("refuses to project too early", () => {
    // At two minutes past, one view projects to thirty and none projects to
    // zero. Neither is information.
    const e = evaluateHourly({ target: 20 }, 1, 2);
    expect(e.pace).toBeNull();
    expect(e.behind).toBeNull();
    expect(evaluateHourly({ target: 20 }, 1, PACE_MIN_MINUTES).pace).not.toBeNull();
  });

  it("calls a slow hour behind", () => {
    const e = evaluateHourly({ target: 20 }, 2, 30); // paces to 4
    expect(e.behind).toBe(true);
  });

  it("never calls a hit hour behind", () => {
    // Already met. The rest of the hour cannot unmake it, whatever the pace
    // arithmetic says.
    const e = evaluateHourly({ target: 20 }, 25, 15);
    expect(e.hit).toBe(true);
    expect(e.behind).toBe(false);
  });

  it("does not clamp the ratio above 1", () => {
    // Three times target is worth seeing as three times target.
    expect(evaluateHourly({ target: 10 }, 30, 60).ratio).toBe(3);
  });

  it("clamps negatives and impossible clocks", () => {
    const e = evaluateHourly({ target: 10 }, -5, 999);
    expect(e.value).toBe(0);
    expect(e.minutesElapsed).toBe(60);
  });

  it("does not divide by a zero target", () => {
    expect(evaluateHourly({ target: 0 }, 5, 30).ratio).toBe(1);
    expect(evaluateHourly({ target: 0 }, 5, 30).hit).toBe(false);
  });
});

describe("shouldNotify", () => {
  const hit = evaluateHourly({ target: 20 }, 25, 40);
  const short = evaluateHourly({ target: 20 }, 4, 60);

  it("reports a hit the moment it happens", () => {
    const d = shouldNotify(goal(), hit, {
      localHour: 14,
      alreadySent: [],
      hourEnded: false,
    });
    expect(d.notify).toBe(true);
    if (d.notify) {
      expect(d.kind).toBe("hit");
      expect(d.body).toContain("25");
    }
  });

  it("never sends the same kind twice in one hour", () => {
    // THE DEDUPE. A cron every five minutes would otherwise send twelve
    // identical pushes for one hour.
    const d = shouldNotify(goal(), hit, {
      localHour: 14,
      alreadySent: ["hit"],
      hourEnded: false,
    });
    expect(d.notify).toBe(false);
  });

  it("holds a miss until the hour is actually over", () => {
    // Before the hour ends a shortfall is a projection, and a projection is
    // not worth a notification.
    const midHour = shouldNotify(goal(), evaluateHourly({ target: 20 }, 4, 40), {
      localHour: 14,
      alreadySent: [],
      hourEnded: false,
    });
    expect(midHour.notify).toBe(false);

    const ended = shouldNotify(goal(), short, {
      localHour: 14,
      alreadySent: [],
      hourEnded: true,
    });
    expect(ended.notify).toBe(true);
    if (ended.notify) expect(ended.kind).toBe("miss");
  });

  it("stays silent during quiet hours", () => {
    const d = shouldNotify(goal(), hit, {
      localHour: 3,
      alreadySent: [],
      hourEnded: false,
    });
    expect(d.notify).toBe(false);
    if (!d.notify) expect(d.reason).toBe("quiet hours");
  });

  it("stays silent when paused or untargeted", () => {
    expect(
      shouldNotify(goal({ paused: true }), hit, { localHour: 14, alreadySent: [], hourEnded: false }).notify,
    ).toBe(false);
    expect(
      shouldNotify(goal({ target: 0 }), hit, { localHour: 14, alreadySent: [], hourEnded: false }).notify,
    ).toBe(false);
  });

  it("respects each switch independently", () => {
    expect(
      shouldNotify(goal({ notifyOnHit: false }), hit, { localHour: 14, alreadySent: [], hourEnded: false }).notify,
    ).toBe(false);
    expect(
      shouldNotify(goal({ notifyOnMiss: false }), short, { localHour: 14, alreadySent: [], hourEnded: true }).notify,
    ).toBe(false);
  });

  it("does not report a miss on an hour that was hit", () => {
    const d = shouldNotify(goal(), hit, {
      localHour: 14,
      alreadySent: ["hit"],
      hourEnded: true,
    });
    expect(d.notify).toBe(false);
  });
});

describe("formatMetric", () => {
  it("prints revenue as money and everything else as a count", () => {
    expect(formatMetric("revenue_cents", 2_499)).toBe("$24.99");
    expect(formatMetric("pageviews", 42)).toBe("42");
  });
});

describe("hourKeyUtc", () => {
  it("buckets by UTC hour", () => {
    expect(hourKeyUtc(new Date("2026-09-01T14:37:12Z"))).toBe("2026-09-01T14");
  });

  it("gives one key per hour, so a five-minute cron dedupes", () => {
    const a = hourKeyUtc(new Date("2026-09-01T14:00:00Z"));
    const b = hourKeyUtc(new Date("2026-09-01T14:59:59Z"));
    const c = hourKeyUtc(new Date("2026-09-01T15:00:00Z"));
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it("is UTC so a clock change cannot repeat an hour", () => {
    // A local key would let a daylight-saving hour recur and send everything
    // twice. The quiet window is local; the bucket is not.
    expect(hourKeyUtc(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-25T01");
  });
});

describe("minutesIntoHour", () => {
  it("measures position within the clock hour", () => {
    expect(minutesIntoHour(new Date("2026-09-01T14:00:00Z"))).toBe(0);
    expect(minutesIntoHour(new Date("2026-09-01T14:30:00Z"))).toBe(30);
    expect(minutesIntoHour(new Date("2026-09-01T14:59:30Z"))).toBeCloseTo(59.5, 1);
  });
});

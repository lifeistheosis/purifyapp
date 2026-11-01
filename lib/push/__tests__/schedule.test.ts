// The reminder cron drives every transport (Web Push, APNs, FCM) off these
// pure helpers, so the timezone/hour matching must be provably correct.

import { describe, it, expect } from "vitest";
import {
  campaignReminderPayload,
  dueCampaigns,
  dueKind,
  nowInTz,
  reminderPayload,
  reminderStep,
  stepDue,
  stepIsDue,
  stepStart,
  MAX_CAMPAIGN_REMINDERS_PER_RUN,
  STEP_MINUTES,
  type CampaignReminderRow,
} from "@/lib/push/schedule";

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

  it("keeps the reader's minute to its ten-minute step", () => {
    // It matched the hour alone until 2026-10-31, so 08:30 came at 08:00.
    const row = { morning_time: "08:30", evening_time: null, timezone: "America/New_York" };
    expect(dueKind(row, noonUtc)).toBeNull();
    expect(dueKind(row, new Date("2026-06-15T12:30:20Z"))).toBe("morning");
    // 08:35 is in the step that begins at 08:30, and comes with it.
    expect(dueKind({ ...row, morning_time: "08:35" }, new Date("2026-06-15T12:30:20Z"))).toBe("morning");
    expect(dueKind({ ...row, morning_time: "08:35" }, new Date("2026-06-15T12:40:20Z"))).toBeNull();
  });

  it("reads a time by its step, and a broken one as never", () => {
    expect(reminderStep("07:45")).toBe(7 * 60 + 40);
    expect(reminderStep("00:00")).toBe(0);
    expect(reminderStep("23:59")).toBe(23 * 60 + 50);
    expect(reminderStep("24:00")).toBeNull();
    expect(reminderStep("7pm")).toBeNull();
    expect(stepStart(new Date("2026-06-15T12:47:59Z")).toISOString()).toBe("2026-06-15T12:40:00.000Z");
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

// The two days a year the clocks change. The runs keep to UTC and the
// reader's clock moves by an hour, so an hour of steps happens twice (a
// reminder in it used to come twice) or not at all (it used to not come).
describe("summer time", () => {
  const run = (iso: string) => new Date(iso);

  it("sends a reminder in the hour that happens twice only the first time (New York, clocks back)", () => {
    // 2026-11-01: 01:30 EDT is 05:30 UTC, and an hour later it is 01:30 EST.
    const row = { morning_time: "01:30", evening_time: null, timezone: "America/New_York" };
    expect(dueKind(row, run("2026-11-01T05:30:20Z"))).toBe("morning");
    expect(dueKind(row, run("2026-11-01T06:30:20Z"))).toBeNull();
    // The steps after it are ordinary again.
    expect(dueKind({ ...row, morning_time: "02:00" }, run("2026-11-01T07:00:20Z"))).toBe("morning");
  });

  it("sends a reminder in the hour that never happens with the first step after (New York, clocks forward)", () => {
    // 2027-03-14: 01:50 EST is 06:50 UTC, and ten minutes later it is 03:00 EDT.
    const row = { morning_time: null, evening_time: "02:30", timezone: "America/New_York" };
    expect(dueKind(row, run("2027-03-14T06:50:20Z"))).toBeNull();
    expect(dueKind(row, run("2027-03-14T07:00:20Z"))).toBe("evening");
    // The 03:10 reminder keeps its own step, and the skipped one is not sent again.
    expect(dueKind({ ...row, evening_time: "03:10" }, run("2027-03-14T07:10:20Z"))).toBe("evening");
    expect(dueKind(row, run("2027-03-14T07:10:20Z"))).toBeNull();
  });

  it("does the same where the clocks go back at four (Athens) and in the southern spring (Sydney)", () => {
    // Athens, 2026-10-25: 03:00 EEST is 00:00 UTC, 03:00 EET is 01:00 UTC.
    const athens = { morning_time: "03:05", evening_time: null, timezone: "Europe/Athens" };
    expect(dueKind(athens, run("2026-10-25T00:00:20Z"))).toBe("morning");
    expect(dueKind(athens, run("2026-10-25T01:00:20Z"))).toBeNull();
    // Sydney, 2026-10-04: 01:50 AEST is 15:50 UTC the day before, then 03:00 AEDT.
    const sydney = { morning_time: "02:45", evening_time: null, timezone: "Australia/Sydney" };
    expect(dueKind(sydney, run("2026-10-03T15:50:20Z"))).toBeNull();
    expect(dueKind(sydney, run("2026-10-03T16:00:20Z"))).toBe("morning");
  });

  it("holds campaign reminders to the same clock", () => {
    const row: CampaignReminderRow = {
      campaign_id: "c1",
      remind_enabled: true,
      remind_time: "01:05",
      timezone: "America/New_York",
    };
    expect(dueCampaigns([row], run("2026-11-01T05:00:20Z"))).toHaveLength(1);
    expect(dueCampaigns([row], run("2026-11-01T06:00:20Z"))).toHaveLength(0);
    expect(dueCampaigns([{ ...row, remind_time: "02:05" }], run("2027-03-14T07:00:20Z"))).toHaveLength(1);
  });

  // The property behind the cases above, everywhere it can bend: every
  // ten-minute step of the reader's day is sent exactly once on every whole
  // local day, on ordinary days and on both change days. Zones with
  // half-hour and three-quarter offsets, a half-hour change (Lord Howe),
  // changes at midnight (Santiago), and ones with none (Kathmandu, Kolkata)
  // are in the list because each breaks a simpler rule a different way.
  const ZONES: [string, string[]][] = [
    ["America/New_York", ["2026-11-01", "2027-03-14"]],
    ["America/St_Johns", ["2026-11-01", "2027-03-14"]],
    ["Europe/Athens", ["2026-10-25", "2027-03-28"]],
    ["Europe/Paris", ["2026-10-25", "2027-03-28"]],
    ["Australia/Sydney", ["2026-10-04", "2027-04-04"]],
    ["Australia/Lord_Howe", ["2026-10-04", "2027-04-04"]],
    ["Pacific/Chatham", ["2026-09-27", "2027-04-04"]],
    ["America/Santiago", ["2026-09-06", "2027-04-04"]],
    ["Asia/Kathmandu", ["2026-10-25"]],
    ["Asia/Kolkata", ["2026-10-25"]],
    ["UTC", ["2026-10-25"]],
  ];

  const STEP_MS = STEP_MINUTES * 60_000;
  const STEPS_A_DAY = (24 * 60) / STEP_MINUTES;
  const wall = (d: Date, tz: string) => {
    const t = nowInTz(d, tz);
    return {
      date: t.toISOString().slice(0, 10),
      step: t.getUTCHours() * 60 + Math.floor(t.getUTCMinutes() / STEP_MINUTES) * STEP_MINUTES,
    };
  };
  const before = (steps: number[], i: number) => [1, 2, 3, 4, 5, 6].map((k) => steps[i - k]);

  for (const [tz, days] of ZONES) {
    for (const day of days) {
      it(`sends each step once a day around ${day} in ${tz}`, () => {
        // One run in every ten-minute step, from two days before to two
        // days after. The clock is read once a run, as the real run reads it.
        const start = Date.parse(`${day}T00:00:00Z`) - 2 * 24 * 3600_000;
        const runs = Array.from({ length: 4 * STEPS_A_DAY }, (_, i) => new Date(start + i * STEP_MS));
        const clocks = runs.map((r) => wall(r, tz));
        const steps = clocks.map((c) => c.step);
        // The first and last local days are only partly inside the span.
        const first = clocks[0].date;
        const last = clocks[clocks.length - 1].date;
        const whole = new Set(clocks.map((c) => c.date).filter((d) => d !== first && d !== last));
        const sends = new Map<string, number>();
        clocks.forEach((c, i) => {
          if (i < 6 || !whole.has(c.date)) return;
          const earlier = before(steps, i);
          for (let target = 0; target < 24 * 60; target += STEP_MINUTES) {
            if (!stepIsDue(target, c.step, earlier)) continue;
            const key = `${c.date} ${target}`;
            sends.set(key, (sends.get(key) ?? 0) + 1);
          }
        });
        for (const d of whole) {
          for (let target = 0; target < 24 * 60; target += STEP_MINUTES) {
            expect(sends.get(`${d} ${target}`) ?? 0, `${tz} ${d} step ${target}`).toBe(1);
          }
        }
        expect(sends.size).toBe(whole.size * STEPS_A_DAY);
        // And the clock a real run reads is the one the property ran over.
        const i = runs.length / 2;
        expect(stepDue(steps[i], runs[i], tz)).toBe(stepIsDue(steps[i], steps[i], before(steps, i)));
      });
    }
  }
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

// Campaign reminders. These helpers existed for a release with zero call
// sites and zero tests: the toggle wrote a column, the migration indexed it,
// and nothing ever read it, so a reader saw an armed switch promising "one
// quiet notification a day" that could never fire. The cron pass that calls
// them now lives in app/api/cron/push-deliver.
describe("dueCampaigns", () => {
  const noonUtc = new Date("2026-06-15T12:00:00Z");
  const row = (over: Partial<CampaignReminderRow> = {}): CampaignReminderRow => ({
    campaign_id: "c1",
    remind_enabled: true,
    remind_time: "08:00",
    timezone: "America/New_York", // 08:00 local at 12:00Z in June
    ...over,
  });

  it("fires on a local-hour match, not a UTC one", () => {
    expect(dueCampaigns([row()], noonUtc)).toHaveLength(1);
    // Same wall-clock string, different zone: 08:00 in Athens is not now.
    expect(dueCampaigns([row({ timezone: "Europe/Athens" })], noonUtc)).toHaveLength(0);
  });

  it("keeps the minute to its ten-minute step", () => {
    // The cron runs every ten minutes; a reader's ":45" comes in the step from ":40".
    expect(dueCampaigns([row({ remind_time: "08:45" })], noonUtc)).toHaveLength(0);
    expect(dueCampaigns([row({ remind_time: "08:45" })], new Date("2026-06-15T12:40:20Z"))).toHaveLength(1);
  });

  it("ignores a row that never asked", () => {
    expect(dueCampaigns([row({ remind_enabled: false })], noonUtc)).toHaveLength(0);
    expect(dueCampaigns([row({ remind_time: null })], noonUtc)).toHaveLength(0);
  });

  it("falls back to UTC rather than throwing on a missing zone", () => {
    expect(dueCampaigns([row({ timezone: null, remind_time: "12:00" })], noonUtc))
      .toHaveLength(1);
  });

  it("caps a reader who joined many campaigns", () => {
    // The whole point of the cap: twelve opt-ins must not become twelve
    // notifications in one hour. The caller applies this per reader.
    const many = Array.from({ length: 12 }, (_, i) =>
      row({ campaign_id: `c${i}` }),
    );
    expect(dueCampaigns(many, noonUtc)).toHaveLength(
      MAX_CAMPAIGN_REMINDERS_PER_RUN,
    );
  });
});

describe("campaignReminderPayload", () => {
  it("says something is there without saying what", () => {
    const p = campaignReminderPayload("abc-123");
    // A campaign is frequently "for my mother's surgery". A push payload
    // crosses APNs and FCM in plaintext, is stored in a Postgres column, and
    // lands on a lock screen in a shared room. No title, no subject, no name.
    const visible = `${p.title} ${p.body}`;
    expect(visible).not.toContain("abc-123");
    expect(visible).not.toMatch(/\d/); // no counts either
    expect(visible).not.toContain("!");
  });

  it("deep links to the campaign, with the id escaped", () => {
    const p = campaignReminderPayload("a b&c");
    expect(p.url).toBe("/campaigns/detail?id=a%20b%26c");
  });
});

// The reminder cron drives every transport (Web Push, APNs, FCM) off these
// pure helpers, so the timezone/hour matching must be provably correct.

import { describe, it, expect } from "vitest";
import {
  campaignReminderPayload,
  dueCampaigns,
  dueKind,
  nowInTz,
  reminderPayload,
  MAX_CAMPAIGN_REMINDERS_PER_RUN,
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

  it("matches the hour, so any minute inside it counts", () => {
    // The cron runs hourly; a reader's ":45" must still fire in that hour.
    expect(dueCampaigns([row({ remind_time: "08:45" })], noonUtc)).toHaveLength(1);
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

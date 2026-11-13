import { describe, expect, it } from "vitest";

import {
  AUTO_PIECES,
  autoSendDecision,
  briefWindowOpen,
  clockLabel,
  DESK_DEFAULTS,
  deskSettingsProblem,
  HOLD_WINDOW_MINUTES,
  isAutoPiece,
  isWeeklyBrief,
  localClock,
  lookWaits,
  readAnnouncement,
  readDeskSettings,
  readHolds,
  readLookSeen,
  sendTimeAfter,
  withHold,
  withoutHold,
  type Announcement,
  type DeskSettings,
} from "../ownerDesk";
import { LOOK_ALREADY_SEEN, READER_EMAIL_LOOK } from "@/lib/email/look";

/**
 * The owner's desk (docs/plans/owner-desk.md, sections 2 and 3), on his two
 * answers of 2026-11-13: "and yes ok for the owners brief" (7:30 his time,
 * Monday's the weekly one) and "yes auto" (the Sunday email, the monthly note
 * and the feast shop email send themselves unless he holds them; the board
 * message waits for his tap).
 */

// Sunday 15 November 2026. New York is on standard time (UTC-5): 7:30 AM there is 12:30 UTC.
const SUNDAY_0730_NY = new Date("2026-11-15T12:30:00Z");
const at = (iso: string) => new Date(iso);

describe("his clock", () => {
  it("reads New York's date, minutes and weekday, through the clock change", () => {
    expect(localClock(SUNDAY_0730_NY)).toEqual({ day: "2026-11-15", minutes: 450, weekday: 0 });
    // Summer time (UTC-4): 7:30 AM on Monday 6 July 2026 is 11:30 UTC.
    expect(localClock(at("2026-07-06T11:30:00Z"))).toEqual({ day: "2026-07-06", minutes: 450, weekday: 1 });
    // 11 PM in New York is already tomorrow in UTC; his day is still today.
    expect(localClock(at("2026-11-16T04:00:00Z")).day).toBe("2026-11-15");
  });

  it("says a time the way he reads it", () => {
    expect(clockLabel("07:30")).toBe("7:30 AM");
    expect(clockLabel("12:00")).toBe("12 noon");
    expect(clockLabel("13:15")).toBe("1:15 PM");
    expect(clockLabel("09:00")).toBe("9 AM");
  });
});

describe("the settings", () => {
  it("default to his answers: the brief at 7:30, Monday's the weekly one, and the sends on", () => {
    expect(DESK_DEFAULTS).toMatchObject({ briefAt: "07:30", weeklyDay: 1, autoSend: true });
    expect(readDeskSettings(undefined)).toEqual(DESK_DEFAULTS);
    expect(readDeskSettings({ junk: true })).toEqual(DESK_DEFAULTS);
  });

  it("keep what he chose, and replace only what is not a setting", () => {
    expect(readDeskSettings({ briefAt: "06:45", weeklyDay: 5, autoSend: false, sendAt: "10:00" })).toEqual({
      briefAt: "06:45",
      weeklyDay: 5,
      autoSend: false,
      sendAt: "10:00",
    });
    expect(readDeskSettings({ briefAt: "25:00", weeklyDay: 9, autoSend: "yes" })).toEqual(DESK_DEFAULTS);
  });

  it("refuse a send hour inside the hold window, and say why in his words", () => {
    const s: DeskSettings = { ...DESK_DEFAULTS, briefAt: "09:00", sendAt: "10:00" };
    expect(deskSettingsProblem(s)).toMatch(/at least 2 hours after the brief/);
    // A stored pair like that keeps his brief and pushes the send back.
    expect(readDeskSettings(s)).toMatchObject({ briefAt: "09:00", sendAt: "11:00" });
    expect(deskSettingsProblem({ ...s, sendAt: "11:00" })).toBeNull();
  });

  it("keep both hours where his day and the UTC day are one date", () => {
    expect(deskSettingsProblem({ ...DESK_DEFAULTS, briefAt: "04:00" })).toMatch(/brief comes between/);
    expect(deskSettingsProblem({ ...DESK_DEFAULTS, sendAt: "19:00" })).toMatch(/sends go between/);
  });
});

describe("the brief's day", () => {
  it("opens at his hour and closes in the evening", () => {
    expect(briefWindowOpen(at("2026-11-15T12:29:00Z"), DESK_DEFAULTS)).toBe(false);
    expect(briefWindowOpen(SUNDAY_0730_NY, DESK_DEFAULTS)).toBe(true);
    expect(briefWindowOpen(at("2026-11-15T23:30:00Z"), DESK_DEFAULTS)).toBe(false);
  });

  it("is the weekly one on the day he chose, Monday unless he changes it", () => {
    expect(isWeeklyBrief(SUNDAY_0730_NY, DESK_DEFAULTS)).toBe(false);
    expect(isWeeklyBrief(at("2026-11-16T12:30:00Z"), DESK_DEFAULTS)).toBe(true);
    expect(isWeeklyBrief(SUNDAY_0730_NY, { ...DESK_DEFAULTS, weeklyDay: 0 })).toBe(true);
  });
});

describe("what can send itself", () => {
  it("is the Sunday email, the monthly note and the feast shop email, and never the board message", () => {
    expect(Object.values(AUTO_PIECES).map((p) => p.kind)).toEqual(["weekly", "monthly", "shop_feast"]);
    expect(isAutoPiece("email-weekly:2026-W46")).toBe(true);
    expect(isAutoPiece("shop-feast:nativity-2026")).toBe(true);
    expect(isAutoPiece("board:2026-W46")).toBe(false);
    expect(isAutoPiece("eikon-open:2026-12")).toBe(false);
    expect(isAutoPiece(null)).toBe(false);
  });

  it("keeps only real holds, and drops a hold on anything that cannot send itself", () => {
    const holds = readHolds({
      holds: {
        "email-weekly:2026-W46": { at: "2026-11-15T13:00:00Z", by: "him" },
        "board:2026-W46": { at: "2026-11-15T13:00:00Z", by: "him" },
        "email-monthly:2026-12": { by: "no time" },
      },
    });
    expect(Object.keys(holds)).toEqual(["email-weekly:2026-W46"]);
    const now = SUNDAY_0730_NY;
    const held = withHold({}, "email-monthly:2026-12", "him", now);
    expect(held["email-monthly:2026-12"]).toEqual({ at: now.toISOString(), by: "him" });
    expect(withoutHold(held, "email-monthly:2026-12", now)).toEqual({});
  });

  it("reads an announcement only as the brief wrote it", () => {
    expect(readAnnouncement(null)).toBeNull();
    expect(readAnnouncement({ day: "2026-11-15", at: "not a time", pieces: [] })).toBeNull();
    const a = readAnnouncement({
      day: "2026-11-15",
      at: "2026-11-15T12:30:00Z",
      pieces: [
        { ruleKey: "email-weekly:2026-W46", kind: "weekly", periodKey: "2026-W46" },
        // The wrong campaign for its rule, and a board message: neither can be named.
        { ruleKey: "email-monthly:2026-12", kind: "weekly", periodKey: "2026-11" },
        { ruleKey: "board:2026-W46", kind: "weekly", periodKey: "2026-W46" },
      ],
    });
    expect(a?.pieces).toEqual([{ ruleKey: "email-weekly:2026-W46", kind: "weekly", periodKey: "2026-W46" }]);
  });
});

describe("the reader emails' look he has seen", () => {
  it("is the look readers already have until he clears another, and waits only on a look he has not seen", () => {
    expect(readLookSeen(undefined, LOOK_ALREADY_SEEN)).toEqual({ seen: LOOK_ALREADY_SEEN, at: null, by: null });
    expect(readLookSeen({ seen: "2", at: "2026-11-20T15:00:00Z", by: "him" }, "1")).toEqual({ seen: "2", at: "2026-11-20T15:00:00Z", by: "him" });
    expect(readLookSeen({ seen: "<script>" }, "1").seen).toBe("1");
    // Today the reader emails wear the look readers have had since September: nothing waits.
    expect(lookWaits(READER_EMAIL_LOOK, readLookSeen(undefined, LOOK_ALREADY_SEEN))).toBe(false);
    // The day the kit's look goes in (READER_EMAIL_LOOK "2"), the sends wait for his look until he clears it.
    expect(lookWaits("2", readLookSeen(undefined, LOOK_ALREADY_SEEN))).toBe(true);
    expect(lookWaits("2", readLookSeen({ seen: "2" }, LOOK_ALREADY_SEEN))).toBe(false);
  });
});

describe("a send by itself", () => {
  const ruleKey = "email-weekly:2026-W46";
  const named: Announcement = {
    day: "2026-11-15",
    at: SUNDAY_0730_NY.toISOString(),
    pieces: [{ ruleKey, kind: "weekly", periodKey: "2026-W46" }],
  };
  const decide = (now: Date, over: Partial<Parameters<typeof autoSendDecision>[0]> = {}) =>
    autoSendDecision({ now, settings: DESK_DEFAULTS, announcement: named, holds: {}, ruleKey, dueToday: true, ...over });
  const NOON = at("2026-11-15T17:00:00Z"); // 12 noon in New York

  it("goes at the sends' hour when the morning brief named it, he did not hold it, and it is still due", () => {
    expect(decide(NOON)).toEqual({ go: true });
  });

  it("never goes while the switch is off", () => {
    expect(decide(NOON, { settings: { ...DESK_DEFAULTS, autoSend: false } })).toEqual({ go: false, why: "off" });
  });

  it("never goes unless that day's brief named it", () => {
    expect(decide(NOON, { announcement: null })).toEqual({ go: false, why: "not named" });
    expect(decide(NOON, { announcement: { ...named, day: "2026-11-14" } })).toEqual({ go: false, why: "not named" });
    expect(decide(NOON, { announcement: { ...named, pieces: [] } })).toEqual({ go: false, why: "not named" });
  });

  it("never goes once he holds it", () => {
    expect(decide(NOON, { holds: { [ruleKey]: { at: SUNDAY_0730_NY.toISOString(), by: "him" } } })).toEqual({
      go: false,
      why: "held",
    });
  });

  it("never goes when the board no longer has it due: skipped, given a later day, or done", () => {
    expect(decide(NOON, { dueToday: false })).toEqual({ go: false, why: "not due" });
  });

  it("waits for the sends' hour, and for the hold window after a brief that came late", () => {
    expect(decide(at("2026-11-15T16:59:00Z"))).toEqual({ go: false, why: "too early" });
    // The brief went at 11:00 AM: the piece waits until 1:00 PM, not noon.
    const late = { ...named, at: at("2026-11-15T16:00:00Z").toISOString() };
    expect(sendTimeAfter(new Date(late.at), DESK_DEFAULTS)).toBe(13 * 60);
    expect(decide(NOON, { announcement: late })).toEqual({ go: false, why: "too early" });
    expect(decide(at("2026-11-15T18:00:00Z"), { announcement: late })).toEqual({ go: true });
    expect(HOLD_WINDOW_MINUTES).toBeGreaterThanOrEqual(120);
  });

  it("lets the day pass rather than send in the evening", () => {
    expect(decide(at("2026-11-15T23:00:00Z"))).toEqual({ go: false, why: "window passed" });
    // A brief that came after 4 PM leaves no send that day: it waits to be sent by hand.
    const evening = { ...named, at: at("2026-11-15T21:30:00Z").toISOString() };
    expect(sendTimeAfter(new Date(evening.at), DESK_DEFAULTS)).toBeNull();
    expect(decide(at("2026-11-15T22:59:00Z"), { announcement: evening })).toEqual({ go: false, why: "window passed" });
  });
});

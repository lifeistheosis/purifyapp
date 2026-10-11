// The phone ticks once for a day kept: for the mark made here that lights the
// flame, and for nothing else the ledger hears. The why is in ../dayKept.ts.

import { describe, expect, it } from "vitest";

import { dayKept, isOwnMark } from "../dayKept";

const YESTERDAY = "2026-10-09";
const TODAY = "2026-10-10";
const TOMORROW = "2026-10-11";

describe("a mark made on this device", () => {
  it("says which day it is for, and that day is today", () => {
    expect(isOwnMark({ ruleId: "morning", date: TODAY }, TODAY)).toBe(true);
    expect(isOwnMark({ ruleId: "day:reading", date: TODAY }, TODAY)).toBe(true);
  });

  it("is not the bare event the sync and a single prayer send", () => {
    expect(isOwnMark(null, TODAY)).toBe(false);
    expect(isOwnMark(undefined, TODAY)).toBe(false);
  });

  it("is not a mark for another day", () => {
    expect(isOwnMark({ ruleId: "day:reading", date: YESTERDAY }, TODAY)).toBe(false);
    expect(isOwnMark({ ruleId: "day:reading" }, TODAY)).toBe(false);
  });
});

describe("the moment a day is kept", () => {
  it("is the first mark of the day made here", () => {
    expect(dayKept(null, TODAY, true, true)).toEqual({ litOn: TODAY, tick: true });
    expect(dayKept(YESTERDAY, TODAY, true, true)).toEqual({ litOn: TODAY, tick: true });
  });

  it("comes once: the next thing done the same day is quiet", () => {
    const first = dayKept(YESTERDAY, TODAY, true, true);
    expect(dayKept(first.litOn, TODAY, true, true)).toEqual({ litOn: TODAY, tick: false });
  });

  it("is not a replay: another device's mark lights the flame without a tick", () => {
    const replay = dayKept(null, TODAY, true, false);
    expect(replay).toEqual({ litOn: TODAY, tick: false });
    // And what the reader does here afterwards is not what kept the day.
    expect(dayKept(replay.litOn, TODAY, true, true).tick).toBe(false);
  });

  it("waits for the day to be kept: one prayer marked inside a rule keeps nothing", () => {
    expect(dayKept(YESTERDAY, TODAY, false, false)).toEqual({ litOn: YESTERDAY, tick: false });
    expect(dayKept(YESTERDAY, TODAY, false, true)).toEqual({ litOn: YESTERDAY, tick: false });
  });

  it("comes again the next day", () => {
    expect(dayKept(TODAY, TOMORROW, true, true)).toEqual({ litOn: TOMORROW, tick: true });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dismissNudge, markOnboarded } from "@/lib/onboarding/state";
import { isDayOneShown } from "@/lib/onboarding/useDayOne";

import { dayNumber, keyFromNumber, weekStrip } from "../compute";
import { atRiskShown, ropeRow, ropeWeek } from "../rope";

// The streak as the prayer rope (1.8, the owner's pick B of round 5): the
// week Monday first, a knot a day, the days kept filled, today lit once
// kept, and the rope out of the way while the Day 1 card shows (his pick B of
// round 6, "Day 1 alone").

const ago = (today: string, n: number) => keyFromNumber(dayNumber(today) - n);
const dates = (knots: { date: string }[]) => knots.map((k) => k.date);
const states = (knots: { state: string }[]) => knots.map((k) => k.state);

describe("the rope's week", () => {
  it("runs Monday to Sunday around today, whatever day today is", () => {
    // Wednesday, 28 October 2026.
    const week = ropeWeek([], "2026-10-28", false);
    expect(dates(week)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(week.map((k) => k.today)).toEqual([false, false, true, false, false, false, false]);
    // A Monday leads its own week, and a Sunday closes it.
    expect(ropeWeek([], "2026-10-26", false)[0]).toMatchObject({ date: "2026-10-26", today: true });
    expect(ropeWeek([], "2026-11-01", false)[6]).toMatchObject({ date: "2026-11-01", today: true });
  });

  it("ties the days kept, leaves the missed ones open, and waits on the days to come", () => {
    const today = "2026-10-29"; // Thursday
    // Kept Monday and Wednesday. Tuesday was missed and the reader's one
    // hidden save held it, so its knot is the softer one (the sheet's ember).
    const kept = ["2026-10-26", "2026-10-28"];
    const week = ropeWeek(weekStrip(kept, today), today, false);
    expect(states(week)).toEqual(["kept", "saved", "kept", "open", "future", "future", "future"]);
    expect(week[3].today).toBe(true);
  });

  it("lights today the moment it is kept, before the strip has heard of it", () => {
    const today = "2026-10-28";
    const strip = weekStrip([ago(today, 1)], today);
    expect(ropeWeek(strip, today, false)[2]).toEqual({ date: today, state: "open", today: true });
    expect(ropeWeek(strip, today, true)[2]).toEqual({ date: today, state: "kept", today: true });
    // And from the strip alone, once it carries today.
    expect(ropeWeek(weekStrip([today], today), today, false)[2].state).toBe("kept");
  });

  it("holds the days of a week that crosses a month's end", () => {
    // Tuesday, 1 December: the week began on Monday, 30 November.
    const today = "2026-12-01";
    const week = ropeWeek(weekStrip(["2026-11-30", today], today), today, true);
    expect(dates(week)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(states(week)).toEqual(["kept", "kept", "future", "future", "future", "future", "future"]);
  });

  it("and one that crosses a year's end", () => {
    // Thursday, 31 December 2026.
    const today = "2026-12-31";
    const week = ropeWeek(weekStrip(["2026-12-28", "2026-12-29", "2026-12-30"], today), today, false);
    expect(dates(week)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(states(week)).toEqual(["kept", "kept", "kept", "open", "future", "future", "future"]);
  });

  it("marks a day missed when nothing was kept and no save held it", () => {
    const today = "2026-11-01"; // Sunday
    const week = ropeWeek(weekStrip([], today), today, false);
    expect(states(week)).toEqual(["missed", "missed", "missed", "missed", "missed", "missed", "open"]);
  });

  it("draws nothing for a day it cannot read", () => {
    expect(ropeWeek([], "not a day", false)).toEqual([]);
  });
});

describe("the rope on Today", () => {
  const ready = { ready: true, atRisk: false };

  it("is drawn once the streak is read, and holds its place until then", () => {
    expect(ropeRow(ready, false)).toBe("rope");
    expect(ropeRow({ ready: false, atRisk: false }, false)).toBe("hold");
  });

  it("is not drawn while the Day 1 card shows, not even as a placeholder", () => {
    expect(ropeRow(ready, true)).toBe("none");
    expect(ropeRow({ ready: false, atRisk: false }, true)).toBe("none");
  });

  it("gives way from 6 pm to the evening card, which waits for Day 1 too", () => {
    const evening = { ready: true, atRisk: true };
    expect(ropeRow(evening, false)).toBe("none");
    expect(atRiskShown(evening, false)).toBe(true);
    expect(atRiskShown(evening, true)).toBe(false);
    expect(atRiskShown(ready, false)).toBe(false);
    expect(atRiskShown({ ready: false, atRisk: true }, false)).toBe(false);
  });
});

describe("whether the Day 1 card is up", () => {
  beforeEach(() => {
    const map = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
      },
      dispatchEvent: () => true,
    });
    vi.stubGlobal("CustomEvent", class extends Event {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is up from the end of onboarding until Day 1 is taken or dismissed, and the rope comes back then", () => {
    expect(isDayOneShown()).toBe(false);
    markOnboarded();
    expect(isDayOneShown()).toBe(true);
    expect(ropeRow({ ready: true, atRisk: false }, isDayOneShown())).toBe("none");
    // Taking Day 1 dismisses it too (FirstStepsNudge's Begin link).
    dismissNudge();
    expect(isDayOneShown()).toBe(false);
    expect(ropeRow({ ready: true, atRisk: false }, isDayOneShown())).toBe("rope");
  });
});

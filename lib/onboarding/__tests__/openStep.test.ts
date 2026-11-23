import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { OPENED_KEY, firstOpening, stepOpening } from "../openStep";

/**
 * The week's card on Today (the owner, 2026-11-22: "a lot of the times it
 * doesn't even switch to the screen smoothly"). Two faults were measured on
 * the export of main that day (docs/plans/onboarding-2.0.md, "A day of the
 * week, worked on"), and each is held here:
 *
 *   - the step was written as taken at the tap, so the card left Today and
 *     the page jumped before the page's own transition began;
 *   - the card stood under the greeting, with its Begin under the tab bar as
 *     Today opened, where a tap opens the Bible.
 *
 * What a browser must say of both is the gate's probe, scripts/gate/week-card.mjs.
 */
describe("opening a step from its card", () => {
  it("counts at the tap, and keeps nothing until the card has left the screen", () => {
    const count = vi.fn();
    const keep = vi.fn();
    const opening = stepOpening({ count, keep });

    opening.tapped();
    expect(count).toHaveBeenCalledTimes(1);
    expect(keep).not.toHaveBeenCalled();

    opening.left();
    expect(keep).toHaveBeenCalledTimes(1);
  });

  it("counts a second tap no more, and keeps once", () => {
    const count = vi.fn();
    const keep = vi.fn();
    const opening = stepOpening({ count, keep });

    opening.tapped();
    opening.tapped();
    opening.left();
    opening.left();
    expect(count).toHaveBeenCalledTimes(1);
    expect(keep).toHaveBeenCalledTimes(1);
  });

  it("keeps nothing when the card leaves with no tap", () => {
    const count = vi.fn();
    const keep = vi.fn();
    stepOpening({ count, keep }).left();
    expect(count).not.toHaveBeenCalled();
    expect(keep).not.toHaveBeenCalled();
  });
});

describe("the week's card on Today", () => {
  const card = readFileSync("components/onboarding/FirstStepsNudge.tsx", "utf8").replace(/\s+/g, " ");
  const today = readFileSync("components/today/TodayMobileV3.tsx", "utf8");

  it("writes a step as taken, and dismisses Day 1, only as what is kept", () => {
    // Each of the two is written once in the card, and each time as the opening's `keep`.
    expect(card.split("writeWeek(stepTaken(").length - 1).toBe(1);
    // With the day's frame (2.0) opening writes nothing: the day is kept by the reader's Done on its page.
    expect(card).toContain("keep: day ? () => {} : () => writeWeek(stepTaken(readWeek(), today()))");
    expect(card.split("dismissNudge()").length - 1).toBe(1);
    expect(card).toContain("keep: () => dismissNudge()");
    // And the card says when it has left.
    expect(card).toContain("opening.current?.left()");
  });

  it("stands first on Today, above the greeting, so its Begin is clear of the tab bar", () => {
    const at = (part: string) => {
      const i = today.indexOf(part);
      expect(i, part).toBeGreaterThan(-1);
      return i;
    };
    expect(at("<FirstStepsNudge />")).toBeLessThan(at("<TodayGreeting />"));
  });
});

// With the day's frame (2.0, lib/onboarding/flags.ts) a step waits on Today
// until the reader's own Done, so it can be opened many times in a day.
describe("a step opened again before it is kept", () => {
  const store = () => {
    const kept = new Map<string, string>();
    return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), kept };
  };

  it("is counted the first time it is opened on a day, and not again that day", () => {
    const s = store();
    expect(firstOpening(0, "2026-12-06", s)).toBe(true);
    expect(s.kept.get(OPENED_KEY)).toBe("0:2026-12-06");
    expect(firstOpening(0, "2026-12-06", s)).toBe(false);
    expect(firstOpening(0, "2026-12-06", s)).toBe(false);
  });

  it("is counted again on another day, and for another step", () => {
    const s = store();
    firstOpening(0, "2026-12-06", s);
    expect(firstOpening(0, "2026-12-07", s)).toBe(true);
    expect(firstOpening(1, "2026-12-07", s)).toBe(true);
  });

  it("counts every opening when the device keeps nothing, as before the frame", () => {
    expect(firstOpening(0, "2026-12-06", null)).toBe(true);
    const shut = {
      getItem: () => {
        throw new Error("shut");
      },
      setItem: () => {},
    };
    expect(firstOpening(0, "2026-12-06", shut)).toBe(true);
  });

  it("is asked by the card only with the frame on, so a reader without it is counted as before", () => {
    const card = readFileSync("components/onboarding/FirstStepsNudge.tsx", "utf8").replace(/\s+/g, " ");
    expect(card).toContain('if (!day || firstOpening(week.index, today(), window.localStorage)) countWeekStep(week.index + 1, "opened");');
  });
});


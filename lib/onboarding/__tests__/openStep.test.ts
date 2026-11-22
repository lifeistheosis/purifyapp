import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { stepOpening } from "../openStep";

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
    expect(card).toContain("keep: () => writeWeek(stepTaken(readWeek(), today()))");
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

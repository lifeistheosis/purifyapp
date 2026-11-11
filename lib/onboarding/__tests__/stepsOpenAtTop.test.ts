import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Every step of the welcome questions opens at its top (the fresh-eyes walk
 * of 2026-11-11). The questions are one scroller, and a step taller than the
 * screen leaves it scrolled: "What are you looking for?" opened 114px down
 * after "Your calendar and your fast", its title and the Back and Skip
 * buttons off the top. The walk of the export measures it on every step,
 * both ways (scripts/questions-top-walk.mjs); this holds the two things that
 * make it so.
 */
describe("the welcome questions' one scroller", () => {
  const flow = readFileSync("components/onboarding/OnboardingFlow.tsx", "utf8").replace(/\s+/g, " ");

  it("is put back to its top whenever the step changes, before the step is painted", () => {
    expect(flow).toContain("useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [step]);");
    // And it is the dialog itself that is put back: the one element that scrolls.
    expect(flow).toMatch(/<div ref=\{scroller\} role="dialog"/);
  });

  it("keeps no scroll anchor, so the old step's button is not held in place under the new step", () => {
    const at = flow.indexOf('<div ref={scroller} role="dialog"');
    const tag = flow.slice(at, flow.indexOf(">", at));
    expect(tag).toContain("overflow-y-auto");
    expect(tag).toContain("[overflow-anchor:none]");
  });

  it("is the only scroller the steps have", () => {
    // A second scroller inside a step would need the same care.
    expect(flow.split("overflow-y-auto").length - 1).toBe(1);
  });
});

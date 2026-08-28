import { describe, expect, it } from "vitest";

import { buildLadder, currentGoal, ladderProgress } from "../goals";

/**
 * Pinned to the real books on 2026-08-28, AFTER the correction that one of the
 * three Google Play subscriptions is the owner's own test account.
 *
 *   paying customers   2, not 3: Dranem on Plus ($4.99) and henrymyslicki9 on
 *                      Pro ($19.99). The third is lifeistheosis, the owner.
 *   subs at list       $24.98
 *   subs net of 15%    $21.23
 *   fixed costs        $171.00 a month, including the hidden Bible API line
 *   boxes owed         one, for the single Pro member, $5.95 at the ceiling
 */
const BOOKS = {
  fixedCostsCents: 17100,
  boxCostsAtCeilingCents: 595,
  netRevenueCents: 2123,
};

const PRO_NET = 1699; // $16.99 after the store
const PLUS_NET = 424; // $4.24 after the store

describe("the ladder", () => {
  it("starts at what actually leaves the account", () => {
    const [first] = buildLadder(BOOKS);
    expect(first.id).toBe("break-even");
    expect(first.targetCents).toBe(17100); // $171, not the $142 /support shows
  });

  it("puts the boxes on the second rung, costed at the ceiling", () => {
    const rungs = buildLadder(BOOKS);
    expect(rungs[1].targetCents).toBe(17695); // $176.95
    expect(rungs[2].targetCents).toBe(26543); // $265.43, half a month spare
    expect(rungs[3].targetCents).toBe(100_000);
  });

  it("rises with costs, without anyone editing a constant", () => {
    const dearer = buildLadder({ ...BOOKS, fixedCostsCents: 25000 });
    expect(dearer[0].targetCents).toBe(25000);
    expect(dearer[1].targetCents).toBe(25595);
  });
});

describe("where the app actually stands", () => {
  const progress = ladderProgress(BOOKS, PRO_NET);

  it("has not cleared the first rung", () => {
    const [breakEven] = progress;
    expect(breakEven.reached).toBe(false);
    expect(breakEven.remainingCents).toBe(14977); // $149.77 short
    expect(Math.round(breakEven.progress * 100)).toBe(12);
  });

  it("says how many members close it", () => {
    const [breakEven] = progress;
    expect(breakEven.membersNeeded).toBe(9); // 9 more Pro
    expect(ladderProgress(BOOKS, PLUS_NET)[0].membersNeeded).toBe(36);
  });

  it("names break even as the rung being worked on", () => {
    expect(currentGoal(progress)?.id).toBe("break-even");
  });

  it("counts NO progress from the owner's own subscription", () => {
    // The correction that prompted this: three Google Play rows, two customers.
    // Counting the owner's own card as income overstates the first rung's
    // progress and makes break even look nearer than it is.
    const withOwner = ladderProgress(
      { ...BOOKS, netRevenueCents: 2123 + PLUS_NET },
      PRO_NET,
    );
    expect(withOwner[0].remainingCents).toBeLessThan(
      progress[0].remainingCents,
    );
    expect(progress[0].remainingCents).toBe(14977);
  });
});

describe("guards", () => {
  it("moves the goal on as each is cleared", () => {
    const cleared = ladderProgress({ ...BOOKS, netRevenueCents: 20000 }, PRO_NET);
    expect(cleared[0].reached).toBe(true);
    expect(cleared[1].reached).toBe(true);
    expect(currentGoal(cleared)?.id).toBe("cushion");
  });

  it("returns null when every rung is behind you", () => {
    const all = ladderProgress({ ...BOOKS, netRevenueCents: 200_000 }, PRO_NET);
    expect(currentGoal(all)).toBeNull();
    expect(all.every((g) => g.reached)).toBe(true);
  });

  it("refuses a ladder that stops ascending", () => {
    // Once costs pass $1,000 the round-number rung is no longer ahead of the
    // cushion, and a panel showing "First $1,000 month: reached" above an
    // unreached cushion reads as a bug. Fail loudly instead.
    expect(() =>
      ladderProgress({ ...BOOKS, fixedCostsCents: 90_000 }, PRO_NET),
    ).toThrow(/not ascending/);
  });

  it("never asks for a fraction of a member", () => {
    const p = ladderProgress({ ...BOOKS, netRevenueCents: 17099 }, PRO_NET);
    expect(p[0].remainingCents).toBe(1);
    expect(p[0].membersNeeded).toBe(1);
  });
});

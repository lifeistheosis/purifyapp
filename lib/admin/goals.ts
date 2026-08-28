/**
 * The ladder: break even first, then profit.
 *
 * ── Why the rungs are derived and not typed in ──────────────────────────
 *
 * A goal of "$500 a month" is a wish. A goal of "cover the $171 that leaves the
 * account every month" is a number with a reason attached, and it moves on its
 * own when a cost is added. Every rung below except the round-number ones is
 * computed from real costs, so adding a server or a licence raises the target
 * the same day rather than the next time somebody remembers to edit a constant.
 *
 * ── Why net, always ─────────────────────────────────────────────────────
 *
 * Targets are measured against revenue AFTER the store's cut and after the
 * boxes are paid for, because that is the money that can actually pay a bill.
 * A ladder built on list price would call break even about 15% early and stay
 * wrong in the same direction forever.
 *
 * ── One account is not a customer ───────────────────────────────────────
 *
 * The owner's own Plus subscription is bought through Google Play with the
 * owner's own card. It is not income: the money leaves, the store keeps 15%,
 * and the rest comes back, so counting it as revenue reports a loss of 75 cents
 * as a gain of $4.24. lib/dev/developer.ts already knows which account that is,
 * and callers must exclude it before the figures reach here.
 */

export type Goal = {
  id: string;
  label: string;
  /** Net monthly revenue, in cents, that clears this rung. */
  targetCents: number;
  /** Why this number and not a rounder one. Shown under the label. */
  why: string;
};

export type GoalProgress = Goal & {
  reachedCents: number;
  /** 0 to 1, clamped. */
  progress: number;
  remainingCents: number;
  reached: boolean;
  /** Extra paying members needed, at the given net-per-member rate. */
  membersNeeded: number;
};

export type LadderInput = {
  /** Every active expense line, published or hidden, in cents per month. */
  fixedCostsCents: number;
  /** What the boxes owed this month cost at the ceiling, in cents. */
  boxCostsAtCeilingCents: number;
  /** Current net monthly revenue: after the store's cut, excluding the owner. */
  netRevenueCents: number;
};

/**
 * The rungs, in order. Each one is a strictly larger target than the last, and
 * `buildLadder` asserts that rather than trusting the arithmetic.
 */
export function buildLadder(input: LadderInput): Goal[] {
  const { fixedCostsCents, boxCostsAtCeilingCents } = input;
  const withBoxes = fixedCostsCents + boxCostsAtCeilingCents;

  return [
    {
      id: "break-even",
      label: "Break even",
      targetCents: fixedCostsCents,
      why: "Covers every recurring line, including the ones /support does not publish.",
    },
    {
      id: "boxes-covered",
      label: "Boxes covered",
      targetCents: withBoxes,
      why: "Break even plus every Pro box owed this month, costed at the ceiling rather than at what you hope to pay.",
    },
    {
      id: "cushion",
      label: "One month of cushion",
      targetCents: Math.round(withBoxes * 1.5),
      why: "Half a month spare, so one refund or one cancelled subscription does not put the month underwater.",
    },
    {
      id: "first-thousand",
      label: "First $1,000 month",
      targetCents: 100_000,
      why: "The first month the app pays for itself and leaves something behind. A round number on purpose: it is the one people feel.",
    },
  ];
}

export function ladderProgress(
  input: LadderInput,
  netPerMemberCents: number,
): GoalProgress[] {
  const goals = buildLadder(input);

  // A ladder whose rungs are not ascending would show a later goal as already
  // reached while an earlier one is not, which reads as a bug in the panel.
  for (let i = 1; i < goals.length; i++) {
    if (goals[i].targetCents <= goals[i - 1].targetCents) {
      throw new Error(
        `goal ladder is not ascending: "${goals[i].id}" (${goals[i].targetCents}) ` +
          `does not exceed "${goals[i - 1].id}" (${goals[i - 1].targetCents}). ` +
          `Costs have grown past a round-number rung; re-order or drop it.`,
      );
    }
  }

  return goals.map((g) => {
    const remainingCents = Math.max(0, g.targetCents - input.netRevenueCents);
    return {
      ...g,
      reachedCents: input.netRevenueCents,
      progress:
        g.targetCents === 0
          ? 1
          : Math.min(1, Math.max(0, input.netRevenueCents / g.targetCents)),
      remainingCents,
      reached: input.netRevenueCents >= g.targetCents,
      membersNeeded:
        remainingCents === 0
          ? 0
          : netPerMemberCents <= 0
            ? Infinity
            : Math.ceil(remainingCents / netPerMemberCents),
    };
  });
}

/** The rung being worked on: the first not yet reached, or null if all are. */
export function currentGoal(progress: GoalProgress[]): GoalProgress | null {
  return progress.find((g) => !g.reached) ?? null;
}

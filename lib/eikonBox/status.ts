// The member-facing vocabulary for a box claim, and the legal moves the
// admin routes will accept. The drop analogue of lib/shop/status.ts.

import type { ClaimStatus, DropStatus } from "./types";

/** The calm step ladder a member sees, in order. */
export const CLAIM_STEPS = [
  "Claimed",
  "Being gathered",
  "Packed",
  "Shipped",
  "Delivered",
] as const;

export type ClaimStep = (typeof CLAIM_STEPS)[number];

/**
 * Where this claim sits on the ladder.
 *
 * "Being gathered" has no claim status of its own: it is derived from the
 * DROP moving past its window while the claim is still merely claimed. That
 * is the honest thing to show for the stretch between the window closing
 * and the owner having the units in hand, which on a claim-first drop is
 * most of the wait.
 */
export function memberClaimStep(
  claim: { status: ClaimStatus },
  drop: { status: DropStatus },
): ClaimStep {
  switch (claim.status) {
    case "delivered":
      return "Delivered";
    case "shipped":
      return "Shipped";
    case "packed":
      return "Packed";
    case "cancelled":
      // Terminal; callers render a pill, not the ladder. Reported as the
      // first step so a stray render never shows a cancelled box as sent.
      return "Claimed";
    case "claimed":
    default:
      return drop.status === "closed" ||
        drop.status === "fulfilling" ||
        drop.status === "shipped"
        ? "Being gathered"
        : "Claimed";
  }
}

export function claimStepIndex(step: ClaimStep): number {
  return CLAIM_STEPS.indexOf(step);
}

/**
 * Legal drop transitions. Anything not listed is refused by the admin route
 * with a 409 rather than silently applied.
 *
 * 'closed' can go back to 'open' on purpose: the owner will want to reopen a
 * window they shut too early, and there is no harm in it.
 */
export const DROP_TRANSITIONS: Record<DropStatus, DropStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["closed", "cancelled"],
  closed: ["open", "fulfilling", "cancelled"],
  fulfilling: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export function canMoveDrop(from: DropStatus, to: DropStatus): boolean {
  return DROP_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Is this drop accepting claims right now? Mirrors claim_eikon_box(). */
export function dropIsOpen(
  drop: { status: DropStatus; claimsOpenAt: string | null; claimsCloseAt: string | null },
  now: Date = new Date(),
): boolean {
  if (drop.status !== "open") return false;
  if (drop.claimsOpenAt && new Date(drop.claimsOpenAt) > now) return false;
  if (drop.claimsCloseAt && new Date(drop.claimsCloseAt) <= now) return false;
  return true;
}

// What a claimed gift does to an entitlements row.
//
// Pure so the claim route's money-adjacent math is testable without a
// database. The rules that matter:
//
//   * A gift EXTENDS, never truncates. If the reader already has paid time
//     left, the gift stacks on top of it rather than overwriting the expiry
//     with now + days. (The admin comp route deliberately sets an absolute
//     window; a gift must not, or gifting someone a week would shorten a
//     paid year.)
//   * Pro implies Plus, so a Pro gift carries plus_until forward to at least
//     the new Pro expiry.
//   * A Plus gift NEVER touches pro_until. Comp clears the other tier so the
//     grant is exactly what the admin picked; a gift is additive and must not
//     silently demote a Pro member who is handed a Plus gift.
//   * is_supporter is preserved by the caller (upsert_entitlement overwrites
//     it), same as the RevenueCat webhook does.

export type EntitlementDates = {
  plus_until?: string | null;
  pro_until?: string | null;
};

export type GiftGrant = {
  plusUntil: string;
  proUntil: string | null;
};

const DAY_MS = 86_400_000;

/** Later of two instants; treats null/invalid as "no time left". */
function latest(a: number, b: string | null | undefined): number {
  if (!b) return a;
  const t = new Date(b).getTime();
  return Number.isFinite(t) && t > a ? t : a;
}

/**
 * Resolve the new expiry dates for claiming `days` of `tier`.
 *
 * @param row   the reader's current entitlements row (or null when absent).
 * @param tier  what the gift grants.
 * @param days  length of the gift in days (> 0).
 * @param now   clock injection point for tests; defaults to now.
 */
export function computeGiftGrant(
  row: EntitlementDates | null | undefined,
  tier: "plus" | "pro",
  days: number,
  now: Date = new Date(),
): GiftGrant {
  const nowMs = now.getTime();
  const span = Math.max(0, Math.round(days)) * DAY_MS;

  if (tier === "pro") {
    // Stack on whatever Pro time is left, not on `now`.
    const proBase = latest(nowMs, row?.pro_until);
    const proEnd = proBase + span;
    // Pro includes Plus: carry Plus to at least the new Pro expiry, but never
    // pull an already-longer Plus window back.
    const plusEnd = latest(proEnd, row?.plus_until);
    return {
      proUntil: new Date(proEnd).toISOString(),
      plusUntil: new Date(plusEnd).toISOString(),
    };
  }

  const plusBase = latest(nowMs, row?.plus_until);
  return {
    plusUntil: new Date(plusBase + span).toISOString(),
    // Untouched. A Plus gift must not demote a Pro member.
    proUntil: row?.pro_until ?? null,
  };
}

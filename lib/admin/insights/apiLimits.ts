/**
 * API.Bible free-tier limits, and where this project stands against them.
 *
 * Purify serves NIV, NKJV and NLT through API.Bible (American Bible Society)
 * under the Biblica agreements. The free tier has three ceilings and crossing
 * any one of them requires enterprise terms, negotiated at support@api.bible.
 *
 * THE THIRD CEILING IS NOT A NUMBER, and that is why this module exists rather
 * than two progress bars. Monetization is a yes or no, it is already yes for
 * this project, and a dashboard that only drew usage meters would show two
 * comfortable green bars beside a breach.
 */

export const API_BIBLE_SUPPORT_EMAIL = "support@api.bible";

export const API_BIBLE_LIMITS = {
  /** Calls per calendar month. */
  monthlyCalls: 150_000,
  /** Distinct users per calendar month. */
  monthlyActiveUsers: 100_000,
} as const;

/**
 * How close is close enough to act.
 *
 * 0.8 rather than 1.0 because the thing being protected is a licence, not a
 * quota that merely throttles. Discovering a breach on the day it happens
 * leaves no time to negotiate, and negotiation is the remedy the agreement
 * offers. 0.95 is the second step, where the answer stops being "plan" and
 * becomes "send the email".
 */
export const WARN_AT = 0.8;
export const CRITICAL_AT = 0.95;

export type LimitStatus = "ok" | "unmeasured" | "approaching" | "urgent" | "breached";

export type LimitReading = {
  id: "calls" | "mau" | "monetization";
  label: string;
  /** null means genuinely not measured, which is not the same as zero. */
  used: number | null;
  limit: number | null;
  /** used / limit, or null when either side is unknown. */
  ratio: number | null;
  status: LimitStatus;
  /** One sentence an operator can act on. */
  detail: string;
};

/**
 * A usage ceiling, read.
 *
 * `used: null` reports "unmeasured" and never "ok". A tracker that shows a
 * comfortable green bar for a number nobody counted is worse than no tracker,
 * because it converts an unknown into a false reassurance.
 */
export function readUsageLimit(
  id: "calls" | "mau",
  label: string,
  used: number | null,
  limit: number,
): LimitReading {
  if (used === null) {
    return {
      id,
      label,
      used: null,
      limit,
      ratio: null,
      status: "unmeasured",
      detail: `Nothing counts this yet, so it cannot be reported against the ${limit.toLocaleString("en-US")} ceiling. An unmeasured limit is not a limit you are under.`,
    };
  }

  const ratio = limit > 0 ? used / limit : null;
  const pct = ratio === null ? "" : `${Math.round(ratio * 100)}% of the ceiling.`;

  if (ratio !== null && ratio >= 1) {
    return {
      id,
      label,
      used,
      limit,
      ratio,
      status: "breached",
      detail: `Over the free-tier ceiling. ${pct} Enterprise terms are required, not optional.`,
    };
  }
  if (ratio !== null && ratio >= CRITICAL_AT) {
    return {
      id,
      label,
      used,
      limit,
      ratio,
      status: "urgent",
      detail: `${pct} Close enough that the next good month crosses it. Open the conversation now.`,
    };
  }
  if (ratio !== null && ratio >= WARN_AT) {
    return {
      id,
      label,
      used,
      limit,
      ratio,
      status: "approaching",
      detail: `${pct} Worth planning the upgrade before it is forced.`,
    };
  }
  return {
    id,
    label,
    used,
    limit,
    ratio,
    status: "ok",
    detail: `${pct} Comfortable.`,
  };
}

/**
 * The monetization ceiling.
 *
 * Binary, and breached the moment the app takes money. It is deliberately NOT
 * expressed as a ratio, because rendering "1 of 1" beside two usage bars would
 * invite reading it as a meter with room left on it.
 */
export function readMonetization(monetized: boolean | null): LimitReading {
  // NULL IS A THIRD ANSWER, and dropping it was the whole bug. The route sends
  // `monetized: null` when the entitlements or shop_orders read fails, and its
  // own comment says "'we could not check' and 'no money has changed hands'
  // are different facts". This function took a plain boolean, so null arrived
  // as falsy and became "ok": one failed read flipped the licence card from a
  // red "Over the limit" to a green "Within the free tier", and dropped the
  // banner from Goals and Growth entirely. The response is HTTP 200, so the
  // "Could not be read" path never ran either.
  //
  // The banner is red for a real reason today, which is what made this
  // dangerous rather than merely wrong.
  //
  // `unmeasured` already outranks `ok` in RANK below, so the overall status
  // still degrades correctly and no call site needs to change.
  if (monetized === null) {
    return {
      id: "monetization",
      label: "Monetization",
      used: null,
      limit: null,
      ratio: null,
      status: "unmeasured",
      detail:
        "Whether the app is taking money could not be read, so the licence condition cannot be judged. This is not a statement that the condition holds.",
    };
  }
  return {
    id: "monetization",
    label: "Monetization",
    used: null,
    limit: null,
    ratio: null,
    status: monetized ? "breached" : "ok",
    detail: monetized
      ? "The app takes money, so the free tier's non-commercial condition no longer applies. This is a licence question rather than a usage one, and no amount of headroom on the other two ceilings offsets it."
      : "No subscriptions, purchases or ads. The non-commercial condition holds.",
  };
}

const RANK: Record<LimitStatus, number> = {
  ok: 0,
  unmeasured: 1,
  approaching: 2,
  urgent: 3,
  breached: 4,
};

/** The worst of the readings, which is what a single banner has to speak for. */
export function worstStatus(readings: LimitReading[]): LimitStatus {
  return readings.reduce<LimitStatus>(
    (worst, r) => (RANK[r.status] > RANK[worst] ? r.status : worst),
    "ok",
  );
}

export function needsEnterprise(readings: LimitReading[]): boolean {
  const s = worstStatus(readings);
  return s === "breached" || s === "urgent";
}

export const STATUS_LABEL: Record<LimitStatus, string> = {
  ok: "Within the free tier",
  unmeasured: "Not measured",
  approaching: "Approaching the limit",
  urgent: "About to cross",
  breached: "Over the limit",
};

/**
 * The sentence the banner leads with.
 *
 * Names the email, because the remedy for every one of these is the same
 * conversation and burying it a click away in a settings page is how a
 * compliance warning becomes decoration.
 */
export function enterpriseAdvice(readings: LimitReading[]): string | null {
  const breached = readings.filter((r) => r.status === "breached");
  const urgent = readings.filter((r) => r.status === "urgent");

  if (breached.length > 0) {
    return `${breached.map((r) => r.label).join(" and ")} ${breached.length === 1 ? "is" : "are"} past the API.Bible free tier. Write to ${API_BIBLE_SUPPORT_EMAIL} to negotiate enterprise terms.`;
  }
  if (urgent.length > 0) {
    return `${urgent.map((r) => r.label).join(" and ")} will cross the API.Bible free tier shortly. Write to ${API_BIBLE_SUPPORT_EMAIL} before it does.`;
  }
  return null;
}

/**
 * Where a usage figure is heading by the end of the month.
 *
 * Straight-line from the pace so far, which is the honest simple model when the
 * only input is a running total: if a third of the month has produced N, the
 * month produces roughly 3N. Returns null rather than a flattering number when
 * the month is too young to say anything, because a projection off two days is
 * noise with a decimal point.
 */
export function projectMonthEnd(
  usedSoFar: number | null,
  dayOfMonth: number,
  daysInMonth: number,
): number | null {
  if (usedSoFar === null) return null;
  if (dayOfMonth < 3 || dayOfMonth > daysInMonth) return null;
  return Math.round((usedSoFar / dayOfMonth) * daysInMonth);
}

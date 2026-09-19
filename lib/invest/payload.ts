// What the investor page is handed. Built from the same three sources the
// owner dashboard reads (the live counts, the plan and the hand-entered
// figures), so the page and the panel are the same numbers by construction.

import { INVEST_MANUAL } from "./manual";
import { INVESTOR_PLAN, paceAgainstPlan, planAnchors, planYears, type Pace, type PlanAnchor, type PlanYearDetail } from "./plan";
import type { InvestorLive } from "./live";

export type InvestPayload = {
  /** Null when the live read failed: the page then keeps its printed figures. */
  live: InvestorLive | null;
  plan: {
    anchors: PlanAnchor[];
    years: PlanYearDetail[];
    memberPricePerYear: number;
    averageOrder: number;
    reachablePractising: number;
  };
  pace: Pace | null;
  manual: typeof INVEST_MANUAL;
};

export function buildPayload(live: InvestorLive | null, now = new Date()): InvestPayload {
  return {
    live,
    plan: {
      anchors: planAnchors(),
      years: planYears(),
      memberPricePerYear: INVESTOR_PLAN.memberPricePerYear,
      averageOrder: INVESTOR_PLAN.averageOrder,
      reachablePractising: INVESTOR_PLAN.reachablePractising,
    },
    pace: live ? paceAgainstPlan(live.runRate.total, now) : null,
    manual: INVEST_MANUAL,
  };
}

/**
 * JSON that is safe inside a <script> element: no "</script>" can close it
 * early, and no HTML comment or CDATA marker can form.
 */
export function scriptSafeJson(value: unknown): string {
  // Each risky character becomes its six-character escape (a backslash, u,
  // four hex digits), which JSON.parse turns back into the character. Built
  // from character codes so no editor can quietly unescape it.
  const backslash = String.fromCharCode(92);
  const risky = new RegExp("[<>&" + String.fromCharCode(0x2028, 0x2029) + "]", "g");
  return JSON.stringify(value).replace(
    risky,
    (ch) => backslash + "u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** The empty data block the page ships with; the route fills it. */
export const DATA_SLOT = `<script id="invest-data" type="application/json">null</script>`;

export function injectPayload(html: string, payload: InvestPayload): string {
  if (!html.includes(DATA_SLOT)) return html;
  return html.replace(DATA_SLOT, `<script id="invest-data" type="application/json">${scriptSafeJson(payload)}</script>`);
}

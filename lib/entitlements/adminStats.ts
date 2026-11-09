import "server-only";

// Server-side subscription counts for the admin hub, derived from the
// entitlements table (the only place Plus/Pro state lives). Reused by the
// Revenue and Subscriptions routes so both agree on the numbers.
//
// This is the current picture only. Who joined and who left over time comes
// from the RevenueCat events the webhook keeps from 1.9 (admin item A2,
// lib/admin/plusHistory.ts); here those events say only who is in a free
// trial now, so a trial stops counting as a paying member.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriberCounts } from "@/lib/premium/mrr";
import { DEVELOPER_EMAILS } from "@/lib/dev/developer";
import { userIdByEmail } from "@/lib/admin/accountEmails";
import { pageAllSettled } from "@/lib/supabase/pageAll";
import { trialMembers } from "@/lib/admin/plusEvents.server";

export type SubscriptionStats = {
  /** plus_until in the future (includes Pro, which is a Plus superset). */
  activePlus: number;
  /** pro_until in the future. */
  activePro: number;
  /** active Plus but not Pro. */
  plusOnly: number;
  /** is_supporter = true (pre-launch lifetime-sync promise). */
  supporters: number;
  /** active Plus (incl. Pro) grouped by plus_source. */
  bySource: Record<string, number>;
  /** Paid-only counts (comped AND gifted accounts excluded) for the MRR estimate. */
  paidCounts: SubscriberCounts;

  /**
   * The split the admin panel leads with, because `activePlus` alone misleads.
   *
   * On production today 16 accounts hold active Plus and 13 of them are comps,
   * so a headline reading "Active Plus 16" describes a subscriber base four
   * times larger than the one paying. The breakdown existed only inside
   * `bySource`, several cards further down, behind a chart.
   *
   * These seven always sum to `activePlus`: paid, comped, gifted, legacy,
   * developer, test and trial.
   */
  /** Someone is being billed for these. */
  paidPlus: number;
  /** Granted by an admin (plus_source = 'comp'). Nobody paid. */
  compedPlus: number;
  /** Redeemed gifts (plus_source = 'gift'). Nobody paid. */
  giftedPlus: number;
  /**
   * Grandfathered at the paywall launch (plus_source = 'legacy'), by
   * scripts/grandfather-plus.mjs: readers who already had collections, notes
   * or bookmarks when enforcement flipped, kept whole because the terms
   * promise paid features never paywall what was free. Nobody paid, and
   * nobody will be billed; the row's expiry is 2099.
   */
  legacyPlus: number;

  /**
   * The owner's own subscriptions, bought through a store with the owner's own
   * card while testing.
   *
   * This is NOT income and counting it as such is worse than counting a comp.
   * A comp is money that never moved. This is money that left the owner's card,
   * had 15% taken by the store, and came back smaller: booking $4.99 of revenue
   * records a 75 cent loss as a gain. On 2026-08-28 one of the three paying
   * Google Play rows was exactly this, so a third of the "paying" base and a
   * sixth of MRR was the owner paying himself.
   *
   * Excluded from `paidPlus` and from `paidCounts`, so it reaches neither the
   * headline nor the MRR estimate.
   */
  developerPlus: number;

  /**
   * Plus bought with test money (plus_source = 'test', from 2026-11-09): a
   * sandbox or license-tester purchase, or RevenueCat's Test Store. It grants
   * access so testing works, and it is never income, so it is kept out of
   * `paidPlus` and `paidCounts` like a comp. Before that date the webhook
   * recorded these as Google Play members, so older ones still read as paying
   * until their next event rewrites the row.
   */
  testPlus: number;

  /**
   * In a free trial now (from 1.9, admin item A2): Plus through a store with
   * nothing paid yet, read from the kept RevenueCat events
   * (lib/admin/plusEvents.server.ts). Until those events existed a trial
   * counted as a paying member, priced at list in the MRR estimate. Kept out
   * of `paidPlus` and `paidCounts`.
   */
  trialPlus: number;
  /**
   * False while the events cannot say who is in a trial (the table is not
   * there yet, or could not be read): every trial then counts as paying, as
   * it always did, and the admin says so.
   */
  trialsKnown: boolean;
};

/**
 * THROWS rather than returning zeros. This is the highest-leverage swallow in
 * the panel: three routes call it (/api/admin/overview, /revenue and
 * /subscriptions), and a discarded error here reported 0 active Plus, 0 Pro, 0
 * supporters, $0 MRR and $0 ARR on all three at once, at HTTP 200, which the
 * client cannot tell from a product nobody has ever paid for.
 *
 * A 500 is the honest answer: fetchJson returns null on it and the tabs show
 * their failure state instead of a figure. Zeros that mean "the database did
 * not answer" are worse than no figure, because the operator acts on them.
 */
export async function subscriptionStats(
  admin: SupabaseClient,
): Promise<SubscriptionStats> {
  // EVERY ROW, IN PAGES. This read named no limit, and a request with none
  // stops at 1,000 rows all the same, without an error. Entitlements holds a
  // row for everyone who ever had access, comps, gifts and the grandfathered
  // included, so it can pass a thousand while few of them pay, and every
  // count below, and the MRR built on them, would then have been taken from
  // a thousand rows in no stated order.
  const { data, error } = await pageAllSettled((from, to) =>
    admin
      .from("entitlements")
      .select("user_id, plus_until, pro_until, plus_source, is_supporter")
      .order("user_id")
      .range(from, to),
  );

  if (error) throw new Error(`entitlements read failed: ${error.message}`);

  // Resolved once, not per row. A failure here must not take the whole panel
  // down: if the lookup cannot answer, the owner's own row falls back to being
  // counted as paid, which is the behaviour that existed before this and is
  // wrong in the safe direction (an overstated figure the operator can see)
  // rather than a 500 on three tabs.
  const developerIds = new Set(
    (
      await Promise.all(
        DEVELOPER_EMAILS.map(async (email) => {
          try {
            return await userIdByEmail(email);
          } catch {
            return null;
          }
        }),
      )
    ).filter((id): id is string => !!id),
  );

  // Who is in a free trial, when the kept events can say. Never fatal: a
  // missing table or a failed read leaves everyone counted as before.
  const trials = await trialMembers(admin).catch(() => null);

  const rows = data;
  const now = Date.now();
  const future = (ts: string | null) => !!ts && new Date(ts).getTime() > now;

  let activePlus = 0;
  let activePro = 0;
  let plusOnly = 0;
  let supporters = 0;
  let plusOnlyPaid = 0;
  let proPaid = 0;
  let compedPlus = 0;
  let giftedPlus = 0;
  let legacyPlus = 0;
  let developerPlus = 0;
  let testPlus = 0;
  let trialPlus = 0;
  const bySource: Record<string, number> = {};

  for (const r of rows as {
    user_id: string;
    plus_until: string | null;
    pro_until: string | null;
    plus_source: string | null;
    is_supporter: boolean | null;
  }[]) {
    if (r.is_supporter) supporters += 1;
    const pro = future(r.pro_until);
    const plus = pro || future(r.plus_until);
    if (!plus) continue;

    activePlus += 1;
    const source = r.plus_source || "unknown";
    bySource[source] = (bySource[source] ?? 0) + 1;
    // Sources that grant access without anyone paying for it. "comp" is an
    // admin grant; "gift" is written by app/api/gifts/claim/route.ts when a
    // gift is redeemed. Only "comp" was excluded, so every redeemed gift was
    // counted as a paying subscriber and priced at list in estimatedMrrCents.
    // That inflates the one number used to judge whether Purify earns.
    const isDeveloper = developerIds.has(r.user_id);
    // plus_source vocabulary (lib/billing/plusSource.ts): 'apple' | 'google'
    // | 'stripe' pay; 'comp' is a grant (the admin's, or RevenueCat's
    // promotional), 'gift' a redeemed gift, 'legacy' a grandfathered account
    // from the paywall launch, 'test' a purchase made with test money. Only
    // the first three are income ('unknown', a store the webhook could not
    // name, is counted as paying: someone was billed somewhere).
    // A member in a free trial has Plus and has paid nothing yet.
    const inTrial = trials?.has(r.user_id) ?? false;
    const unpaid = source === "comp" || source === "gift" || source === "legacy" || source === "test" || isDeveloper || inTrial;
    if (source === "comp") compedPlus += 1;
    else if (source === "gift") giftedPlus += 1;
    else if (source === "legacy") legacyPlus += 1;
    else if (source === "test") testPlus += 1;
    else if (isDeveloper) developerPlus += 1;
    else if (inTrial) trialPlus += 1;

    if (pro) {
      activePro += 1;
      if (!unpaid) proPaid += 1;
    } else {
      plusOnly += 1;
      if (!unpaid) plusOnlyPaid += 1;
    }
  }

  return {
    activePlus,
    activePro,
    plusOnly,
    supporters,
    bySource,
    paidCounts: { plusOnly: plusOnlyPaid, pro: proPaid },
    paidPlus: plusOnlyPaid + proPaid,
    compedPlus,
    giftedPlus,
    legacyPlus,
    developerPlus,
    testPlus,
    trialPlus,
    trialsKnown: trials !== null,
  };
}

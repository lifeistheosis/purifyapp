import type { ConnectStatus } from "./connect";

/**
 * What a new seller still has to do, in the order it actually works.
 *
 * ── Why this is a module and not four lines of JSX ──────────────────────
 *
 * The order is not obvious, and getting it wrong wastes somebody's evening.
 * A seller cannot publish a listing before their store is live: the API
 * refuses it (app/api/shop/seller/products/route.ts, validateListing) with
 * "Your store isn't live yet; save this listing as a draft." But Purify will
 * not open a store with nothing in it. So the true sequence has a step that
 * reads like a contradiction unless it is spelled out:
 *
 *   1. Fill in the store page.
 *   2. Set up payouts, and wait for Stripe to clear you.
 *   3. Write your listings AS DRAFTS. They cannot be published yet.
 *   4. Ask Purify to open the store.
 *   5. Now publish the drafts.
 *
 * Step 5 only exists after step 4, which is why it is generated rather than
 * fixed: showing "publish your listings" to somebody who is not allowed to is
 * how a console teaches people to ignore it.
 *
 * Pure and dependency-free so vitest can hold the sequence still. Everything
 * about how it looks lives in components/shop/seller/SetupChecklist.tsx.
 */

export type SetupStepKey = "store" | "payouts" | "listings" | "open" | "publish";

export type SetupStep = {
  key: SetupStepKey;
  /** Done means done. Never "probably". */
  done: boolean;
  /**
   * Set when the step cannot be started yet, with the reason. A step that is
   * neither done nor blocked is the one to do next.
   */
  blockedBy?: SetupStepKey;
  /** Where the seller goes to do it. */
  href: string;
};

export type SetupFacts = {
  store: {
    status: string;
    tagline: string | null;
    description: string | null;
    shipping_origin: string | null;
    return_policy_md: string | null;
  } | null;
  connect: ConnectStatus;
  /** Purify's own stores skip payouts: their money is already in the right account. */
  purifyOperated: boolean;
  draftListings: number;
  publishedListings: number;
};

/**
 * The store page counts as done when it has the four things a buyer needs to
 * decide: what this store is, who runs it, where it ships from, and what
 * happens if the item is wrong.
 *
 * Deliberately NOT counting logo, banner or shipping policy. They improve a
 * storefront and none of them is load-bearing, and a checklist that stays
 * amber over a missing logo is a checklist people stop reading.
 */
export function storePageComplete(store: SetupFacts["store"]): boolean {
  if (!store) return false;
  const filled = (v: string | null) => Boolean(v && v.trim().length > 0);
  return (
    filled(store.tagline) &&
    filled(store.description) &&
    filled(store.shipping_origin) &&
    filled(store.return_policy_md)
  );
}

/** Stripe will take a payment for this store, or it is Purify's own. */
export function payoutsReady(facts: SetupFacts): boolean {
  if (facts.purifyOperated) return true;
  return facts.connect === "charges_only" || facts.connect === "ready";
}

export function sellerSetupSteps(facts: SetupFacts): SetupStep[] {
  const live = facts.store?.status === "live";
  const storeDone = storePageComplete(facts.store);
  const payoutsDone = payoutsReady(facts);
  // Drafts count. A seller who has written five listings has done this step
  // even though nothing is public yet, because publishing is not available to
  // them until the store opens.
  const listingsDone = facts.draftListings + facts.publishedListings > 0;

  const steps: SetupStep[] = [
    { key: "store", done: storeDone, href: "/shop/seller/store" },
    { key: "payouts", done: payoutsDone, href: "/shop/seller/payouts" },
    { key: "listings", done: listingsDone, href: "/shop/seller/listings" },
    {
      key: "open",
      done: live,
      href: "/shop/seller",
      // Named blocker rather than a boolean, so the UI can say WHICH thing is
      // in the way instead of a generic "not yet".
      ...(live
        ? {}
        : !storeDone
          ? { blockedBy: "store" as const }
          : !payoutsDone
            ? { blockedBy: "payouts" as const }
            : !listingsDone
              ? { blockedBy: "listings" as const }
              : {}),
    },
  ];

  // Only once the store is open, because until then the API refuses it and
  // offering it would be a button that always errors.
  if (live) {
    steps.push({
      key: "publish",
      done: facts.publishedListings > 0,
      href: "/shop/seller/listings",
    });
  }

  return steps;
}

/** The one step to do next, or null when everything is done. */
export function nextSetupStep(steps: SetupStep[]): SetupStep | null {
  return steps.find((s) => !s.done && !s.blockedBy) ?? null;
}

/** Whole-setup progress, for a "3 of 5" line. */
export function setupProgress(steps: SetupStep[]): { done: number; total: number } {
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}

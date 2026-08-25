import { describe, expect, it } from "vitest";

import {
  nextSetupStep,
  payoutsReady,
  sellerSetupSteps,
  setupProgress,
  storePageComplete,
  type SetupFacts,
} from "../sellerSetup";

/**
 * The sequence a new seller is walked through.
 *
 * The one that matters: a seller CANNOT publish a listing until their store is
 * live (app/api/shop/seller/products/route.ts refuses it), and Purify will not
 * open a store with nothing in it. So "write your listings" has to be
 * satisfiable by DRAFTS, and "publish them" must not appear before it is
 * possible. Both are asserted below, because either mistake produces a console
 * that tells somebody to do something the server will reject.
 */

const blank: SetupFacts = {
  store: {
    status: "draft",
    tagline: null,
    description: null,
    shipping_origin: null,
    return_policy_md: null,
  },
  connect: "none",
  purifyOperated: false,
  draftListings: 0,
  publishedListings: 0,
};

const filledStore = {
  status: "draft",
  tagline: "Icons written in the Cretan manner",
  description: "A small workshop in Thessaloniki.",
  shipping_origin: "Greece",
  return_policy_md: "Thirty days, unused.",
};

describe("storePageComplete", () => {
  it("needs all four things a buyer decides on", () => {
    expect(storePageComplete(filledStore)).toBe(true);
  });

  it("is false while any of the four is missing", () => {
    for (const key of [
      "tagline",
      "description",
      "shipping_origin",
      "return_policy_md",
    ] as const) {
      expect(
        storePageComplete({ ...filledStore, [key]: null }),
        `${key} missing should block the step`,
      ).toBe(false);
    }
  });

  it("does not accept whitespace as filled in", () => {
    expect(storePageComplete({ ...filledStore, tagline: "   " })).toBe(false);
  });

  it("does not wait on a logo, a banner or a shipping policy", () => {
    // A checklist that stays amber over a missing logo is one people stop
    // reading. None of those three is load-bearing for a buyer.
    expect(storePageComplete(filledStore)).toBe(true);
  });

  it("is false with no store at all", () => {
    expect(storePageComplete(null)).toBe(false);
  });
});

describe("payoutsReady", () => {
  it("is true once Stripe will take a charge, even before the first payout", () => {
    // charges_only is a real and common state; treating it as not-ready would
    // stall a seller Stripe has already cleared to sell.
    expect(payoutsReady({ ...blank, connect: "charges_only" })).toBe(true);
    expect(payoutsReady({ ...blank, connect: "ready" })).toBe(true);
  });

  it("is false while Stripe is still verifying", () => {
    expect(payoutsReady({ ...blank, connect: "onboarding" })).toBe(false);
    expect(payoutsReady({ ...blank, connect: "none" })).toBe(false);
  });

  it("is true for a Purify-operated store with no Connect account", () => {
    // EIKON. Its money already lands in the right account.
    expect(payoutsReady({ ...blank, purifyOperated: true, connect: "none" })).toBe(true);
  });
});

describe("sellerSetupSteps", () => {
  it("starts a brand new seller on the store page", () => {
    const steps = sellerSetupSteps(blank);
    expect(steps.map((s) => s.key)).toEqual(["store", "payouts", "listings", "open"]);
    expect(nextSetupStep(steps)?.key).toBe("store");
    expect(setupProgress(steps)).toEqual({ done: 0, total: 4 });
  });

  it("counts DRAFT listings as the listings step being done", () => {
    // THE point. A seller cannot publish before the store is live, so if this
    // step needed a published listing it could never be satisfied and the
    // console would deadlock against its own API.
    const steps = sellerSetupSteps({ ...blank, draftListings: 3 });
    expect(steps.find((s) => s.key === "listings")?.done).toBe(true);
  });

  it("does not offer 'publish' before the store is live", () => {
    // It would be a button that always errors.
    const steps = sellerSetupSteps({
      ...blank,
      store: filledStore,
      connect: "ready",
      draftListings: 2,
    });
    expect(steps.map((s) => s.key)).not.toContain("publish");
  });

  it("offers 'publish' once the store is live, and marks it undone until something is", () => {
    const steps = sellerSetupSteps({
      ...blank,
      store: { ...filledStore, status: "live" },
      connect: "ready",
      draftListings: 2,
    });
    const publish = steps.find((s) => s.key === "publish");
    expect(publish).toBeDefined();
    expect(publish?.done).toBe(false);
  });

  it("names WHICH step is blocking the go-live ask, not just that one is", () => {
    const onlyStoreMissing = sellerSetupSteps({
      ...blank,
      connect: "ready",
      draftListings: 1,
    });
    expect(onlyStoreMissing.find((s) => s.key === "open")?.blockedBy).toBe("store");

    const onlyPayoutsMissing = sellerSetupSteps({
      ...blank,
      store: filledStore,
      draftListings: 1,
    });
    expect(onlyPayoutsMissing.find((s) => s.key === "open")?.blockedBy).toBe("payouts");

    const onlyListingsMissing = sellerSetupSteps({
      ...blank,
      store: filledStore,
      connect: "ready",
    });
    expect(onlyListingsMissing.find((s) => s.key === "open")?.blockedBy).toBe("listings");
  });

  it("unblocks the go-live ask once the first three are done", () => {
    const steps = sellerSetupSteps({
      ...blank,
      store: filledStore,
      connect: "charges_only",
      draftListings: 1,
    });
    const open = steps.find((s) => s.key === "open");
    expect(open?.blockedBy).toBeUndefined();
    expect(open?.done).toBe(false);
    expect(nextSetupStep(steps)?.key).toBe("open");
  });

  it("never returns a blocked step as the next thing to do", () => {
    // nextSetupStep drives the console's headline. Pointing somebody at a step
    // the server will refuse is the failure this guards.
    const steps = sellerSetupSteps(blank);
    const next = nextSetupStep(steps);
    expect(next?.blockedBy).toBeUndefined();
  });

  it("is fully done for an open store that has published something", () => {
    const steps = sellerSetupSteps({
      ...blank,
      store: { ...filledStore, status: "live" },
      connect: "ready",
      publishedListings: 4,
    });
    expect(nextSetupStep(steps)).toBeNull();
    expect(setupProgress(steps)).toEqual({ done: 5, total: 5 });
  });

  it("walks EIKON straight past payouts", () => {
    const steps = sellerSetupSteps({
      ...blank,
      store: { ...filledStore, status: "live" },
      purifyOperated: true,
      connect: "none",
      publishedListings: 11,
    });
    expect(steps.find((s) => s.key === "payouts")?.done).toBe(true);
    expect(nextSetupStep(steps)).toBeNull();
  });

  it("every step has somewhere to go", () => {
    for (const facts of [blank, { ...blank, store: { ...filledStore, status: "live" } }]) {
      for (const step of sellerSetupSteps(facts)) {
        expect(step.href.startsWith("/shop/seller")).toBe(true);
      }
    }
  });
});

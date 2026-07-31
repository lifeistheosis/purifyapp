import { describe, expect, it } from "vitest";
import {
  canMoveDrop,
  claimStepIndex,
  dropIsOpen,
  memberClaimStep,
} from "@/lib/eikonBox/status";

describe("memberClaimStep", () => {
  it("reads Claimed while the drop is still taking claims", () => {
    expect(memberClaimStep({ status: "claimed" }, { status: "open" })).toBe(
      "Claimed",
    );
  });

  it("becomes Being gathered once the window shuts, without a claim write", () => {
    // The whole point: the claim row does not change when the drop closes,
    // so the member's screen has to derive this from the DROP.
    expect(memberClaimStep({ status: "claimed" }, { status: "closed" })).toBe(
      "Being gathered",
    );
    expect(memberClaimStep({ status: "claimed" }, { status: "fulfilling" })).toBe(
      "Being gathered",
    );
  });

  it("follows the claim once the claim itself moves", () => {
    expect(memberClaimStep({ status: "packed" }, { status: "fulfilling" })).toBe(
      "Packed",
    );
    expect(memberClaimStep({ status: "shipped" }, { status: "fulfilling" })).toBe(
      "Shipped",
    );
    expect(memberClaimStep({ status: "delivered" }, { status: "shipped" })).toBe(
      "Delivered",
    );
  });

  it("never reports a cancelled claim as sent", () => {
    const step = memberClaimStep({ status: "cancelled" }, { status: "shipped" });
    expect(claimStepIndex(step)).toBeLessThan(claimStepIndex("Shipped"));
  });
});

describe("canMoveDrop", () => {
  it("allows the ordinary run of a month", () => {
    expect(canMoveDrop("draft", "open")).toBe(true);
    expect(canMoveDrop("open", "closed")).toBe(true);
    expect(canMoveDrop("closed", "fulfilling")).toBe(true);
    expect(canMoveDrop("fulfilling", "shipped")).toBe(true);
  });

  it("allows reopening a window shut too early", () => {
    expect(canMoveDrop("closed", "open")).toBe(true);
  });

  it("refuses to skip sourcing", () => {
    expect(canMoveDrop("open", "shipped")).toBe(false);
    expect(canMoveDrop("draft", "fulfilling")).toBe(false);
  });

  it("treats shipped and cancelled as terminal", () => {
    expect(canMoveDrop("shipped", "open")).toBe(false);
    expect(canMoveDrop("cancelled", "open")).toBe(false);
  });
});

describe("dropIsOpen", () => {
  const now = new Date("2026-08-05T12:00:00Z");

  it("is open inside the window", () => {
    expect(
      dropIsOpen(
        {
          status: "open",
          claimsOpenAt: "2026-08-01T00:00:00Z",
          claimsCloseAt: "2026-08-10T00:00:00Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("is shut once the close time passes even if the status was never moved", () => {
    // This is the rule that makes "unclaimed is not carried over"
    // enforceable when the owner forgets to close the drop on the 11th.
    expect(
      dropIsOpen(
        {
          status: "open",
          claimsOpenAt: "2026-08-01T00:00:00Z",
          claimsCloseAt: "2026-08-04T00:00:00Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("is shut before the window opens", () => {
    expect(
      dropIsOpen(
        {
          status: "open",
          claimsOpenAt: "2026-08-09T00:00:00Z",
          claimsCloseAt: "2026-08-20T00:00:00Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("is shut for every status other than open", () => {
    for (const status of ["draft", "closed", "fulfilling", "shipped", "cancelled"] as const) {
      expect(
        dropIsOpen({ status, claimsOpenAt: null, claimsCloseAt: null }, now),
      ).toBe(false);
    }
  });
});

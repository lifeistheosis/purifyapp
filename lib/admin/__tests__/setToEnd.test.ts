import { describe, expect, it } from "vitest";

import { noteFor, REASONS } from "../../../components/admin/subscriptions/SetToEnd";

describe("the note to a member set to end (docs/plans/keep-members.md)", () => {
  it("greets by first name, or plainly, and signs as the house", () => {
    expect(noteFor("Maria Ionescu").startsWith("Hi Maria,")).toBe(true);
    expect(noteFor(null).startsWith("Hi,")).toBe(true);
    expect(noteFor(null).endsWith("Edgar, the Purify Team")).toBe(true);
  });
  it("offers no discount and carries no em dash", () => {
    const n = noteFor("Maria");
    expect(n).not.toMatch(/—/);
    expect(n.toLowerCase()).not.toMatch(/discount|% off|free month|offer/);
  });
  it("says each store reason in words", () => {
    expect(REASONS.UNSUBSCRIBE).toBe("turned renewal off");
    expect(REASONS.BILLING_ERROR).toBe("the card failed");
  });
});

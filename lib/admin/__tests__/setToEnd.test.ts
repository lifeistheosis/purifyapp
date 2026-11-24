import { describe, expect, it } from "vitest";

import { cardNoteFor, noteFor, REASONS } from "../../../components/admin/subscriptions/SetToEnd";

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
  it("has a card-failed note that says how to fix it, with no offer and no em dash", () => {
    const n = cardNoteFor("Daniel Haddad");
    expect(n.startsWith("Hi Daniel,")).toBe(true);
    expect(n).toMatch(/Play Store/);
    expect(n).toMatch(/Settings/);
    expect(n).not.toMatch(/—/);
    expect(n.toLowerCase()).not.toMatch(/discount|% off|free month|offer/);
    expect(n.endsWith("Edgar, the Purify Team")).toBe(true);
  });
  it("says each store reason in words", () => {
    expect(REASONS.UNSUBSCRIBE).toBe("turned renewal off");
    expect(REASONS.BILLING_ERROR).toBe("the card failed");
  });
});

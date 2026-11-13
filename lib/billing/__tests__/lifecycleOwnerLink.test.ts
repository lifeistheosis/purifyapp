import { beforeEach, describe, expect, it, vi } from "vitest";

import { landingOf, ADMIN_VIEW_TABS } from "@/lib/admin/pages";
import { parseHash } from "@/lib/admin/handoff";

/**
 * The owner's alert for a failed renewal opens the panel on Subscriptions
 * (1.9, the arbiter's routing of 2026-11-13: a fault found before the merge,
 * web only). The panel reads which view to open from the address's #tab=
 * alone (components/admin/AdminShell.tsx, readHash, as quietBoard.test.ts
 * says of the board): the alert linked "/admin?tab=subscriptions", whose
 * hash is empty, so a tap on it opened Home, and the member whose payment
 * failed was one more step away.
 *
 * What the owner would notice if this broke: the push "A renewal did not go
 * through" opening the admin's Home instead of Subscriptions.
 */

const state = vi.hoisted(() => ({ alerts: [] as { url?: string; kind: string }[] }));

vi.mock("@/lib/admin/accountEmails", () => ({ emailByUserId: async () => "member@example.com" }));
vi.mock("@/lib/email/ledger", () => ({ sendEmailOnce: async () => ({ status: "sent" }) }));
vi.mock("@/lib/email/templates/account", () => ({
  paymentFailedEmail: () => ({ subject: "s", html: "h", text: "t" }),
  plusActiveEmail: () => ({ subject: "s", html: "h", text: "t" }),
}));
vi.mock("@/lib/admin/ownerAlert", () => ({
  notifyOwner: async (alert: { url?: string; kind: string }) => {
    state.alerts.push(alert);
    return { sent: 1, failed: 0, noRecipients: false };
  },
}));

import { sendLifecycleEmail } from "../applyLifecycle";

describe("the owner's alert for a failed renewal", () => {
  beforeEach(() => {
    state.alerts = [];
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("links the panel by its #tab=, to the Subscriptions view, with nothing after the path", async () => {
    await sendLifecycleEmail({} as never, "user-1", { email: { kind: "payment_failed", periodKey: "1" } }, "play_store");
    expect(state.alerts).toHaveLength(1);
    const [alert] = state.alerts;
    expect(alert.kind).toBe("billing-issue");
    const url = new URL(alert.url ?? "", "https://purifyapp.net");
    expect(url.pathname).toBe("/admin");
    // A query is never read by the panel, so a view named there opens Home.
    expect(url.search).toBe("");
    const { tab } = parseHash(url.hash);
    expect(tab).toBe("subscriptions");
    // And the view is one the panel answers, so the link lands where it says.
    expect(landingOf(tab ?? "")).toEqual({ tab: "subscriptions" });
    expect(ADMIN_VIEW_TABS).toContain("subscriptions");
  });

  it("sends no alert for a plan that began, only the member's own email", async () => {
    await sendLifecycleEmail({} as never, "user-1", { email: { kind: "plus_active", periodKey: "1" } }, "play_store");
    expect(state.alerts).toHaveLength(0);
  });
});

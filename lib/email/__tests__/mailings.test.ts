import { describe, expect, it } from "vitest";

import { mailByPerson, mailingKeyOf, mailingLabel, mergeMail, summarizeMailings, type LedgerRow } from "../mailings";

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

const row = (r: Partial<LedgerRow> & Pick<LedgerRow, "dedupe_key" | "kind">): LedgerRow => ({
  user_id: null,
  email: "reader@example.com",
  subject: "A subject",
  status: "sent",
  created_at: "2026-09-15T10:00:00Z",
  sent_at: "2026-09-15T10:00:01Z",
  ...r,
});

describe("mailingKeyOf", () => {
  it("strips the reader's own id, so one mailing is one group", () => {
    expect(mailingKeyOf({ dedupe_key: `terms:2026-08-14:${U1}`, user_id: U1, kind: "terms_changed" })).toBe(
      "terms:2026-08-14",
    );
    expect(mailingKeyOf({ dedupe_key: `welcome:${U1}`, user_id: U1, kind: "welcome" })).toBe("welcome");
  });

  it("falls back to the kind for keys that do not end in the reader", () => {
    expect(mailingKeyOf({ dedupe_key: `plus_ending:${U1}:2026-09-20`, user_id: U1, kind: "plus_ending" })).toBe(
      "plus_ending",
    );
    expect(mailingKeyOf({ dedupe_key: "order_confirmation:abc", user_id: null, kind: "order_confirmation" })).toBe(
      "order_confirmation",
    );
  });
});

describe("mailingLabel", () => {
  it("names the mailing and its period in words", () => {
    expect(mailingLabel("terms:2026-08-14", "terms_changed")).toBe("Terms change notice · 2026-08-14");
    expect(mailingLabel("weekly:2026-W38", "weekly")).toBe("Weekly calendar · 2026-W38");
    expect(mailingLabel("welcome", "welcome")).toBe("Welcome");
  });

  it("does not print a uuid at a reader", () => {
    expect(mailingLabel(`claim_closing:${U1}`, "claim_closing")).toBe("EIKON claims close soon · one drop");
  });
});

describe("summarizeMailings", () => {
  const rows: LedgerRow[] = [
    row({ dedupe_key: `terms:2026-08-14:${U1}`, kind: "terms_changed", user_id: U1, subject: "Terms" }),
    row({ dedupe_key: `terms:2026-08-14:${U2}`, kind: "terms_changed", user_id: U2, status: "failed", sent_at: null }),
    row({ dedupe_key: `welcome:${U1}`, kind: "welcome", user_id: U1, created_at: "2026-09-16T10:00:00Z" }),
    // The same person twice under one mailing counts once.
    row({ dedupe_key: `terms:2026-08-14:${U1}`, kind: "terms_changed", user_id: U1 }),
  ];

  it("counts people, not rows, and keeps failures separate", () => {
    const [newest, terms] = summarizeMailings(rows);
    expect(newest.key).toBe("welcome");
    expect(terms.key).toBe("terms:2026-08-14");
    expect(terms.sent).toBe(1);
    expect(terms.failed).toBe(1);
    expect(terms.people).toBe(2);
  });

  it("orders by most recent activity", () => {
    expect(summarizeMailings(rows).map((m) => m.key)).toEqual(["welcome", "terms:2026-08-14"]);
  });
});

describe("mailByPerson", () => {
  it("tallies by reader, and by address for rows logged without one", () => {
    const { byUser, byEmail } = mailByPerson([
      row({ dedupe_key: `welcome:${U1}`, kind: "welcome", user_id: U1 }),
      row({ dedupe_key: `terms:2026-08-14:${U1}`, kind: "terms_changed", user_id: U1, status: "failed" }),
      row({ dedupe_key: "order_confirmation:x", kind: "order_confirmation", email: "Reader@Example.com" }),
    ]);
    expect(byUser.get(U1)).toMatchObject({ received: 1, failed: 1 });
    expect(byEmail.get("reader@example.com")).toMatchObject({ received: 1 });
  });

  it("merges the two tallies for one person, keeping the newest email", () => {
    const merged = mergeMail(
      { received: 2, failed: 0, lastAt: "2026-09-15T00:00:00Z", lastSubject: "Older" },
      { received: 1, failed: 1, lastAt: "2026-09-18T00:00:00Z", lastSubject: "Newer" },
    );
    expect(merged).toEqual({ received: 3, failed: 1, lastAt: "2026-09-18T00:00:00Z", lastSubject: "Newer" });
  });
});

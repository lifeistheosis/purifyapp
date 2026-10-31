import { describe, expect, it } from "vitest";

import { buildRecord, byDay, filterRecord, kindOf, sentenceOf, type ActivityEntry, type ModLine } from "../auditRecord";

/**
 * The record, the Audit log's second view (A's timeline, kept by his pick B
 * on r3-17): the admin's actions and Community's moderation as one list, by
 * day, said in words, searchable, narrowed by kind. Every name, email and
 * order below is made up.
 */

const entry = (id: string, at: string, action: string, over: Partial<ActivityEntry> = {}): ActivityEntry => ({
  id,
  actor_email: "owner@example.com",
  action,
  entity_type: "shop_orders",
  entity_id: null,
  detail: null,
  created_at: at,
  ...over,
});

const ENTRIES: ActivityEntry[] = [
  entry("1", "2026-10-30T09:12:00Z", "patch_note_revision.accept"),
  entry("2", "2026-10-30T08:02:00Z", "refund.approve", { entity_id: "1038", detail: { amount_cents: 1800, reason: "charged twice" } }),
  entry("3", "2026-10-29T18:22:00Z", "comp.grant", { actor_email: "second@example.com", detail: { email: "reader.d@example.com", months: 3 } }),
  entry("4", "2026-10-29T17:00:00Z", "shop.webhook", { actor_email: null, entity_id: "1043", detail: { event: "checkout.session.completed" } }),
];

const MOD: ModLine[] = [
  { id: "m1", actor_name: "Moderator 1", actor_email: null, action: "remove_reply", target_kind: "reply", summary: "Reader A: masked words", created_at: "2026-10-29T21:05:00Z" },
];

describe("the record", () => {
  it("files each action under the switch's kinds", () => {
    expect(kindOf("refund.approve")).toBe("Money");
    expect(kindOf("comp.grant")).toBe("Money");
    expect(kindOf("ambassador.pay")).toBe("Money");
    expect(kindOf("shop.webhook")).toBe("Shop");
    expect(kindOf("user.verification")).toBe("Readers");
    expect(kindOf("ambassador.invite")).toBe("Community");
    expect(kindOf("patch_note_revision.accept")).toBe("Releases");
    expect(kindOf("email.campaign_send")).toBe("Releases");
    expect(kindOf("saint.complete")).toBe("Admin");
  });

  it("says each line in words", () => {
    expect(sentenceOf(ENTRIES[1])).toBe("Refunded order 1038, $18.00");
    expect(sentenceOf(ENTRIES[2])).toBe("Gave Plus for 3 months to reader.d@example.com");
    expect(sentenceOf(entry("x", "", "store.status", { entity_type: "shop_stores", entity_id: "s1" }))).toBe("Store status, shop_stores s1");
  });

  it("is one list, newest first, with his own lines as You and the server's as Stripe", () => {
    const rows = buildRecord(ENTRIES, MOD, "Owner@Example.com");
    expect(rows.map((r) => [r.who, r.kind])).toEqual([
      ["You", "Releases"],
      ["You", "Money"],
      ["Moderator 1", "Community"],
      ["second@example.com", "Money"],
      ["Stripe", "Shop"],
    ]);
    expect(rows[2].what).toBe("Remove reply: Reader A: masked words");
    // A row opens to its detail in words.
    expect(rows[1].detail).toEqual([
      ["shop orders", "1038"],
      ["amount cents", "1800"],
      ["reason", "charged twice"],
    ]);
  });

  it("finds any name, email, order or word, within a kind", () => {
    const rows = buildRecord(ENTRIES, MOD, "owner@example.com");
    expect(filterRecord(rows, "1038", "All").map((r) => r.id)).toEqual(["a:2"]);
    expect(filterRecord(rows, "reader.d", "All").map((r) => r.id)).toEqual(["a:3"]);
    expect(filterRecord(rows, "", "Money").map((r) => r.id)).toEqual(["a:2", "a:3"]);
    expect(filterRecord(rows, "masked words", "Community").map((r) => r.id)).toEqual(["m:m1"]);
  });

  it("groups by day as a person says it", () => {
    const rows = buildRecord(ENTRIES, MOD, "owner@example.com");
    const now = new Date(2026, 9, 30, 12, 0);
    const days = byDay(rows, now).map((d) => d.day);
    expect(days[0]).toBe("Today");
    expect(days).toContain("Yesterday");
  });
});

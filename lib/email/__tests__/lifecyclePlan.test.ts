import { describe, expect, it } from "vitest";

import { planLifecycle, type LifecycleRow } from "../lifecyclePlan";

const NOW = new Date("2026-09-14T12:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

function member(id: string, patch: Partial<LifecycleRow> = {}): LifecycleRow {
  return {
    user_id: id,
    plus_until: null,
    pro_until: null,
    auto_renew: null,
    billing_issue_at: null,
    plus_source: "google",
    ...patch,
  };
}

const plan = (rows: LifecycleRow[], extra: Partial<Parameters<typeof planLifecycle>[0]> = {}) =>
  planLifecycle({ rows, openDrops: [], claimedBy: new Map(), now: NOW, ...extra });

const kinds = (rows: LifecycleRow[], extra = {}) => plan(rows, extra).map((p) => `${p.kind}:${p.userId}`);

describe("plus_ending", () => {
  it("warns a member who turned renewal off, three days out", () => {
    expect(kinds([member("a", { plus_until: at(2.5), auto_renew: false })])).toEqual(["plus_ending:a"]);
  });

  it("never warns a renewing member, whose date is always about a period ahead", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: true })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(2), auto_renew: null })])).toEqual([]);
  });

  it("stays quiet when renewal state could not be read at all", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false })], { renewalStateKnown: false })).toEqual([]);
  });

  it("does not pile on a member who already had the payment email this month", () => {
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false, billing_issue_at: at(-5) })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(2), auto_renew: false, billing_issue_at: at(-40) })])).toEqual([
      "plus_ending:a",
    ]);
  });

  it("is not due a week out, and keys on the end date so a daily rerun is one email", () => {
    expect(kinds([member("a", { plus_until: at(7), auto_renew: false })])).toEqual([]);
    const today = plan([member("a", { plus_until: at(2), auto_renew: false })])[0];
    const tomorrow = planLifecycle({
      rows: [member("a", { plus_until: at(2), auto_renew: false })],
      openDrops: [],
      claimedBy: new Map(),
      now: new Date(NOW.getTime() + DAY),
    })[0];
    expect(tomorrow.dedupeKey).toBe(today.dedupeKey);
  });
});

describe("plus_ended and winback", () => {
  it("tells a member their access ended, within two days of it ending", () => {
    expect(kinds([member("a", { plus_until: at(-1) })])).toEqual(["plus_ended:a"]);
    expect(kinds([member("a", { plus_until: at(-3) })])).toEqual([]);
  });

  it("sends winback thirty days on, once in a life, and knows who had Pro", () => {
    const [p] = plan([member("a", { plus_until: at(-31), pro_until: at(-31) })]);
    expect(p).toMatchObject({ kind: "winback", dedupeKey: "winback:a", wasPro: true });
    expect(plan([member("b", { plus_until: at(-31) })])[0]).toMatchObject({ wasPro: false });
    expect(kinds([member("a", { plus_until: at(-20) })])).toEqual([]);
    expect(kinds([member("a", { plus_until: at(-40) })])).toEqual([]);
  });

  it("does not treat an active Pro member with an old Plus date as lapsed", () => {
    expect(kinds([member("a", { plus_until: at(-31), pro_until: at(20) })])).toEqual([]);
  });
});

describe("claim_closing", () => {
  const drop = { id: "d1", title: "St Nicholas", claims_close_at: at(1) };

  it("reminds active Pro members who have not claimed, in the last 48 hours", () => {
    const rows = [
      member("pro-unclaimed", { pro_until: at(10), plus_until: at(10) }),
      member("pro-claimed", { pro_until: at(10), plus_until: at(10) }),
      member("plus-only", { plus_until: at(10) }),
    ];
    const out = kinds(rows, { openDrops: [drop], claimedBy: new Map([["d1", new Set(["pro-claimed"])]]) });
    expect(out).toEqual(["claim_closing:pro-unclaimed"]);
  });

  it("says nothing about a drop closing later than 48 hours, or already closed", () => {
    const rows = [member("p", { pro_until: at(10) })];
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: at(3) }] })).toEqual([]);
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: at(-1) }] })).toEqual([]);
    expect(kinds(rows, { openDrops: [{ ...drop, claims_close_at: null }] })).toEqual([]);
  });
});

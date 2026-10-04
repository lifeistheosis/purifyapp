// A payout sends what it marks as paid, however many commissions that is.
//
// The API returns at most 1,000 rows a request and says nothing when it stops
// (docs/audit/findings.yaml F-31, F-38). payAmbassador claims every cleared
// commission onto the payout in one update, which has no such cap, then reads
// them back to add them up. Read in one request, a payout of 1,200
// commissions added up 1,000 of them, sent that, and marked all 1,200 paid.
//
// Stripe is a stand-in that records what it was asked to send. The database
// is a stand-in that caps at 1,000 rows a request, as the real one does.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

const sent: { amount: number; destination: string; transfer_group: string }[] = [];
vi.mock("stripe", () => ({
  default: class {
    transfers = {
      list: async () => ({ data: [] }),
      create: async (args: { amount: number; destination: string; transfer_group: string }) => {
        sent.push(args);
        return { id: `tr_${sent.length}` };
      },
    };
  },
}));

const { payAmbassador, runAmbassadorPayouts } = await import("../payouts");

const pad = (i: number) => String(i).padStart(5, "0");
const now = Date.parse("2026-10-04T12:00:00Z");

type Commission = { id: string; ambassador_id: string; status: string; payout_id: string | null; amount_cents: number };

function programme(cleared: number) {
  const ambassadors = [
    { id: "maria", code: "maria", status: "active", stripe_account_id: "acct_maria", payouts_enabled: true },
  ];
  const commission_ledger: Commission[] = [
    ...Array.from({ length: cleared }, (_, i) => ({
      id: `c${pad(i)}`,
      ambassador_id: "maria",
      status: "cleared",
      payout_id: null,
      amount_cents: 250,
    })),
    // Not hers to be paid for yet, and not hers at all.
    { id: "p-pending", ambassador_id: "maria", status: "pending", payout_id: null, amount_cents: 999 },
    { id: "q-other", ambassador_id: "someone-else", status: "cleared", payout_id: null, amount_cents: 999 },
  ];
  const ambassador_payouts: { id: string; status: string; amount_cents: number; error?: string | null }[] = [];
  return { ambassadors, commission_ledger, ambassador_payouts };
}

beforeEach(() => {
  sent.length = 0;
});

describe("payAmbassador", () => {
  it("sends the sum of every commission it marks paid, past the first thousand", async () => {
    const db = programme(1200);
    const { client } = cappedApi(db);
    const result = await payAmbassador(client, "maria", { period: "2026-10", minCents: 2500, now });

    expect(result).toEqual({ ok: true, amountCents: 300_000, transferId: "tr_1" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ amount: 300_000, destination: "acct_maria" });

    const hers = db.commission_ledger.filter((c) => c.ambassador_id === "maria" && c.id.startsWith("c"));
    expect(hers.every((c) => c.status === "paid" && c.payout_id !== null)).toBe(true);
    // What was sent is what was marked: 250 cents for each of the 1,200.
    expect(hers.filter((c) => c.status === "paid").length * 250).toBe(sent[0].amount);
    expect(db.ambassador_payouts).toHaveLength(1);
    expect(db.ambassador_payouts[0]).toMatchObject({ status: "paid", amount_cents: 300_000 });
    // The pending one and the other ambassador's are left alone.
    expect(db.commission_ledger.find((c) => c.id === "p-pending")).toMatchObject({ status: "pending", payout_id: null });
    expect(db.commission_ledger.find((c) => c.id === "q-other")).toMatchObject({ status: "cleared", payout_id: null });
  });

  it("pays a small balance as it always did", async () => {
    const db = programme(12);
    const { client } = cappedApi(db);
    const result = await payAmbassador(client, "maria", { period: "2026-10", minCents: 2500, now });
    expect(result).toEqual({ ok: true, amountCents: 3000, transferId: "tr_1" });
  });

  it("leaves a balance under the minimum where it is", async () => {
    const db = programme(4);
    const { client } = cappedApi(db);
    expect(await payAmbassador(client, "maria", { period: "2026-10", minCents: 2500, now })).toEqual({
      ok: false,
      skipped: "under the minimum",
    });
    expect(sent).toHaveLength(0);
    expect(db.commission_ledger.every((c) => c.payout_id === null)).toBe(true);
  });

  it("sends nothing and lets the rows go when the claimed commissions cannot be read whole", async () => {
    const db = programme(1200);
    // Reads of the ledger: two pages to see what is owed, then two to add up
    // what was claimed. The last of them fails.
    const { client } = cappedApi(db, {}, { fail: ({ table, n }) => (table === "commission_ledger" && n === 4 ? { message: "down" } : null) });
    const result = await payAmbassador(client, "maria", { period: "2026-10", minCents: 2500, now });

    expect(result).toEqual({ ok: false, error: "The claimed commissions could not be read." });
    expect(sent).toHaveLength(0);
    expect(db.commission_ledger.every((c) => c.payout_id === null && c.status !== "paid")).toBe(true);
    expect(db.ambassador_payouts[0]).toMatchObject({ status: "failed" });
  });
});

describe("runAmbassadorPayouts", () => {
  it("does nothing while automatic payouts are off", async () => {
    const { client } = cappedApi({ ...programme(1200), shop_settings: [{ id: 1, ambassador_auto_payouts: false }] });
    expect(await runAmbassadorPayouts(client, now)).toEqual({ off: true });
    expect(sent).toHaveLength(0);
  });

  it("pays an ambassador who is past the thousandth on the list", async () => {
    const db = programme(40);
    const many = [
      ...Array.from({ length: 1100 }, (_, i) => ({
        id: `a${pad(i)}`,
        code: `a${pad(i)}`,
        status: "active",
        stripe_account_id: `acct_${i}`,
        payouts_enabled: true,
      })),
      ...db.ambassadors,
    ];
    const { client } = cappedApi({ ...db, ambassadors: many, shop_settings: [{ id: 1, ambassador_auto_payouts: true }] });
    const out = await runAmbassadorPayouts(client, now);

    const results = "results" in out ? out.results : undefined;
    if (!results) throw new Error("the run answered as if automatic payouts were off");
    expect(Object.keys(results)).toHaveLength(1101);
    expect(results.maria).toEqual({ ok: true, amountCents: 10_000, transferId: "tr_1" });
  });
});

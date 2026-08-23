import { describe, expect, it } from "vitest";

import {
  canCancelPayment,
  canFlipRefunded,
  cancelRefusalMessage,
  guardedOrderUpdate,
  readOrderState,
  staleOrderMessage,
  type OrderWriteDb,
} from "../orderWrite";

/**
 * The compare-and-swap that stops a settlement being overwritten.
 *
 * THE FAKE EVALUATES EACH QUERY EXACTLY ONCE, and that is not a detail. An
 * earlier draft of this fake built its terminal as
 * `Object.assign(Promise.resolve(run()), { maybeSingle: async () => run() })`,
 * which runs the update eagerly at `.select()` and again at `.maybeSingle()`.
 * The second evaluation re-tests the guard against the row the first one
 * already moved, matches nothing, and every interleave assertion below would
 * have passed for the wrong reason. A single memoised thunk is the fix, and it
 * is why `calls` is asserted rather than assumed.
 */

type Row = { id: string; payment_status: string; fulfillment_status: string };

function fakeDb(row: Row | null, opts: { readError?: string; writeError?: string } = {}) {
  const state = { row: row ? { ...row } : null };
  const calls = { updates: 0, reads: 0 };

  const db: OrderWriteDb = {
    from() {
      return {
        select() {
          const eqs: [string, unknown][] = [];
          const chain = {
            eq(col: string, val: unknown) {
              eqs.push([col, val]);
              return chain;
            },
            async maybeSingle() {
              calls.reads++;
              if (opts.readError) return { data: null, error: { message: opts.readError } };
              return { data: state.row as unknown as Row | null, error: null };
            },
          };
          return chain;
        },
        update(values: Record<string, unknown>) {
          const eqs: [string, unknown][] = [];
          let settled: Promise<{ data: Row[] | null; error: { message: string } | null }> | null =
            null;
          const run = () => {
            // Memoised. Awaiting the same terminal twice must not re-run the
            // guard against a row this call already moved.
            if (settled) return settled;
            calls.updates++;
            settled = (async () => {
              if (opts.writeError) return { data: null, error: { message: opts.writeError } };
              const r = state.row;
              const matches =
                r !== null &&
                eqs.every(([col, val]) => (r as unknown as Record<string, unknown>)[col] === val);
              if (!matches) return { data: [], error: null };
              state.row = { ...r, ...(values as Partial<Row>) };
              return { data: [state.row], error: null };
            })();
            return settled;
          };
          const chain = {
            eq(col: string, val: unknown) {
              eqs.push([col, val]);
              return chain;
            },
            select() {
              return { then: (res: never, rej: never) => run().then(res, rej) };
            },
          };
          return chain;
        },
      };
    },
  } as unknown as OrderWriteDb;

  return { db, state, calls };
}

const PENDING: Row = { id: "o1", payment_status: "pending", fulfillment_status: "pending" };

describe("guardedOrderUpdate", () => {
  it("writes when the row still holds the expected state", async () => {
    const { db, state, calls } = fakeDb(PENDING);
    const r = await guardedOrderUpdate(
      db,
      "o1",
      { payment_status: "pending", fulfillment_status: "pending" },
      { fulfillment_status: "packaged" },
    );
    expect(r.ok).toBe(true);
    expect(state.row?.fulfillment_status).toBe("packaged");
    expect(calls.updates, "the update must be evaluated exactly once").toBe(1);
  });

  it("REFUSES when a settlement landed between the read and the write", async () => {
    // The bug this whole module exists for. The seller read `pending`, the
    // Stripe webhook wrote `paid`, and the old guard tested fulfillment_status
    // only, which the webhook never touches, so it matched and stamped
    // "cancelled" over a paid order.
    const { db, state } = fakeDb({ ...PENDING, payment_status: "paid" });
    const r = await guardedOrderUpdate(
      db,
      "o1",
      { payment_status: "pending", fulfillment_status: "pending" },
      { fulfillment_status: "cancelled", payment_status: "cancelled" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "stale") {
      expect(r.found?.payment_status).toBe("paid");
    } else {
      throw new Error("expected a stale refusal");
    }
    expect(state.row?.payment_status, "the paid order must be untouched").toBe("paid");
  });

  it("reports error, never stale, when the re-read fails", async () => {
    // "The order is gone" is not a claim a broken read has earned.
    const { db } = fakeDb(PENDING, { readError: "connection reset" });
    const r = await guardedOrderUpdate(db, "o1", { payment_status: "paid" }, { x: 1 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("error");
  });

  it("reports error when the write itself fails", async () => {
    const { db } = fakeDb(PENDING, { writeError: "deadlock detected" });
    const r = await guardedOrderUpdate(db, "o1", {}, { x: 1 });
    expect(!r.ok && r.reason).toBe("error");
  });

  it("guards only the columns it is given", async () => {
    // A tracking save has no competing writer and needs no guard.
    const { db, state } = fakeDb({ ...PENDING, payment_status: "paid" });
    const r = await guardedOrderUpdate(db, "o1", {}, { outbound_tracking: "XYZ" });
    expect(r.ok).toBe(true);
    expect(state.row?.payment_status).toBe("paid");
  });
});

describe("readOrderState", () => {
  it("tells an absent row from a failed read", async () => {
    const absent = await readOrderState(fakeDb(null).db, "o1");
    expect(absent).toEqual({ ok: true, state: null });

    const broken = await readOrderState(fakeDb(PENDING, { readError: "timeout" }).db, "o1");
    expect(broken.ok).toBe(false);
  });
});

describe("the cancel allow-list", () => {
  it("permits only pending and cancelled", () => {
    expect(canCancelPayment("pending")).toBe(true);
    expect(canCancelPayment("cancelled")).toBe(true);
    expect(canCancelPayment("paid")).toBe(false);
    // The defect: the old check tested `=== "paid"` only, so a REFUNDED order
    // passed through and had its refund record stamped over.
    expect(canCancelPayment("refunded")).toBe(false);
  });

  it("refuses a payment_status nobody has invented yet", () => {
    // An allow-list fails closed. A deny-list would wave this through.
    expect(canCancelPayment("chargeback")).toBe(false);
    expect(canCancelPayment("")).toBe(false);
  });

  it("keeps the paid refusal byte-identical to the copy that shipped", () => {
    expect(cancelRefusalMessage("paid")).toBe(
      "This order is paid. Refund it instead of cancelling.",
    );
  });

  it("says something true about a refunded order", () => {
    expect(cancelRefusalMessage("refunded")).toContain("refunded");
  });
});

describe("canFlipRefunded", () => {
  it("permits paid and refunded, refuses everything else", () => {
    expect(canFlipRefunded("paid")).toBe(true);
    expect(canFlipRefunded("refunded")).toBe(true); // idempotent re-stamp
    expect(canFlipRefunded("pending")).toBe(false);
    expect(canFlipRefunded("cancelled")).toBe(false);
  });
});

describe("staleOrderMessage", () => {
  it("names both states so the operator knows what happened", () => {
    const m = staleOrderMessage({ payment_status: "paid", fulfillment_status: "shipped" });
    expect(m).toContain("paid");
    expect(m).toContain("shipped");
  });

  it("says so plainly when the row is gone", () => {
    expect(staleOrderMessage(null)).toContain("no longer exists");
  });
});

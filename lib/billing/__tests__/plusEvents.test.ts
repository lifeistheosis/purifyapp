// Every RevenueCat event, kept for the admin (1.9, admin item A2): what a row
// holds, what it never holds, and that keeping it never throws.

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetPlusEvents, keepPlusEvent, plusEventRow } from "../plusEvents";

const USER = "44444444-4444-4444-8444-444444444444";

beforeEach(() => __resetPlusEvents());

describe("plusEventRow", () => {
  it("reads a renewal that ended a free trial, and why a membership ended", () => {
    const renewal = plusEventRow({
      id: "r1",
      type: "RENEWAL",
      app_user_id: USER,
      period_type: "NORMAL",
      is_trial_conversion: true,
      renewal_number: 2,
      price: 49.99,
      event_timestamp_ms: Date.UTC(2026, 10, 9),
    });
    expect(renewal).toMatchObject({ trial_conversion: true, renewal_number: 2, price_usd: 49.99, reason: null });
    expect(plusEventRow({ id: "c1", type: "CANCELLATION", cancel_reason: "BILLING_ERROR" })?.reason).toBe("BILLING_ERROR");
    expect(plusEventRow({ id: "x1", type: "EXPIRATION", expiration_reason: "UNSUBSCRIBE" })?.reason).toBe("UNSUBSCRIBE");
  });

  it("keeps a refund's price below zero, as RevenueCat sends it", () => {
    expect(plusEventRow({ id: "f1", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", price: -4.99 })?.price_usd).toBe(-4.99);
  });

  it("drops what does not fit rather than failing the write", () => {
    const row = plusEventRow({
      id: "z1",
      type: "RENEWAL",
      app_user_id: "not-a-uuid",
      store: "X".repeat(65),
      price: Number.NaN,
      takehome_percentage: 1.5,
      renewal_number: -1,
      is_trial_conversion: "yes",
      event_timestamp_ms: "soon",
    }, Date.UTC(2026, 10, 9, 8));
    expect(row).toMatchObject({
      user_id: null,
      store: null,
      price_usd: null,
      takehome: null,
      renewal_number: null,
      trial_conversion: null,
      event_at: "2026-11-09T08:00:00.000Z",
    });
  });

  it("keeps nothing without an id or a type, and none of the events that say nothing about a membership", () => {
    expect(plusEventRow({ type: "RENEWAL" })).toBeNull();
    expect(plusEventRow({ id: "a", type: "" })).toBeNull();
    for (const type of ["TEST", "TRANSFER", "SUBSCRIBER_ALIAS", "EXPERIMENT_ENROLLMENT", "INVOICE_ISSUANCE", "VIRTUAL_CURRENCY_TRANSACTION"]) {
      expect(plusEventRow({ id: "a", type })).toBeNull();
    }
    // A type RevenueCat adds later is kept; the admin counts only those it knows.
    expect(plusEventRow({ id: "a", type: "SOMETHING_NEW" })?.type).toBe("SOMETHING_NEW");
  });

  it("never holds a country, an email or the store's order number", () => {
    const row = plusEventRow({
      id: "p1",
      type: "INITIAL_PURCHASE",
      app_user_id: USER,
      country_code: "US",
      transaction_id: "GPA.1",
      original_transaction_id: "GPA.0",
      subscriber_attributes: { $email: { value: "a@b.c" } },
    } as never);
    expect(row).not.toHaveProperty("country_code");
    expect(row).not.toHaveProperty("transaction_id");
    const flat = JSON.stringify(row);
    for (const leak of ["US", "GPA", "a@b.c"]) expect(flat).not.toContain(leak);
  });
});

describe("keepPlusEvent", () => {
  type Write = Record<string, unknown>;
  function db(answers: ({ code?: string; message: string } | null)[], writes: Write[] = []) {
    return {
      writes,
      client: () =>
        ({
          from: () => ({
            upsert: async (row: Write) => {
              writes.push(row);
              return { error: answers.shift() ?? null };
            },
          }),
        }) as unknown as SupabaseClient,
    };
  }
  const event = { id: "k1", type: "EXPIRATION", app_user_id: USER, event_timestamp_ms: Date.UTC(2026, 10, 9) };

  it("keeps the event of an account deleted since, linked to no one", async () => {
    const d = db([{ code: "23503", message: "violates foreign key constraint" }, null]);
    expect(await keepPlusEvent(d.client, event)).toBe("kept");
    expect(d.writes.map((w) => w.user_id)).toEqual([USER, null]);
  });

  it("remembers a missing table for ten minutes", async () => {
    const d = db([{ code: "42P01", message: "relation does not exist" }]);
    const t = Date.UTC(2026, 10, 9);
    expect(await keepPlusEvent(d.client, event, t)).toBe("no table");
    expect(await keepPlusEvent(d.client, event, t + 9 * 60_000)).toBe("no table");
    expect(d.writes).toHaveLength(1);
    expect(await keepPlusEvent(d.client, event, t + 11 * 60_000)).toBe("kept");
  });

  it("never throws, even when no client can be made", async () => {
    const broken = () => {
      throw new Error("supabaseKey is required");
    };
    await expect(keepPlusEvent(broken, event)).resolves.toBe("failed");
    await expect(keepPlusEvent(db([{ message: "timeout" }]).client, event)).resolves.toBe("failed");
  });
});

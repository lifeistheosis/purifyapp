import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COMMISSION_BPS, type StorePayouts } from "./connect";

/**
 * The I/O half of Stripe Connect. Every rule lives in ./connect.ts, which is
 * pure and unit-tested; this file only reads and writes.
 *
 * ALWAYS THE SERVICE ROLE. shop_store_payouts and shop_order_fees have RLS on
 * with no policy and no grants to anon or authenticated
 * (20260824_shop_connect.sql), because a commission rate is an ownership split
 * and shop_stores is world-readable for live stores. A caller reaching these
 * tables through a session client gets nothing back, which is the design, not
 * a bug to work around.
 *
 * THE TABLES MAY NOT EXIST. AGENTS.md is explicit that merged and applied are
 * independently true or false, and the migration is held unsigned like the
 * three before it on this branch. So every read here fails soft to "no
 * Connect", which lands on exactly the behaviour the shop has today: a
 * Purify-balance charge with no destination and no fee. Nothing breaks while
 * the migration waits; Connect simply does not switch on.
 */

/** Postgres: undefined_table, undefined_column. */
const ABSENT = new Set(["42P01", "42703"]);

let warnedAbsent = false;

function noteAbsent(where: string, code: string | undefined) {
  if (!ABSENT.has(code ?? "")) return false;
  if (!warnedAbsent) {
    warnedAbsent = true;
    console.warn(
      `[shop] Connect tables are absent (${where}); every store falls back to a direct Purify charge. Apply supabase/migrations/20260824_shop_connect.sql.`,
    );
  }
  return true;
}

export type StorePayoutsRow = StorePayouts & {
  store_id: string;
  onboarding_started_at: string | null;
};

const PAYOUT_COLUMNS =
  "store_id, stripe_account_id, charges_enabled, payouts_enabled, commission_rate_bps, onboarding_started_at";

export async function getStorePayouts(
  storeId: string,
): Promise<StorePayoutsRow | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_store_payouts")
      .select(PAYOUT_COLUMNS)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      if (!noteAbsent("getStorePayouts", error.code)) {
        console.warn("[shop] payouts read failed", error.message);
      }
      return null;
    }
    return (data as StorePayoutsRow | null) ?? null;
  } catch (e) {
    console.warn("[shop] payouts read threw", (e as Error).message);
    return null;
  }
}

export async function getStorePayoutsByAccount(
  accountId: string,
): Promise<StorePayoutsRow | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_store_payouts")
      .select(PAYOUT_COLUMNS)
      .eq("stripe_account_id", accountId)
      .maybeSingle();
    if (error) {
      if (!noteAbsent("getStorePayoutsByAccount", error.code)) {
        console.warn("[shop] payouts read failed", error.message);
      }
      return null;
    }
    return (data as StorePayoutsRow | null) ?? null;
  } catch (e) {
    console.warn("[shop] payouts read threw", (e as Error).message);
    return null;
  }
}

/**
 * Create the row if it is missing, leaving an existing commission rate alone.
 *
 * The rate is the one term negotiated per seller, so an upsert that carried a
 * default would silently reset a negotiated 22% back to 10% every time
 * onboarding was re-entered. Insert-if-absent is the whole point.
 */
export async function ensureStorePayoutsRow(
  storeId: string,
): Promise<StorePayoutsRow | null> {
  const existing = await getStorePayouts(storeId);
  if (existing) return existing;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_store_payouts")
      .insert({ store_id: storeId, commission_rate_bps: DEFAULT_COMMISSION_BPS })
      .select(PAYOUT_COLUMNS)
      .single();
    if (error) {
      if (!noteAbsent("ensureStorePayoutsRow", error.code)) {
        console.warn("[shop] payouts insert failed", error.message);
      }
      // A lost race against a concurrent insert lands here on the primary key;
      // re-reading gets the winner's row rather than reporting a failure.
      return getStorePayouts(storeId);
    }
    return data as StorePayoutsRow;
  } catch (e) {
    console.warn("[shop] payouts insert threw", (e as Error).message);
    return null;
  }
}

export async function setStripeAccount(
  storeId: string,
  accountId: string,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("shop_store_payouts")
      .update({
        stripe_account_id: accountId,
        onboarding_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId);
    if (error) {
      console.warn("[shop] payouts account write failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[shop] payouts account write threw", (e as Error).message);
    return false;
  }
}

/**
 * Mirror Stripe's own verdict from an account.updated event.
 *
 * Matched on stripe_account_id, never on a store id carried in the event:
 * the event is about an ACCOUNT, and the account is the only thing Stripe
 * knows. Rows matched is checked so an event for an account this database has
 * never heard of is logged rather than silently swallowed, which is what a
 * webhook pointed at the wrong environment looks like.
 */
export async function applyAccountCapabilities(
  accountId: string,
  caps: { chargesEnabled: boolean; payoutsEnabled: boolean },
): Promise<"updated" | "unknown-account" | "failed"> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_store_payouts")
      .update({
        charges_enabled: caps.chargesEnabled,
        payouts_enabled: caps.payoutsEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", accountId)
      .select("store_id");
    if (error) {
      if (!noteAbsent("applyAccountCapabilities", error.code)) {
        console.warn("[shop] capability write failed", error.message);
      }
      return "failed";
    }
    if (!data || data.length === 0) return "unknown-account";
    return "updated";
  } catch (e) {
    console.warn("[shop] capability write threw", (e as Error).message);
    return "failed";
  }
}

export async function setCommissionBps(
  storeId: string,
  bps: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("shop_store_payouts")
      .update({ commission_rate_bps: bps, updated_at: new Date().toISOString() })
      .eq("store_id", storeId);
    if (error) {
      console.warn("[shop] commission write failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[shop] commission write threw", (e as Error).message);
    return false;
  }
}

export type OrderFee = {
  order_id: string;
  stripe_account_id: string;
  commission_rate_bps: number;
  commission_base_cents: number;
  application_fee_cents: number;
};

/**
 * Freeze what was charged, at the moment it is charged.
 *
 * Best-effort by design: the row is a record, and failing a checkout because
 * the record could not be written would cost a sale to protect a report. The
 * console renders a missing fee as unknown rather than as zero (see
 * sellerNetCents), so the gap is visible instead of fabricated.
 */
export async function recordOrderFee(fee: OrderFee): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("shop_order_fees").insert(fee);
    if (error) {
      if (!noteAbsent("recordOrderFee", error.code)) {
        console.warn("[shop] order fee insert failed", error.message);
      }
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[shop] order fee insert threw", (e as Error).message);
    return false;
  }
}

export async function getOrderFee(orderId: string): Promise<OrderFee | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_order_fees")
      .select(
        "order_id, stripe_account_id, commission_rate_bps, commission_base_cents, application_fee_cents",
      )
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) {
      if (!noteAbsent("getOrderFee", error.code)) {
        console.warn("[shop] order fee read failed", error.message);
      }
      return null;
    }
    return (data as OrderFee | null) ?? null;
  } catch (e) {
    console.warn("[shop] order fee read threw", (e as Error).message);
    return null;
  }
}

/** Every fee row for a seller's orders, keyed by order id. */
export async function getOrderFees(
  orderIds: string[],
): Promise<Map<string, OrderFee>> {
  const out = new Map<string, OrderFee>();
  if (orderIds.length === 0) return out;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_order_fees")
      .select(
        "order_id, stripe_account_id, commission_rate_bps, commission_base_cents, application_fee_cents",
      )
      .in("order_id", orderIds);
    if (error) {
      if (!noteAbsent("getOrderFees", error.code)) {
        console.warn("[shop] order fees read failed", error.message);
      }
      return out;
    }
    for (const row of (data ?? []) as OrderFee[]) out.set(row.order_id, row);
    return out;
  } catch (e) {
    console.warn("[shop] order fees read threw", (e as Error).message);
    return out;
  }
}

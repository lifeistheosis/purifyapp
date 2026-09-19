import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { logActivity } from "@/lib/admin/activityLog";

import { ABANDON_AFTER_MS, decideAbandoned, sessionState } from "./abandonedCheckouts";
import { sendOrderConfirmationEmail } from "./orderEmails";
import { settleCheckoutSession, type SettlementDb } from "./webhookSettlement";

/**
 * Clear abandoned checkouts, asking Stripe about each one first.
 *
 * The rules are in ./abandonedCheckouts.ts. This is the part that reads the
 * orders, asks Stripe, and writes: run from the scheduled maintenance
 * (lib/ops/maintenance.ts), so the queue empties itself instead of waiting for
 * somebody to press a button.
 *
 * Bounded per run. Each order is one Stripe call at up to 10 seconds, and the
 * scheduler that calls this also evaluates the hourly goals, so a backlog is
 * worked through over a few runs rather than all at once.
 */

const PER_RUN = 40;

export type SweepReport = {
  checked: number;
  settled: number;
  cancelled: number;
  /** Still pending: Stripe did not answer, or a delayed payment is clearing. */
  left: number;
  errors: string[];
};

export async function sweepAbandonedCheckouts(admin: SupabaseClient, now: number = Date.now()): Promise<SweepReport> {
  const report: SweepReport = { checked: 0, settled: 0, cancelled: 0, left: 0, errors: [] };
  const cutoff = new Date(now - ABANDON_AFTER_MS).toISOString();
  const { data, error } = await admin
    .from("shop_orders")
    .select("id, stripe_session_id")
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(PER_RUN);
  if (error) {
    report.errors.push(`shop_orders: ${error.message}`);
    return report;
  }
  const orders = (data ?? []) as { id: string; stripe_session_id: string | null }[];
  if (orders.length === 0) return report;

  const key = process.env.STRIPE_SECRET_KEY;
  const stripe = key ? new Stripe(key, { timeout: 10_000, maxNetworkRetries: 1 }) : null;

  for (const order of orders) {
    report.checked += 1;
    let session: Stripe.Checkout.Session | null = null;
    if (order.stripe_session_id && stripe) {
      try {
        session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      } catch (e) {
        report.errors.push(`session for ${order.id.slice(0, 8)}: ${(e as Error).message}`);
      }
    }
    // A session id with no key to read it by is a question nobody can
    // answer here, so it is left, never cancelled blind.
    const state = sessionState(session, Boolean(order.stripe_session_id));
    const action = decideAbandoned(state);

    if (action === "leave") {
      report.left += 1;
      continue;
    }

    if (action === "settle" && session) {
      const result = await settleCheckoutSession(
        admin as unknown as SettlementDb,
        sendOrderConfirmationEmail,
        session as unknown as Parameters<typeof settleCheckoutSession>[2],
      );
      if (result === "paid" || result === "recovered") report.settled += 1;
      else report.left += 1;
      continue;
    }

    if (action === "expire_then_cancel" && stripe && order.stripe_session_id) {
      try {
        await stripe.checkout.sessions.expire(order.stripe_session_id);
      } catch (e) {
        // Not expired means it could still be paid: do not cancel under it.
        report.errors.push(`expire ${order.id.slice(0, 8)}: ${(e as Error).message}`);
        report.left += 1;
        continue;
      }
    }

    const { error: cancelError } = await admin
      .from("shop_orders")
      .update({
        payment_status: "cancelled",
        fulfillment_status: "cancelled",
        updated_at: new Date(now).toISOString(),
      })
      .eq("id", order.id)
      .eq("payment_status", "pending");
    if (cancelError) {
      report.errors.push(`cancel ${order.id.slice(0, 8)}: ${cancelError.message}`);
      report.left += 1;
    } else {
      report.cancelled += 1;
    }
  }

  if (report.settled > 0 || report.cancelled > 0) {
    void logActivity({
      actorEmail: null,
      action: "shop.abandoned_sweep",
      entityType: "shop_orders",
      entityId: null,
      detail: { ...report, errors: report.errors.slice(0, 5) },
    });
  }
  return report;
}

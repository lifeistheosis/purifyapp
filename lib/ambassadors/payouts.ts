import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { pageAllSettled } from "@/lib/supabase/pageAll";

import { MIN_PAYOUT_CENTS, payoutPeriod } from "./ledger";

/**
 * Clearing and paying ambassador commissions
 * (supabase/migrations/20260930000000_ambassadors.sql).
 *
 * ── Clearing ────────────────────────────────────────────────────────────
 *
 * clear_matured_commissions() moves pending commissions whose refund window
 * has passed to cleared. The hourly maintenance calls it (lib/ops/maintenance.ts),
 * which is this deployment's one dependable clock.
 *
 * ── Paying, and never twice ─────────────────────────────────────────────
 *
 * A payout is a Stripe transfer from Purify's balance to the ambassador's
 * connected Express account. The order is fixed, because each step is what
 * makes the next one safe to retry:
 *
 *   1. CLAIM a payout row for the period. (ambassador, period) is unique, so
 *      two runs cannot both hold the month.
 *   2. CLAIM the cleared ledger rows onto that payout, and pay what was
 *      actually claimed, not what was counted a moment before.
 *   3. LOOK before sending: any transfer already made for this payout
 *      (transfer_group payout_<id>) means a previous run sent it and failed
 *      to record it. Record it now instead of sending again.
 *   4. SEND with an idempotency key of the payout and the day, so a retry the
 *      same day is the same request and a retry the next day is a fresh one.
 *   5. RECORD paid, or failed with Stripe's reason and the rows released for
 *      the next attempt.
 *
 * Automatic monthly payouts run only when the owner has turned them on
 * (shop_settings.ambassador_auto_payouts). A payout sent by hand from the
 * admin uses the same path with its own period.
 *
 * Stripe pays from the platform's AVAILABLE balance. If Purify's balance is
 * swept to the bank before the run, the transfer fails with Stripe's
 * insufficient-funds message, which the admin shows, and the next day tries
 * again.
 */

export type PayResult =
  | { ok: true; amountCents: number; transferId: string }
  | { ok: false; skipped: string }
  | { ok: false; error: string };

type Ambassador = {
  id: string;
  code: string;
  status: string;
  stripe_account_id: string | null;
  payouts_enabled: boolean;
};

export async function clearMatured(admin: SupabaseClient): Promise<{ cleared: number } | { error: string }> {
  const { data, error } = await admin.rpc("clear_matured_commissions");
  if (error) return { error: error.message };
  return { cleared: typeof data === "number" ? data : 0 };
}

export async function autoPayoutsOn(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  return (data as Record<string, unknown> | null)?.ambassador_auto_payouts === true;
}

async function stripeClient() {
  const { default: Stripe } = await import("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/** What one request returns at most, whatever is asked (docs/audit/findings.yaml F-31). */
const PAGE = 1000;

/**
 * Every cleared commission of an ambassador that is on a payout, or on none
 * when `payoutId` is null. However many there are.
 *
 * What this returns is added up and sent as money, so it must be all of them.
 * One request returns at most 1,000 rows and says nothing about the rest: read
 * that way, a payout of 1,200 commissions paid 1,000 of them, and then marked
 * all 1,200 as paid.
 *
 * It walks the id, each request asking for the rows after the last one read,
 * and not numbered pages. A commission can leave the set while this is
 * reading (a refund reverses it), and with numbered pages that moves every
 * later row up one place, so the row at the next page's edge is never read
 * and still gets marked paid.
 *
 * Null when a request fails. The sum of some of the rows is not a sum.
 */
async function clearedRows(
  admin: SupabaseClient,
  ambassadorId: string,
  payoutId: string | null,
): Promise<{ id: string; amount_cents: number }[] | null> {
  const out: { id: string; amount_cents: number }[] = [];
  let after: string | null = null;
  for (;;) {
    let query = admin
      .from("commission_ledger")
      .select("id, amount_cents")
      .eq("ambassador_id", ambassadorId)
      .eq("status", "cleared");
    query = payoutId ? query.eq("payout_id", payoutId) : query.is("payout_id", null);
    if (after) query = query.gt("id", after);
    const { data, error } = await query.order("id").limit(PAGE);
    if (error) return null;
    const rows = (data ?? []) as { id: string; amount_cents: number }[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
    after = rows[rows.length - 1].id;
  }
}

const sumCents = (rows: { amount_cents: number }[]) => rows.reduce((a, r) => a + r.amount_cents, 0);

export async function payAmbassador(
  admin: SupabaseClient,
  ambassadorId: string,
  opts: { period: string; minCents: number; now?: number },
): Promise<PayResult> {
  const now = opts.now ?? Date.now();
  const { data: ambRow, error: ambError } = await admin
    .from("ambassadors")
    .select("id, code, status, stripe_account_id, payouts_enabled")
    .eq("id", ambassadorId)
    .maybeSingle();
  if (ambError || !ambRow) return { ok: false, error: ambError?.message ?? "No such ambassador." };
  const amb = ambRow as Ambassador;
  if (amb.status !== "active") return { ok: false, skipped: "paused" };
  if (!amb.stripe_account_id || !amb.payouts_enabled) return { ok: false, skipped: "no payout account" };

  const owedCents = sumCents((await clearedRows(admin, amb.id, null)) ?? []);

  // 1. The payout row for this period: reuse one a failed or interrupted run left.
  const { data: existing } = await admin
    .from("ambassador_payouts")
    .select("id, status")
    .eq("ambassador_id", amb.id)
    .eq("period", opts.period)
    .maybeSingle();
  if ((existing as { status?: string } | null)?.status === "paid") return { ok: false, skipped: "already paid this period" };
  if (!existing && owedCents < opts.minCents) return { ok: false, skipped: "under the minimum" };

  let payoutId = (existing as { id?: string } | null)?.id ?? null;
  if (!payoutId) {
    const { data: created, error } = await admin
      .from("ambassador_payouts")
      .insert({ ambassador_id: amb.id, period: opts.period, amount_cents: owedCents, status: "pending" })
      .select("id")
      .single();
    if (error || !created) return { ok: false, skipped: `period already claimed (${error?.message ?? "no row"})` };
    payoutId = (created as { id: string }).id;
  }

  // 2. Claim the rows onto this payout and pay what was actually claimed.
  await admin
    .from("commission_ledger")
    .update({ payout_id: payoutId })
    .eq("ambassador_id", amb.id)
    .eq("status", "cleared")
    .is("payout_id", null);
  const claimed = await clearedRows(admin, amb.id, payoutId);
  if (!claimed) {
    // The claimed rows could not be read whole, so there is no amount to send.
    // Let them go and leave the payout for the next run to pick up.
    const message = "The claimed commissions could not be read.";
    await admin.from("commission_ledger").update({ payout_id: null }).eq("payout_id", payoutId).eq("status", "cleared");
    await admin.from("ambassador_payouts").update({ status: "failed", error: message }).eq("id", payoutId);
    return { ok: false, error: message };
  }
  const amountCents = sumCents(claimed);
  if (amountCents < Math.max(1, opts.minCents)) {
    await admin.from("commission_ledger").update({ payout_id: null }).eq("payout_id", payoutId).eq("status", "cleared");
    await admin.from("ambassador_payouts").update({ status: "failed", error: "Nothing cleared to pay." }).eq("id", payoutId);
    return { ok: false, skipped: "nothing cleared to pay" };
  }
  await admin.from("ambassador_payouts").update({ amount_cents: amountCents, status: "pending", error: null }).eq("id", payoutId);

  const group = `payout_${payoutId}`;
  try {
    const stripe = await stripeClient();
    // 3. Look before sending.
    const prior = await stripe.transfers.list({ transfer_group: group, limit: 1 });
    let transferId = prior.data[0]?.id ?? null;
    // 4. Send, once per payout per day.
    if (!transferId) {
      const day = new Date(now).toISOString().slice(0, 10);
      const transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: "usd",
          destination: amb.stripe_account_id,
          transfer_group: group,
          description: `Purify ambassador commissions, ${opts.period}`,
          metadata: { purify_ambassador_id: amb.id, purify_payout_id: payoutId, purify_code: amb.code },
        },
        { idempotencyKey: `ambassador-payout-${payoutId}-${day}` },
      );
      transferId = transfer.id;
    }
    // 5. Record.
    const paidAt = new Date(now).toISOString();
    await admin
      .from("ambassador_payouts")
      .update({ status: "paid", stripe_transfer_id: transferId, paid_at: paidAt, error: null })
      .eq("id", payoutId);
    await admin.from("commission_ledger").update({ status: "paid", paid_at: paidAt }).eq("payout_id", payoutId).eq("status", "cleared");
    return { ok: true, amountCents, transferId };
  } catch (e) {
    const err = e as { message?: string; raw?: { message?: string } };
    const message = (err.raw?.message ?? err.message ?? "Stripe refused the transfer.").slice(0, 500);
    await admin.from("ambassador_payouts").update({ status: "failed", error: message }).eq("id", payoutId);
    await admin.from("commission_ledger").update({ payout_id: null }).eq("payout_id", payoutId).eq("status", "cleared");
    console.error(`[ambassadors] payout failed ambassador=${amb.id} payout=${payoutId} :: ${message}`);
    return { ok: false, error: message };
  }
}

/** The monthly run: every connected, active ambassador over the minimum. */
export async function runAmbassadorPayouts(admin: SupabaseClient, now: number = Date.now()) {
  if (!(await autoPayoutsOn(admin))) return { off: true as const };
  // In pages: an ambassador past the thousandth would never have been paid.
  const { data } = await pageAllSettled<{ id: string }>((from, to) =>
    admin
      .from("ambassadors")
      .select("id")
      .eq("status", "active")
      .eq("payouts_enabled", true)
      .not("stripe_account_id", "is", null)
      .order("id")
      .range(from, to),
  );
  const period = payoutPeriod(now);
  const results: Record<string, PayResult> = {};
  for (const a of data ?? []) {
    results[a.id] = await payAmbassador(admin, a.id, { period, minCents: MIN_PAYOUT_CENTS, now });
  }
  return { period, results };
}

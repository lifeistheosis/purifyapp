import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmationEmail } from "@/lib/shop/orderEmails";
import {
  settleCheckoutSession,
  type SettleResult,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ask Stripe which pending orders it actually took money for, and settle them.
 *
 * ── Why this is needed ─────────────────────────────────────────────────
 *
 * Measured on production 2026-09-01: 48 orders, of which 31 sat `pending` with
 * a Stripe session attached and exactly 1 was `paid`, while Stripe's own
 * dashboard showed roughly sixty dollars taken. Money had been collected and
 * the order rows never learned about it.
 *
 * Settlement runs entirely through the webhook, so anything that stops a
 * `checkout.session.completed` from arriving or from succeeding leaves the
 * order pending forever: a webhook secret that was rotated, an endpoint added
 * after the first orders, a deploy during a delivery, a 500 that exhausted
 * Stripe's retries. The webhook has no backstop, and this is it.
 *
 * ── Stripe is the source of truth, and the only one consulted ──────────
 *
 * Nothing here decides an order was paid. It asks Stripe about that order's
 * own checkout session and believes the answer. A reconciler that inferred
 * payment from anything else would eventually mark an unpaid order paid, which
 * is worse than the problem it fixes.
 *
 * ── It reuses the webhook's settlement, deliberately ───────────────────
 *
 * settleCheckoutSession carries the money rules: the amount check that refuses
 * to settle when Stripe's total disagrees with the order, and the idempotent
 * guarded update. A second implementation here would be a second place for
 * those to be wrong, and this is the path that runs when the first one failed.
 *
 * ── GET is a dry run and POST applies ──────────────────────────────────
 *
 * Money moves state here. The default is to report what WOULD change.
 */

/** Bounded so one call cannot walk an unbounded history. */
const MAX_ORDERS = 200;

type PendingRow = {
  id: string;
  total_cents: number;
  stripe_session_id: string | null;
  created_at: string;
};

type Finding = {
  orderId: string;
  totalCents: number;
  /** What Stripe says about the session. */
  stripeStatus: string;
  /** What settlement did, on POST. Absent on a dry run. */
  result?: SettleResult;
  note?: string;
};

async function loadPending(supa: ReturnType<typeof createAdminClient>) {
  return supa
    .from("shop_orders")
    .select("id, total_cents, stripe_session_id, created_at")
    .eq("payment_status", "pending")
    .not("stripe_session_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_ORDERS);
}

async function run(apply: boolean, actorEmail: string | null) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SECRET_KEY is not set on this deployment, so Stripe cannot be asked anything.",
      },
      { status: 503 },
    );
  }
  // BOUNDED. The default client carries an 80 second timeout and 2 retries,
  // so a single stalled session could hold this request open for 240 seconds
  // while the operator watches a spinner. The loop is sequential and capped at
  // 200, which is fine for a manually pressed button, but only if no one call
  // can hang for minutes.
  const stripe = new Stripe(key, { timeout: 10_000, maxNetworkRetries: 1 });
  const supa = createAdminClient();

  const { data, error } = await loadPending(supa);
  if (error) {
    return NextResponse.json(
      { error: "Could not read pending orders.", detail: error.message },
      { status: 500 },
    );
  }
  const pending = (data ?? []) as PendingRow[];

  // WHEN DID STRIPE LAST CALL? The first question worth asking, and until the
  // webhook started logging there was no way to answer it. "Never" means the
  // endpoint is not registered in Stripe or points somewhere else, which is a
  // different fix from a webhook that arrives and fails.
  const { data: lastHook, error: hookErr } = await supa
    .from("admin_activity_log")
    .select("created_at, detail")
    .eq("action", "shop.webhook")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string; detail: Record<string, unknown> }>();

  const findings: Finding[] = [];
  let recoveredCents = 0;

  for (const order of pending) {
    if (!order.stripe_session_id) continue;
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    } catch (e) {
      // A session Stripe has never heard of is worth reporting, not throwing:
      // it usually means the row was created against a different Stripe
      // account or mode, and that is a fact the operator needs.
      findings.push({
        orderId: order.id,
        totalCents: order.total_cents,
        stripeStatus: "unreadable",
        note: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    const status = session.payment_status ?? "unknown";
    // Stripe's own words. Only `paid` is money; `unpaid` is an abandoned
    // checkout and `no_payment_required` is a zero-value session.
    if (status !== "paid") {
      findings.push({
        orderId: order.id,
        totalCents: order.total_cents,
        stripeStatus: status,
      });
      continue;
    }

    if (!apply) {
      findings.push({
        orderId: order.id,
        totalCents: order.total_cents,
        stripeStatus: status,
        note: "would be settled",
      });
      recoveredCents += order.total_cents;
      continue;
    }

    const result = await settleCheckoutSession(
      supa as unknown as SettlementDb,
      sendOrderConfirmationEmail,
      session as unknown as Parameters<typeof settleCheckoutSession>[2],
    );
    findings.push({
      orderId: order.id,
      totalCents: order.total_cents,
      stripeStatus: status,
      result,
    });
    if (result === "paid" || result === "recovered") {
      recoveredCents += order.total_cents;
    }
  }

  // CHECKED means every pending order was actually asked about. A run in
  // which Stripe could not read a session (wrong key, wrong mode, a rotated
  // secret) has verified nothing about those orders, so it must not count as
  // the reconcile that clears the attention strip's stale-orders finding.
  //
  // The log row below IS that clearing signal: app/api/admin/overview reads
  // the newest shop.reconcile row as "the last time somebody asked Stripe",
  // and lib/admin/attentionOrders.ts treats every stale order older than it
  // as checked. It used to be written by POST unconditionally, after a 503
  // (no key) and a 500 (orders unreadable) as much as after a real run, so a
  // failed press cleared a money finding. Written here, inside the run, only
  // when the run applied and read every session.
  const unreadable = findings.filter((f) => f.stripeStatus === "unreadable").length;
  const checked = unreadable === 0;
  if (apply && checked) {
    void logActivity({
      actorEmail,
      action: "shop.reconcile",
      entityType: "shop_orders",
      entityId: null,
      detail: { applied: true, pendingChecked: pending.length, unreadable },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      applied: apply,
      pendingChecked: pending.length,
      /** Sessions Stripe could not read. Above zero, this run is not a check. */
      unreadable,
      /** True when every pending order was read. Only then does Apply clear the strip. */
      checked,
      // AN UNREADABLE LOG IS NOT "STRIPE NEVER CALLED". The error was
      // discarded here, so an absent table and an empty log were the same
      // answer, and the card turned that into a red instruction to go and
      // re-point a webhook that is working. 20260823_admin_activity_log.sql
      // is one of the unsigned migrations, so that was the likely state.
      //
      // 42P01 is "relation does not exist". app/api/admin/activity-log
      // already uses this exact test; this is the same pattern.
      lastWebhookLogReadable: !hookErr,
      lastWebhookLogMissing: hookErr?.code === "42P01",
      lastWebhookAt: lastHook?.created_at ?? null,
      lastWebhookResult: (lastHook?.detail?.result as string) ?? null,
      // Only the ones Stripe confirmed. This is the number that answers
      // "how much did we take that the panel could not see".
      settleable: findings.filter(
        (f) => f.stripeStatus === "paid" && f.result !== "amount-mismatch",
      ).length,
      recoveredCents,
      findings,
      limit: MAX_ORDERS,
      truncated: pending.length >= MAX_ORDERS,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return run(false, adminUser.email ?? null);
}

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // An explicit confirmation in the body, because a POST to this URL from
  // anywhere else should not move money into the books by accident.
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* no body is fine; the check below refuses it */
  }
  if ((body as { confirm?: boolean } | null)?.confirm !== true) {
    return NextResponse.json(
      { error: "Send { confirm: true } to apply. GET for a dry run." },
      { status: 400 },
    );
  }

  // The shop.reconcile log row is written inside run(), and only for a run
  // that applied and read every session. See the note there.
  return run(true, adminUser.email ?? null);
}

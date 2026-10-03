import { NextResponse } from "next/server";

import { balance, clickSeries, MIN_PAYOUT_CENTS, type LedgerRow } from "@/lib/ambassadors/ledger";
import { referralLink } from "@/lib/ambassadors/referral";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in reader's ambassador dashboard (components/shop/ambassador):
 * their link, visits to it by day, the EIKON orders it brought in and what
 * each earned, their balance and their payouts.
 *
 * Read with the service role after the session is checked, and only ever for
 * the caller's own ambassador row. The buyers behind the orders are never
 * named: an ambassador sees a confirmation number, an amount and a date.
 *
 * `ambassador: null` is the ordinary answer for everyone who has not been
 * invited, and for every reader until 20260930000000_ambassadors.sql has run.
 */
async function handleGET(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your ambassador page." }, { status: 401 });

  const admin = createAdminClient();
  const { data: amb, error } = await admin
    .from("ambassadors")
    .select("id, code, display_name, status, commission_bps, stripe_account_id, payouts_enabled, created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !amb) return NextResponse.json({ ambassador: null }, { headers: { "Cache-Control": "no-store" } });

  const now = Date.now();
  const since = new Date(now - 30 * 86_400_000).toISOString().slice(0, 10);
  const [clicksRes, ledgerRes, payoutsRes] = await Promise.all([
    admin.from("ambassador_clicks").select("day, clicks").eq("ambassador_id", amb.id).gte("day", since),
    admin
      .from("commission_ledger")
      .select("order_id, status, amount_cents, base_cents, created_at, clears_at")
      .eq("ambassador_id", amb.id)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("ambassador_payouts")
      .select("period, amount_cents, status, created_at, paid_at, error")
      .eq("ambassador_id", amb.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const clicks = clickSeries((clicksRes.data ?? []) as { day: string; clicks: number }[], now, 30);
  const ledger = (ledgerRes.data ?? []) as (LedgerRow & { order_id: string; base_cents: number; clears_at: string })[];

  return NextResponse.json(
    {
      ambassador: {
        code: amb.code,
        displayName: amb.display_name,
        status: amb.status,
        rateBps: amb.commission_bps,
        connected: Boolean(amb.stripe_account_id),
        payoutsReady: Boolean(amb.payouts_enabled),
        since: amb.created_at,
      },
      link: referralLink(SITE_URL, amb.code),
      clicks,
      clicks30: clicks.reduce((a, c) => a + c.clicks, 0),
      balance: balance(ledger),
      minPayoutCents: MIN_PAYOUT_CENTS,
      recent: ledger.slice(0, 20).map((r) => ({
        order: orderConfirmationNumber(r.order_id),
        status: r.status,
        amountCents: r.amount_cents,
        baseCents: r.base_cents,
        at: r.created_at,
        clearsAt: r.clears_at,
      })),
      payouts: payoutsRes.data ?? [],
      at: new Date(now).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;

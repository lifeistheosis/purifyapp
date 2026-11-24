import { NextResponse, type NextRequest } from "next/server";

import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents } from "@/lib/premium/mrr";
import { notOwnTestOrdersFilter } from "@/lib/admin/testOrders";
import { buildDigest, digestTokenMatches, type DigestInputs } from "@/lib/owner/digest";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAll } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner's digest (lib/owner/digest.ts): totals only, for a holder of
 * OWNER_DIGEST_TOKEN, sent as `Authorization: Bearer <token>`.
 *
 * Closed in every environment while the variable is unset or shorter than 32
 * characters, the way the cron routes are closed without CRON_SECRET.
 *
 * KEPT LIGHT ON SUPABASE'S EGRESS (the free quota's date, docs/NOW.md item 0).
 * Counts are head requests, which move no rows. The only rows read are the
 * entitlements (a few hundred, through subscriptionStats, as the admin's own
 * tabs read them), the week's page view
 * counts (one number a row), and the month's paid orders (none at present).
 * It is read when he asks, not on a schedule.
 */
const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET(req: NextRequest) {
  const token = process.env.OWNER_DIGEST_TOKEN;
  if (!token) return NextResponse.json({ error: "Not configured." }, { status: 503, headers: noStore });
  if (!digestTokenMatches(req.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  if (await rateLimited("owner-digest", 3600, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: noStore });
  }

  const admin = createAdminClient();
  const day = 86_400_000;
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const d7 = iso(now - 7 * day);
  const d14 = iso(now - 14 * day);
  const d30 = iso(now - 30 * day);
  const nowIso = iso(now);

  const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const head = { count: "exact" as const, head: true };

  try {
    const [
      total, new7, newPrev7, new30,
      sessions7, sessionsPrev7,
      views7Rows,
      subs, cancelling, billingIssue, orders,
    ] = await Promise.all([
      count(admin.from("profiles").select("id", head)),
      count(admin.from("profiles").select("id", head).gte("joined_at", d7)),
      count(admin.from("profiles").select("id", head).gte("joined_at", d14).lt("joined_at", d7)),
      count(admin.from("profiles").select("id", head).gte("joined_at", d30)),
      count(admin.from("analytics_sessions").select("session_id", head).gte("last_seen", d7)),
      count(admin.from("analytics_sessions").select("session_id", head).gte("last_seen", d14).lt("last_seen", d7)),
      pageAll<{ pageviews: number }>((a, b) =>
        admin.from("analytics_sessions").select("pageviews").gte("last_seen", d7)
          .order("session_id").range(a, b)),
      subscriptionStats(admin),
      count(admin.from("entitlements").select("user_id", head).gt("plus_until", nowIso).eq("auto_renew", false)),
      count(admin.from("entitlements").select("user_id", head).gt("plus_until", nowIso).not("billing_issue_at", "is", null)),
      pageAll<{ total_cents: number }>((a, b) =>
        admin.from("shop_orders").select("total_cents").eq("payment_status", "paid")
          .gte("created_at", d30).or(notOwnTestOrdersFilter()).order("id").range(a, b)),
    ]);

    const inputs: DigestInputs = {
      generatedAt: nowIso,
      accounts: { total, new7, newPrev7, new30 },
      readers: {
        // Not recorded: /api/track never writes analytics_sessions.user_id.
        signedIn7: null,
        signedInPrev7: null,
        sessions7,
        sessionsPrev7,
        pageviews7: views7Rows.reduce((s, r) => s + (r.pageviews ?? 0), 0),
      },
      plus: {
        paid: subs.paidPlus,
        trial: subs.trialPlus,
        trialsKnown: subs.trialsKnown,
        comped: subs.compedPlus,
        gifted: subs.giftedPlus,
        legacy: subs.legacyPlus,
        developer: subs.developerPlus,
        test: subs.testPlus,
        bySource: subs.bySource,
        cancelling,
        billingIssue,
        estimatedMrrCents: estimatedMrrCents(subs.paidCounts),
      },
      shop: {
        paidOrders30: orders.length,
        paidRevenueCents30: orders.reduce((s, o) => s + (o.total_cents ?? 0), 0),
      },
    };
    return NextResponse.json(buildDigest(inputs), { headers: noStore });
  } catch (e) {
    // A failed read is a 500, never zeros (see subscriptionStats).
    console.error("[owner-digest]", (e as Error).message);
    return NextResponse.json({ error: "A read failed." }, { status: 500, headers: noStore });
  }
}

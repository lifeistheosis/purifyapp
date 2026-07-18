import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCustomerDates,
  revenuecatRestConfigured,
} from "@/lib/billing/revenuecatRest";

export const dynamic = "force-dynamic";

/**
 * The list of active subscribers for the admin Subscriptions view: name,
 * email, tier, source, and next-billing date. NO financials — no amount,
 * no card, nothing RevenueCat/Stripe consider payment data. Next-billing is
 * plus_until/pro_until (the webhook writes the period end there). The real
 * START date is enriched from RevenueCat's REST API when the key is set,
 * and otherwise left null (the DB does not store it).
 */
const ENRICH_CAP = 100; // don't fan out to RevenueCat for huge lists

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: ents } = await admin
    .from("entitlements")
    .select("user_id, plus_until, pro_until, plus_source, is_supporter")
    .or(`plus_until.gt.${nowIso},pro_until.gt.${nowIso}`)
    .limit(2000);

  const rows = (ents ?? []) as {
    user_id: string;
    plus_until: string | null;
    pro_until: string | null;
    plus_source: string | null;
    is_supporter: boolean | null;
  }[];

  // Names + emails from the profiles mirror.
  const ids = rows.map((r) => r.user_id);
  const profileById = new Map<string, { display_name: string | null; email: string }>();
  if (ids.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", ids);
    for (const p of (profiles ?? []) as {
      id: string;
      display_name: string | null;
      email: string;
    }[]) {
      profileById.set(p.id, { display_name: p.display_name, email: p.email });
    }
  }

  const now = Date.now();
  const isFuture = (ts: string | null) => !!ts && new Date(ts).getTime() > now;

  const members = rows.map((r) => {
    const isPro = isFuture(r.pro_until);
    const p = profileById.get(r.user_id);
    return {
      userId: r.user_id,
      name: p?.display_name ?? null,
      email: p?.email ?? null,
      tier: isPro ? ("Pro" as const) : ("Plus" as const),
      source: r.plus_source ?? "unknown",
      comped: r.plus_source === "comp",
      // Next billing = the active period end.
      nextBilling: isPro ? r.pro_until : r.plus_until,
      startDate: null as string | null,
    };
  });

  // Enrich start dates from RevenueCat when configured and the list is small
  // enough to fan out politely.
  const enriched = revenuecatRestConfigured() && members.length <= ENRICH_CAP;
  if (enriched) {
    await Promise.all(
      members.map(async (m) => {
        const d = await getCustomerDates(m.userId);
        if (d) {
          m.startDate = d.startDate;
          if (d.nextBilling) m.nextBilling = d.nextBilling;
        }
      }),
    );
  }

  // Most recent renewals first (soonest-expiring last is less useful than
  // "who's active"); sort by next billing descending, nulls last.
  members.sort((a, b) => (b.nextBilling ?? "").localeCompare(a.nextBilling ?? ""));

  return NextResponse.json(
    { members, enriched, revenuecat: revenuecatRestConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";

import { getOwnerUser, ownerListIsExplicit } from "@/lib/owner/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import type { Actuals } from "@/lib/owner/actuals";

export const dynamic = "force-dynamic";

/**
 * The numbers the projection is calibrated against.
 *
 * Everything here is a count of something that really happened. No estimate,
 * no assumption, and nothing derived from list prices: those belong on the
 * modelling side, where they can be argued with. If a figure cannot be
 * counted it is absent rather than filled in, which is why there is no
 * revenue-per-subscriber in this payload.
 *
 * Gated on the owner list, not the admin one. Same person today; different
 * surface, and the separation is the point.
 */
export async function GET() {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const dayMs = 86_400_000;
  const since30 = new Date(Date.now() - 30 * dayMs).toISOString();

  const [profilesRes, newUsersRes, subs, sessionsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("joined_at", since30),
    subscriptionStats(admin),
    // Country per session for the trailing 30 days. The same window
    // /api/admin/audience uses, so the two cannot disagree.
    admin
      .from("analytics_sessions")
      .select("country, country_code")
      .gte("last_seen", since30)
      .limit(50_000),
  ]);

  const tally = new Map<string, { code: string | null; name: string; sessions: number }>();
  for (const row of sessionsRes.data ?? []) {
    const name = row.country ?? "Unknown";
    const e = tally.get(name) ?? { code: row.country_code ?? null, name, sessions: 0 };
    e.sessions += 1;
    tally.set(name, e);
  }
  const countries = [...tally.values()].sort((a, b) => b.sessions - a.sessions);

  const actuals: Actuals = {
    totalUsers: profilesRes.count ?? 0,
    // paidCounts, not activePlus. subscriptionStats keeps a separate paid-only
    // tally precisely because comped and gifted accounts are excluded from it,
    // and counting a comp as a subscriber would flatter the one rate this
    // dashboard can actually measure.
    paidSubscribers: subs.paidCounts.plusOnly + subs.paidCounts.pro,
    // What the paid tally leaves out: active Plus minus the ones being paid for.
    comped: Math.max(0, subs.activePlus - (subs.paidCounts.plusOnly + subs.paidCounts.pro)),
    newUsers30: newUsersRes.count ?? 0,
    visitors30: (sessionsRes.data ?? []).length,
    countries,
    // No API in this app reports store installs. Play Console and App Store
    // Connect know; nothing here does. Null until entered by hand.
    reportedInstalls: null,
    asOf: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      actuals,
      // Surfaced so the dashboard can say plainly when the owner gate is
      // borrowing the admin list rather than standing on its own.
      ownerListIsExplicit: ownerListIsExplicit(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

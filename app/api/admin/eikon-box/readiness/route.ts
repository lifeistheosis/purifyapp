import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { readBudget } from "@/lib/email/budget";
import { emailEnabled } from "@/lib/email/send";
import { eikonBoxEnabled } from "@/lib/eikonBox/flags";
import { resolveAudience } from "@/lib/push/audience";
import { missingPushEnv } from "@/lib/push/deliveryGaps";
import { apnsProblem } from "@/lib/push/providers/apns";
import { fcmProblem } from "@/lib/push/providers/fcm";
import { apnsConfigured, fcmConfigured, webPushConfigured } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether the EIKON Box can actually run a drop right now.
 *
 * Every part of it is switchable and the parts fail quietly: with
 * NEXT_PUBLIC_EIKON_BOX_ENABLED unset the member routes answer 404 and the
 * screens say "opening soon" (lib/eikonBox/flags.ts), with no open drop there
 * is nothing to claim, and with push unconfigured an announcement is logged as
 * "enqueued" and reaches nobody. Each of those is invisible from the Drops
 * table, so this answers them together, before a drop is announced.
 *
 * Probed 2026-09-19 against production: /api/eikon-box/current answered 404,
 * so the member side was off while the admin side looked healthy.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const [drops, pro, audience, budget] = await Promise.all([
    admin
      .from("eikon_drops")
      .select("id, title, status, period_month, claims_open_at, claims_close_at")
      .order("period_month", { ascending: false })
      .limit(12),
    admin.from("entitlements").select("user_id", { count: "exact", head: true }).gt("pro_until", nowIso),
    resolveAudience(admin, "pro"),
    readBudget(admin),
  ]);

  const rows = (drops.data ?? []) as {
    id: string;
    title: string;
    status: string;
    period_month: string;
    claims_open_at: string | null;
    claims_close_at: string | null;
  }[];
  const open =
    rows.find(
      (d) =>
        d.status === "open" &&
        (!d.claims_open_at || d.claims_open_at <= nowIso) &&
        (!d.claims_close_at || d.claims_close_at > nowIso),
    ) ?? null;
  const upcoming = rows.find((d) => d.status === "draft") ?? null;

  const missing = missingPushEnv(process.env);
  const byPlatform = { android: 0, ios: 0 };
  for (const t of audience.tokens) {
    if (t.platform === "android") byPlatform.android += 1;
    else if (t.platform === "ios") byPlatform.ios += 1;
  }

  return NextResponse.json({
    memberSide: eikonBoxEnabled(),
    tables: !drops.error,
    tablesError: drops.error?.message ?? null,
    drops: {
      total: rows.length,
      open: open ? { id: open.id, title: open.title, closesAt: open.claims_close_at } : null,
      next: upcoming ? { id: upcoming.id, title: upcoming.title, periodMonth: upcoming.period_month } : null,
    },
    pro: pro.count ?? 0,
    push: {
      transports: [
        {
          transport: "android" as const,
          label: "Android",
          devices: byPlatform.android,
          ready: fcmConfigured(),
          missing: missing.android,
          problem: missing.android.length ? null : fcmProblem(),
        },
        {
          transport: "ios" as const,
          label: "iPhone",
          devices: byPlatform.ios,
          ready: apnsConfigured(),
          missing: missing.ios,
          problem: missing.ios.length ? null : apnsProblem(),
        },
        {
          transport: "web" as const,
          label: "Web",
          devices: audience.webCount,
          ready: webPushConfigured(),
          missing: missing.web,
          problem: null,
        },
      ],
      errors: audience.errors,
    },
    email: { enabled: emailEnabled(), leftToday: budget.left },
  });
}

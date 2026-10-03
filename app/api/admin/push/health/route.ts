import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { missingPushEnv, type PushTransport } from "@/lib/push/deliveryGaps";
import { apnsProblem, checkApns } from "@/lib/push/providers/apns";
import { explainFailure } from "@/lib/push/failures";
import { fcmProblem } from "@/lib/push/providers/fcm";
import { apnsConfigured, fcmConfigured, webPushConfigured } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Can each push transport deliver right now, and to how many devices.
 *
 * The Push tab used to learn this only by sending: the broadcast came back
 * "Nothing was delivered" with the reason after the fact. This answers before
 * anything is sent, per platform: the devices waiting on it, whether it is
 * ready, which variables are unset, and, when they are set but unreadable,
 * which part is wrong (lib/push/credentials.ts). Variable NAMES and shapes
 * only; no value is ever read into the response.
 *
 * A readable key is not yet a working one, so for iPhones it also asks Apple
 * (checkApns in lib/push/providers/apns.ts, a push to a token that cannot
 * exist, reaching no one). `refused` is Apple saying no to the key itself,
 * with the reason in `problem`.
 */

type Row = {
  transport: PushTransport;
  label: string;
  devices: number | null;
  ready: boolean;
  missing: string[];
  problem: string | null;
  refused?: boolean;
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // COUNTED, not listed. This selected every token and counted them here, and
  // one request returns at most 1,000 rows whatever .limit() asks for: at 310
  // devices that was still right, and past 1,000 it would have gone on saying
  // 1,000. The database counts instead, so there is no row limit to meet.
  const [androidTokens, iosTokens, subs] = await Promise.all([
    admin.from("device_push_tokens").select("platform", { count: "exact", head: true }).eq("platform", "android"),
    admin.from("device_push_tokens").select("platform", { count: "exact", head: true }).eq("platform", "ios"),
    admin.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);
  const missing = missingPushEnv(process.env);
  const apple = await checkApns().catch(() => null);
  const appleRefused = apple !== null && !apple.ok;

  const rows: Row[] = [
    {
      transport: "android",
      label: "Android",
      devices: androidTokens.error ? null : (androidTokens.count ?? 0),
      ready: fcmConfigured(),
      missing: missing.android,
      problem: missing.android.length ? null : fcmProblem(),
    },
    {
      transport: "ios",
      label: "iPhone",
      devices: iosTokens.error ? null : (iosTokens.count ?? 0),
      ready: apnsConfigured() && !appleRefused,
      missing: missing.ios,
      problem: missing.ios.length
        ? null
        : appleRefused
          ? explainFailure("ios", apple.reason)
          : apnsProblem(),
      refused: appleRefused,
    },
    {
      transport: "web",
      label: "Web",
      devices: subs.error ? null : (subs.count ?? 0),
      ready: webPushConfigured(),
      missing: missing.web,
      problem: null,
    },
  ];

  return NextResponse.json({ transports: rows }, { headers: { "Cache-Control": "no-store" } });
}

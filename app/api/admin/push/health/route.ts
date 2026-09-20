import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { missingPushEnv, type PushTransport } from "@/lib/push/deliveryGaps";
import { apnsProblem } from "@/lib/push/providers/apns";
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
 */

type Row = {
  transport: PushTransport;
  label: string;
  devices: number | null;
  ready: boolean;
  missing: string[];
  problem: string | null;
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [tokens, subs] = await Promise.all([
    admin.from("device_push_tokens").select("platform").limit(20000),
    admin.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);
  const byPlatform = { android: 0, ios: 0 };
  for (const t of (tokens.data ?? []) as { platform: string }[]) {
    if (t.platform === "android") byPlatform.android += 1;
    else if (t.platform === "ios") byPlatform.ios += 1;
  }
  const missing = missingPushEnv(process.env);

  const rows: Row[] = [
    {
      transport: "android",
      label: "Android",
      devices: tokens.error ? null : byPlatform.android,
      ready: fcmConfigured(),
      missing: missing.android,
      problem: missing.android.length ? null : fcmProblem(),
    },
    {
      transport: "ios",
      label: "iPhone",
      devices: tokens.error ? null : byPlatform.ios,
      ready: apnsConfigured(),
      missing: missing.ios,
      problem: missing.ios.length ? null : apnsProblem(),
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

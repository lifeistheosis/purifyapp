import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { explainFailure } from "@/lib/push/failures";
import { sendNativeOne, sendWebPushOne, type NativeToken, type WebSub } from "@/lib/push/send";
import {
  SELF_TEST_MAX,
  SELF_TEST_PUSH,
  SELF_TEST_WINDOW_SECONDS,
  browserOf,
  type MyDevice,
  type MyDeviceResult,
} from "@/lib/push/selfTest";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in admin's own devices, and a test push to them alone
 * (lib/push/selfTest.ts says why).
 *
 * WHOSE DEVICES. Only the account of the session that asks: the user id is
 * the admin's own, from getAdminUser, and the request carries nothing that
 * could name another reader, not a user id, a token or an audience. There is
 * no way to point it at someone else short of signing in as them.
 *
 * WHAT IS SHOWN. Kind, browser, dates and the phone's time zone. Never a
 * token or a browser's push address: each is a key that reaches that device.
 *
 * WHAT IS KEPT. Nothing new. A send the push service accepts stamps the
 * device's last_sent_at, and one refused as a device that no longer exists
 * removes it, as every send does (lib/push/send.ts). Nothing is written to
 * push_broadcasts: this is not a broadcast, and the history stays a record of
 * what readers were sent.
 */

type TokenRow = { token: string; platform: "ios" | "android"; created_at: string | null; last_sent_at: string | null; timezone: string | null };
type SubRow = { endpoint: string; p256dh: string; auth: string; created_at: string | null; last_sent_at: string | null };

async function ownDevices(userId: string) {
  const admin = createAdminClient();
  const [tokens, subs] = await Promise.all([
    admin
      .from("device_push_tokens")
      .select("token, platform, created_at, last_sent_at, timezone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, created_at, last_sent_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  return {
    admin,
    error: tokens.error?.message ?? subs.error?.message ?? null,
    tokens: (tokens.data ?? []) as TokenRow[],
    subs: (subs.data ?? []) as SubRow[],
  };
}

function phone(t: TokenRow): MyDevice {
  return { kind: t.platform, browser: null, since: t.created_at, lastAccepted: t.last_sent_at, zone: t.timezone };
}

function browser(s: SubRow): MyDevice {
  return { kind: "web", browser: browserOf(s.endpoint), since: s.created_at, lastAccepted: s.last_sent_at, zone: null };
}

/** The admin's own devices, before anything is sent. */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error, tokens, subs } = await ownDevices(user.id);
  if (error) {
    console.error("[admin/push/test] read failed", error);
    return NextResponse.json({ error: "Could not read your devices." }, { status: 503 });
  }
  return NextResponse.json(
    { devices: [...tokens.map(phone), ...subs.map(browser)] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Body = z.object({ confirm: z.literal(true) });

/** Send the test to every one of the admin's own devices, and say what each push service answered. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Body.safeParse(body).success) {
    return NextResponse.json({ error: "Not confirmed." }, { status: 400 });
  }

  if (await rateLimited(`admin-push-test:${user.id}`, SELF_TEST_WINDOW_SECONDS, SELF_TEST_MAX)) {
    return NextResponse.json({ error: "That is enough tests for ten minutes. Try again shortly." }, { status: 429 });
  }

  const { admin, error, tokens, subs } = await ownDevices(user.id);
  if (error) {
    console.error("[admin/push/test] read failed", error);
    return NextResponse.json({ error: "Could not read your devices, so nothing was sent." }, { status: 503 });
  }

  const results: MyDeviceResult[] = await Promise.all([
    ...tokens.map(async (t): Promise<MyDeviceResult> => {
      const device = phone(t);
      try {
        const r = await sendNativeOne(admin, { token: t.token, platform: t.platform } as NativeToken, SELF_TEST_PUSH);
        if (r.skipped) return { ...device, result: "not-set-up", reason: t.platform === "ios" ? "The server has no Apple key." : "The server has no Firebase key." };
        if (r.ok) return { ...device, result: "accepted", reason: null };
        const why = r.reason ? explainFailure(t.platform, r.reason) : null;
        return { ...device, result: r.gone ? "gone" : "refused", reason: why };
      } catch {
        return { ...device, result: "refused", reason: "The send failed before the push service answered." };
      }
    }),
    ...subs.map(async (s): Promise<MyDeviceResult> => {
      const device = browser(s);
      try {
        const r = await sendWebPushOne(admin, { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth } as WebSub, SELF_TEST_PUSH);
        if (r.ok) return { ...device, result: "accepted", reason: null };
        if (r.reason === "not-configured") return { ...device, result: "not-set-up", reason: "The server has no web push keys." };
        if (r.gone) return { ...device, result: "gone", reason: "This browser had dropped its subscription." };
        return { ...device, result: "refused", reason: r.reason === "unreachable" ? "The browser's push service did not answer." : `The browser's push service answered ${r.reason}.` };
      } catch {
        return { ...device, result: "refused", reason: "The send failed before the push service answered." };
      }
    }),
  ]);

  // Counts only, never a token or an address.
  console.info(
    "[admin/push/test]",
    JSON.stringify(results.map((r) => ({ kind: r.kind, result: r.result }))),
  );

  return NextResponse.json({ sentAt: new Date().toISOString(), devices: results }, { headers: { "Cache-Control": "no-store" } });
}

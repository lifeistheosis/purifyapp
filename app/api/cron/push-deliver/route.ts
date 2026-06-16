import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dueKind, reminderPayload, type ReminderKind } from "@/lib/push/schedule";
import { apnsConfigured, sendApns } from "@/lib/push/providers/apns";
import { fcmConfigured, sendFcm } from "@/lib/push/providers/fcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hourly delivery of opt-in prayer reminders across all transports:
 *   - Web Push (push_subscriptions)  → web-push + VAPID
 *   - iOS      (device_push_tokens)  → APNs
 *   - Android  (device_push_tokens)  → FCM
 *
 * For each row we ask `dueKind` whether the current UTC hour maps to the
 * user's local morning_time / evening_time (per their stored IANA timezone),
 * then dispatch the same tiny payload via the right transport.
 *
 * Auth: x-cron-secret header (same shape as /api/cron/bmc-snapshot).
 *
 * Each transport degrades to a dry-run (counts only, no throw) when its
 * credentials are absent, so this route is safe to ship before VAPID / APNs /
 * FCM are configured.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      req.headers.get("x-cron-secret") ??
      req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supa = createAdminClient();
  const now = new Date();

  const web = await deliverWeb(supa, now);
  const native = await deliverNative(supa, now);

  return NextResponse.json({ ok: true, web, native });
}

// --- Web Push -----------------------------------------------------------

async function deliverWeb(
  supa: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const { data: rows } = await supa
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, morning_time, evening_time, timezone");

  const candidates: {
    endpoint: string;
    p256dh: string;
    auth: string;
    kind: ReminderKind;
  }[] = [];
  for (const r of rows ?? []) {
    const kind = dueKind(r, now);
    if (kind)
      candidates.push({
        endpoint: r.endpoint as string,
        p256dh: r.p256dh as string,
        auth: r.auth as string,
        kind,
      });
  }

  const vapidPub = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPub || !vapidPriv || !vapidSubject) {
    return { mode: "dry-run", reason: "VAPID env vars not set", candidates: candidates.length };
  }

  let webpush: typeof import("web-push") | null = null;
  try {
    webpush = (await import("web-push")).default ?? (await import("web-push"));
  } catch {
    return { mode: "dry-run", reason: "web-push not installed", candidates: candidates.length };
  }
  webpush.setVapidDetails(vapidSubject, vapidPub, vapidPriv);

  let sent = 0;
  let failed = 0;
  for (const c of candidates) {
    const payload = JSON.stringify({ kind: c.kind, ...reminderPayload(c.kind) });
    try {
      await webpush.sendNotification(
        { endpoint: c.endpoint, keys: { p256dh: c.p256dh, auth: c.auth } },
        payload,
      );
      sent++;
      await supa
        .from("push_subscriptions")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("endpoint", c.endpoint);
    } catch (e) {
      failed++;
      const msg = String(e);
      if (msg.includes("410") || msg.includes("404")) {
        await supa.from("push_subscriptions").delete().eq("endpoint", c.endpoint);
      }
    }
  }
  return { sent, failed, candidates: candidates.length };
}

// --- Native (APNs / FCM) ------------------------------------------------

async function deliverNative(
  supa: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const { data: rows } = await supa
    .from("device_push_tokens")
    .select("token, platform, morning_time, evening_time, timezone");

  const candidates: {
    token: string;
    platform: "ios" | "android";
    kind: ReminderKind;
  }[] = [];
  for (const r of rows ?? []) {
    const kind = dueKind(r, now);
    if (kind)
      candidates.push({
        token: r.token as string,
        platform: r.platform as "ios" | "android",
        kind,
      });
  }

  const haveApns = apnsConfigured();
  const haveFcm = fcmConfigured();
  if (!haveApns && !haveFcm) {
    return { mode: "dry-run", reason: "APNs/FCM env not set", candidates: candidates.length };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const c of candidates) {
    const configured = c.platform === "ios" ? haveApns : haveFcm;
    if (!configured) {
      skipped++;
      continue;
    }
    const msg = reminderPayload(c.kind);
    const res =
      c.platform === "ios"
        ? await sendApns(c.token, msg)
        : await sendFcm(c.token, msg);
    if (res.ok) {
      sent++;
      await supa
        .from("device_push_tokens")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("token", c.token);
    } else {
      failed++;
      if (res.gone) {
        await supa.from("device_push_tokens").delete().eq("token", c.token);
      }
    }
  }
  return { sent, failed, skipped, candidates: candidates.length };
}

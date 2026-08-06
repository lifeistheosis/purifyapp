import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dueKind, reminderPayload, type ReminderKind } from "@/lib/push/schedule";
import {
  apnsConfigured,
  fcmConfigured,
  sendNativeOne,
  sendWebPushOne,
  webPushConfigured,
} from "@/lib/push/send";

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
  // Degrade CLOSED, not open. This used to be `if (secret) { ...403... }`,
  // so with CRON_SECRET unset the check was skipped entirely and any
  // anonymous GET ran the handler under the service role. Verified against
  // production: this route answered a caller with no credentials at all.
  // Same shape as lib/shop/flags.ts, which refuses rather than assumes.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Closed in EVERY environment, not just production. fix/native-analytics-
    // blackout proposed leaving dev open "so the loop is easy to drive"; that
    // is the same shape as the bug being fixed, and a dev build pointed at a
    // production database is not hypothetical here.
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  {
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

  // A query failure means we do not know who was due, which is not the same
  // as "nobody was due". Answer 500 so the scheduler's run goes red instead
  // of logging a cheerful zero forever.
  const errors = [...(web.errors ?? []), ...(native.errors ?? [])];
  if (errors.length > 0) {
    console.error("[cron/push-deliver] query failures", errors);
    return NextResponse.json({ ok: false, errors, web, native }, { status: 500 });
  }

  return NextResponse.json({ ok: true, web, native });
}

// --- Web Push -----------------------------------------------------------

async function deliverWeb(
  supa: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const { data: rows, error } = await supa
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, morning_time, evening_time, timezone");
  const errors = error ? [`push_subscriptions: ${error.message}`] : [];

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

  if (!webPushConfigured()) {
    return {
      mode: "dry-run",
      reason: "VAPID env vars not set",
      candidates: candidates.length,
      errors,
    };
  }

  let sent = 0;
  let failed = 0;
  for (const c of candidates) {
    const r = await sendWebPushOne(
      supa,
      { endpoint: c.endpoint, p256dh: c.p256dh, auth: c.auth },
      { kind: c.kind, ...reminderPayload(c.kind) },
    );
    if (r.ok) sent++;
    else failed++;
  }
  return { sent, failed, candidates: candidates.length, errors };
}

// --- Native (APNs / FCM) ------------------------------------------------

async function deliverNative(
  supa: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const { data: rows, error } = await supa
    .from("device_push_tokens")
    .select("token, platform, morning_time, evening_time, timezone");
  const errors = error ? [`device_push_tokens: ${error.message}`] : [];

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

  if (!apnsConfigured() && !fcmConfigured()) {
    return {
      mode: "dry-run",
      reason: "APNs/FCM env not set",
      candidates: candidates.length,
      errors,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const c of candidates) {
    const res = await sendNativeOne(
      supa,
      { token: c.token, platform: c.platform },
      reminderPayload(c.kind),
    );
    if (res.ok) sent++;
    else if (res.skipped) skipped++;
    else failed++;
  }
  return { sent, failed, skipped, candidates: candidates.length, errors };
}

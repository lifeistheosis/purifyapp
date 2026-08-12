import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  campaignReminderPayload,
  dueCampaigns,
  dueKind,
  reminderPayload,
  type CampaignReminderRow,
  type ReminderKind,
} from "@/lib/push/schedule";
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
  const campaigns = await deliverCampaigns(supa, now);

  // A query failure means we do not know who was due, which is not the same
  // as "nobody was due". Answer 500 so the scheduler's run goes red instead
  // of logging a cheerful zero forever.
  const errors = [
    ...(web.errors ?? []),
    ...(native.errors ?? []),
    ...(campaigns.errors ?? []),
  ];
  if (errors.length > 0) {
    console.error("[cron/push-deliver] query failures", errors);
    return NextResponse.json(
      { ok: false, errors, web, native, campaigns },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, web, native, campaigns });
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

// --- Campaign reminders -------------------------------------------------

/**
 * The opt-in daily reminder for a prayer campaign.
 *
 * This pass did not exist. `dueCampaigns` and `campaignReminderPayload` were
 * written, tested by nobody, and called by nobody: the toggle wrote
 * `remind_enabled` to a column, the migration built a partial index for a
 * scan that was never run, and the reader was shown an armed switch that
 * said "one quiet notification a day" while nothing ever read the row.
 *
 * WHERE THE TIMEZONE COMES FROM. `CampaignReminderRow` needs one and
 * `prayer_campaign_prayers` has no such column. It is not added here on
 * purpose: the reader's IANA zone is already recorded on every device they
 * registered, and a second copy on a second table is a second thing to keep
 * in step. It is read from the reader's own push rows instead. A reader with
 * no registered device has nowhere to deliver to anyway, so those rows fall
 * out before the question is asked.
 *
 * THE CAP IS PER READER. `dueCampaigns` stops at
 * MAX_CAMPAIGN_REMINDERS_PER_RUN, so it is called once per reader rather
 * than once over the whole table: a global call would let one reader's
 * twelve campaigns consume the entire run's allowance for everybody.
 */
async function deliverCampaigns(
  supa: ReturnType<typeof createAdminClient>,
  now: Date,
) {
  const errors: string[] = [];

  const { data: optIns, error } = await supa
    .from("prayer_campaign_prayers")
    .select("user_id, campaign_id, remind_enabled, remind_time")
    .eq("remind_enabled", true);

  if (error) {
    // 42703 undefined_column / 42P01 undefined_table mean the campaign
    // migration has not been applied. That is the NORMAL state of this
    // feature, which ships dark behind NEXT_PUBLIC_CAMPAIGNS_ENABLED and a
    // hand-applied migration, so it must not turn the hourly cron red and
    // bury a real morning-reminder failure under a permanent 500. Same
    // posture as notifyOfReply, which skips silently until its own table
    // exists. Any OTHER error is a genuine failure and is reported.
    if (error.code === "42703" || error.code === "42P01") {
      return { mode: "inactive", reason: "campaign migration not applied", errors };
    }
    errors.push(`prayer_campaign_prayers: ${error.message}`);
    return { sent: 0, failed: 0, candidates: 0, errors };
  }
  if (!optIns?.length) return { sent: 0, failed: 0, candidates: 0, errors };

  const userIds = [...new Set(optIns.map((r) => r.user_id as string))];

  const { data: webRows, error: webError } = await supa
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth, timezone")
    .in("user_id", userIds);
  if (webError) errors.push(`push_subscriptions (campaigns): ${webError.message}`);

  const { data: nativeRows, error: nativeError } = await supa
    .from("device_push_tokens")
    .select("user_id, token, platform, timezone")
    .in("user_id", userIds);
  if (nativeError)
    errors.push(`device_push_tokens (campaigns): ${nativeError.message}`);

  type Targets = {
    timezone: string | null;
    web: { endpoint: string; p256dh: string; auth: string }[];
    native: { token: string; platform: "ios" | "android" }[];
  };
  const byUser = new Map<string, Targets>();
  const target = (id: string): Targets => {
    let t = byUser.get(id);
    if (!t) {
      t = { timezone: null, web: [], native: [] };
      byUser.set(id, t);
    }
    return t;
  };
  for (const r of webRows ?? []) {
    const t = target(r.user_id as string);
    t.timezone ??= (r.timezone as string | null) ?? null;
    t.web.push({
      endpoint: r.endpoint as string,
      p256dh: r.p256dh as string,
      auth: r.auth as string,
    });
  }
  for (const r of nativeRows ?? []) {
    const t = target(r.user_id as string);
    t.timezone ??= (r.timezone as string | null) ?? null;
    t.native.push({
      token: r.token as string,
      platform: r.platform as "ios" | "android",
    });
  }

  const optInsByUser = new Map<string, CampaignReminderRow[]>();
  for (const r of optIns) {
    const id = r.user_id as string;
    if (!byUser.has(id)) continue; // no device registered, nothing to deliver to
    const list = optInsByUser.get(id) ?? [];
    list.push({
      campaign_id: r.campaign_id as string,
      remind_enabled: r.remind_enabled as boolean,
      remind_time: (r.remind_time as string | null) ?? null,
      timezone: byUser.get(id)!.timezone,
    });
    optInsByUser.set(id, list);
  }

  const candidates: { userId: string; campaignId: string }[] = [];
  for (const [userId, rows] of optInsByUser) {
    for (const due of dueCampaigns(rows, now)) {
      candidates.push({ userId, campaignId: due.campaign_id });
    }
  }

  const anyTransport = webPushConfigured() || apnsConfigured() || fcmConfigured();
  if (!anyTransport) {
    return {
      mode: "dry-run",
      reason: "no push transport configured",
      candidates: candidates.length,
      errors,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const c of candidates) {
    const payload = campaignReminderPayload(c.campaignId);
    const t = byUser.get(c.userId);
    if (!t) continue;
    if (webPushConfigured()) {
      for (const w of t.web) {
        const r = await sendWebPushOne(supa, w, { kind: "campaign", ...payload });
        if (r.ok) sent++;
        else failed++;
      }
    }
    if (apnsConfigured() || fcmConfigured()) {
      for (const n of t.native) {
        const r = await sendNativeOne(supa, n, payload);
        if (r.ok) sent++;
        else if (r.skipped) skipped++;
        else failed++;
      }
    }
  }
  return { sent, failed, skipped, candidates: candidates.length, errors };
}

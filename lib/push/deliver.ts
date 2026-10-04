import "server-only";

import { pageAllIn, pageAllSettled } from "@/lib/supabase/pageAll";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addFailure, emptyTally, tallyIsEmpty } from "./failures";
import {
  campaignReminderPayload,
  dueCampaigns,
  dueKind,
  reminderPayload,
  type CampaignReminderRow,
  type ReminderKind,
} from "./schedule";
import { apnsConfigured, fcmConfigured, sendNativeOne, sendWebPushOne, webPushConfigured } from "./send";

// The hourly delivery of opt-in prayer reminders, across every transport:
//   - Web Push (push_subscriptions)  to browsers, signed with the VAPID keys
//   - iOS      (device_push_tokens)  through APNs
//   - Android  (device_push_tokens)  through FCM
// and the one-a-day campaign reminder a reader may have turned on.
//
// For each row `dueKind` says whether this UTC hour is the reader's own
// morning or evening hour (by their stored IANA zone), and the same small
// payload goes out by the right transport. Each transport degrades to a dry
// run (counts only, no throw) while its credentials are absent.
//
// ── Where it runs from ──────────────────────────────────────────────────
//
// This lived inside app/api/cron/push-deliver, which nothing had called
// since 2026-09-26: GitHub's scheduler was switched off that day and the
// line for Render's cron was written down and never added, so onboarding
// went on asking readers to turn reminders on that no job would ever send.
// It is here so the heartbeat that does run, /api/cron/hourly-goals every ten
// minutes, can carry it (deliverRemindersOnce), the way it already carries
// lib/ops/maintenance.ts. The route still answers for a scheduler that calls
// it directly; both go through the same hourly claim, so two callers in one
// hour send once.

type Admin = ReturnType<typeof createAdminClient>;

export type ReminderRun = {
  web: Awaited<ReturnType<typeof deliverWeb>>;
  native: Awaited<ReturnType<typeof deliverNative>>;
  campaigns: Awaited<ReturnType<typeof deliverCampaigns>>;
  /** Query failures: who was due is not known, which is not "nobody was due". */
  errors: string[];
};

/** Deliver everything due in this hour. No claim: the caller decides whether it may run. */
export async function deliverReminders(supa: Admin, now: Date): Promise<ReminderRun> {
  const web = await deliverWeb(supa, now);
  const native = await deliverNative(supa, now);
  const campaigns = await deliverCampaigns(supa, now);
  const errors = [...(web.errors ?? []), ...(native.errors ?? []), ...(campaigns.errors ?? [])];
  return { web, native, campaigns, errors };
}

/** The UTC hour a run belongs to, as the claim's name. */
export function reminderHourKey(now: Date): string {
  return now.toISOString().slice(0, 13);
}

/** How far into the hour a run may still send when the claim cannot be asked. */
const UNCLAIMED_RUN_MINUTES = 10;

/**
 * Ask for this UTC hour. "mine": this run took it. "taken": another run has
 * it. "unknown": the claim could not be asked at all.
 *
 * One row in rate_limits, taken atomically by rate_limit_hit: the first
 * caller in a UTC hour is told it is within budget, every later one that it
 * is over. The window is exactly an hour because that function's own tidying
 * drops rows whose window began more than an hour ago, and a claim has to
 * outlive its hour.
 *
 * Asked directly and not through lib/security/ratelimit.ts, which answers
 * "within budget" when the limiter fails. That is right for a request limit
 * and wrong here: it would read a broken limiter as six claims an hour.
 */
async function claimHour(supa: Admin, now: Date): Promise<"mine" | "taken" | "unknown"> {
  try {
    const { data, error } = await supa.rpc("rate_limit_hit", {
      p_key: `push-deliver:${reminderHourKey(now)}`,
      p_window_seconds: 3600,
      p_max: 1,
    });
    if (error) {
      console.warn("[push/deliver] the hourly claim could not be asked", error.message);
      return "unknown";
    }
    return data ? "taken" : "mine";
  } catch (e) {
    console.warn("[push/deliver] the hourly claim could not be asked", e instanceof Error ? e.message : String(e));
    return "unknown";
  }
}

/**
 * Deliver this hour's reminders unless a run has already claimed the hour.
 *
 * Matching is by the reader's local HOUR, so a second run in the same hour
 * would send every due reader the same reminder again. The claim (claimHour)
 * is what lets a caller arrive every ten minutes and send once.
 *
 * When the claim cannot be asked, the clock decides instead: a run in the
 * hour's first ten minutes goes ahead and a later one does not. Sending on
 * every run would be six reminders an hour for as long as the limiter is
 * down, and sending on none is how reminders stopped for a week. One caller
 * in six lands in those ten minutes, so that is still once an hour.
 */
export async function deliverRemindersOnce(
  supa: Admin,
  now: Date,
): Promise<{ claimed: false } | ({ claimed: true } & ReminderRun)> {
  const claim = await claimHour(supa, now);
  if (claim === "taken") return { claimed: false };
  if (claim === "unknown" && now.getUTCMinutes() >= UNCLAIMED_RUN_MINUTES) return { claimed: false };
  const run = await deliverReminders(supa, now);
  if (run.errors.length > 0) console.error("[push/deliver] query failures", run.errors);
  return { claimed: true, ...run };
}

// --- Web Push -----------------------------------------------------------

async function deliverWeb(
  supa: Admin,
  now: Date,
) {
  // Every subscription, in pages. This read named no limit, and a request
  // with none stops at 1,000 rows all the same: past a thousand browsers the
  // rest would have had no reminder, and the run would still have said ok.
  const { data: rows, error } = await pageAllSettled((from, to) =>
    supa
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, morning_time, evening_time, timezone")
      .order("endpoint")
      .range(from, to),
  );
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
  supa: Admin,
  now: Date,
) {
  // Every phone, in pages, for the same reason as the browsers above.
  const { data: rows, error } = await pageAllSettled((from, to) =>
    supa
      .from("device_push_tokens")
      .select("token, platform, morning_time, evening_time, timezone")
      .order("token")
      .range(from, to),
  );
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
  // Why each failure failed, so the run's own answer (and the log) says it.
  // A count alone is how 135 iPhones went unreached without a word.
  const failures = emptyTally();
  for (const c of candidates) {
    const res = await sendNativeOne(
      supa,
      { token: c.token, platform: c.platform },
      reminderPayload(c.kind),
    );
    if (res.ok) sent++;
    else if (res.skipped) skipped++;
    else {
      failed++;
      addFailure(failures, c.platform, res.reason);
    }
  }
  if (!tallyIsEmpty(failures)) {
    console.warn("[push/deliver] native failures", JSON.stringify(failures));
  }
  return { sent, failed, skipped, candidates: candidates.length, failures, errors };
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
  supa: Admin,
  now: Date,
) {
  const errors: string[] = [];

  // In pages, like the two passes above: a request stops at 1,000 rows.
  const { data: optIns, error } = await pageAllSettled((from, to) =>
    supa
      .from("prayer_campaign_prayers")
      .select("user_id, campaign_id, remind_enabled, remind_time")
      .eq("remind_enabled", true)
      .order("campaign_id")
      .order("user_id")
      .range(from, to),
  );

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

  // The readers' ids go a hundred at a time. One .in() carried every id in the
  // address of the request, and the answer stopped at 1,000 rows either way.
  const webRows = await pageAllIn(userIds, (some, from, to) =>
    supa
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth, timezone")
      .in("user_id", some)
      .order("endpoint")
      .range(from, to),
  ).catch((e: Error) => {
    errors.push(`push_subscriptions (campaigns): ${e.message}`);
    return [];
  });

  const nativeRows = await pageAllIn(userIds, (some, from, to) =>
    supa
      .from("device_push_tokens")
      .select("user_id, token, platform, timezone")
      .in("user_id", some)
      .order("token")
      .range(from, to),
  ).catch((e: Error) => {
    errors.push(`device_push_tokens (campaigns): ${e.message}`);
    return [];
  });

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
  for (const r of webRows) {
    const t = target(r.user_id as string);
    t.timezone ??= (r.timezone as string | null) ?? null;
    t.web.push({
      endpoint: r.endpoint as string,
      p256dh: r.p256dh as string,
      auth: r.auth as string,
    });
  }
  for (const r of nativeRows) {
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
  const failures = emptyTally();
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
        else {
          failed++;
          addFailure(failures, n.platform, r.reason);
        }
      }
    }
  }
  if (!tallyIsEmpty(failures)) {
    console.warn("[push/deliver] campaign native failures", JSON.stringify(failures));
  }
  return { sent, failed, skipped, candidates: candidates.length, failures, errors };
}

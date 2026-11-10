import "server-only";

import { julyCampaignRoutes } from "@/lib/campaigns/flags";
import { getMessages } from "@/lib/i18n";
import { pageAllIn, pageAllSettled } from "@/lib/supabase/pageAll";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addFailure, emptyTally, tallyIsEmpty } from "./failures";
import {
  campaignReminderPayload,
  dueCampaigns,
  dueKind,
  reminderPayload,
  STEP_MINUTES,
  stepStart,
  type CampaignReminderRow,
  type ReminderKind,
} from "./schedule";
import { apnsConfigured, fcmConfigured, sendNativeOne, sendWebPushOne, webPushConfigured } from "./send";

// The delivery of opt-in prayer reminders, every ten minutes, across every
// transport:
//   - Web Push (push_subscriptions)  to browsers, signed with the VAPID keys
//   - iOS      (device_push_tokens)  through APNs
//   - Android  (device_push_tokens)  through FCM
// and, written and now retired, the one-a-day campaign reminder a reader could
// turn on in July (deliverCampaigns, below, says why it sends nothing).
//
// For each row `dueKind` says whether this ten-minute step is the reader's
// own morning or evening time (by their stored IANA zone), and the same small
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
// it directly; both go through the same claim on each ten-minute step, so two
// callers in one step send once.

type Admin = ReturnType<typeof createAdminClient>;

export type ReminderRun = {
  web: Awaited<ReturnType<typeof deliverWeb>>;
  native: Awaited<ReturnType<typeof deliverNative>>;
  campaigns: Awaited<ReturnType<typeof deliverCampaigns>>;
  /** Query failures: who was due is not known, which is not "nobody was due". */
  errors: string[];
};

/** Deliver everything due in this step. No claim: the caller decides whether it may run. */
export async function deliverReminders(supa: Admin, now: Date): Promise<ReminderRun> {
  const web = await deliverWeb(supa, now);
  const native = await deliverNative(supa, now);
  const campaigns = await deliverCampaigns(supa, now);
  const errors = [...(web.errors ?? []), ...(native.errors ?? []), ...(campaigns.errors ?? [])];
  return { web, native, campaigns, errors };
}

/** The UTC hour a moment belongs to, as the old hourly claim named it. */
export function reminderHourKey(now: Date): string {
  return now.toISOString().slice(0, 13);
}

/** The ten-minute step a moment belongs to, as its claim's name: "2026-10-31T14:20". */
export function reminderStepKey(now: Date): string {
  return stepStart(now).toISOString().slice(0, 16);
}

type Claim = "mine" | "taken" | "unknown";

/**
 * Ask for one ten-minute step. "mine": this run took it. "taken": another
 * run has it. "unknown": the claim could not be asked at all.
 *
 * One row in rate_limits, taken atomically by rate_limit_hit: the first
 * caller for a step is told it is within budget, every later one that it is
 * over. The window stays an hour, and only steps of the current UTC hour are
 * ever asked for: the function files a row under the hour it is CALLED in
 * and tidies rows whose hour is over, so a step asked for again in the next
 * hour would find no row and be taken twice.
 *
 * Asked directly and not through lib/security/ratelimit.ts, which answers
 * "within budget" when the limiter fails. That is right for a request limit
 * and wrong here: it would read a broken limiter as a claim on every run.
 */
async function claimStep(supa: Admin, step: Date): Promise<Claim> {
  try {
    const { data, error } = await supa.rpc("rate_limit_hit", {
      p_key: `push-deliver:${reminderStepKey(step)}`,
      p_window_seconds: 3600,
      p_max: 1,
    });
    if (error) {
      console.warn("[push/deliver] the claim could not be asked", error.message);
      return "unknown";
    }
    return data ? "taken" : "mine";
  } catch (e) {
    console.warn("[push/deliver] the claim could not be asked", e instanceof Error ? e.message : String(e));
    return "unknown";
  }
}

/**
 * Whether the hourly rule this replaced already sent this UTC hour.
 *
 * Until 2026-10-31 the first run of each UTC hour claimed the hour
 * (`push-deliver:2026-10-31T14`) and sent every reminder of it at once. In
 * the hour this code first runs, that has happened already, and sending its
 * steps again would remind every reader twice. Read, never written, so the
 * old claim is never made by this code; its row is tidied with its hour, so
 * after that hour this is one small read that finds nothing.
 */
async function hourAlreadySent(supa: Admin, now: Date): Promise<boolean> {
  try {
    const { data, error } = await supa
      .from("rate_limits")
      .select("key")
      .eq("key", `push-deliver:${reminderHourKey(now)}`)
      .limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/** How many steps back a run looks for one that no run took (a run lost to a restart). */
const CATCH_UP_STEPS = 5;

/**
 * Deliver the reminders of every step no run has claimed yet: this step,
 * and those of the same UTC hour a lost run left behind.
 *
 * Matching is by the reader's own ten-minute step, so a second run in a step
 * would send its readers the same reminder again; the claim (claimStep) is
 * what lets callers arrive at any pace and each step send once. The heartbeat
 * comes every ten minutes, so a run normally finds one step of its own.
 *
 * When the claim cannot be asked, the run sends its own step and no other:
 * each run is in a step of its own, so that is still once per step, and
 * sending nothing is how reminders stopped for a week.
 */
export async function deliverRemindersOnce(
  supa: Admin,
  now: Date,
): Promise<{ claimed: false } | ({ claimed: true; steps: string[] } & ReminderRun)> {
  const current = stepStart(now);
  const hourStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  if (await hourAlreadySent(supa, now)) return { claimed: false };
  const steps: Date[] = [];
  for (let k = CATCH_UP_STEPS; k >= 0; k--) {
    const step = new Date(current.getTime() - k * STEP_MINUTES * 60_000);
    if (step.getTime() >= hourStart.getTime()) steps.push(step);
  }
  const sent: { step: string; run: ReminderRun }[] = [];
  for (const step of steps) {
    const claim = await claimStep(supa, step);
    if (claim === "taken") continue;
    if (claim === "unknown" && step.getTime() !== current.getTime()) continue;
    sent.push({ step: reminderStepKey(step), run: await deliverReminders(supa, step) });
  }
  if (sent.length === 0) return { claimed: false };
  const errors = sent.flatMap((s) => s.run.errors);
  if (errors.length > 0) console.error("[push/deliver] query failures", errors);
  // The current step's counts, with every step's errors and the steps sent.
  const last = sent[sent.length - 1].run;
  return { claimed: true, steps: sent.map((s) => s.step), ...last, errors };
}

/**
 * Each reader's language, for the words their reminder is sent in
 * (profiles.preferred_language, 20260719): read only for the readers due in
 * this run, a hundred at a time. Where the column is not applied, or the read
 * fails, the map is empty and every reminder goes in English, as before;
 * never a missing reminder for want of a language.
 */
async function languagesOf(supa: Admin, userIds: (string | null)[]): Promise<Map<string, string | null>> {
  const ids = [...new Set(userIds.filter((id): id is string => typeof id === "string" && id !== ""))];
  if (ids.length === 0) return new Map();
  try {
    const rows = await pageAllIn(ids, (some, from, to) =>
      supa.from("profiles").select("id, preferred_language").in("id", some).order("id").range(from, to),
    );
    return new Map(
      (rows as { id: string; preferred_language?: string | null }[]).map((r) => [r.id, r.preferred_language ?? null]),
    );
  } catch {
    return new Map();
  }
}

/** The reminder in the words of the reader it goes to. */
function wordsFor(languages: Map<string, string | null>, userId: string | null): Readonly<Record<string, string>> {
  return getMessages(userId ? languages.get(userId) : null);
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
      .select("endpoint, p256dh, auth, user_id, morning_time, evening_time, timezone")
      .order("endpoint")
      .range(from, to),
  );
  const errors = error ? [`push_subscriptions: ${error.message}`] : [];

  const candidates: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userId: string | null;
    kind: ReminderKind;
  }[] = [];
  for (const r of rows ?? []) {
    const kind = dueKind(r, now);
    if (kind)
      candidates.push({
        endpoint: r.endpoint as string,
        p256dh: r.p256dh as string,
        auth: r.auth as string,
        userId: (r.user_id as string | null) ?? null,
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
  const languages = await languagesOf(supa, candidates.map((c) => c.userId));
  for (const c of candidates) {
    const r = await sendWebPushOne(
      supa,
      { endpoint: c.endpoint, p256dh: c.p256dh, auth: c.auth },
      { kind: c.kind, ...reminderPayload(c.kind, wordsFor(languages, c.userId)) },
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
      .select("token, platform, user_id, morning_time, evening_time, timezone")
      .order("token")
      .range(from, to),
  );
  const errors = error ? [`device_push_tokens: ${error.message}`] : [];

  const candidates: {
    token: string;
    platform: "ios" | "android";
    userId: string | null;
    kind: ReminderKind;
  }[] = [];
  for (const r of rows ?? []) {
    const kind = dueKind(r, now);
    if (kind)
      candidates.push({
        token: r.token as string,
        platform: r.platform as "ios" | "android",
        userId: (r.user_id as string | null) ?? null,
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
  const languages = await languagesOf(supa, candidates.map((c) => c.userId));
  for (const c of candidates) {
    // With its kind, so the phone's push service drops it once it is hours
    // late and a newer one replaces it on the screen (lib/push/lifetime.ts),
    // and in the words of the reader it goes to.
    const res = await sendNativeOne(
      supa,
      { token: c.token, platform: c.platform },
      { kind: c.kind, ...reminderPayload(c.kind, wordsFor(languages, c.userId)) },
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
 *
 * RETIRED WITH JULY'S ROUTES (2026-11-10; docs/audit/findings.yaml, F-50).
 * Campaigns were withdrawn on 2026-08-26, and everything a reader could do
 * with one went that day, the switch that turns this reminder off among it
 * (app/api/campaigns/[id]/remind answers 404). This sender was left running.
 * From 2026-10-04, when the heartbeat began to carry the reminders, it sent
 * "Your prayer campaign" once a day to every reader who had turned it on in
 * July: for a campaign that had ended, to a page that is not found, with no
 * way left to stop it. It asked nothing of the withdrawal, nor of the
 * campaign's last day.
 *
 * So it follows July's routes (lib/campaigns/flags.ts, julyCampaignRoutes):
 * while they are retired it reads no row and sends nothing. It is kept, not
 * deleted, as they are. The reminder comes back in the rework's own form and
 * its own phase, and has to be written to the rework's rules when it does (a
 * campaign's last day, a way to turn it off that works); this pass is not
 * that. lib/push/__tests__/campaignRemindersRetired.test.ts holds it.
 */
async function deliverCampaigns(
  supa: Admin,
  now: Date,
) {
  const errors: string[] = [];

  if (!julyCampaignRoutes()) {
    return { mode: "inactive", reason: "July's campaign reminders are retired", errors };
  }

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
        const r = await sendNativeOne(supa, n, { kind: "campaign", ...payload });
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

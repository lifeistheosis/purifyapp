import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { userIdByEmail } from "@/lib/admin/accountEmails";
import { emailsByUserId } from "@/lib/admin/users";

import { drain, quotaStopMessage } from "../drain";
import { sendEmailOnce } from "../ledger";
import { postalAddress } from "../marketing";
import { unsubscribeTokenFor } from "../preferences";
import type { SendOnceResult } from "../sendOnce";

import { readWeekCounts, roomLeft } from "./cap";
import { RETENTION_KINDS, type RetentionKind } from "./kinds";
import { letterFor } from "./letters";
import {
  FIRST_WEEK,
  oneEach,
  planFasting,
  planFirstWeek,
  planFirstWeekForOwner,
  planPickUp,
  planPickUpForOwner,
  type FirstWeekStep,
  type PlannedRetention,
} from "./plan";
import { retentionSubscribers } from "./preferences";
import { frameFor, lookFor, retentionUnsubscribeHeaders } from "./render";
import { fastingSent, pickUpSentSince, readFirstWeek, readPickUp, readProfiles, readSent, readStyles } from "./signals";
import { companionFasts, retentionPosition, type RetentionPosition } from "./switches";

/**
 * The retention step of the daily lifecycle job (lib/email/lifecycle.ts):
 * read, plan, send, report, for each email whose switch is past off.
 *
 * With every switch off, as all three are until his yes to their designs,
 * this reads nothing and sends nothing. At "owner" it reads only the owner's
 * own account and sends only to him. At "readers" it reads only the readers
 * who turned that list on.
 *
 * THE RULES IT KEEPS, each held by a test in lib/email/retention/__tests__:
 *
 *   - Only to readers whose column says true (preferences.ts), with their
 *     own unsubscribe link and one-click header for that list (render.ts).
 *   - Only in an approved look: no look, no send (render.ts LOOKS).
 *   - The postal address, or nothing goes (as every list email).
 *   - One retention email per reader per run, and none while the reader's
 *     week already holds two optional emails from any campaign (cap.ts).
 *     If the count cannot be read, readers get nothing that run.
 *   - Bulk mail: it spends what the day's budget has left (budget.ts), and
 *     what does not fit is deferred to the next run, inside its window.
 *   - Once: every copy goes through the send-once ledger (sendOnce.ts).
 *   - What was sent is read back before planning: if that read fails, the
 *     emails that depend on it (where you left off, the companion) wait.
 */

export type RetentionOutcome = SendOnceResult["status"] | "deferred" | "no_address" | "capped" | "no_look" | "no_token";

export type RetentionCounts = Record<RetentionOutcome, number> & { planned: number };

export type RetentionReport = {
  /** Where each switch stood, as obeyed. */
  positions: Record<RetentionKind, RetentionPosition>;
  byKind: Record<RetentionKind, RetentionCounts>;
  /** Lists whose column is not in email_preferences yet: nobody can be on them. */
  absent: RetentionKind[];
  /** Everything held: no postal address, so no list email may go. */
  held: "no_postal_address" | null;
  errors: string[];
};

export type RetentionDeps = {
  /** The accounts behind ADMIN_EMAILS. */
  ownerIds?: () => Promise<string[]>;
  addresses?: (admin: SupabaseClient, ids: string[]) => Promise<Map<string, string>>;
  tokenFor?: (admin: SupabaseClient, userId: string) => Promise<string | null>;
  send?: typeof sendEmailOnce;
};

const CONCURRENCY = 4;

/** How far back each kind's sends are read to know what a reader already had. */
const SENT_LOOKBACK_DAYS: Record<RetentionKind, number> = {
  first_week: 400,
  pick_up: 45,
  // Great Lent is 48 days; its opening must still be seen in its last week.
  fasting_companion: 70,
};

function emptyCounts(): RetentionCounts {
  return {
    planned: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    duplicate: 0,
    unavailable: 0,
    deferred: 0,
    no_address: 0,
    capped: 0,
    no_look: 0,
    no_token: 0,
  };
}

function emptyReport(): RetentionReport {
  return {
    positions: Object.fromEntries(RETENTION_KINDS.map((k) => [k, retentionPosition(k)])) as Record<RetentionKind, RetentionPosition>,
    byKind: Object.fromEntries(RETENTION_KINDS.map((k) => [k, emptyCounts()])) as Record<RetentionKind, RetentionCounts>,
    absent: [],
    held: null,
    errors: [],
  };
}

/** The accounts behind ADMIN_EMAILS, as lib/admin/ownerAlert.ts finds them. */
async function ownerIdsFromEnv(): Promise<string[]> {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ids = await Promise.all(emails.map((e) => userIdByEmail(e).catch(() => null)));
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

/** The owner's first sends, for one email: from his own account, to him alone. */
async function planForOwner(
  admin: SupabaseClient,
  kind: RetentionKind,
  ownerIds: string[],
  now: Date,
  errors: string[],
): Promise<PlannedRetention[]> {
  const sent = await readSent(admin, ownerIds, kind, now, SENT_LOOKBACK_DAYS[kind], errors);
  if (!sent) return [];
  const mine = sent.filter((s) => s.key.owner);
  if (kind === "first_week") {
    return planFirstWeekForOwner(
      ownerIds.map((userId) => ({
        userId,
        sent: new Set(mine.flatMap((s) => (s.key.kind === "first_week" && s.key.userId === userId ? [s.key.step as FirstWeekStep] : []))),
      })),
    );
  }
  if (kind === "pick_up") {
    const facts = await readPickUp(admin, ownerIds, now, errors);
    return planPickUpForOwner(
      facts.map((f) => ({ userId: f.userId, lines: f.lines, sent: mine.some((s) => s.key.userId === f.userId) })),
      now,
    );
  }
  const styles = await readStyles(admin, ownerIds, errors);
  const had = fastingSent(sent, true);
  return planFasting(
    ownerIds.map((userId) => ({ userId, style: styles.get(userId) ?? "new", sent: had.get(userId) ?? new Map() })),
    now,
    companionFasts(),
    { owner: true },
  );
}

/** One email's plan for the readers on its list. */
async function planForReaders(
  admin: SupabaseClient,
  kind: RetentionKind,
  ids: string[],
  now: Date,
  errors: string[],
): Promise<PlannedRetention[]> {
  if (ids.length === 0) return [];
  if (kind === "first_week") {
    // Only accounts inside the guide's ten days are read any further.
    const profiles = await readProfiles(admin, ids, errors);
    const last = FIRST_WEEK[FIRST_WEEK.length - 1].until;
    const young = ids.filter((id) => {
      const made = Date.parse(profiles.get(id)?.joined_at ?? "");
      const age = (now.getTime() - made) / 86_400_000;
      return Number.isFinite(made) && age >= FIRST_WEEK[0].from && age < last;
    });
    return planFirstWeek(await readFirstWeek(admin, young, errors), now);
  }
  const sent = await readSent(admin, ids, kind, now, SENT_LOOKBACK_DAYS[kind], errors);
  // Without what was sent there is no telling a second copy from a first.
  if (!sent) return [];
  if (kind === "pick_up") {
    const facts = await readPickUp(admin, ids, now, errors);
    const since = pickUpSentSince(sent, new Map(facts.map((f) => [f.userId, f.lastActiveAt])));
    return planPickUp(
      facts.map((f) => ({ ...f, sentSince: since.get(f.userId) ?? new Set() })),
      now,
    );
  }
  const styles = await readStyles(admin, ids, errors);
  const had = fastingSent(sent, false);
  return planFasting(
    ids.map((userId) => ({ userId, style: styles.get(userId) ?? "new", sent: had.get(userId) ?? new Map() })),
    now,
    companionFasts(),
  );
}

export async function runRetention(
  admin: SupabaseClient,
  now: Date,
  opts: { bulkLeft: number } & RetentionDeps,
): Promise<{ report: RetentionReport; spent: number }> {
  const report = emptyReport();
  const on = RETENTION_KINDS.filter((k) => report.positions[k] !== "off");
  if (on.length === 0) return { report, spent: 0 };

  const address = postalAddress();
  if (!address) {
    report.held = "no_postal_address";
    return { report, spent: 0 };
  }

  const errors = report.errors;
  const tokens = new Map<string, string>();
  const planned: PlannedRetention[] = [];

  // ── The owner's first sends ──
  const ownerKinds = on.filter((k) => report.positions[k] === "owner");
  if (ownerKinds.length > 0) {
    const ownerIds = await (opts.ownerIds ?? ownerIdsFromEnv)();
    if (ownerIds.length === 0) errors.push("A retention email is at owner, and ADMIN_EMAILS names no account to send it to.");
    for (const kind of ownerKinds) planned.push(...(await planForOwner(admin, kind, ownerIds, now, errors)));
  }

  // ── Readers who turned a list on ──
  const readerPlans: PlannedRetention[] = [];
  for (const kind of on.filter((k) => report.positions[k] === "readers")) {
    const subs = await retentionSubscribers(admin, kind);
    if (subs.absent) {
      report.absent.push(kind);
      continue;
    }
    if (subs.error) {
      errors.push(subs.error);
      continue;
    }
    for (const s of subs.subscribers) tokens.set(s.userId, s.unsubscribeToken);
    readerPlans.push(...(await planForReaders(admin, kind, subs.subscribers.map((s) => s.userId), now, errors)));
  }

  for (const p of [...planned, ...readerPlans]) report.byKind[p.kind].planned += 1;

  // One a reader a run: another of the three due the same day waits for a
  // later run, inside its own window.
  const chosen = oneEach(readerPlans);
  for (const p of readerPlans) if (!chosen.includes(p)) report.byKind[p.kind].deferred += 1;

  // And only where the reader's week has room. A count that cannot be read
  // gives nobody room: the cap does not fail open.
  if (chosen.length > 0) {
    const { counts, error } = await readWeekCounts(admin, chosen.map((p) => p.userId), now);
    if (error) errors.push(error);
    for (const p of chosen) {
      if (!error && roomLeft(counts.get(p.userId) ?? 0) >= 1) planned.push(p);
      else report.byKind[p.kind].capped += 1;
    }
  }
  if (planned.length === 0) return { report, spent: 0 };

  // ── Who, where, and in what look ──
  let addresses = new Map<string, string>();
  try {
    addresses = await (opts.addresses ?? emailsByUserId)(admin, [...new Set(planned.map((p) => p.userId))]);
  } catch (e) {
    errors.push(`auth users: ${(e as Error).message}`);
  }
  const tokenFor = opts.tokenFor ?? unsubscribeTokenFor;
  const sendable: { p: PlannedRetention; to: string; token: string }[] = [];
  for (const p of planned) {
    if (!lookFor(p.kind)) {
      report.byKind[p.kind].no_look += 1;
      continue;
    }
    const to = addresses.get(p.userId);
    if (!to) {
      report.byKind[p.kind].no_address += 1;
      continue;
    }
    let token = tokens.get(p.userId) ?? null;
    if (!token) {
      try {
        token = await tokenFor(admin, p.userId);
      } catch (e) {
        errors.push(`unsubscribe token: ${(e as Error).message}`);
      }
    }
    // An email with no way to stop it does not go.
    if (!token) {
      report.byKind[p.kind].no_token += 1;
      continue;
    }
    sendable.push({ p, to, token });
  }

  let spent = 0;
  const send = opts.send ?? sendEmailOnce;
  const drained = await drain(sendable, {
    concurrency: CONCURRENCY,
    cap: { applies: () => true, limit: Math.max(0, opts.bulkLeft) },
    send: ({ p, to, token }) => {
      const look = lookFor(p.kind)!;
      const content = look(letterFor(p, now), frameFor(p.kind, token, address, { owner: p.owner }));
      return send(admin, {
        dedupeKey: p.dedupeKey,
        kind: p.kind,
        userId: p.userId,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        headers: retentionUnsubscribeHeaders(token, p.kind),
      });
    },
    record: ({ p }, outcome) => {
      report.byKind[p.kind][outcome] += 1;
      if (outcome === "sent" || outcome === "failed") spent += 1;
    },
  });
  const quota = quotaStopMessage(drained);
  if (quota) errors.push(quota);
  return { report, spent };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { startCampaign } from "@/lib/email/campaignStart";

import { logActivity } from "./activityLog";
import { readBoard } from "./boardRead";
import { autoSendDecision, localClock, parseClock, type AutoDecision } from "./ownerDesk";
import { readDesk } from "./ownerDeskStore";

/**
 * The Sunday email, the monthly note and the feast shop email, sent by
 * themselves (his word, 2026-11-13: "yes auto"). The rules are in
 * lib/admin/ownerDesk.ts (autoSendDecision); the send is the panel's own
 * (lib/email/campaignStart.ts), so every check a press meets, this meets.
 *
 * Called by the maintenance heartbeat (lib/ops/maintenance.ts) every ten
 * minutes. It reads the desk first and stops there on most calls: when the
 * switch is off, when no brief today named a piece, or before the hour.
 * Only then does it read the board, and a board whose stored rows could not
 * be read sends nothing (a skip or a "not before" day might be missing).
 *
 * ONCE. A piece that started, or that already went, is not tried again on
 * this server that day; and if it were, the send-once rules underneath would
 * refuse it (a job per mailing, a campaign per period, a ledger row per
 * reader). A refusal that will not change by itself (the words, the period,
 * nothing to send, the postal address) is written to the activity log once
 * and not retried that day; a failure of the database or the draft is tried
 * again on the next heartbeat.
 */

export type AutoSendLine = {
  ruleKey: string;
  /** What happened: a reason it did not go, or the send's outcome. */
  outcome: Exclude<AutoDecision, { go: true }>["why"] | "started" | "already" | "refused" | "failed";
  detail?: string;
};

export type AutoSendReport = { off?: string; lines: AutoSendLine[] };

/** ruleKey to the day it was finished on this server: started, already gone, or refused for good. */
const finished = new Map<string, string>();

/** For the tests: forget what this server has done. */
export function forgetAutoSends(): void {
  finished.clear();
}

export async function runAutoSends(admin: SupabaseClient, now: Date = new Date()): Promise<AutoSendReport> {
  const desk = await readDesk(admin);
  if (!desk.ok) return { off: "the desk could not be read", lines: [] };
  if (!desk.settings.autoSend) return { off: "the switch is off", lines: [] };
  const clock = localClock(now);
  const ann = desk.announcement;
  if (!ann || ann.day !== clock.day || ann.pieces.length === 0) return { lines: [] };
  // Before the sends' hour nothing can go, so the board is not read.
  if (clock.minutes < (parseClock(desk.settings.sendAt) as number)) {
    return { lines: ann.pieces.map((p) => ({ ruleKey: p.ruleKey, outcome: "too early" })) };
  }
  const todo = ann.pieces.filter((p) => finished.get(p.ruleKey) !== clock.day);
  if (todo.length === 0) return { lines: [] };

  const board = await readBoard(admin, clock.day);
  if (board.error) return { off: `the board could not be read (${board.error})`, lines: [] };

  const lines: AutoSendLine[] = [];
  for (const piece of todo) {
    const task = board.tasks.find((t) => t.ruleKey === piece.ruleKey);
    const decision = autoSendDecision({
      now,
      settings: desk.settings,
      announcement: ann,
      holds: desk.holds,
      ruleKey: piece.ruleKey,
      dueToday: !!task && task.status === "open" && task.dueOn === clock.day,
    });
    if (!decision.go) {
      lines.push({ ruleKey: piece.ruleKey, outcome: decision.why });
      continue;
    }

    const result = await startCampaign(admin, {
      kind: piece.kind,
      periodKey: piece.periodKey,
      order: "oldest",
      perDay: null,
      createdByEmail: null,
      now,
    });
    if (result.ok) {
      finished.set(piece.ruleKey, clock.day);
      lines.push({ ruleKey: piece.ruleKey, outcome: "started", detail: `${result.run.counts.sent} sent in the first share` });
      void logActivity({
        actorEmail: null,
        action: "email.campaign_auto_send",
        entityType: "email_campaign",
        entityId: result.mailingKey,
        detail: { ruleKey: piece.ruleKey, briefAt: ann.at, ...result.run.counts, owed: result.run.owed, note: result.run.note },
      });
      continue;
    }
    if (result.code === "exists") {
      finished.set(piece.ruleKey, clock.day);
      lines.push({ ruleKey: piece.ruleKey, outcome: "already", detail: result.error });
      continue;
    }
    const lasting = result.code !== "draft" && result.code !== "job";
    if (lasting) {
      finished.set(piece.ruleKey, clock.day);
      void logActivity({
        actorEmail: null,
        action: "email.campaign_auto_refused",
        entityType: "email_campaign",
        entityId: `${piece.kind}:${piece.periodKey}`,
        detail: { ruleKey: piece.ruleKey, code: result.code, error: result.error },
      });
    }
    lines.push({ ruleKey: piece.ruleKey, outcome: lasting ? "refused" : "failed", detail: result.error });
  }
  return { lines };
}

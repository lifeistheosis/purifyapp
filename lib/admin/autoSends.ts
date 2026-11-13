import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { draftCampaign } from "@/lib/email/campaignDrafts";
import { campaignCopyViolations, startCampaign } from "@/lib/email/campaignStart";
import { sendEmailOnce } from "@/lib/email/ledger";
import { READER_EMAIL_LOOK } from "@/lib/email/look";
import { postalAddress, renderMarketing } from "@/lib/email/marketing";

import { adminEmails } from "./access";
import { logActivity } from "./activityLog";
import { readBoard } from "./boardRead";
import { autoSendDecision, localClock, lookWaits, parseClock, type AnnouncedPiece, type AutoDecision } from "./ownerDesk";
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
 *
 * THE FIRST-SEND GUARD (lib/email/look.ts). While the reader emails wear a
 * look he has not cleared on the desk, a piece that would go to readers goes
 * to him alone instead, once for that look, exactly as a reader would get it;
 * then nothing goes to readers by itself until he says he has seen it in his
 * own inbox. The brief is not held by it.
 */

/** The send-once key of the one copy a new look sends him: one per look. */
export const firstLookKey = (look: string = READER_EMAIL_LOOK) => `first_look:${look}`;

type FirstLook = { outcome: "to you first" | "waiting for your look" | "refused" | "failed"; detail?: string };

/** The piece's email, as a reader would get it, to him alone: once for each new look. */
async function sendFirstLook(admin: SupabaseClient, piece: AnnouncedPiece, now: Date): Promise<FirstLook> {
  const to = adminEmails()[0];
  if (!to) return { outcome: "failed", detail: "ADMIN_EMAILS unset" };
  const address = postalAddress();
  if (!address) return { outcome: "refused", detail: "EMAIL_POSTAL_ADDRESS unset, so no list email can go" };
  const draft = await draftCampaign(admin, piece.kind, now).catch((e: Error) => e);
  if (draft instanceof Error) return { outcome: "failed", detail: draft.message };
  if (draft.periodKey !== piece.periodKey) return { outcome: "refused", detail: `the draft is now for ${draft.periodKey}` };
  if (!draft.body) return { outcome: "refused", detail: draft.reason ?? "nothing to send" };
  if (campaignCopyViolations(piece.kind, draft.body).length) return { outcome: "refused", detail: "the words do not pass the email doctrine" };
  // An empty token: his copy's unsubscribe button leads to the page itself, as a list email to no reader does.
  const email = renderMarketing(draft.body, draft.list, "", address);
  const result = await sendEmailOnce(admin, {
    dedupeKey: firstLookKey(),
    kind: "first_look",
    userId: null,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers,
  });
  if (result.status === "duplicate") return { outcome: "waiting for your look" };
  if (result.status !== "sent") return { outcome: "failed", detail: result.status === "failed" || result.status === "unavailable" ? result.error : result.status };
  void logActivity({
    actorEmail: null,
    action: "email.first_look",
    entityType: "email_campaign",
    entityId: `${piece.kind}:${piece.periodKey}`,
    detail: { look: READER_EMAIL_LOOK, ruleKey: piece.ruleKey },
  });
  return { outcome: "to you first" };
}

export type AutoSendLine = {
  ruleKey: string;
  /** What happened: a reason it did not go, or the send's outcome. */
  outcome:
    | Exclude<AutoDecision, { go: true }>["why"]
    | "started"
    | "already"
    | "refused"
    | "failed"
    /** The first-send guard: this one went to him alone, or readers wait for his look. */
    | "to you first"
    | "waiting for your look";
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

    // The first-send guard: a look he has not seen goes to him alone, never to readers.
    if (lookWaits(READER_EMAIL_LOOK, desk.look)) {
      const first = await sendFirstLook(admin, piece, now);
      if (first.outcome !== "failed") finished.set(piece.ruleKey, clock.day);
      lines.push({ ruleKey: piece.ruleKey, outcome: first.outcome, ...(first.detail ? { detail: first.detail } : {}) });
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

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emailLayout } from "@/lib/email/layout";
import { sendEmailOnce } from "@/lib/email/ledger";
import { SITE_URL } from "@/lib/site";

import { adminEmails } from "./access";
import { saveBoardDraft } from "./boardDraft";
import { readBriefFigures } from "./briefFigures";
import { readToday, type TodayPart } from "./briefToday";
import { briefEmail, spanFor, type BriefFigures } from "./ownerBrief";
import { briefWindowOpen, isWeeklyBrief, localClock, type AnnouncedPiece } from "./ownerDesk";
import { briefSent, DESK_KEYS, readDesk, writeDesk, type DeskState } from "./ownerDeskStore";

/**
 * Makes and sends the owner's brief (lib/admin/ownerBrief.ts says what it is).
 * Called by the maintenance heartbeat (lib/ops/maintenance.ts) every ten
 * minutes; it sends once his hour has come (7:30 New York time unless he
 * changed it), once a day.
 *
 * ONE A DAY. The email log keys it `owner_brief:<his date>`, so a second
 * server, a restart or a press from the panel cannot send a second one. The
 * weekly brief is that day's brief, not a second email.
 *
 * WHAT IT ANNOUNCES. A piece the brief names as going out by itself
 * (lib/admin/briefToday.ts) is written to the desk only after the brief was
 * sent: a brief that failed names nothing, and so nothing goes by itself
 * (lib/admin/autoSends.ts).
 *
 * The board message's draft from the week is saved as the week's draft row
 * when the brief is made on the board message's day, and only when the week
 * has no row (lib/admin/boardDraft.ts). It never publishes.
 */

export const briefKey = (day: string) => `owner_brief:${day}`;

/**
 * The shell the brief is drawn in. The design kit's email template
 * (docs/brand/kit/email/) replaces emailLayout here when it lands; every part
 * of the brief is drawn on the email theme's tokens, so they follow.
 */
export const briefShell: Parameters<typeof briefEmail>[3] = (opts) => emailLayout(opts);

const adminUrl = () => `${SITE_URL.replace(/\/$/, "")}/admin`;

export type ComposedBrief = {
  desk: DeskState;
  weekly: boolean;
  figures: BriefFigures;
  today: TodayPart;
  announce: AnnouncedPiece[];
  subject: string;
  html: string;
};

/**
 * The brief as it would go now. "send" is the brief itself: its pieces go out
 * by themselves two hours on, and the board message's draft is saved.
 * "preview" is the panel's look at it: the pieces as they stand, nothing saved.
 */
export async function composeBrief(
  admin: SupabaseClient,
  now: Date,
  mode: "send" | "preview",
  known?: DeskState,
): Promise<ComposedBrief> {
  const desk = known ?? (await readDesk(admin));
  const weekly = isWeeklyBrief(now, desk.settings);
  const [today, figures] = await Promise.all([
    readToday(admin, now, desk, mode === "send" ? "brief" : "panel"),
    readBriefFigures(admin, spanFor(now, weekly)),
  ]);
  if (today.board) {
    today.board.saved = mode === "send" ? await saveBoardDraft(admin, today.board) : "preview";
  }
  const { subject, html } = briefEmail(figures, today, { admin: adminUrl() }, briefShell);
  return { desk, weekly, figures, today, announce: mode === "send" ? today.announce : [], subject, html };
}

export type BriefReport = {
  sent: boolean;
  reason: string;
  day?: string;
  weekly?: boolean;
  /** How many pieces it named as going out by itself. */
  named?: number;
};

/** The day this server last saw the brief sent, so most heartbeats stop at once. */
let sentOn: string | null = null;
/** When this server last tried and failed, so a failure is retried every half hour, not every ten minutes. */
let failedAt = 0;
const RETRY_MS = 30 * 60_000;

/** For the tests: forget what this server has done. */
export function forgetBriefRuns(): void {
  sentOn = null;
  failedAt = 0;
}

export async function sendOwnerBrief(admin: SupabaseClient, now: Date = new Date()): Promise<BriefReport> {
  const { day } = localClock(now);
  if (sentOn === day) return { sent: false, reason: "already sent today", day };
  const desk = await readDesk(admin);
  if (!briefWindowOpen(now, desk.settings)) return { sent: false, reason: "not the brief's hour", day };
  const to = adminEmails()[0];
  if (!to) return { sent: false, reason: "ADMIN_EMAILS unset", day };
  if (failedAt && now.getTime() - failedAt < RETRY_MS) return { sent: false, reason: "waiting to try again", day };

  const key = briefKey(day);
  const log = await briefSent(admin, key);
  if (log?.sent) {
    sentOn = day;
    return { sent: false, reason: "already sent today", day };
  }

  const brief = await composeBrief(admin, now, "send", desk);
  const result = await sendEmailOnce(admin, {
    dedupeKey: key,
    kind: "owner_brief",
    userId: null,
    to,
    subject: brief.subject,
    html: brief.html,
  });
  if (result.status === "duplicate") {
    sentOn = day;
    return { sent: false, reason: "already sent today", day };
  }
  if (result.status !== "sent") {
    failedAt = now.getTime();
    return { sent: false, reason: result.status === "failed" || result.status === "unavailable" ? `${result.status}: ${result.error}` : result.status, day };
  }
  sentOn = day;
  failedAt = 0;

  // Only now, with the brief in his inbox, may what it named go out by itself.
  let named = 0;
  if (brief.announce.length > 0 && desk.ok) {
    const w = await writeDesk(admin, DESK_KEYS.announced, { day, at: now.toISOString(), pieces: brief.announce }, "the owner's brief");
    if (w.ok) named = brief.announce.length;
  }
  return { sent: true, reason: "sent", day, weekly: brief.weekly, named };
}
